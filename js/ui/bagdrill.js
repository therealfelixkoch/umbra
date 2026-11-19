// Runden am Sack (ARENA → Drills): Ansagen per Systemstimme (Englisch), Glocke zu Start und Ende.
// Die Ansagen kommen aus der Engine (js/engine/bagdrill.js: bagSchedule → [{ t, text }]).
// Die Datei wird dynamisch geladen: Fehlt sie noch, bleibt die App heil und der Drill sagt Bescheid.
// Die Stimme ist die bestehende Systemstimme aus voice.js. ECHO spricht nie.
import { esc } from './kit.js';
import { ringBell, keepAwake } from './sound.js';
import { speak, stopSpeaking, canSpeak, voiceName } from './voice.js';

const CATS = [['kick', 'Kicks'], ['knee', 'Knee'], ['hands', 'Hands']];
const DURATIONS = [[60, '1 min'], [90, '1:30'], [120, '2 min'], [150, '2:30'], [180, '3 min']];
const TEMPO = [['slow', 'Ruhig'], ['mid', 'Mittel'], ['fast', 'Schnell']];
const PREP_MS = 5000;
const REST_MS = 30000;
const INTRO = ['Bag rounds. Strike on call.', 'Combination drill initiated. Execute.', 'Bag protocol engaged. Hit what you hear.'];
const OUTRO = ['Bag rounds complete. Adequate.', 'Drill terminated. Your output is recorded.', 'Protocol complete. Recover.'];

let eng = null; // Engine-Modul, sobald geladen
let loading = null;
let bd = null; // { cfg, round, phase, startAt, endAt, plan, idx, call, total }
let ticker = null;
let ctxRef = null;

function loadEngine() {
  if (eng || loading) return loading;
  loading = import('../engine/bagdrill.js')
    .then((m) => { eng = m; if (location.hash.startsWith('#arena')) ctxRef?.render(); return m; })
    .catch(() => { loading = null; return null; });
  return loading;
}

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Ansagen der Runde aus der Engine. t in ms; liefert die Engine Sekunden, wird umgerechnet.
function planFor(cfg, seed) {
  const plan = (eng.bagSchedule({ duration: cfg.duration, tempo: cfg.tempo, cats: cfg.cats, seed }) || [])
    .filter((x) => x && x.text != null).sort((a, b) => a.t - b.t);
  const last = plan[plan.length - 1];
  const inSeconds = last && last.t <= cfg.duration;
  return plan.map((x) => ({ at: inSeconds ? x.t * 1000 : x.t, text: String(x.text) }));
}

function startWork(now) {
  bd.phase = 'work';
  bd.startAt = now;
  bd.endAt = now + bd.cfg.duration * 1000;
  bd.plan = planFor(bd.cfg, now);
  bd.idx = 0;
  bd.call = null;
  ringBell(1);
}

function tick() {
  if (!bd || bd.phase === 'done') return;
  const now = Date.now();
  if (bd.phase === 'prep' || bd.phase === 'rest') {
    if (now >= bd.endAt) {
      bd.round += bd.phase === 'rest' ? 1 : 0;
      startWork(now);
      redraw();
    } else updateClock(bd.endAt - now);
    return;
  }
  if (now >= bd.endAt) {
    ringBell(3);
    if (bd.round < bd.cfg.rounds) {
      bd.phase = 'rest';
      bd.endAt = now + REST_MS;
      setTimeout(() => speak('Recover. Thirty seconds.'), 1300);
    } else {
      bd.phase = 'done';
      clearInterval(ticker);
      keepAwake(false);
      setTimeout(() => speak(pick(OUTRO)), 1300);
    }
    redraw();
    return;
  }
  const next = bd.plan[bd.idx];
  if (next && now - bd.startAt >= next.at) {
    bd.idx++;
    bd.total++;
    bd.call = next.text;
    speak(next.text);
    const el = document.querySelector('[data-bag-call]');
    if (el) {
      el.innerHTML = `<span class="bag-call">${esc(next.text)}</span>`;
      el.classList.remove('flash');
      void el.offsetWidth; // Animation neu starten
      el.classList.add('flash');
    }
  }
  updateClock(bd.endAt - now);
}

function updateClock(ms) {
  const el = document.querySelector('[data-bag-clock]');
  if (el) el.textContent = fmt(ms);
}

function redraw() {
  if (location.hash.startsWith('#arena')) ctxRef?.render();
}

const defaults = () => ({ duration: 120, tempo: 'mid', rounds: 3, cats: { kick: 'mixed' } });

export function bagView(c) {
  ctxRef = c;
  loadEngine();
  if (!bd) {
    const cfg = c.ui.bag || (c.ui.bag = { ...defaults(), ...(c.data.settings.bagdrill || {}) });
    cfg.cats = { ...(cfg.cats || {}) };
    const chip = (act, v, label, on) => `<button class="chip${on ? ' on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
    const picked = CATS.filter(([k]) => cfg.cats[k]);
    const modes = picked.map(([k, label]) => `<div class="field bag-mode"><span>${label}</span>
      <div class="seg small">${[['order', 'In Order'], ['mixed', 'Mixed']].map(([m, l]) => `<button class="${cfg.cats[k] === m ? 'on' : ''}" data-act="bag-mode" data-k="${k}" data-v="${m}">${l}</button>`).join('')}</div></div>`).join('');
    return `<section class="card">
        <div class="label">Runden am Sack</div>
        <p class="muted small">Das System sagt Kombis an, du schlägst sie sofort. Kicks: nur die Zahl. Knee: Zahl und „Knee“. Hands: Zahl und „Hands“. Dazu kommen Zusatz-Kombis.</p>
        <div class="muted small">Kategorien</div>
        <div class="chips">${CATS.map(([k, l]) => chip('bag-cat', k, l, !!cfg.cats[k])).join('')}</div>
        ${modes ? `<div class="bag-modes">${modes}</div>` : '<p class="muted small">Mindestens eine Kategorie wählen.</p>'}
        <div class="muted small">Dauer pro Runde</div>
        <div class="chips">${DURATIONS.map(([v, l]) => chip('bag-dur', v, l, cfg.duration === v)).join('')}</div>
        <div class="muted small">Tempo</div>
        <div class="chips">${TEMPO.map(([v, l]) => chip('bag-tempo', v, l, cfg.tempo === v)).join('')}</div>
        <div class="field"><span>Runden <small class="muted">(30 s Pause)</small></span>
          <div class="stepper"><button class="step" data-act="bag-rounds" data-dir="-1">−</button><div class="step-val"><b>${cfg.rounds}</b></div><button class="step" data-act="bag-rounds" data-dir="1">+</button></div></div>
        <button class="btn primary wide big" data-act="bag-start" ${picked.length ? '' : 'disabled'}>Drill starten</button>
        <p class="muted small">${!eng ? 'Die Ansagen kommen mit dem nächsten Programm-Update. Bis dahin lässt sich der Drill einstellen, aber noch nicht starten.'
    : canSpeak() ? `Stimme: ${esc(voiceName())}. Lautstärke hoch, Stummschalter aus.` : 'Dieses Gerät kann keine Sprachausgabe, die Ansagen erscheinen nur auf dem Bildschirm.'}</p>
      </section>`;
  }
  if (bd.phase === 'done') {
    return `<section class="rt done"><small>Runden am Sack</small><b class="rt-phase">Drill beendet</b>
        <p class="muted">${bd.cfg.rounds} × ${fmt(bd.cfg.duration * 1000)} · ${bd.total} Ansagen</p></section>
      <button class="btn primary wide big" data-act="bag-log">Als ARENA eintragen</button>
      <button class="btn ghost wide" data-act="bag-close">Schließen</button>`;
  }
  const label = bd.phase === 'prep' ? 'Bereit' : bd.phase === 'rest' ? 'Pause' : `Runde ${bd.round}`;
  const call = bd.phase === 'work' && bd.call
    ? `<span class="bag-call">${esc(bd.call)}</span>`
    : `<span class="fw-word muted">${bd.phase === 'rest' ? 'Atmen' : 'Stand einnehmen'}</span>`;
  return `<section class="rt fw bag ${bd.phase}">
      <small>${label} von ${bd.cfg.rounds}</small>
      <div class="fw-cmd" data-bag-call>${call}</div>
      <b class="num fw-clock" data-bag-clock>${fmt(bd.endAt - Date.now())}</b>
    </section>
    <button class="btn big danger wide" data-act="bag-stop">Stopp</button>`;
}

export const bagActions = {
  'bag-cat': (c, d) => {
    const cats = { ...c.ui.bag.cats };
    if (cats[d.v]) delete cats[d.v]; else cats[d.v] = 'mixed';
    c.ui.bag.cats = cats;
    c.render();
  },
  'bag-mode': (c, d) => { c.ui.bag.cats = { ...c.ui.bag.cats, [d.k]: d.v }; c.render(); },
  'bag-dur': (c, d) => { c.ui.bag.duration = Number(d.v); c.render(); },
  'bag-tempo': (c, d) => { c.ui.bag.tempo = d.v; c.render(); },
  'bag-rounds': (c, d) => { c.ui.bag.rounds = Math.max(1, Math.min(12, c.ui.bag.rounds + Number(d.dir))); c.render(); },
  'bag-start': (c) => {
    if (!eng) {
      c.system('Noch nicht bereit', '<p>Die Ansagen für die Runden am Sack kommen mit dem nächsten Programm-Update.</p>');
      return;
    }
    const cfg = { ...c.ui.bag, cats: { ...c.ui.bag.cats } };
    if (!Object.keys(cfg.cats).length) return;
    const now = Date.now();
    bd = { cfg, round: 1, phase: 'prep', endAt: now + PREP_MS, total: 0 };
    speak(pick(INTRO)); // erster Aufruf im Tap entsperrt die Sprachausgabe auf iOS
    clearInterval(ticker);
    ticker = setInterval(tick, 100);
    keepAwake(true);
    c.update((data) => ({ ...data, settings: { ...data.settings, bagdrill: cfg } }));
  },
  'bag-stop': (c) => {
    clearInterval(ticker);
    stopSpeaking();
    keepAwake(false);
    const played = bd.phase === 'work' ? bd.round - 1 + (Date.now() - bd.startAt) / (bd.cfg.duration * 1000) : bd.round - 1;
    bd = played > 0.2 ? { ...bd, phase: 'done', cfg: { ...bd.cfg, rounds: Math.max(1, Math.round(played)) } } : null;
    c.render();
  },
  'bag-log': (c) => {
    const minutes = Math.max(15, Math.round((bd.cfg.rounds * bd.cfg.duration) / 60 / 15) * 15);
    const rounds = bd.cfg.rounds;
    const min = bd.cfg.duration / 60;
    bd = null;
    c.ui.arena = { minutes, when: 'today', content: ['Sack'], blocks: [{ type: 'Sonstiges', rounds, min, note: 'Runden am Sack' }] };
    c.setUi({ atab: 'log' });
  },
  'bag-close': (c) => { bd = null; c.render(); },
};

export const isRunning = () => !!bd && bd.phase !== 'done';
