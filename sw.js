// Service Worker: alles vorab cachen, dann komplett offline. Bei Änderungen VERSION erhöhen.
const VERSION = 'umbra-v5';
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
    './js/data/exercises.js',
    './js/data/glyphs.js',
    './js/data/missions.js',
    './js/data/mobility.js',
    './js/engine/cycle.js',
    './js/engine/dates.js',
    './js/engine/decide.js',
    './js/engine/footwork.js',
    './js/engine/game.js',
    './js/engine/history.js',
    './js/engine/mobility.js',
    './js/engine/plan.js',
    './js/engine/progress.js',
    './js/engine/progression.js',
    './js/engine/roundtimer.js',
    './js/state.js',
    './js/store.js',
    './js/ui/arena.js',
    './js/ui/check.js',
    './js/ui/footwork.js',
    './js/ui/kit.js',
    './js/ui/kodex.js',
    './js/ui/onboarding.js',
    './js/ui/profile.js',
    './js/ui/sound.js',
    './js/ui/today.js',
    './js/ui/training.js',
    './js/ui/voice.js',
    './js/ui/week.js',
    './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((r) => r || fetch(req)));
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
