// Arena: Muay Thai in zwei Taps loggen, dazu ein Rundentimer mit Gong.
import { esc, stepper } from './kit.js';
import { logArena } from '../engine/plan.js';
import { addDays, formatDay } from '../engine/dates.js';
import { startTimer, advanceTo, totalMinutes, WARN_SEC } from '../engine/roundtimer.js';
import { gong, bell, clack, keepAwake } from './sound.js';

const DURATIONS = [45, 60, 90, 120];
const WORK = [[60, '1 min'], [120, '2 min'], [180, '3 min'], [300, '5 min']];
const REST = [[0, 'keine'], [30, '30 s'], [60, '1 min'], [90, '1:30']];
const DEFAULT_RT = { work: 180, rest: 60, rounds: 5 };

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Läuft auch weiter, wenn du kurz in einen anderen Tab wechselst.
let timer = null; // { cfg, st, paused, left, warned }
let ticker = null;
let ctxRef = null;

function play(event) {
  if (event === 'gong') gong();
  if (event === 'bell') bell();
}

function tick() {
  if (!timer || timer.paused) return;
  const now = Date.now();
  const { st, event } = advanceTo(timer.st, timer.cfg, now);
  if (event) {
    timer.st = st;
    timer.warned = false;
    play(event);
    if (st.phase === 'done') stopTicker();
    if (location.hash.startsWith('#arena')) ctxRef?.render();
    return;
  }
  const left = st.endAt - now;
  if (st.phase === 'work' && !timer.warned && left <= WARN_SEC * 1000 && timer.cfg.work > 30) {
    timer.warned = true;
    clack();
  }
  const el = document.querySelector('[data-rt-clock]');
  if (el) el.textContent = fmt(left);
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(tick, 200);
  keepAwake(true);
}

function stopTicker() {
  clearInterval(ticker);
  ticker = null;
  keepAwake(false);
}

function timerView() {
  const { cfg, st } = timer;
  if (st.phase === 'done') {
    return `<section class="rt done"><small>Arena-Timer</small><b class="rt-phase">Fertig</b>
      <p class="muted">${st.round} ${st.round === 1 ? 'Runde' : 'Runden'} à ${fmt(cfg.work * 1000)}</p></section>
      <div class="label">Gleich eintragen?</div>
      <div class="arena-pick">
        <button class="arena-btn" data-act="rt-log" data-v="light"><b>Locker</b><small>Technik</small></button>
        <button class="arena-btn hard" data-act="rt-log" data-v="hard"><b>Hart</b><small>Sparring</small></button>
      </div>
      <button class="btn ghost wide" data-act="rt-close">Ohne Eintrag schließen</button>`;
  }
  const label = st.phase === 'prep' ? 'Bereit' : st.phase === 'rest' ? 'Pause' : `Runde ${st.round}`;
  const left = timer.paused ? timer.left : st.endAt - Date.now();
  return `<section class="rt ${st.phase}">
      <small>${st.phase === 'rest' ? `gleich Runde ${st.round + 1} von ${cfg.rounds}` : `von ${cfg.rounds} Runden`}</small>
      <b class="rt-phase">${label}</b>
      <b class="rt-clock num" data-rt-clock>${fmt(left)}</b>
      <div class="rounds">${Array.from({ length: cfg.rounds }, (_, k) =>
        `<i class="${k < st.round - (st.phase === 'work' ? 1 : 0) ? 'on' : ''}"></i>`).join('')}</div>
    </section>
    <div class="row gap">
      <button class="btn grow big" data-act="rt-pause">${timer.paused ? 'Weiter' : 'Pause'}</button>
      <button class="btn big" data-act="rt-skip" aria-label="Phase überspringen">⏭</button>
      <button class="btn big danger" data-act="rt-stop" aria-label="Stopp">■</button>
    </div>
    <p class="muted small center">Bildschirm bleibt an. Bei gesperrtem iPhone pausiert der Timer.</p>`;
}

function setupView(c) {
  const rt = c.ui.rt || (c.ui.rt = { ...DEFAULT_RT, ...(c.data.settings.roundTimer || {}) });
  const chip = (act, v, label, on) => `<button class="chip${on ? ' on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
  return `<section class="card">
      <div class="label">Rundentimer</div>
      <div class="muted small">Runde</div>
      <div class="chips">${WORK.map(([v, l]) => chip('rt-work', v, l, rt.work === v)).join('')}</div>
      <div class="muted small">Pause</div>
      <div class="chips">${REST.map(([v, l]) => chip('rt-rest', v, l, rt.rest === v)).join('')}</div>
      <div class="field"><span>Runden</span>${stepper('rt-rounds', rt.rounds, '')}</div>
      <button class="btn primary wide big" data-act="rt-start">Timer starten</button>
      <p class="muted small">Gong am Rundenende, Klacken 10 s vorher, Glocke zum Start. Stummschalter am iPhone aus.</p>
    </section>`;
}

export default {
  render(c) {
    ctxRef = c;
    if (timer) return `<h1 class="h">Arena</h1>${timerView()}`;
    const f = c.ui.arena || (c.ui.arena = { minutes: 60, when: 'today' });
    const recent = c.data.sessions.filter((s) => s.kind === 'arena').slice(-8).reverse();
    return `<h1 class="h">Arena</h1>
      ${setupView(c)}
      <div class="label">Eintragen</div>
      <div class="arena-pick">
        <button class="arena-btn${f.intensity === 'light' ? ' on' : ''}" data-act="a-int" data-v="light"><b>Locker</b><small>Technik</small></button>
        <button class="arena-btn hard${f.intensity === 'hard' ? ' on' : ''}" data-act="a-int" data-v="hard"><b>Hart</b><small>Sparring</small></button>
      </div>
      <div class="label">Dauer</div>
      <div class="chips">${DURATIONS.map((m) => `<button class="chip${f.minutes === m ? ' on' : ''}" data-act="a-min" data-v="${m}">${m} min</button>`).join('')}</div>
      <div class="label">Wann</div>
      <div class="chips"><button class="chip${f.when === 'today' ? ' on' : ''}" data-act="a-when" data-v="today">Heute</button><button class="chip${f.when === 'yesterday' ? ' on' : ''}" data-act="a-when" data-v="yesterday">Gestern</button></div>
      <button class="btn primary wide big" data-act="a-save" ${f.intensity ? '' : 'disabled'}>Arena eintragen</button>
      ${recent.length ? `<section class="card"><div class="label">Zuletzt</div>${recent.map((s) =>
        `<div class="done-row"><span>${formatDay(s.day)} · ${s.intensity === 'hard' ? 'Sparring' : 'Technik'} · ${s.minutes} min</span><button class="x" data-act="a-del" data-id="${esc(s.id)}" aria-label="Löschen">×</button></div>`).join('')}</section>` : ''}`;
  },
  actions: {
    'a-int': (c, d) => { c.ui.arena.intensity = d.v; c.render(); },
    'a-min': (c, d) => { c.ui.arena.minutes = Number(d.v); c.render(); },
    'a-when': (c, d) => { c.ui.arena.when = d.v; c.render(); },
    'a-save': (c) => {
      const f = c.ui.arena;
      const day = f.when === 'yesterday' ? addDays(c.today(), -1) : c.today();
      save(c, day, f.intensity, f.minutes);
      c.ui.arena = { minutes: 60, when: 'today' };
    },
    'a-del': (c, d) => c.update((data) => ({ ...data, sessions: data.sessions.filter((s) => s.id !== d.id) })),

    'rt-work': (c, d) => { c.ui.rt.work = Number(d.v); c.render(); },
    'rt-rest': (c, d) => { c.ui.rt.rest = Number(d.v); c.render(); },
    'rt-rounds': (c, d) => { c.ui.rt.rounds = Math.max(1, Math.min(30, c.ui.rt.rounds + Number(d.dir))); c.render(); },
    'rt-start': (c) => {
      const cfg = { ...c.ui.rt };
      timer = { cfg, st: startTimer(cfg, Date.now()), paused: false, warned: false };
      startTicker();
      // Einstellung merken
      c.update((data) => ({ ...data, settings: { ...data.settings, roundTimer: cfg } }));
    },
    'rt-pause': (c) => {
      if (timer.paused) {
        timer.st = { ...timer.st, endAt: Date.now() + timer.left };
        timer.paused = false;
      } else {
        timer.left = timer.st.endAt - Date.now();
        timer.paused = true;
      }
      c.render();
    },
    'rt-skip': () => {
      if (timer.paused) timer.paused = false;
      timer.st = { ...timer.st, endAt: Date.now() };
      tick();
    },
    'rt-stop': (c) => {
      const done = timer.st.round - (timer.st.phase === 'work' ? 1 : 0);
      timer.st = { phase: 'done', round: Math.max(0, done), endAt: null };
      stopTicker();
      if (!done) timer = null;
      c.render();
    },
    'rt-log': (c, d) => {
      const minutes = totalMinutes(timer.cfg, timer.st.round);
      timer = null;
      save(c, c.today(), d.v, minutes);
    },
    'rt-close': (c) => { timer = null; c.render(); },
  },
};

function save(c, day, intensity, minutes) {
  let xp = 0;
  c.update((data) => {
    const r = logArena(data, { day, intensity, minutes });
    xp = r.session.xp;
    return r.data;
  });
  c.system('Arena verbucht.', `<div class="xp-gain num">+${xp} XP</div><p class="muted">${minutes} min · ${intensity === 'hard' ? 'Morgen plant das System entsprechend.' : 'Saubere Technik zahlt sich aus.'}</p>`);
}
