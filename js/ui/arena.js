// ARENA: Muay Thai loggen (Gefühl 1–10, Dauer in h) und ein eigenständiger Rundentimer mit Gong.
import { esc, stepper } from './kit.js';
import { logArena, HARD_RPE } from '../engine/plan.js';
import { addDays, formatDay } from '../engine/dates.js';
import { startTimer, advanceTo, totalMinutes, WARN_SEC } from '../engine/roundtimer.js';
import { ringBell, clack, keepAwake } from './sound.js';
import { footworkView, footworkActions, isRunning as footworkRunning } from './footwork.js';
import { bmtView, bmtActions, bmtInput } from './bmt.js';
import { BMT_NAME } from '../engine/bmt.js';
import { ARENA_CONTENT } from '../engine/arenastats.js';
import { painPrompt } from './wrist.js';
import { arenaStatusView, arenaStatusActions, arenaStatusInput } from './arenastatus.js';

const RPE_LABEL = { 1: 'sehr locker', 3: 'locker', 5: 'mittel', 7: 'hart', 9: 'sehr hart', 10: 'maximal' };
const hours = (min) => `${(min / 60).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} h`;
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
  if (event === 'gong') ringBell(3);
  if (event === 'bell') ringBell(1);
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
    return `<section class="rt done"><small>ARENA-Timer</small><b class="rt-phase">Fertig</b>
      <p class="muted">${st.round} ${st.round === 1 ? 'Runde' : 'Runden'} à ${fmt(cfg.work * 1000)}</p></section>
      <button class="btn primary wide big" data-act="rt-log">Einheit eintragen</button>
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
      <p class="muted small">Ding-Ding-Ding am Rundenende, Klacken 10 s vorher, ein Ding zum Start. Stummschalter am iPhone aus.</p>
    </section>`;
}

const screen = {
  render(c) {
    ctxRef = c;
    const tab = c.ui.atab || (timer ? 'timer' : 'log');
    const seg = `<div class="seg"><button class="${tab === 'log' ? 'on' : ''}" data-act="atab" data-v="log">Eintragen</button><button class="${tab === 'bmt' ? 'on' : ''}" data-act="atab" data-v="bmt">BMT</button><button class="${tab === 'timer' ? 'on' : ''}" data-act="atab" data-v="timer">Timer${timer && timer.st.phase !== 'done' ? ' ●' : ''}</button><button class="${tab === 'footwork' ? 'on' : ''}" data-act="atab" data-v="footwork">Footwork${footworkRunning() ? ' ●' : ''}</button><button class="${tab === 'status' ? 'on' : ''}" data-act="atab" data-v="status">Status</button></div>`;
    if (tab === 'timer') return `<h1 class="h">ARENA</h1>${seg}${timer ? timerView() : setupView(c)}`;
    if (tab === 'footwork') return `<h1 class="h">ARENA</h1>${seg}${footworkView(c)}`;
    if (tab === 'bmt') return `<h1 class="h">ARENA</h1>${seg}${bmtView(c)}`;
    if (tab === 'status') return `<h1 class="h">ARENA</h1>${seg}${arenaStatusView(c)}`;

    const f = c.ui.arena || (c.ui.arena = { minutes: 60, when: 'today' });
    const recent = c.data.sessions.filter((s) => s.kind === 'arena').slice(-8).reverse();
    const rpeBtn = (n) => `<button class="rpe${f.rpe === n ? ' on' : ''}${n >= HARD_RPE ? ' hard' : ''}" data-act="a-rpe" data-v="${n}">${n}</button>`;
    return `<h1 class="h">ARENA</h1>${seg}
      <section class="card">
        ${f.bmt ? `<div class="bmt-link"><span>${BMT_NAME} · Woche ${f.bmt.week}</span><button class="x" data-act="a-unlink" aria-label="Verknüpfung lösen">×</button></div>` : ''}
        <div class="label">Intensität (Gefühl)</div>
        <div class="rpe-grid">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rpeBtn).join('')}</div>
        <p class="muted small">${f.rpe ? `${f.rpe} · ${RPE_LABEL[f.rpe] || RPE_LABEL[f.rpe - 1]}${f.rpe >= HARD_RPE ? ' · zählt als harte Einheit' : ''}` : `1 = locker Technik … 10 = Vollgas. Ab ${HARD_RPE} plant die App wie nach Sparring.`}</p>
        <div class="label">Dauer gesamt</div>
        <div class="field"><span class="muted">Zeit der Einheit</span>${stepper('a-dur', hours(f.minutes), '')}</div>
        <div class="label">Inhalte <small class="muted">optional</small></div>
        <div class="chips">${ARENA_CONTENT.map((k) => `<button class="chip${(f.content || []).includes(k) ? ' on' : ''}" data-act="a-content" data-v="${k}">${k}</button>`).join('')}</div>
        ${(f.content || []).includes('Sparring') ? `<div class="field"><span class="muted">Sparringsrunden</span>${stepper('a-spar', `${f.sparRounds || 0}`, '')}</div>` : ''}
        <input class="search" data-input="a-focus" placeholder="Fokus oder Notiz (optional)" value="${esc(f.focus || '')}" autocomplete="off">
        <div class="label">Wann</div>
        <div class="chips"><button class="chip${f.when === 'today' ? ' on' : ''}" data-act="a-when" data-v="today">Heute</button><button class="chip${f.when === 'yesterday' ? ' on' : ''}" data-act="a-when" data-v="yesterday">Gestern</button></div>
      </section>
      <button class="btn primary wide big" data-act="a-save" ${f.rpe ? '' : 'disabled'}>ARENA eintragen</button>
      ${recent.length ? `<section class="card"><div class="label">Zuletzt</div>${recent.map((s) =>
        `<div class="done-row"><span>${formatDay(s.day)}${s.bmt ? ` · BMT W${s.bmt.week}` : ''} · ${s.rpe ? `Intensität ${s.rpe}` : s.intensity === 'hard' ? 'Sparring' : 'Technik'} · ${hours(s.minutes)}</span><button class="x" data-act="a-del" data-id="${esc(s.id)}" aria-label="Löschen">×</button></div>`).join('')}</section>` : ''}`;
  },
  onInput(c, name, value) {
    bmtInput(c, name, value);
    arenaStatusInput(c, name, value);
    if (name === 'a-focus' && c.ui.arena) c.ui.arena.focus = value.slice(0, 160);
  },
  actions: {
    ...footworkActions,
    ...bmtActions,
    ...arenaStatusActions,
    'a-content': (c, d) => {
      const cur = c.ui.arena.content || [];
      c.ui.arena.content = cur.includes(d.v) ? cur.filter((x) => x !== d.v) : [...cur, d.v];
      c.render();
    },
    'a-spar': (c, d) => { c.ui.arena.sparRounds = Math.max(0, Math.min(30, (c.ui.arena.sparRounds || 0) + Number(d.dir))); c.render(); },
    // Block mit Zeitangabe → Rundentimer mit 1 min Pause
    'bmt-timer': (c, d) => {
      c.ui.rt = { work: Number(d.work), rest: 60, rounds: Number(d.rounds) };
      c.ui.atab = 'timer';
      screen.actions['rt-start'](c);
    },
    // Footwork-Block → Footwork-Drill mit dieser Dauer (Start per Tipp, wegen der Sprachausgabe)
    'bmt-footwork': (c, d) => {
      const min = Number(d.min) || 3;
      c.ui.fw = { ...(c.ui.fw || { tempo: 'mid' }), duration: Math.min(180, Math.max(60, Math.round(min * 2) * 30)), rounds: Number(d.rounds) || 1 };
      c.setUi({ atab: 'footwork' });
    },
    // ARENA-Eintrag mit dieser BMT-Woche verknüpfen
    'bmt-log': (c, d) => {
      const w = (c.data.bmt?.weeks || []).find((x) => x.id === d.id);
      c.ui.arena = { ...(c.ui.arena || { minutes: 60, when: 'today' }), bmt: w ? { weekId: w.id, week: w.number } : null };
      c.setUi({ atab: 'log' });
    },
    atab: (c, d) => c.setUi({ atab: d.v }),
    'a-rpe': (c, d) => { c.ui.arena.rpe = Number(d.v); c.render(); },
    'a-dur': (c, d) => { c.ui.arena.minutes = Math.max(15, Math.min(360, c.ui.arena.minutes + Number(d.dir) * 15)); c.render(); },
    'a-when': (c, d) => { c.ui.arena.when = d.v; c.render(); },
    'a-save': (c) => {
      const f = c.ui.arena;
      const day = f.when === 'yesterday' ? addDays(c.today(), -1) : c.today();
      save(c, day, f);
      c.ui.arena = { minutes: 60, when: 'today' };
    },
    'a-unlink': (c) => { c.ui.arena.bmt = null; c.render(); },
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
    'rt-log': (c) => {
      const minutes = Math.max(15, Math.round(totalMinutes(timer.cfg, timer.st.round) / 15) * 15);
      timer = null;
      c.ui.arena = { minutes, when: 'today' };
      c.setUi({ atab: 'log' });
    },
    'rt-close': (c) => { timer = null; c.render(); },
  },
};

export default screen;

function save(c, day, { rpe, minutes, bmt = null, content, sparRounds, focus }) {
  let xp = 0;
  let session = null;
  c.update((data) => {
    const r = logArena(data, { day, rpe, minutes, bmt, content, sparRounds: (content || []).includes('Sparring') ? sparRounds : null, focus });
    xp = r.session.xp;
    session = r.session;
    return r.data;
  });
  c.system('ARENA verbucht.', `<div class="xp-gain num">+${xp} XP</div><p class="muted">Intensität ${rpe} · ${hours(minutes)}${rpe >= HARD_RPE ? ' · Morgen plant das System entsprechend.' : ''}</p>${painPrompt(c, session)}`);
}
