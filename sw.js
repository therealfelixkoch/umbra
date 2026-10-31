// Service Worker – erzeugt von tools/build_sw.py, nicht von Hand ändern.
// Jede Datei steht mit Inhalts-Hash in der Liste und liegt im Cache unter "pfad?h=<hash>".
// Beim Update wird nur geholt, was sich geändert hat – Unverändertes wird aus dem alten Cache übernommen.
// Geladen wird gedrosselt (wenige Anfragen gleichzeitig), bei 429/5xx mit Wartezeit erneut versucht:
// GitHub Pages sperrt sonst die IP ("Rate limit exceeded") und das Update bleibt hängen.
// App-Dateien: komplett vorab gecacht (Versionswechsel = neuer Cache), ausgeliefert nur aus der eigenen Version.
// Lore-Bilder und TEMPER-Clips: eigener Cache, fehlende brechen die Installation nicht ab.
const VERSION = 'v38';
const LORE_CACHE = 'umbra-lore';
const ASSETS = [
  ['./', '453adf55be'],
  ['./css/app.css', 'cc7fede094'],
  ['./fonts/oxanium.woff2', '2a16eec157'],
  ['./icons/apple-touch-icon.png', 'f42acbee32'],
  ['./icons/icon-192.png', '3d8f27d61d'],
  ['./icons/icon-512.png', '0295c4fed7'],
  ['./icons/icon.svg', 'fbcba7aae2'],
  ['./index.html', '453adf55be'],
  ['./js/app.js', '02ca1ee5ab'],
  ['./js/data/arcs.js', '3152161668'],
  ['./js/data/benchmarks.js', '9c8ccc043c'],
  ['./js/data/events.js', '2eb8024905'],
  ['./js/data/exercises.js', 'f46c70e882'],
  ['./js/data/feet.js', 'e2ad0c7708'],
  ['./js/data/glyphs.js', '759d567b7d'],
  ['./js/data/help.js', 'cbbfeb14c8'],
  ['./js/data/ladders.js', '0ff55a37fc'],
  ['./js/data/lore.js', '027c05afd0'],
  ['./js/data/missions.js', '0627fb138e'],
  ['./js/data/mobility.js', '769b9581b8'],
  ['./js/data/story.js', 'af5f677572'],
  ['./js/data/temper-book1.js', '702959e7ed'],
  ['./js/data/temper.js', '57feef2490'],
  ['./js/data/wrist.js', 'b987751049'],
  ['./js/data/xp-config.js', '548e97b3fb'],
  ['./js/engine/arc.js', 'dc35015b7d'],
  ['./js/engine/arcsync.js', 'be0f6dd5b3'],
  ['./js/engine/arenastats.js', '7bb700efdf'],
  ['./js/engine/bmt.js', 'aa7be4de85'],
  ['./js/engine/boss.js', '49b2206b5d'],
  ['./js/engine/breath.js', 'e5ed6e3ed4'],
  ['./js/engine/cycle.js', '14b99599a9'],
  ['./js/engine/dates.js', 'af95a22180'],
  ['./js/engine/debrief.js', 'e9102f2bbf'],
  ['./js/engine/decide.js', '10791104a6'],
  ['./js/engine/equipment.js', 'b059eca27f'],
  ['./js/engine/events.js', 'c994ec4d8b'],
  ['./js/engine/feet.js', '4362885b91'],
  ['./js/engine/footwork.js', '5312e93ef9'],
  ['./js/engine/game.js', '63afc71dce'],
  ['./js/engine/history.js', 'dd0f8dca15'],
  ['./js/engine/journal.js', '7b48da0b12'],
  ['./js/engine/load.js', '9dd032dd5a'],
  ['./js/engine/mobility.js', '77f24a00e6'],
  ['./js/engine/pillars.js', '3a873b5175'],
  ['./js/engine/plan.js', 'c81ca2b625'],
  ['./js/engine/progress.js', 'ed666a1e11'],
  ['./js/engine/progression.js', '3c409d9bfb'],
  ['./js/engine/roundtimer.js', 'b55a25bdb5'],
  ['./js/engine/rulelog.js', '8c0b64d0a4'],
  ['./js/engine/session.js', '10e4efe9d9'],
  ['./js/engine/signals.js', '5c6c288bbe'],
  ['./js/engine/sleep.js', '1298971cf3'],
  ['./js/engine/stagnation.js', '762c9f8299'],
  ['./js/engine/story.js', '4739d6abee'],
  ['./js/engine/temper.js', '1b881e6639'],
  ['./js/engine/warmup.js', '917a5f0348'],
  ['./js/engine/wrist.js', 'cc8d0487a7'],
  ['./js/state.js', '385522a85a'],
  ['./js/store.js', '4479526259'],
  ['./js/ui/arena.js', 'aa1c0ac254'],
  ['./js/ui/arenastatus.js', 'dc404ff3d8'],
  ['./js/ui/atmosphere.js', 'e81ed51354'],
  ['./js/ui/benchmark.js', 'eefb866fc4'],
  ['./js/ui/bmt.js', '71247a3558'],
  ['./js/ui/check.js', '4d2de53514'],
  ['./js/ui/debrief.js', 'c8744bf115'],
  ['./js/ui/emblem.js', '2be5347b01'],
  ['./js/ui/equipment.js', 'ee8f54bd47'],
  ['./js/ui/feet.js', '7dcec93e91'],
  ['./js/ui/footwork.js', '3a4fe0d8fc'],
  ['./js/ui/hands.js', '70e8e7d092'],
  ['./js/ui/intro.js', 'c9a29037c1'],
  ['./js/ui/journal.js', '60600537d1'],
  ['./js/ui/kit.js', '142f3115a1'],
  ['./js/ui/kodex.js', 'd583262e95'],
  ['./js/ui/ladder.js', 'ee7c52a66f'],
  ['./js/ui/lore.js', '04a89c0aad'],
  ['./js/ui/onboarding.js', '0be60fd526'],
  ['./js/ui/overview.js', 'f3c3166b0e'],
  ['./js/ui/profile.js', 'cfc2cf6bb1'],
  ['./js/ui/review.js', '789ec1a610'],
  ['./js/ui/sound.js', 'f3064f3330'],
  ['./js/ui/storycard.js', '7062b3ef0b'],
  ['./js/ui/temper-audio.js', '52058b3ceb'],
  ['./js/ui/temper-clips.js', '6c7c4210de'],
  ['./js/ui/temper.js', '83990d981f'],
  ['./js/ui/today.js', '6542124c7d'],
  ['./js/ui/tour.js', '728bcd06e0'],
  ['./js/ui/training.js', '114514b48b'],
  ['./js/ui/voice.js', '3d841c8c66'],
  ['./js/ui/week.js', 'a3f8994aa1'],
  ['./js/ui/wrist.js', 'c536ea2932'],
  ['./js/version.js', '44c76b853c'],
  ['./manifest.webmanifest', '8cc9978b5d'],
];
const LORE = [
  ['./assets/lore/boss-fracture.webp', '764246f7dd'],
  ['./assets/lore/boss-hollow.webp', 'e4a75a9487'],
  ['./assets/lore/boss-rigor.webp', '3cf3d61d29'],
  ['./assets/lore/boss-torpor.webp', 'b001f81b9a'],
  ['./assets/lore/guardian-0-shade.webp', '19268ed435'],
  ['./assets/lore/guardian-1-blade.webp', '3c975a3f1c'],
  ['./assets/lore/guardian-2-warden.webp', '89bd780eb5'],
  ['./assets/lore/guardian-3-phantom.webp', '2796ea78e2'],
  ['./assets/lore/guardian-4-umbra.webp', 'f1e354f716'],
  ['./assets/lore/guardian-5-unbreakable.webp', 'c007527a85'],
  ['./assets/lore/nemesis-plateau.webp', '4371256d73'],
  ['./assets/temper/b1/b1-ci-1.mp3', '138e89075d'],
  ['./assets/temper/b1/b1-ci-2.mp3', '25dc5f19b2'],
  ['./assets/temper/b1/b1-ci-3.mp3', '9ada242002'],
  ['./assets/temper/b1/b1-ci-4.mp3', '7aeaa3e6c7'],
  ['./assets/temper/b1/b1-ci-5.mp3', '8f9ea5fd98'],
  ['./assets/temper/b1/b1-ci-6.mp3', '2bec6a6ed5'],
  ['./assets/temper/b1/b1-count-start.mp3', '1c64091b7e'],
  ['./assets/temper/b1/b1-e06-intro.mp3', 'a5465a7009'],
  ['./assets/temper/b1/b1-e06-outro.mp3', '2185251a67'],
  ['./assets/temper/b1/b1-e07-intro.mp3', '95abc673a3'],
  ['./assets/temper/b1/b1-e07-outro.mp3', 'd04dbc82ab'],
  ['./assets/temper/b1/b1-e08-c1.mp3', 'a8eb0dea5d'],
  ['./assets/temper/b1/b1-e08-c2.mp3', 'aee1deb7b5'],
  ['./assets/temper/b1/b1-e08-c3.mp3', '91685f0b92'],
  ['./assets/temper/b1/b1-e08-c4.mp3', 'f3b2cd1571'],
  ['./assets/temper/b1/b1-e08-intro.mp3', '8ee177ff13'],
  ['./assets/temper/b1/b1-e08-outro.mp3', 'd0e4adaa4e'],
  ['./assets/temper/b1/b1-e09-intro.mp3', 'b7fecbc548'],
  ['./assets/temper/b1/b1-e09-outro.mp3', '96c1e3ac07'],
  ['./assets/temper/b1/b1-e10-intro.mp3', '3d02a76ada'],
  ['./assets/temper/b1/b1-e10-outro.mp3', 'baedf59c5d'],
  ['./assets/temper/b1/b1-end-tone.mp3', 'd07202bc96'],
  ['./assets/temper/b1/b1-silent.mp3', '5180a32b27'],
  ['./assets/temper/b1/b1-thought-1.mp3', '651de43e75'],
  ['./assets/temper/b1/b1-thought-2.mp3', '8d5803ec78'],
  ['./assets/temper/b1/b1-wave-end.mp3', 'fae39bdd86'],
  ['./assets/temper/b1/b1-wave-peak.mp3', 'e0cdda4a07'],
  ['./assets/temper/b1/b1-wave-start.mp3', '06e7c197d8'],
];
const PARALLEL = 3;
const key = (url, h) => `${url}?h=${h}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function pool(items, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

async function get(url, mode) {
  for (let t = 0; ; t++) {
    const res = await fetch(url, { cache: mode });
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && t < 3) { await wait(3000 * 2 ** t); continue; }
    const err = new Error(`${res.status} ${url}`);
    err.status = res.status;
    throw err;
  }
}

async function precache() {
  const cache = await caches.open(VERSION);
  await pool(ASSETS, async ([url, h]) => {
    const k = key(url, h);
    if (await cache.match(k)) return;
    const old = await caches.match(k);
    await cache.put(k, old || await get(url, 'reload'));
  });
}

let loreBusy = null;
function cacheLore() {
  return loreBusy || (loreBusy = (async () => {
    const cache = await caches.open(LORE_CACHE);
    let blocked = false;
    await pool(LORE, async ([url, h]) => {
      const k = key(url, h);
      if (blocked || await cache.match(k)) return;
      try {
        const res = await get(url, 'no-cache');
        await cache.delete(url, { ignoreSearch: true });
        await cache.put(k, res);
      } catch (err) {
        if (err.status === 429) blocked = true; // gesperrt: Rest beim nächsten Start
      }
    });
  })().finally(() => { loreBusy = null; }));
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache()
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
    e.respondWith(caches.open(VERSION).then((c) => c.match('./index.html', { ignoreSearch: true }).then((r) => r || c.match('./', { ignoreSearch: true }))).then((r) => r || fetch(req)));
    return;
  }
  if (url.pathname.includes('/assets/lore/') || url.pathname.includes('/assets/temper/')) {
    e.respondWith(caches.open(LORE_CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  e.respondWith(caches.open(VERSION).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) c.put(req, res.clone());
    return res;
  }))));
});
