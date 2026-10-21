// UMBRA – App-Rahmen: Laden, Speichern, Routing, Event-Delegation, Modals.
import * as store from './store.js';
import { toDay } from './engine/dates.js';
import { ICONS, sys, esc } from './ui/kit.js';
import { unlockAudio, setSound } from './ui/sound.js';
import { checkProgress } from './engine/progress.js';
import { syncData } from './engine/arcsync.js';
import { arcOf, WEEK_PLAN } from './data/arcs.js';
import { victoryPanels, retreatPanels, nemesisPanels } from './engine/story.js';
import { debriefStats } from './engine/debrief.js';
import { comicPanels, bindPanels } from './ui/lore.js';
import { XP_CONFIG } from './data/xp-config.js';
import { APP_VERSION } from './version.js';
import today from './ui/today.js';
import training from './ui/training.js';
import arena from './ui/arena.js';
import kodex from './ui/kodex.js';
import profile from './ui/profile.js';
import onboarding from './ui/onboarding.js';
import check from './ui/check.js';
import review from './ui/review.js';
import debrief from './ui/debrief.js';
import intro from './ui/intro.js';
import temper from './ui/temper.js';

const SCREENS = { heute: today, training, arena, kodex, profil: profile, onboarding, check, review, debrief, intro, temper };
const TABS = [['heute', 'Heute'], ['arena', 'Arena'], ['kodex', 'Kodex'], ['profil', 'Profil']];

const app = {
  data: null,
  route: 'heute',
  param: null,
  ui: {},     // flüchtiger UI-Zustand je Screen
  modal: null,
  events: [], // Erfolge, die nach dem aktuellen Modal angezeigt werden
  lastKK: null,
};

const root = document.getElementById('app');
const modalEl = document.getElementById('modal');

export const ctx = {
  get data() { return app.data; },
  get ui() { return app.ui; },
  get param() { return app.param; },
  today: () => toDay(),
  update(fn) {
    const next = fn(app.data);
    if (next) app.data = next;
    sync();
    const r = checkProgress(app.data, toDay());
    if (r.events.length) {
      app.data = r.data;
      app.events.push(...r.events);
      setTimeout(flushEvents, 60);
    }
    store.save(app.data);
    setSound(app.data.settings.sound !== false);
    render();
  },
  setUi(patch) {
    Object.assign(app.ui, patch);
    render();
  },
  go(route, param = null) {
    location.hash = param ? `${route}/${param}` : route;
  },
  modal(html) {
    app.modal = html;
    renderModal();
  },
  system(title, body, buttons = [['close-modal', 'Verstanden']], tone = 'sys') {
    ctx.modal(sys(title, `${body}<div class="row gap">${buttons.map(([act, label, extra = '']) =>
      `<button class="btn ${extra}" data-act="${act}">${esc(label)}</button>`).join('')}</div>`, { tone, cls: 'pop' }));
  },
  // Comic-Panels im Modal (Boss-Sieg, Rückzug, Nemesis, Arc-Wechsel)
  panels(title, panels, tone = 'sys') {
    ctx.modal(sys(title, `${comicPanels(panels, 'modal-panels')}<div class="row gap"><button class="btn primary" data-act="close-modal">Weiter</button></div>`, { tone, cls: 'pop panels-modal' }));
    bindPanels(modalEl);
  },
  render: () => render(),
};

// App-Dateien neu laden: Service Worker abmelden, Datei-Caches leeren (Lore-Bilder bleiben), neu starten.
// Deine Trainingsdaten liegen in IndexedDB und werden dabei nicht angefasst.
export async function repairApp() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== 'umbra-lore').map((k) => caches.delete(k)));
  } catch { /* nicht verfügbar */ }
  location.replace(location.pathname + location.hash);
}
window.__umbraRepair = repairApp;

// Passen JavaScript- und CSS-Stand nach einem Update nicht zusammen (gemischter Cache), einmal selbst reparieren.
function versionMismatch() {
  const css = getComputedStyle(document.documentElement).getPropertyValue('--app-version').trim().replace(/["']/g, '');
  return css !== APP_VERSION;
}

function parseHash() {
  const [route, param] = location.hash.replace(/^#/, '').split('/');
  app.route = SCREENS[route] ? route : 'heute';
  app.param = param ? decodeURIComponent(param) : null;
}

function render() {
  if (!app.data) return;
  let route = app.route;
  if (!app.data.settings.onboarded) route = 'onboarding';
  const screen = SCREENS[route];
  const showTabs = !['onboarding', 'training', 'check', 'review', 'debrief', 'intro', 'temper'].includes(route);
  root.innerHTML = `<main class="screen screen-${route}">${screen.render(ctx)}</main>${showTabs ? tabbar(route) : ''}`;
  screen.mount?.(ctx, root);
  animateKK();
}

// Kampfkraft zählt sichtbar hoch, wenn sie gestiegen ist.
function animateKK() {
  const el = root.querySelector('[data-kk]');
  if (!el) return;
  const to = Number(el.dataset.kk);
  const from = app.lastKK;
  app.lastKK = to;
  if (from == null || to <= from || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const t0 = performance.now();
  el.classList.add('kk-up');
  const step = (t) => {
    const p = Math.min(1, (t - t0) / 1100);
    const v = Math.round(from + (to - from) * (1 - (1 - p) ** 3));
    el.textContent = v.toLocaleString('de-DE');
    if (p < 1) requestAnimationFrame(step);
    else setTimeout(() => el.classList.remove('kk-up'), 600);
  };
  requestAnimationFrame(step);
}

// Arc-Wochen weiterzählen. Liefert Ereignisse für Systemmeldungen.
function sync() {
  const r = syncData(app.data, toDay());
  if (!r.changed) return false;
  app.data = r.data;
  for (const e of r.events) {
    if (['arc_complete', 'week_done', 'week_repeat', 'boss_defeated', 'boss_retreat', 'nemesis_appears', 'nemesis_fades'].includes(e.type)) app.events.push(e);
  }
  // Nur die letzte Wochenmeldung zeigen, Arc-Wechsel immer.
  const keep = ['ascension', 'quest', 'boss_defeated', 'boss_retreat', 'nemesis_appears', 'nemesis_fades'];
  const arcs = app.events.filter((e) => e.type === 'arc_complete');
  const weeks = app.events.filter((e) => e.type !== 'arc_complete' && !keep.includes(e.type));
  app.events = [...app.events.filter((e) => keep.includes(e.type)), ...arcs.slice(-1), ...(arcs.length ? [] : weeks.slice(-1))];
  setTimeout(flushEvents, 60);
  return true;
}

function flushEvents() {
  if (app.modal || !app.events.length) return;
  const ev = app.events.shift();
  const today = toDay();
  if (ev.type === 'boss_defeated' || ev.type === 'boss_retreat') {
    const st = debriefStats(app.data, ev.n, today) || {};
    const vars = { missions: st.missions, records: st.records, arena: st.arena, flow: st.flowDays };
    const p = ev.type === 'boss_defeated' ? victoryPanels(app.data, ev.n, vars) : retreatPanels(app.data, ev.n, vars);
    ctx.panels(ev.type === 'boss_defeated' ? 'Sieg' : 'Rückzug', p, ev.type === 'boss_defeated' ? 'gold aura' : 'calm');
    return;
  }
  if (ev.type === 'nemesis_appears' || ev.type === 'nemesis_fades') {
    ctx.panels('Nemesis', nemesisPanels(ev.type === 'nemesis_fades' ? 'fades' : 'appears'), ev.type === 'nemesis_fades' ? 'gold' : 'warn');
    return;
  }
  if (ev.type === 'arc_complete') {
    const a = arcOf(app.data.engine.arc.n);
    ctx.system(`ARC ${a.id} · ${a.name}`, `<p class="reason">${esc(a.focus)}.</p><p class="muted">Ein neuer Arc beginnt. Das Intro wartet auf „Heute“.</p>`,
      [['close-modal', 'Weiter', 'primary']], 'gold aura');
    return;
  }
  if (ev.type === 'week_done') {
    const w = WEEK_PLAN[ev.week];
    ctx.system(`Arc-Woche ${ev.week}`, `<p class="reason">${esc(w.label)}. RIR-Ziel ${w.rir}.</p>${w.deload ? '<p class="muted">Deload-Woche: halbe Sätze, Mobility-Check wiederholen.</p>' : ''}`);
    return;
  }
  if (ev.type === 'week_repeat') {
    ctx.system(`Arc-Woche ${ev.week}`, '<p class="muted">Letzte Woche hatte weniger als zwei volle Missionen. Die Woche läuft noch einmal. Kein Problem.</p>', undefined, 'calm');
    return;
  }
  if (ev.type === 'ascension') {
    const a = ev.ascension;
    ctx.system('Ascension freigeschaltet', `<div class="asc-big" style="--aura:${a.aura}"><span>◆</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div><div class="xp-gain num">+${XP_CONFIG.sources.ascension} XP</div>`,
      [['close-modal', 'Weiter', 'primary']], 'gold aura');
  } else if (ev.type === 'quest') {
    ctx.system('Quest erfüllt', `<p class="reason">${esc(ev.quest.title)}: ${esc(ev.quest.desc)}.</p><div class="xp-gain num">+${XP_CONFIG.sources.quest} XP</div>`,
      [['close-modal', 'Weiter', 'primary']], 'gold');
  }
}

function tabbar(route) {
  const active = app.data.active;
  return `<nav class="tabbar">${TABS.map(([id, label]) =>
    `<button class="tab${route === id ? ' on' : ''}" data-act="go" data-to="${id}">${ICONS[id]}<span>${label}</span>${id === 'heute' && active ? '<i class="dot"></i>' : ''}</button>`).join('')}</nav>`;
}

function renderModal() {
  modalEl.innerHTML = app.modal ? `<div class="backdrop" data-act="close-modal"></div><div class="modal-body">${app.modal}</div>` : '';
  modalEl.classList.toggle('open', !!app.modal);
}

const GLOBAL = {
  go: (c, d) => c.go(d.to, d.param),
  'close-modal': () => {
    ctx.modal(null);
    setTimeout(flushEvents, 250);
  },
};

function currentScreen() {
  return SCREENS[app.data?.settings.onboarded ? app.route : 'onboarding'];
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  unlockAudio();
  const act = el.dataset.act;
  const handler = currentScreen().actions?.[act] || GLOBAL[act];
  if (handler) {
    e.preventDefault();
    handler(ctx, el.dataset, el);
  }
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el) currentScreen().onInput?.(ctx, el.dataset.input, el.value, el);
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) currentScreen().onChange?.(ctx, el.dataset.change, el);
});

window.addEventListener('hashchange', () => {
  parseHash();
  window.scrollTo(0, 0);
  render();
});

// Neuer Tag während die App offen ist → neu zeichnen.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !app.data) return;
  if (sync()) store.save(app.data);
  render();
});

async function boot() {
  parseHash();
  const dev = location.hostname === 'localhost' && !location.search.includes('sw');
  if (!dev && versionMismatch()) {
    let tried = false;
    try { tried = sessionStorage.getItem('umbra-repair') === APP_VERSION; sessionStorage.setItem('umbra-repair', APP_VERSION); } catch { /* privat */ }
    if (!tried) { repairApp(); return; }
  }
  try {
    app.data = await store.load();
  } catch (e) {
    root.innerHTML = `<main class="screen">${sys('Speicher nicht verfügbar', `<p>${esc(e.message)}</p>`)}</main>`;
    return;
  }
  setSound(app.data.settings.sound !== false);
  if (app.data.active && app.route === 'heute') app.route = 'training';
  if (sync()) store.save(app.data);
  render();
  store.requestPersist();
  // Lokal (Entwicklung) nur mit ?sw, damit Änderungen sofort sichtbar sind.
  document.documentElement.dataset.booted = APP_VERSION;
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !dev) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
    // Neu hochgeladene Lore-Bilder für offline nachladen (fehlende werden übersprungen).
    navigator.serviceWorker.ready.then((r) => { if (navigator.onLine) r.active?.postMessage({ type: 'cache-lore' }); }).catch(() => {});
  }
}

boot();
