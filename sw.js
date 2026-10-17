// Service Worker – erzeugt von tools/build_sw.py, nicht von Hand ändern.
// App-Dateien: komplett vorab gecacht (Versionswechsel = neuer Cache).
// Lore-Bilder: eigener Cache, einzeln geladen. Fehlende Bilder brechen die Installation nicht ab;
// bei jedem App-Start mit Netz holt der Service Worker neue oder geänderte Bilder nach.
const VERSION = 'umbra-v11';
const LORE_CACHE = 'umbra-lore';
const ASSETS = [
  './',
  './css/app.css',
  './fonts/oxanium.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './index.html',
  './js/app.js',
  './js/data/arcs.js',
  './js/data/exercises.js',
  './js/data/glyphs.js',
  './js/data/lore.js',
  './js/data/missions.js',
  './js/data/mobility.js',
  './js/data/story.js',
  './js/engine/arc.js',
  './js/engine/arcsync.js',
  './js/engine/bmt.js',
  './js/engine/boss.js',
  './js/engine/cycle.js',
  './js/engine/dates.js',
  './js/engine/debrief.js',
  './js/engine/decide.js',
  './js/engine/footwork.js',
  './js/engine/game.js',
  './js/engine/history.js',
  './js/engine/load.js',
  './js/engine/mobility.js',
  './js/engine/plan.js',
  './js/engine/progress.js',
  './js/engine/progression.js',
  './js/engine/roundtimer.js',
  './js/engine/rulelog.js',
  './js/engine/signals.js',
  './js/engine/stagnation.js',
  './js/engine/story.js',
  './js/state.js',
  './js/store.js',
  './js/ui/arena.js',
  './js/ui/bmt.js',
  './js/ui/check.js',
  './js/ui/debrief.js',
  './js/ui/emblem.js',
  './js/ui/footwork.js',
  './js/ui/haptics.js',
  './js/ui/intro.js',
  './js/ui/kit.js',
  './js/ui/kodex.js',
  './js/ui/lore.js',
  './js/ui/onboarding.js',
  './js/ui/profile.js',
  './js/ui/review.js',
  './js/ui/sound.js',
  './js/ui/today.js',
  './js/ui/training.js',
  './js/ui/voice.js',
  './js/ui/week.js',
  './manifest.webmanifest',
];
const LORE = [
  './assets/lore/arc1-confront.webp',
  './assets/lore/arc1-establishing.webp',
  './assets/lore/arc1-retreat.webp',
  './assets/lore/arc1-victory.webp',
  './assets/lore/arc2-confront.webp',
  './assets/lore/arc2-establishing.webp',
  './assets/lore/arc2-retreat.webp',
  './assets/lore/arc2-victory.webp',
  './assets/lore/arc3-confront.webp',
  './assets/lore/arc3-establishing.webp',
  './assets/lore/arc3-retreat.webp',
  './assets/lore/arc3-victory.webp',
  './assets/lore/arc4-confront.webp',
  './assets/lore/arc4-establishing.webp',
  './assets/lore/arc4-retreat.webp',
  './assets/lore/arc4-victory.webp',
  './assets/lore/boss-fracture.webp',
  './assets/lore/boss-hollow.webp',
  './assets/lore/boss-rigor.webp',
  './assets/lore/boss-torpor.webp',
  './assets/lore/guardian-0-shade.webp',
  './assets/lore/guardian-1-blade.webp',
  './assets/lore/guardian-2-warden.webp',
  './assets/lore/guardian-3-phantom.webp',
  './assets/lore/guardian-4-umbra.webp',
  './assets/lore/guardian-5-unbreakable.webp',
  './assets/lore/mission-arena.webp',
  './assets/lore/mission-ascent.webp',
  './assets/lore/mission-bedrock.webp',
  './assets/lore/mission-flow.webp',
  './assets/lore/mission-forge.webp',
  './assets/lore/mission-impact.webp',
  './assets/lore/mission-infiltration.webp',
  './assets/lore/mission-quickstrike.webp',
  './assets/lore/mission-shadowstep.webp',
  './assets/lore/nemesis-appears.webp',
  './assets/lore/nemesis-fades.webp',
  './assets/lore/nemesis-plateau.webp',
  './assets/lore/splash.webp',
];

async function cacheLore() {
  const cache = await caches.open(LORE_CACHE);
  await Promise.allSettled(LORE.map(async (url) => {
    const res = await fetch(url, { cache: 'no-cache' });
    if (res.ok) await cache.put(url, res);
  }));
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS))
    .then(() => cacheLore().catch(() => {}))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== LORE_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'cache-lore') e.waitUntil(cacheLore().catch(() => {}));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((r) => r || fetch(req)));
    return;
  }
  if (url.pathname.includes('/assets/lore/')) {
    e.respondWith(caches.open(LORE_CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
    }
    return res;
  })));
});
