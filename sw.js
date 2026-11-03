// Service Worker – erzeugt von tools/build_sw.py, nicht von Hand ändern.
// Jede Datei steht mit Inhalts-Hash in der Liste und liegt im Cache unter "pfad?h=<hash>".
// Beim Update wird nur geholt, was sich geändert hat – Unverändertes wird aus dem alten Cache übernommen.
// Geladen wird gedrosselt (wenige Anfragen gleichzeitig), bei 429/5xx mit Wartezeit erneut versucht:
// Abgefragt wird "pfad?h=<hash>": So liefert auch das GitHub-CDN (cacht ~10 min) garantiert den neuen Stand.
// GitHub Pages sperrt sonst die IP ("Rate limit exceeded") und das Update bleibt hängen.
// App-Dateien: komplett vorab gecacht (Versionswechsel = neuer Cache), ausgeliefert nur aus der eigenen Version.
// Lore-Bilder und TEMPER-Clips: eigener Cache, fehlende brechen die Installation nicht ab.
// App-Dateien werden gegen ihren Hash geprüft: Liegt auf GitHub noch ein alter Stand (z. B. Datei im falschen Ordner
// hochgeladen), bricht die Installation ab und die bisherige Version läuft weiter, statt alte und neue Dateien zu mischen.
const VERSION = 'v42';
const LORE_CACHE = 'umbra-lore';
const ASSETS = [
  ['./', '4c866ea0de'],
  ['./css/app.css', '0927944511'],
  ['./fonts/oxanium.woff2', 'd2992b4edf'],
  ['./icons/apple-touch-icon.png', '70e8120199'],
  ['./icons/favicon-64.png', '8dfed88676'],
  ['./icons/icon-192.png', '2809473315'],
  ['./icons/icon-512-maskable.png', '8ad13e111b'],
  ['./icons/icon-512.png', 'bac882737b'],
  ['./icons/logo.png', '99012d8d2e'],
  ['./index.html', '4c866ea0de'],
  ['./js/app.js', '1f586d1e74'],
  ['./js/data/arcs.js', '8b3a9b2be1'],
  ['./js/data/benchmarks.js', '2a0965c4db'],
  ['./js/data/events.js', '2ef255efd1'],
  ['./js/data/exercises.js', 'ff032ac54b'],
  ['./js/data/feet.js', '620be1a94d'],
  ['./js/data/glyphs.js', '871054fecf'],
  ['./js/data/help.js', '2e50bcad38'],
  ['./js/data/ladders.js', 'bf2393487e'],
  ['./js/data/lore.js', '5b89527a02'],
  ['./js/data/missions.js', '29318ee615'],
  ['./js/data/mobility.js', 'cf431a5bb4'],
  ['./js/data/story.js', 'd5715fb604'],
  ['./js/data/temper-book1.js', 'c94d5fd925'],
  ['./js/data/temper.js', '3e873c29b3'],
  ['./js/data/wrist.js', '471bcb6756'],
  ['./js/data/xp-config.js', '56a28c5f37'],
  ['./js/engine/arc.js', '9a4b5465c1'],
  ['./js/engine/arcsync.js', 'b92513523e'],
  ['./js/engine/arenastats.js', '23f8a296cd'],
  ['./js/engine/bmt.js', '043210c33e'],
  ['./js/engine/boss.js', 'd752b51ad5'],
  ['./js/engine/breath.js', 'd3516c09f7'],
  ['./js/engine/cycle.js', '4dea8be1ef'],
  ['./js/engine/dates.js', '2f7191f5da'],
  ['./js/engine/debrief.js', '98acaffea8'],
  ['./js/engine/decide.js', '9644c0ee71'],
  ['./js/engine/equipment.js', '4bef8f4315'],
  ['./js/engine/events.js', '4710a5fc02'],
  ['./js/engine/feet.js', 'da4a3678a7'],
  ['./js/engine/footwork.js', '124537e924'],
  ['./js/engine/game.js', '4044453ea0'],
  ['./js/engine/history.js', '08d1ca687e'],
  ['./js/engine/journal.js', 'be8652d106'],
  ['./js/engine/load.js', '8efeb286c2'],
  ['./js/engine/mobility.js', 'f15c7dbf37'],
  ['./js/engine/pillars.js', '73acb9ac97'],
  ['./js/engine/plan.js', '5e7a731e62'],
  ['./js/engine/progress.js', 'ff7e6b604e'],
  ['./js/engine/progression.js', 'df71ca8d2b'],
  ['./js/engine/roundtimer.js', '4a76a04248'],
  ['./js/engine/rulelog.js', '097bd6974b'],
  ['./js/engine/session.js', 'db99cbec62'],
  ['./js/engine/signals.js', 'c72cc138ae'],
  ['./js/engine/sleep.js', '7a5d531e4c'],
  ['./js/engine/stagnation.js', '435ab26b72'],
  ['./js/engine/story.js', '462a2424b2'],
  ['./js/engine/temper.js', '7c43f09863'],
  ['./js/engine/warmup.js', '52333cea44'],
  ['./js/engine/wrist.js', 'bd33e52ffc'],
  ['./js/state.js', 'e4575d7086'],
  ['./js/store.js', 'ecede7b481'],
  ['./js/ui/arena.js', '1a09d44f08'],
  ['./js/ui/arenastatus.js', '95421e4a0a'],
  ['./js/ui/atmosphere.js', '2ff6653ec2'],
  ['./js/ui/benchmark.js', '6358b7b174'],
  ['./js/ui/bmt.js', '057815f07f'],
  ['./js/ui/check.js', '127c2a2aba'],
  ['./js/ui/debrief.js', 'f88cc9f867'],
  ['./js/ui/emblem.js', '214123cf2d'],
  ['./js/ui/equipment.js', '0a577ee72a'],
  ['./js/ui/feet.js', '6cf2f84ab1'],
  ['./js/ui/footwork.js', '0239e9c9ce'],
  ['./js/ui/hands.js', '314ac6cfc6'],
  ['./js/ui/intro.js', 'ef00c03bf8'],
  ['./js/ui/journal.js', '9f8b753b66'],
  ['./js/ui/kit.js', '1cbb24af3d'],
  ['./js/ui/kodex.js', '6110210699'],
  ['./js/ui/ladder.js', 'daf5022812'],
  ['./js/ui/lore.js', 'cf66d2b029'],
  ['./js/ui/onboarding.js', 'fe8e19f454'],
  ['./js/ui/overview.js', 'd74b6eec33'],
  ['./js/ui/profile.js', '103babe6c3'],
  ['./js/ui/review.js', 'de877e4a2e'],
  ['./js/ui/sound.js', '596f0469f5'],
  ['./js/ui/storycard.js', 'd1caa78aa5'],
  ['./js/ui/temper-audio.js', '91d0f3d99a'],
  ['./js/ui/temper-clips.js', '19de4e5104'],
  ['./js/ui/temper.js', '3b59c27ace'],
  ['./js/ui/today.js', '2347104231'],
  ['./js/ui/tour.js', '3bbdb39aec'],
  ['./js/ui/training.js', '2607c0fbb2'],
  ['./js/ui/voice.js', '16e6fe1d34'],
  ['./js/ui/week.js', '52ca0bd3b8'],
  ['./js/ui/wrist.js', '0e9158e5e8'],
  ['./js/version.js', 'd4a485395d'],
  ['./manifest.webmanifest', '1b61b51494'],
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

async function sha(res) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', await res.clone().arrayBuffer()));
  return Array.from(d.slice(0, 5), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function precache() {
  const cache = await caches.open(VERSION);
  await pool(ASSETS, async ([url, h]) => {
    const k = key(url, h);
    if (await cache.match(k)) return;
    const old = await caches.match(k);
    if (old && await sha(old) === h) { await cache.put(k, old); return; }
    let res = await get(k, 'reload');
    if (await sha(res) !== h) res = await get(`${k}&t=${Date.now()}`, 'reload'); // CDN noch nicht aktuell
    if (await sha(res) !== h) throw new Error(`Falscher Stand auf dem Server: ${url}`);
    await cache.put(k, res);
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
        const res = await get(k, 'no-cache');
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
