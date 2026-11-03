// Benchmark-Workout des Saison-Wächters (Säule 1): Baseline im ersten Kapitel, Revanche in der Prüfwoche.
// Auf Zeit: Stoppuhr. Auf Anzahl: Rundenuhr (Storm Rounds) bzw. AMRAP-Uhr (Wither Flow), Zahl am Ende eintragen.
import { sys, esc, stepper } from './kit.js';
import { guardianName } from '../data/lore.js';
import { benchmarkOf, benchState, benchmarkDue, logBenchmark, formatScore, beats, partsOf, versionText } from '../engine/pillars.js';
import { playTone } from './temper-audio.js';
import { keepAwake, unlockAudio } from './sound.js';
import { setStory } from './storycard.js';

let ticker = null;
const PULSE_SEC = 20; // Puls direkt danach: 20 s zählen, mal 3 = Schläge pro Minute
const fmt = (sec) => { const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** Phasen für Rundenformate: [{label, sec}] */
function phasesOf(v) {
  if (v.amrap) return [{ label: 'Los', sec: v.amrap }];
  if (!v.rounds) return null;
  const out = [];
  for (let r = 1; r <= v.rounds; r++) {
    out.push({ label: `Runde ${r}/${v.rounds} · Sack`, sec: 60 }, { label: `Runde ${r}/${v.rounds} · Sprawls zählen`, sec: 60 }, { label: `Runde ${r}/${v.rounds} · Sack`, sec: 60 });
    if (r < v.rounds) out.push({ label: 'Pause', sec: v.rest });
  }
  return out;
}

function phaseAt(phases, elapsed) {
  let t = 0;
  for (let i = 0; i < phases.length; i++) {
    if (elapsed < t + phases[i].sec) return { i, ...phases[i], left: t + phases[i].sec - elapsed };
    t += phases[i].sec;
  }
  return { i: phases.length, label: 'Fertig', left: 0, done: true };
}

/** Karte auf Heute, wenn der Benchmark dran ist. */
export function benchmarkCard(c) {
  const due = benchmarkDue(c.data, c.today());
  if (!due) return '';
  const n = c.data.engine.arc.n;
  const bench = benchmarkOf(n);
  return `<section class="card flow-card bench-card"><div><b>${due === 'baseline' ? 'Baseline' : 'Revanche'} · ${bench.name}</b>
    <small>${guardianName(n)}: ${due === 'baseline' ? 'dein Startwert für die Saison, ersetzt einmal INFILTRATION' : 'Prüfwoche, schlag deine Baseline'}</small></div>
    <button class="btn primary" data-act="go" data-to="benchmark">Start</button></section>`;
}

const screen = {
  render(c) {
    const arc = c.data.engine.arc;
    const n = arc.n;
    const bench = benchmarkOf(n);
    const st = benchState(c.data, n);
    const f = c.ui.bm || (c.ui.bm = { variant: st.variant || 'half', cardio: st.cardio || 'rope', sub: false, phase: 'ready', value: null });
    const kind = f.kind || (st.baseline ? 'revenge' : 'baseline');
    const variant = st.variant || f.variant;
    const cardio = st.cardio || f.cardio;
    const v = bench.variants[variant];
    const parts = partsOf(bench, variant, cardio);
    const back = '<button class="btn ghost back" data-act="bm-cancel">← Zurück</button>';
    const head = `<h1 class="h">${bench.name}</h1><p class="muted">${guardianName(n)} · ${kind === 'baseline' ? 'Baseline' : 'Revanche'}${st.baseline ? ` · Baseline ${formatScore(bench, st.baseline.value)}` : ''}</p>`;

    if (f.phase === 'saved') {
      const base = st.baseline?.value;
      const won = kind === 'revenge' || st.revenge ? beats(bench, base, st.revenge?.value ?? f.value) : null;
      return `${head}${sys(kind === 'revenge' ? (won ? 'Baseline geschlagen' : 'Knapp daneben') : 'Baseline steht', `
        <p class="big num center">${formatScore(bench, f.value)}</p>
        ${f.pulse ? `<p class="center muted">Puls direkt danach: <b class="num">${f.pulse}</b> /min</p>` : ''}
        <p>${kind === 'revenge' ? (won ? 'Die erste Säule steht. Der Wächter wankt.' : 'Die Säule bleibt offen. Fortschritt und Durchhalten zählen trotzdem.') : 'Das ist deine Messlatte für die Prüfwoche. Gleiche Version, gleiche Regeln.'}</p>
        <button class="btn primary wide" data-act="bm-close">Fertig</button>
        <button class="btn wide share-btn" data-act="story-share">Story-Karte teilen</button>`, { tone: kind === 'revenge' && won ? 'gold' : 'sys' })}`;
    }

    if (f.phase === 'ready') {
      const cardioChips = bench.cardio ? `<div class="label">Cardio am Anfang und Ende</div><div class="chips">${Object.entries(bench.cardio).map(([k, x]) =>
        `<button class="chip${f.cardio === k ? ' on' : ''}" data-act="bm-cardio" data-v="${k}">${x.label}</button>`).join('')}</div>` : '';
      const choose = kind === 'baseline' ? `<div class="label">Version (gilt auch für die Revanche)</div><div class="chips">${Object.entries(bench.variants).map(([k, x]) =>
        `<button class="chip${f.variant === k ? ' on' : ''}" data-act="bm-variant" data-v="${k}">${x.label}</button>`).join('')}</div>${cardioChips}`
        : `<p class="muted small">Version: ${esc(versionText(bench, variant, st.cardio))} (wie bei der Baseline)</p>`;
      return `${back}${head}${sys('Ablauf', `<p>${esc(bench.intro)}</p><ul class="cues">${parts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        ${choose}
        <div class="label">Gelenk-Ersatz</div><ul class="cues small">${bench.subs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="chips"><button class="chip${f.sub ? ' on' : ''}" data-act="bm-sub">${f.sub ? '✓ ' : ''}Mit Ersatz</button></div>
        <p class="muted small">Vorher aufwärmen und der Mobility-Block. ${bench.score === 'time' ? 'Die Uhr läuft, bis du „Fertig“ tippst.' : 'Die Uhr gibt den Takt vor, die Zahl trägst du am Ende ein.'}</p>
        <button class="btn primary wide" data-act="bm-start">Uhr starten</button>`)}`;
    }

    const elapsed = (Date.now() - f.startAt) / 1000;
    if (f.phase === 'run') {
      const phases = phasesOf(v);
      const ph = phases ? phaseAt(phases, elapsed) : null;
      const clock = phases ? fmt(ph.left) : fmt(elapsed);
      return `<div class="bigtimer bench-run">
        <small class="bigtimer-count">${esc(bench.name)}</small>
        <h1>${esc(ph ? ph.label : 'Auf Zeit')}</h1>
        <b class="bigtimer-clock num" data-bm-clock>${clock}</b>
        <button class="btn primary big wide" data-act="bm-stop">${phases ? 'Beenden' : 'Fertig'}</button>
        <p class="bigtimer-hint">Glocke = Phasenwechsel. Bildschirm bleibt an.</p></div>`;
    }

    // Puls direkt nach dem Workout (optional)
    if (f.phase === 'pulse') {
      return `${head}${sys('Puls messen?', `<p>Direkt nach dem Workout zeigt der Puls, wie hart es war. Finger an den Hals oder ans Handgelenk.</p>
        <p class="muted small">Die Uhr läuft ${PULSE_SEC} s, du zählst die Schläge. Die App rechnet auf eine Minute hoch.</p>
        <button class="btn primary wide" data-act="bm-pulse-go">Ja, ${PULSE_SEC} s zählen</button>
        <button class="btn ghost wide" data-act="bm-pulse-skip">Ohne Puls weiter</button>`)}`;
    }
    if (f.phase === 'pulse-run') {
      return `<div class="bigtimer bench-run"><small class="bigtimer-count">Puls</small><h1>Schläge zählen</h1>
        <b class="bigtimer-clock num" data-bm-clock>${fmt(PULSE_SEC - (Date.now() - f.pulseAt) / 1000)}</b>
        <button class="btn ghost wide" data-act="bm-pulse-skip">Abbrechen</button>
        <p class="bigtimer-hint">Glocke = Ende. Dann die gezählten Schläge eintragen.</p></div>`;
    }
    if (f.phase === 'pulse-enter') {
      const beats = f.beats ?? 50;
      return `${head}${sys('Gezählte Schläge', `<p>Wie viele Schläge in ${PULSE_SEC} s?</p>
        ${stepper('bm-beats', `${beats}`, `× 3 = ${beats * 3} /min`, { big: true })}
        <button class="btn primary wide" data-act="bm-pulse-save">Übernehmen</button>
        <button class="btn ghost wide" data-act="bm-pulse-skip">Ohne Puls weiter</button>`)}`;
    }

    // Eingabe
    const step = bench.score === 'time' ? 10 : 1;
    const label = bench.score === 'time' ? 'Zeit' : bench.unit;
    return `${head}${sys('Ergebnis', `<p>${bench.score === 'time' ? 'Gestoppte Zeit, bei Bedarf korrigieren.' : `Wie viele ${bench.unit}?`}</p>
      ${stepper('bm-val', bench.score === 'time' ? fmt(f.value || 0) : `${f.value || 0}`, label, { big: true, idx: String(step) })}
      ${f.pulse ? `<p class="muted small">Puls direkt danach: <b class="num">${f.pulse}</b> /min</p>` : ''}
      <button class="btn primary wide" data-act="bm-save" ${f.value ? '' : 'disabled'}>Speichern</button>
      <button class="btn ghost wide" data-act="bm-cancel">Verwerfen</button>`)}`;
  },
  mount(c) {
    clearInterval(ticker);
    const f = c.ui.bm;
    if (f?.phase === 'pulse-run') {
      ticker = setInterval(() => {
        const left = PULSE_SEC - (Date.now() - f.pulseAt) / 1000;
        const el = document.querySelector('[data-bm-clock]');
        if (left <= 0) { clearInterval(ticker); keepAwake(false); playTone('next'); f.phase = 'pulse-enter'; c.render(); return; }
        if (el) el.textContent = fmt(Math.ceil(left));
      }, 200);
      return;
    }
    if (f?.phase !== 'run') return;
    const bench = benchmarkOf(c.data.engine.arc.n);
    const v = bench.variants[benchState(c.data, c.data.engine.arc.n).variant || f.variant];
    const phases = phasesOf(v);
    ticker = setInterval(() => {
      const el = document.querySelector('[data-bm-clock]');
      const elapsed = (Date.now() - f.startAt) / 1000;
      if (!phases) { if (el) el.textContent = fmt(elapsed); return; }
      const ph = phaseAt(phases, elapsed);
      if (ph.i !== f.seen) { f.seen = ph.i; playTone(ph.done ? 'next' : 'bell'); if (ph.done) { screen.actions['bm-stop'](c); return; } c.render(); return; }
      if (el) el.textContent = fmt(ph.left);
    }, 250);
  },
  actions: {
    'bm-variant': (c, d) => { c.ui.bm.variant = d.v; c.render(); },
    'bm-cardio': (c, d) => { c.ui.bm.cardio = d.v; c.render(); },
    'bm-pulse-go': (c) => { unlockAudio(); keepAwake(true); Object.assign(c.ui.bm, { phase: 'pulse-run', pulseAt: Date.now() }); playTone('bell'); c.render(); },
    'bm-pulse-skip': (c) => { clearInterval(ticker); keepAwake(false); c.ui.bm.phase = 'enter'; c.render(); },
    'bm-beats': (c, d) => { const f = c.ui.bm; f.beats = Math.max(10, Math.min(80, (f.beats ?? 50) + Number(d.dir))); c.render(); },
    'bm-pulse-save': (c) => { const f = c.ui.bm; f.pulse = (f.beats ?? 50) * 3; f.phase = 'enter'; c.render(); },
    'bm-sub': (c) => { c.ui.bm.sub = !c.ui.bm.sub; c.render(); },
    'bm-start': (c) => { unlockAudio(); keepAwake(true); Object.assign(c.ui.bm, { phase: 'run', startAt: Date.now(), seen: 0 }); playTone('bell'); c.render(); },
    'bm-stop': (c) => {
      clearInterval(ticker);
      keepAwake(false);
      const f = c.ui.bm;
      const bench = benchmarkOf(c.data.engine.arc.n);
      f.minutes = Math.max(1, Math.round((Date.now() - f.startAt) / 60000));
      if (bench.score === 'time') f.value = Math.round((Date.now() - f.startAt) / 1000);
      f.phase = 'pulse';
      c.render();
    },
    'bm-val': (c, d) => { const f = c.ui.bm; f.value = Math.max(0, (f.value || 0) + Number(d.dir) * Number(d.idx || 1)); c.render(); },
    'bm-save': (c) => {
      const f = c.ui.bm;
      const n = c.data.engine.arc.n;
      const st = benchState(c.data, n);
      f.kind = st.baseline ? 'revenge' : 'baseline';
      c.update((data) => logBenchmark(data, { kind: f.kind, variant: st.variant || f.variant, cardio: st.cardio || f.cardio, value: f.value, pulse: f.pulse, sub: f.sub, minutes: f.minutes, day: c.today() }));
      f.phase = 'saved';
      const bench = benchmarkOf(n);
      setStory({ kicker: f.kind === 'baseline' ? 'BASELINE GESETZT' : 'REVANCHE', title: bench.name, stats: [[formatScore(bench, f.value).replace(' min', ''), bench.score === 'time' ? 'Zeit' : bench.unit], f.pulse ? [f.pulse, 'Puls'] : [f.minutes || '–', 'Minuten'], [st.variant === 'full' || f.variant === 'full' ? 'VOLL' : 'HALB', 'Version']] });
      c.render();
    },
    'bm-close': (c) => { c.ui.bm = null; c.go('heute'); },
    'bm-cancel': (c) => { clearInterval(ticker); keepAwake(false); c.ui.bm = null; c.go('heute'); },
  },
};

export default screen;
