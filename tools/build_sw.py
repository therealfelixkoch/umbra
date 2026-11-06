#!/usr/bin/env python3
"""Erzeugt sw.js: App-Dateien als Precache, Lore-Bilder einzeln (fehlende brechen nichts).
Aufruf aus dem Projektordner:  python3 tools/build_sw.py <version>   z. B. umbra-v7"""
import os, re, sys, json, hashlib

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

def temper_files():
    # TEMPER-Sprecherclips: alles, was in assets/temper liegt (wie Lore einzeln gecacht, fehlende brechen nichts)
    out = []
    base = os.path.join(ROOT, 'assets/temper')
    for dp, _, fs in os.walk(base):
        out += [os.path.relpath(os.path.join(dp, f), ROOT) for f in fs if f.endswith('.mp3')]
    return sorted(out)

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

def fhash(rel, algo='md5'):
    # Kurzer Inhalts-Hash: Der Service Worker lädt nur Dateien neu, deren Hash sich geändert hat.
    # App-Dateien mit SHA-256, damit der Service Worker den Inhalt nachprüfen kann (crypto.subtle kennt kein MD5).
    return hashlib.new(algo, open(os.path.join(ROOT, rel), 'rb').read()).hexdigest()[:10]

def entries(rels, algo='md5'):
    return "\n".join(f"  ['./{r}', '{fhash(r, algo)}']," for r in rels)

# Lore: nur Bilder, die wirklich da sind – erwartete, aber fehlende Namen würden sonst bei jedem Start 404er erzeugen.
lore_rels = [f'assets/lore/{f}' for f in lore_files() if os.path.exists(os.path.join(ROOT, 'assets/lore', f))]
assets = entries(app_files(), 'sha256')
lore = entries(lore_rels + temper_files())
sw = f"""// Service Worker – erzeugt von tools/build_sw.py, nicht von Hand ändern.
// Jede Datei steht mit Inhalts-Hash in der Liste und liegt im Cache unter "pfad?h=<hash>".
// Beim Update wird nur geholt, was sich geändert hat – Unverändertes wird aus dem alten Cache übernommen.
// Geladen wird gedrosselt (wenige Anfragen gleichzeitig), bei 429/5xx mit Wartezeit erneut versucht:
// Abgefragt wird "pfad?h=<hash>": So liefert auch das GitHub-CDN (cacht ~10 min) garantiert den neuen Stand.
// GitHub Pages sperrt sonst die IP ("Rate limit exceeded") und das Update bleibt hängen.
// App-Dateien: komplett vorab gecacht (Versionswechsel = neuer Cache), ausgeliefert nur aus der eigenen Version.
// Lore-Bilder und TEMPER-Clips: eigener Cache, fehlende brechen die Installation nicht ab.
// App-Dateien werden gegen ihren Hash geprüft: Liegt auf GitHub noch ein alter Stand (z. B. Datei im falschen Ordner
// hochgeladen), bricht die Installation ab und die bisherige Version läuft weiter, statt alte und neue Dateien zu mischen.
const VERSION = '{version}';
const LORE_CACHE = 'umbra-lore';
const ASSETS = [
  ['./', '{fhash('index.html', 'sha256')}'],
{assets}
];
const LORE = [
{lore}
];
const PARALLEL = 3;
const key = (url, h) => `${{url}}?h=${{h}}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function pool(items, fn) {{
  let i = 0;
  await Promise.all(Array.from({{ length: PARALLEL }}, async () => {{
    while (i < items.length) await fn(items[i++]);
  }}));
}}

async function get(url, mode) {{
  for (let t = 0; ; t++) {{
    const res = await fetch(url, {{ cache: mode }});
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && t < 3) {{ await wait(3000 * 2 ** t); continue; }}
    const err = new Error(`${{res.status}} ${{url}}`);
    err.status = res.status;
    throw err;
  }}
}}

async function sha(res) {{
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', await res.clone().arrayBuffer()));
  return Array.from(d.slice(0, 5), (b) => b.toString(16).padStart(2, '0')).join('');
}}

async function precache() {{
  const cache = await caches.open(VERSION);
  await pool(ASSETS, async ([url, h]) => {{
    const k = key(url, h);
    if (await cache.match(k)) return;
    const old = await caches.match(k);
    if (old && await sha(old) === h) {{ await cache.put(k, old); return; }}
    let res = await get(k, 'reload');
    if (await sha(res) !== h) res = await get(`${{k}}&t=${{Date.now()}}`, 'reload'); // CDN noch nicht aktuell
    if (await sha(res) !== h) throw new Error(`Falscher Stand auf dem Server: ${{url}}`);
    await cache.put(k, res);
  }});
}}

let loreBusy = null;
function cacheLore() {{
  return loreBusy || (loreBusy = (async () => {{
    const cache = await caches.open(LORE_CACHE);
    let blocked = false;
    await pool(LORE, async ([url, h]) => {{
      const k = key(url, h);
      if (blocked || await cache.match(k)) return;
      try {{
        const res = await get(k, 'no-cache');
        await cache.delete(url, {{ ignoreSearch: true }});
        await cache.put(k, res);
      }} catch (err) {{
        if (err.status === 429) blocked = true; // gesperrt: Rest beim nächsten Start
      }}
    }});
  }})().finally(() => {{ loreBusy = null; }}));
}}

self.addEventListener('install', (e) => {{
  e.waitUntil(precache()
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
    e.respondWith(caches.open(VERSION).then((c) => c.match('./index.html', {{ ignoreSearch: true }}).then((r) => r || c.match('./', {{ ignoreSearch: true }}))).then((r) => r || fetch(req)));
    return;
  }}
  if (url.pathname.includes('/assets/lore/') || url.pathname.includes('/assets/temper/')) {{
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
print(f"sw.js geschrieben: {version}, {len(app_files())} App-Dateien, {len(lore_rels)} Lore-Bilder, {len(temper_files())} TEMPER-Clips")
