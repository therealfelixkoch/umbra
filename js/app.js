// UMBRA – App-Rahmen: Laden, Speichern, Routing, Event-Delegation, Modals.
import * as store from './store.js';
import { toDay } from './engine/dates.js';
import { ICONS, sys, esc } from './ui/kit.js';
import { unlockAudio, setSound } from './ui/sound.js';
import today from './ui/today.js';
import training from './ui/training.js';
import arena from './ui/arena.js';
import kodex from './ui/kodex.js';
import profile from './ui/profile.js';
import onboarding from './ui/onboarding.js';
import check from './ui/check.js';

const SCREENS = { heute: today, training, arena, kodex, profil: profile, onboarding, check };
const TABS = [['heute', 'Heute'], ['arena', 'Arena'], ['kodex', 'Kodex'], ['profil', 'Profil']];

const app = {
  data: null,
  route: 'heute',
  param: null,
  ui: {},     // flüchtiger UI-Zustand je Screen
  modal: null,
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
  render: () => render(),
};

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
  const showTabs = !['onboarding', 'training', 'check'].includes(route);
  root.innerHTML = `<main class="screen screen-${route}">${screen.render(ctx)}</main>${showTabs ? tabbar(route) : ''}`;
  screen.mount?.(ctx, root);
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
  'close-modal': () => ctx.modal(null),
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
  if (document.visibilityState === 'visible') render();
});

async function boot() {
  parseHash();
  try {
    app.data = await store.load();
  } catch (e) {
    root.innerHTML = `<main class="screen">${sys('Speicher nicht verfügbar', `<p>${esc(e.message)}</p>`)}</main>`;
    return;
  }
  setSound(app.data.settings.sound !== false);
  if (app.data.active && app.route === 'heute') app.route = 'training';
  render();
  store.requestPersist();
  // Lokal (Entwicklung) nur mit ?sw, damit Änderungen sofort sichtbar sind.
  const dev = location.hostname === 'localhost' && !location.search.includes('sw');
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !dev) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
