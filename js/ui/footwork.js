// Footwork-Drill in der ARENA: zufällige Kommandos per Roboterstimme, Glocke zu Start und Ende.
import { schedule, rng, LABELS, ARROWS } from '../engine/footwork.js';
import { ringBell, keepAwake } from './sound.js';
import { speak, stopSpeaking, canSpeak, voiceName } from './voice.js';

const DURATIONS = [[60, '1 min'], [90, '1:30'], [120, '2 min'], [150, '2:30'], [180, '3 min']];
const TEMPO = [['slow', 'Ruhig'], ['mid', 'Mittel'], ['fast', 'Schnell']];
const PREP_MS = 5000;
const REST_MS = 30000;
const INTRO = ['Footwork protocol engaged. Comply.', 'Movement test initiated. Do not anticipate.', 'Calibrating reflexes. Obey.'];
const OUTRO = ['Protocol complete. Adequate.', 'Round terminated. You survived. For now.', 'Data recorded. Your reactions are acceptable.'];

let fw = null; // { cfg, round, phase, startAt, endAt, plan, idx, cmd, cmdAt }
let ticker = null;
let ctxRef = null;

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function startWork(now) {
  fw.phase = 'work';
  fw.startAt = now;
  fw.endAt = now + fw.cfg.duration * 1000;
  fw.plan = schedule(fw.cfg.duration, fw.cfg.tempo, rng(now));
  fw.idx = 0;
  fw.cmd = null;
  ringBell(1);
}

function tick() {
  if (!fw || fw.phase === 'done') return;
  const now = Date.now();
  if (fw.phase === 'prep' || fw.phase === 'rest') {
    if (now >= fw.endAt) {
      fw.round += fw.phase === 'rest' ? 1 : 0;
      startWork(now);
      redraw();
    } else updateClock(fw.endAt - now);
    return;
  }
  if (now >= fw.endAt) {
    ringBell(3);
    if (fw.round < fw.cfg.rounds) {
      fw.phase = 'rest';
      fw.endAt = now + REST_MS;
      setTimeout(() => speak('Recover. Thirty seconds.'), 1300);
    } else {
      fw.phase = 'done';
      clearInterval(ticker);
      keepAwake(false);
      setTimeout(() => speak(pick(OUTRO)), 1300);
    }
    redraw();
    return;
  }
  const next = fw.plan[fw.idx];
  if (next && now - fw.startAt >= next.at) {
    fw.idx++;
    fw.total++;
    fw.cmd = next.cmd;
    fw.cmdAt = now;
    speak(next.cmd === 'back' ? 'Back.' : `${next.cmd[0].toUpperCase()}${next.cmd.slice(1)}.`);
    const el = document.querySelector('[data-fw-cmd]');
    if (el) {
      el.innerHTML = `<span class="fw-arrow">${ARROWS[next.cmd]}</span><span class="fw-word">${LABELS[next.cmd]}</span>`;
      el.classList.remove('flash');
      void el.offsetWidth; // Animation neu starten
      el.classList.add('flash');
    }
  }
  updateClock(fw.endAt - now);
}

function updateClock(ms) {
  const el = document.querySelector('[data-fw-clock]');
  if (el) el.textContent = fmt(ms);
}

function redraw() {
  if (location.hash.startsWith('#arena')) ctxRef?.render();
}

export function footworkView(c) {
  ctxRef = c;
  if (!fw) {
    const cfg = c.ui.fw || (c.ui.fw = { duration: 120, tempo: 'mid', rounds: 1, ...(c.data.settings.footwork || {}) });
    const chip = (act, v, label, on) => `<button class="chip${on ? ' on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
    return `<section class="card">
        <div class="label">Footwork-Drill</div>
        <p class="muted small">Das System ruft zufällig <b>Right, Left, Forward, Back, Switch</b>. Du reagierst sofort mit dem Schritt, ohne vorauszudenken. Kein festes Muster, unregelmäßiger Takt.</p>
        <div class="muted small">Dauer pro Runde</div>
        <div class="chips">${DURATIONS.map(([v, l]) => chip('fw-dur', v, l, cfg.duration === v)).join('')}</div>
        <div class="muted small">Tempo</div>
        <div class="chips">${TEMPO.map(([v, l]) => chip('fw-tempo', v, l, cfg.tempo === v)).join('')}</div>
        <div class="field"><span>Runden <small class="muted">(30 s Pause)</small></span>
          <div class="stepper"><button class="step" data-act="fw-rounds" data-dir="-1">−</button><div class="step-val"><b>${cfg.rounds}</b></div><button class="step" data-act="fw-rounds" data-dir="1">+</button></div></div>
        <button class="btn primary wide big" data-act="fw-start">Drill starten</button>
        <p class="muted small">${canSpeak() ? `Stimme: ${voiceName()}. Lautstärke hoch, Stummschalter aus.` : 'Dieses Gerät kann keine Sprachausgabe, die Kommandos erscheinen nur auf dem Bildschirm.'}</p>
      </section>`;
  }
  if (fw.phase === 'done') {
    return `<section class="rt done"><small>Footwork</small><b class="rt-phase">Protokoll beendet</b>
        <p class="muted">${fw.cfg.rounds} × ${fmt(fw.cfg.duration * 1000)} · ${fw.total} Kommandos</p></section>
      <button class="btn primary wide big" data-act="fw-log">Als ARENA eintragen</button>
      <button class="btn ghost wide" data-act="fw-close">Schließen</button>`;
  }
  const label = fw.phase === 'prep' ? 'Bereit' : fw.phase === 'rest' ? 'Pause' : `Runde ${fw.round}`;
  const left = fw.endAt - Date.now();
  const cmd = fw.phase === 'work' && fw.cmd
    ? `<span class="fw-arrow">${ARROWS[fw.cmd]}</span><span class="fw-word">${LABELS[fw.cmd]}</span>`
    : `<span class="fw-word muted">${fw.phase === 'rest' ? 'Atmen' : 'Stand einnehmen'}</span>`;
  return `<section class="rt fw ${fw.phase}">
      <small>${label} von ${fw.cfg.rounds}</small>
      <div class="fw-cmd" data-fw-cmd>${cmd}</div>
      <b class="num fw-clock" data-fw-clock>${fmt(left)}</b>
    </section>
    <button class="btn big danger wide" data-act="fw-stop">Stopp</button>`;
}

export const footworkActions = {
  'fw-dur': (c, d) => { c.ui.fw.duration = Number(d.v); c.render(); },
  'fw-tempo': (c, d) => { c.ui.fw.tempo = d.v; c.render(); },
  'fw-rounds': (c, d) => { c.ui.fw.rounds = Math.max(1, Math.min(6, c.ui.fw.rounds + Number(d.dir))); c.render(); },
  'fw-start': (c) => {
    const cfg = { ...c.ui.fw };
    const now = Date.now();
    fw = { cfg, round: 1, phase: 'prep', endAt: now + PREP_MS, total: 0 };
    speak(pick(INTRO)); // erster Aufruf im Tap entsperrt die Sprachausgabe auf iOS
    clearInterval(ticker);
    ticker = setInterval(tick, 100);
    keepAwake(true);
    c.update((data) => ({ ...data, settings: { ...data.settings, footwork: cfg } }));
  },
  'fw-stop': (c) => {
    clearInterval(ticker);
    stopSpeaking();
    keepAwake(false);
    const played = fw.phase === 'work' ? fw.round - 1 + (Date.now() - fw.startAt) / (fw.cfg.duration * 1000) : fw.round - 1;
    fw = played > 0.2 ? { ...fw, phase: 'done', cfg: { ...fw.cfg, rounds: Math.max(1, Math.round(played)) } } : null;
    c.render();
  },
  'fw-log': (c) => {
    const minutes = Math.max(15, Math.round((fw.cfg.rounds * fw.cfg.duration) / 60 / 15) * 15);
    fw = null;
    c.ui.arena = { minutes, when: 'today' };
    c.setUi({ atab: 'log' });
  },
  'fw-close': (c) => { fw = null; c.render(); },
};

export const isRunning = () => !!fw && fw.phase !== 'done';
