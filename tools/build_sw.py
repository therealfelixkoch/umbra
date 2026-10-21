#!/usr/bin/env python3
"""Erzeugt sw.js: App-Dateien als Precache, Lore-Bilder einzeln (fehlende brechen nichts).
Aufruf aus dem Projektordner:  python3 tools/build_sw.py <version>   z. B. umbra-v7"""
import os, re, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
version = sys.argv[1] if len(sys.argv) > 1 else None

def app_files():
    out = []
    for root in ['css', 'fonts', 'icons', 'js']:
        for dp, _, fs in os.walk(os.path.join(ROOT, root)):
            for f in fs:
                if f != '.DS_Store':
                    out.append(os.path.relpath(os.path.join(dp, f), ROOT))
    return sorted(out + ['index.html', 'manifest.webmanifest'])

def lore_files():
    # Alle erwarteten Namen aus js/data/lore.js plus alles, was tatsächlich in assets/lore liegt.
    src = open(os.path.join(ROOT, 'js/data/lore.js'), encoding='utf-8').read()
    names = set(re.findall(r"'([a-z0-9-]+\.(?:webp|png))'", src))
    for a in range(1, 5):
        for k in ['establishing', 'confront', 'victory', 'retreat']:
            names.add(f'arc{a}-{k}.webp')
    lore_dir = os.path.join(ROOT, 'assets/lore')
    if os.path.isdir(lore_dir):
        names |= {f for f in os.listdir(lore_dir) if f.endswith(('.webp', '.png'))}
    names.discard('icon-1024.png')  # nur Quelle fürs App-Icon
    return sorted(names)

sw_path = os.path.join(ROOT, 'sw.js')
old = open(sw_path, encoding='utf-8').read() if os.path.exists(sw_path) else ''
if not version:
    m = re.search(r"umbra-v(\d+)", old)
    version = f"umbra-v{int(m.group(1)) + 1 if m else 1}"

# Versionsstempel in JS und CSS: passen sie nach einem Update nicht zusammen, repariert sich die App selbst.
open(os.path.join(ROOT, 'js/version.js'), 'w', encoding='utf-8').write(
    f"// Erzeugt von tools/build_sw.py – muss zur Version in sw.js und css/app.css passen.\nexport const APP_VERSION = '{version}';\n")
css_path = os.path.join(ROOT, 'css/app.css')
css = open(css_path, encoding='utf-8').read()
stamp = f':root {{ --app-version: "{version}"; }} /* Versionsstempel, erzeugt von tools/build_sw.py */\n'
css = re.sub(r'^:root \{ --app-version: "[^"]*"; \} /\* Versionsstempel[^\n]*\n', '', css)
open(css_path, 'w', encoding='utf-8').write(stamp + css)

assets = "\n".join(f"  './{f}'," for f in app_files())
lore = "\n".join(f"  './assets/lore/{f}'," for f in lore_files())
sw = f"""// Service Worker – erzeugt von tools/build_sw.py, nicht von Hand ändern.
// App-Dateien: komplett vorab gecacht (Versionswechsel = neuer Cache). Beim Installieren wird jede Datei
// frisch vom Server geholt (cache: 'reload'), sonst mischt der Browser-Cache (GitHub Pages: 10 min) alte Dateien
// in die neue Version. Ausgeliefert wird nur aus dem Cache der eigenen Version.
// Lore-Bilder: eigener Cache, einzeln geladen. Fehlende Bilder brechen die Installation nicht ab;
// bei jedem App-Start mit Netz holt der Service Worker neue oder geänderte Bilder nach.
const VERSION = '{version}';
const LORE_CACHE = 'umbra-lore';
const ASSETS = [
  './',
{assets}
];
const LORE = [
{lore}
];

async function cacheLore() {{
  const cache = await caches.open(LORE_CACHE);
  await Promise.allSettled(LORE.map(async (url) => {{
    const res = await fetch(url, {{ cache: 'no-cache' }});
    if (res.ok) await cache.put(url, res);
  }}));
}}

self.addEventListener('install', (e) => {{
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS.map((u) => new Request(u, {{ cache: 'reload' }}))))
    .then(() => cacheLore().catch(() => {{}}))
    .then(() => self.skipWaiting()));
}});

self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== LORE_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
}});

self.addEventListener('message', (e) => {{
  if (e.data?.type === 'cache-lore') e.waitUntil(cacheLore().catch(() => {{}}));
}});

self.addEventListener('fetch', (e) => {{
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {{
    e.respondWith(caches.open(VERSION).then((c) => c.match('./index.html').then((r) => r || c.match('./'))).then((r) => r || fetch(req)));
    return;
  }}
  if (url.pathname.includes('/assets/lore/')) {{
    e.respondWith(caches.open(LORE_CACHE).then((c) => c.match(req, {{ ignoreSearch: true }}).then((hit) => hit || fetch(req).then((res) => {{
      if (res.ok) c.put(req, res.clone());
      return res;
    }}))));
    return;
  }}
  e.respondWith(caches.open(VERSION).then((c) => c.match(req, {{ ignoreSearch: true }}).then((hit) => hit || fetch(req).then((res) => {{
    if (res.ok) c.put(req, res.clone());
    return res;
  }}))));
}});
"""
open(sw_path, 'w', encoding='utf-8').write(sw)
print(f"sw.js geschrieben: {version}, {len(app_files())} App-Dateien, {len(lore_files())} Lore-Bilder")
