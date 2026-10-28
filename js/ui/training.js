// Training: Übung für Übung, Satz-Logging, Pausen-Timer, Zirkel, SHADOWSTEP, FLOW.
import { sys, esc, glyphChips, targetText, loadText, setsText, trendBadge, stepper, kg, helpDot } from './kit.js';
import { getDef } from '../data/exercises.js';
import { finishSession, completionOf, swapGroups, itemFor, stateKey, profileContext } from '../engine/plan.js';
import { EXERCISES, CATEGORIES } from '../data/exercises.js';
import { ATTRIBUTES } from '../data/glyphs.js';
import { stepLoad, snap } from '../engine/progression.js';
import { rankFor, totalXp } from '../engine/game.js';
import { exerciseDetail } from './kodex.js';
import { showsElbowTap, reportElbow } from '../engine/signals.js';
import { quoteAfterMission } from '../engine/story.js';
import { guardianImage } from './lore.js';
import { ladderLine } from './ladder.js';
import { painPrompt } from './wrist.js';
import { FEET_SIGNS } from '../data/feet.js';
import { rampable, rampSets, firstRampIndex, supersetOptions, supersetNext, SUPERSET_REST } from '../engine/warmup.js';
import { breathAt, slowPattern } from '../engine/breath.js';
import { book1Reached } from '../engine/temper.js';
import { logDecision } from '../engine/rulelog.js';
import { stepFrom } from '../data/ladders.js';
import { guardianTier } from '../data/lore.js';
import { rankName } from '../engine/game.js';
import { beep, keepAwake, signal, unlockAudio, haptic } from './sound.js';
import { playTone } from './temper-audio.js';
import { setStory } from './storycard.js';
import { BANDS } from '../engine/equipment.js';
import { MISSIONS as MISSIONS_ALL } from '../data/missions.js';
import { RIR_CHOICES, restFor, REST_STEP, exercisePhases, exerciseTimerAt, timerState, intervalPhases, phaseAt, workDone, PHASE_LABEL, activeMinutes } from '../engine/session.js';

const fmt = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ——— Pausen-Timer (Overlay außerhalb des Render-Baums) ———
const restEl = () => document.getElementById('rest');
let rest = null;
function startRest(sec, label = 'Pause', exId = null) {
  rest = { endAt: Date.now() + sec * 1000, total: sec, label, fired: false, exId, min: !!rest?.min };
  drawRest();
}
function drawRest() {
  const el = restEl();
  if (!rest) {
    el.className = '';
    el.innerHTML = '';
    return;
  }
  const left = (rest.endAt - Date.now()) / 1000;
  el.className = `open${left <= 0 ? ' over' : ''}`;
  // 3-Atemzüge-Reset in der Pause (TEMPER, ab Episode 26): 3 × (4 s ein, 8 s aus)
  if (rest.reset) {
    const t = (Date.now() - rest.reset) / 1000;
    if (t < 36) {
      const b = breathAt(rest.reset, Date.now(), slowPattern(8));
      el.className = 'open';
      el.innerHTML = `<div class="rest-inner"><small>Reset · Atemzug ${Math.min(3, b.cycle + 1)}/3 · Pause ${fmt(left)}</small><b class="num">${b.label}</b>
        <p class="muted small">Schultern sinken. Lang aus.</p><div class="row gap"><button class="btn" data-act="rest-reset-stop">Fertig</button></div></div>`;
      return;
    }
    rest.reset = null;
  }
  const C = 452;
  const frac = Math.max(0, Math.min(1, left / Math.max(1, rest.total || 60)));
  if (left > 0 && left <= 3.2 && !rest.warned) { rest.warned = true; beep(1, 660); }
  if (rest.min) {
    el.className = `open min${left <= 0 ? ' over' : ''}`;
    el.innerHTML = `<button class="rest-mini" data-act="rest-toggle" aria-label="Pause aufklappen"><span>${esc(rest.label)}</span>
      <i class="rest-mini-bar"><i style="width:${(frac * 100).toFixed(1)}%"></i></i><b class="num">${left > 0 ? fmt(left) : 'Los'}</b><em>▴</em></button>`;
  } else {
  el.innerHTML = `<div class="rest-inner"><button class="rest-collapse" data-act="rest-toggle" aria-label="Pause einklappen">▾</button><small>${esc(rest.label)}</small>
    <div class="rest-ring"><svg viewBox="0 0 160 160" width="168" height="168" aria-hidden="true"><circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/>
      <circle cx="80" cy="80" r="72" fill="none" stroke="var(--sys)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${(C * (1 - frac)).toFixed(1)}"/></svg>
      <b class="num">${left > 0 ? fmt(left) : 'Los'}</b></div>
    ${rest.resetOffer && left > 40 ? '<button class="btn small ghost rest-reset" data-act="rest-reset">Reset?</button>' : ''}
    <div class="row gap"><button class="btn" data-act="rest-sub">−15 s</button><button class="btn" data-act="rest-add">+15 s</button><button class="btn primary" data-act="rest-skip">${left > 0 ? 'Überspringen' : 'Weiter'}</button></div>
    ${rest.exId ? '<small class="rest-note">±15 s merkt sich die App für diese Übung.</small>' : ''}</div>`;
  }
  if (left <= 0 && !rest.fired) {
    rest.fired = true;
    signal(3);
    setTimeout(() => { if (rest?.fired) { rest = null; drawRest(); } }, 4000);
  }
}

// ——— Takt für alle Uhren ———
let ticker = null;
function startTicker(c) {
  clearInterval(ticker);
  ticker = setInterval(() => tick(c), 250);
}

function tick(c) {
  if (rest) drawRest();
  const a = c.data.active;
  if (!a || location.hash.replace('#', '') !== 'training') return;
  const now = Date.now();
  const el = document.querySelector('[data-elapsed]');
  if (el && a.startedAt) el.textContent = elapsedOf(a, now);
  const p = a.plan;
  if (p.format === 'flow' && a.flow?.switchUntil && !a.flow.paused) {
    const left = Math.ceil((a.flow.switchUntil - now) / 1000);
    if (left <= 0) {
      a.flow = { i: a.flow.i, endAt: a.flow.endAt };
      playTone('bell');
      save(c);
      return;
    }
    if (left <= 3 && a.flow.cd !== left) { a.flow.cd = left; playTone('hold'); }
  }
  if (p.format === 'flow' && a.flow?.endAt && !a.flow.paused && !a.flow.switchUntil) {
    if (now >= a.flow.endAt) {
      advanceFlow(c, true);
      return;
    }
  }
  if (p.format === 'intervals' && a.iv?.startAt && !a.iv.pausedAt) {
    const st = phaseAt(intervalPhases(p), a.iv.startAt, now, a.iv);
    if (st.index !== a.iv.seen) {
      // Signal bei jedem Phasenwechsel: 1 = los, 2 = Pause, 3 = fertig
      if (a.iv.seen != null) signal(st.phase === 'done' ? 3 : st.phase === 'work' ? 1 : 2);
      a.iv.seen = st.index;
      a.roundsDone = workDone(intervalPhases(p), st.index);
      save(c);
      return;
    }
  }
  if (a.cardIv?.startAt && !a.cardIv.pausedAt) {
    const ph = intervalPhases(IV4);
    const st = phaseAt(ph, a.cardIv.startAt, now, a.cardIv);
    if (st.index !== a.cardIv.seen) {
      signal(st.phase === 'done' ? 3 : st.phase === 'work' ? 1 : 2);
      a.cardIv.seen = st.index;
      if (st.phase === 'done') {
        a.log[a.cardIv.i].sets.forEach((x) => { x.done = true; });
        a.cardIv = null;
      }
      save(c);
      return;
    }
  }
  const ct = a.cardTimer;
  if (ct?.phases) {
    const st = exerciseTimerAt(ct.phases, ct.startAt, now);
    if (st.index !== ct.seen) {
      cardPhaseChange(c, a, ct, st);
      return;
    }
    if (st.last && st.over && !ct.fired) {
      ct.fired = true;
      signal(3);
      if (ct.rounds) { finishRounds(c, a, ct, st.round); return; }
      // Zielzeit erreicht: Timer beenden und Satz mit der Zielzeit abhaken (nicht weiterzählen)
      training.actions['t-timer-stop'](c, { k: ct.k });
      return;
    }
    const el = document.querySelector('[data-bigclock]');
    if (el) {
      el.textContent = fmt(Math.max(0, st.left));
    }
  }
  if (p.format === 'amrap' && a.clockEnd && now >= a.clockEnd && !a.clockFired) {
    a.clockFired = true;
    signal(3);
    save(c);
    return;
  }
  document.querySelectorAll('[data-clock]').forEach((el) => {
    const end = Number(el.dataset.clock);
    el.textContent = fmt((end - now) / 1000);
  });
  document.querySelectorAll('[data-timer]').forEach((el) => {
    const t = timerState({ startAt: Number(el.dataset.timer), target: Number(el.dataset.target) }, now);
    el.textContent = t.over ? `+${fmt(t.elapsed - t.target)}` : fmt(t.left);
    el.classList.toggle('over', t.over);
  });
}

// Jede Aktion ist ein Aktivitäts-Zeitstempel (für die Dauer ohne Lücken)
const save = (c) => {
  const a = c.data.active;
  if (a) {
    a.marks ||= [];
    const now = Date.now();
    if (!a.marks.length || now - a.marks.at(-1) > 15000) a.marks.push(now);
  }
  c.update(() => null);
};

// ——— Sätze ———
// Zeitübungen und Runden-Übungen (Sack, Seil in Minuten) bekommen einen Timer in der Karte.
const timed = (def) => (def.mode === 'time' && def.cat !== 'mobility') || (def.mode === 'fixed' && def.unit === 'min');
const timerTarget = (def, s) => (def.mode === 'fixed' ? def.range[0] * 60 : s.value);
const PHASE_NAME = { work: 'Los', side1: 'Seite 1', switch: 'Seitenwechsel', side2: 'Seite 2', rest: 'Pause', relax: 'Locker lassen' };

// Phasenwechsel im Übungs-Timer: Signal, bei Runden die fertige Runde abhaken
function cardPhaseChange(c, a, ct, st) {
  const prev = ct.phases[ct.seen];
  ct.seen = st.index;
  if (ct.rounds && prev?.phase === 'work') {
    const s = a.log[ct.i].sets[ct.ks[prev.round - 1]];
    if (s) { s.done = true; s.sec = prev.sec; }
  }
  signal(st.phase === 'rest' || st.phase === 'switch' || st.phase === 'relax' ? 2 : 1);
  save(c);
}

// Letzte Runde vorbei: abhaken, Timer schließen, normale Pause zur nächsten Übung
function finishRounds(c, a, ct, round) {
  const k = ct.ks[round - 1];
  const s = a.log[ct.i].sets[k];
  a.cardTimer = null;
  if (s && !s.done) { s.sec = ct.phases.at(-1).sec; training.actions['t-done'](c, { k }); } else save(c);
}

// Vollbild während der Übungs-Timer läuft: riesige Restzeit, Übung, Satz x/y, Phase
function bigTimerView(a, ct, def) {
  const st = exerciseTimerAt(ct.phases, ct.startAt, Date.now());
  const sets = a.log[ct.i].sets;
  const counter = ct.rounds ? `Runde ${st.round} von ${ct.ks.length}` : `Satz ${ct.k + 1} von ${sets.length}`;
  const clock = st.over ? `+${fmt(st.elapsed - st.sec)}` : fmt(st.left);
  return `<div class="bigtimer phase-${st.phase}">
    <small class="bigtimer-count">${counter}</small>
    <h1>${esc(def.name)}</h1>
    <b class="bigtimer-phase">${st.phase === 'work' && !ct.rounds && !st.of ? '' : `${PHASE_NAME[st.phase]}${st.of > 1 ? ` · Hold ${st.hold}/${st.of}` : ''}`}</b>
    ${a.log[ct.i].sets[ct.k]?.label && !['Top-Satz', 'Backdown'].includes(a.log[ct.i].sets[ct.k].label) ? `<p class="bigtimer-hint">${esc(a.log[ct.i].sets[ct.k].label)}</p>` : ''}
    <b class="bigtimer-clock num${st.over ? ' over' : ''}" data-bigclock>${clock}</b>
    ${st.phase === 'switch' ? '<p class="bigtimer-hint">Seite wechseln, gleich geht es weiter.</p>' : ''}
    <button class="btn primary big wide" data-act="t-timer-stop" data-k="${ct.k}">${ct.rounds ? 'Stopp' : 'Stopp · Zeit loggen'}</button>
    <p class="bigtimer-hint">${'wakeLock' in navigator ? 'Bildschirm bleibt an.' : 'Bildschirm anlassen für das Signal.'} Bei Lautlos-Schalter kommt nur das violette Signal.</p></div>`;
}
const IV4 = { warmup: 180, rounds: 4, work: 240, rest: 180, cooldown: 180 };
const is4x4 = (def) => def.id.endsWith('_4x4');
const clockOf = (ts) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

function lastSetText(def, s) {
  if (!s) return '';
  const v = `${s.value}${def.mode === 'time' ? ' s' : ''}`;
  return def.load && s.load ? `${kg(s.load)} kg × ${v}` : v;
}

function rirChips(k, cur) {
  return `<div class="rir-chips" role="group" aria-label="RIR Satz ${k + 1}"><small>RIR</small>${RIR_CHOICES.map((v) =>
    `<button class="${cur === v ? 'on' : ''}" data-act="t-rir" data-k="${k}" data-v="${v}">${v === 4 ? '4+' : v}</button>`).join('')}</div>`;
}

function setsView(c, a) {
  const p = a.plan;
  const i = Math.min(a.index, p.items.length - 1);
  const it = p.items[i];
  const entry = a.log[i];
  const def = getDef(it.exId);
  const n = p.items.length;
  const comp = completionOf(a);
  const loadable = def.load && it.ladder.length > 1;
  const last = it.lastTime;
  const fixed = def.mode === 'fixed';
  const r = it.rir ?? 2;
  const setCount = entry.sets.length;
  const showRir = !fixed && !it.explosive && it.rir != null && def.mode !== 'time';
  const hasTimer = timed(def);
  const ct = a.cardTimer?.i === i ? a.cardTimer : null;
  if (ct?.phases) return bigTimerView(a, ct, def);
  const wristPct = { 1: '20–30 %', 2: '30–50 %', 3: 'ca. 50–70 %', 4: 'ca. 70 %' }[c.data.wrist?.stage || 2];
  const rir = it.wrist ? `<p class="rir">${def.dirs ? `Isometrie mit ${wristPct} Kraft, ohne sichtbare Bewegung. ` : ''}Schmerz auf der Kleinfingerseite höchstens 2 (Ampel grün).</p>`
    : fixed ? '' : it.explosive
    ? `<p class="rir">Kontrast: jede Wiederholung maximal explosiv, volle Pause. Stopp, sobald die Explosivität nachlässt. ${helpDot('contrast')}</p>`
    : it.topSet ? `<p class="rir">Top-Satz: 3–5 Wdh., 1 Wdh. im Tank. Backdown: 6–10 Wdh. mit ca. 18 % weniger Last. ${helpDot('topset')}</p>`
      : def.mode === 'amrap' ? `<p class="rir">${it.noFailure ? `Ein Satz, ${r} Wdh. im Tank.` : 'Ein Satz bis kurz vor Versagen, saubere Technik.'}</p>`
        : it.failLast && setCount > 1 ? `<p class="rir">Satz 1–${setCount - 1}: ${r} Wdh. im Tank. Letzter Satz darf ans Versagen.</p>`
          : def.mode === 'time' ? '<p class="rir">Sauber bis zur Zielzeit halten. Der Timer endet von selbst, am Ende der Übung gibst du die Anstrengung (RPE) an.</p>'
          : `<p class="rir">Alle Sätze mit ${r} Wdh. im Tank${it.noFailure ? ', kein Versagen' : ''}. ${helpDot('rir')}</p>`;

  const nextK = entry.sets.findIndex((x) => !x.done);
  const slash = (k) => (a.justDone && a.justDone.i === i && a.justDone.k === k && Date.now() - a.justDone.at < 900 ? ' slash' : '');
  const rows = entry.sets.map((s, k) => {
    const isNext = nextK === k;
    const prev = last?.sets?.[k];
    const lastLine = !fixed && prev ? `<small class="set-last">zuletzt ${esc(lastSetText(def, prev))}</small>` : '';
    // Timer: läuft für diesen Satz, oder Start-Knopf für den nächsten offenen Satz
    let timer = '';
    if (hasTimer && ct?.k === k) {
      const st = timerState(ct, Date.now());
      timer = `<button class="set-timer run${st.over ? ' over' : ''}" data-act="t-timer-stop" data-k="${k}" aria-label="Timer stoppen">
        <b class="num" data-timer="${ct.startAt}" data-target="${ct.target}">${st.over ? `+${fmt(st.elapsed - st.target)}` : fmt(st.left)}</b><small>Stopp · Zeit loggen</small></button>`;
    } else if (hasTimer && isNext && !ct) {
      timer = `<button class="set-timer" data-act="t-timer" data-k="${k}" aria-label="Timer starten"><b>▶ Timer</b><small>${fmt(timerTarget(def, s))}</small></button>`;
    }
    if (fixed) {
      return `<div class="set-wrap"><div class="set-row${s.done ? ' done' : ''}${isNext ? ' next' : ''}${slash(k)}"><span class="set-n">${k + 1}</span>
        <div class="set-fixed">${targetText(def)}${s.sec ? ` <small class="muted">· ${fmt(s.sec)}</small>` : ''}</div>
        <button class="check" data-act="t-done" data-k="${k}" aria-label="Erledigt">✓</button></div>${timer}</div>`;
    }
    const step = def.mode === 'time' ? 5 : 1;
    const sides = def.perSide && def.mode === 'reps';
    const tag = s.label === 'Top-Satz' ? 'TOP' : s.label === 'Backdown' ? 'BD' : null;
    return `<div class="set-wrap${s.done ? ' done' : ''}">${s.label && !tag ? `<small class="set-dir">${esc(s.label)}${it.holdReps > 1 ? ` · ${it.holdReps} × ${s.value} s` : ''}</small>` : ''}<div class="set-row${s.done ? ' done' : ''}${isNext ? ' next' : ''}${slash(k)}"><span class="set-n">${tag ? `<i class="set-tag">${tag}</i>` : k + 1}</span>
      <div class="set-mid">${sides
        ? `<div class="sides">${stepper('t-side', `${s.left ?? s.value}`, 'links', { idx: `${k}:L` })}${stepper('t-side', `${s.right ?? s.value}`, 'rechts', { idx: `${k}:R` })}</div>`
        : stepper('t-val', `${s.value}`, def.mode === 'time' ? 's' : 'Wdh.', { idx: `${k}:${step}`, big: true })}${lastLine}</div>
      ${loadable && s.done ? `<small class="set-load">${kg(s.load)} kg</small>` : ''}
      <button class="check" data-act="t-done" data-k="${k}" aria-label="Satz erledigt">✓</button></div>
      ${timer}${showRir && s.done ? rirChips(k, s.rir) : ''}</div>`;
  }).join('');

  const open = entry.sets.find((s) => !s.done) || entry.sets[entry.sets.length - 1];
  const loadRow = loadable ? `<div class="load-row"><span>${def.load === 'belt' ? 'Zusatzgewicht' : 'Gewicht'}
      <button class="fix-toggle${it.fixed ? ' on' : ''}" data-act="t-fix" aria-pressed="${!!it.fixed}">${it.fixed ? '■ fix' : '□ fix'}</button></span>
    ${stepper('t-load', kg(open.load), 'kg')}</div>
    ${it.fixed ? '<p class="muted small">Gewicht fix: Die App steigert über mehr Wdh., dann +1 Satz, dann langsameres Tempo, dann die schwerere Stufe.</p>' : ''}` : '';
  const ramp = rampBlock(c, a, i, it, def, open);
  const ss = supersetBlock(a, i);
  const allDone = entry.sets.every((s) => s.done);
  const effort = allDone ? `<div class="effort${entry.rpe ? ' set' : ''}"><small>Wie hart war das? RPE</small>
    <div class="rpe-chips">${Array.from({ length: 10 }, (_, k) => k + 1).map((v) => `<button class="${entry.rpe === v ? 'on' : ''}" data-act="t-rpe" data-v="${v}">${v}</button>`).join('')}</div>
    <div class="effort-scale"><span>locker</span><span>maximal</span></div></div>` : '';
  const lastFull = last ? `<div class="last-sets">${last.sets.map((x, k) => `<span><i>${k + 1}</i>${esc(lastSetText(def, x))}</span>`).join('')}</div>` : '<b>–</b>';
  const isLast = i === n - 1;
  return `${head(c, a, `${i + 1}/${n}`, comp)}
    <nav class="t-dots">${p.items.map((x, k) => {
      const done = a.log[k].sets.filter((s) => s.done).length;
      const st = done === a.log[k].sets.length ? 'done' : done ? 'part' : '';
      return `<button class="${st}${k === i ? ' cur' : ''}" data-act="t-goto" data-k="${k}" aria-label="Übung ${k + 1}"></button>`;
    }).join('')}</nav>
    <section class="t-card">
      <div class="t-name"><h1>${esc(def.name)}${it.optional ? ' <em>optional</em>' : ''}</h1><div class="row gap"><button class="info" data-act="t-swap" aria-label="Übung tauschen">⇄</button><button class="info" data-act="t-info" data-id="${def.id}" aria-label="Info">i</button></div></div>
      ${ladderLine(it, def, !entry.sets.some((s) => s.done) && !!it.slotKey && a.plan.profile !== 'travel')}
      ${it.swappedFrom ? `<p class="muted small">Getauscht statt ${esc(getDef(it.swappedFrom)?.name || it.swappedFrom)} · ${it.swapScope === 'arc' ? 'für den Rest des Arcs' : 'nur heute'}</p>` : ''}
      ${glyphChips(def, { small: true })}
      ${fixed ? `<p class="t-target">${targetText(def)}${entry.sets.length > 1 ? ` · ${entry.sets.length} Runden` : ''}</p>` : `
      <div class="t-compare">
        <div><small>Letztes Mal${last ? ` · ${esc(formatShort(last.day))}` : ''}</small>${lastFull}</div>
        <span class="arrow">→</span>
        <div><small>Heute</small><b>${entry.sets.length} × ${targetText(def, it.target)}</b><em>${def.load ? esc(loadText(def, it.load)) : ''}</em></div>
      </div>${trendBadge(it.trend)}${ghostBar(def, entry, last)}`}
      ${it.adjust ? `<p class="note">${esc(it.adjust)}</p>` : ''}
      ${it.tempo ? '<p class="note">Tempo: 3 s ablassen, 1 s Pause in der Dehnung, dann kraftvoll hoch.</p>' : ''}
      ${it.levelLabel ? `<p class="note">Stufe der Übung: <b>${esc(it.levelLabel)}</b>. Drei grüne Einheiten in Folge, dann geht es eine Stufe weiter.</p>` : ''}
      ${it.wristNote ? `<p class="note">${esc(it.wristNote)}</p>` : ''}
      ${it.bothSides ? '<p class="muted small">Beide Seiten nacheinander.</p>' : ''}
      ${rir}
      ${hasTimer ? '<p class="muted small">Timer starten, Bildschirm anlassen für das Signal. Stopp loggt die echte Zeit.</p>' : ''}
      ${ss}
      ${loadRow}
      ${bandRow(c, a, i, def, entry)}
      ${ramp}
      ${is4x4(def) ? card4x4(a, i, entry) : `<div class="sets">${rows}</div>
      <div class="set-adj"><button class="btn small ghost" data-act="t-set-add">+ Satz</button>${entry.sets.length > 1 && entry.sets.some((x) => !x.done) ? '<button class="btn small ghost" data-act="t-set-del">− Satz</button>' : ''}<small class="muted">nur heute ${helpDot('sets')}</small></div>`}
      ${effort}
      ${showsElbowTap(def) && !c.data.settings.jointPause && entry.sets.some((s) => s.done)
        ? `<button class="elbow-tap${entry.elbowReported ? ' done' : ''}" data-act="t-elbow" ${entry.elbowReported ? 'disabled' : ''}>${entry.elbowReported ? 'Ellbogen gemeldet' : 'Ellbogen gezwickt'}</button>` : ''}
    </section>
    <footer class="t-nav">
      <button class="btn" data-act="t-prev" ${i === 0 ? 'disabled' : ''}>←</button>
      ${isLast ? '<button class="btn gold grow" data-act="t-finish">Mission abgeschlossen</button>'
        : '<button class="btn primary grow" data-act="t-next">Nächste Übung →</button>'}
    </footer>`;
}

// Band-Übungen: Farbe wählen (aus dem Bestand des Ortes, sonst alle Farben), wird pro Übung gemerkt
function bandRow(c, a, i, def, entry) {
  if (!(def.equipment || []).includes('band')) return '';
  const owned = c.data.settings.inventory?.[a.plan.profile]?.band || [];
  const list = owned.length ? BANDS.filter((b) => owned.includes(b.id)) : BANDS;
  const cur = entry.band || c.data.settings.bandFor?.[def.id] || null;
  return `<div class="band-row"><div class="label">Band</div><div class="chips">${list.map((b) =>
    `<button class="chip band${cur === b.id ? ' on' : ''}" data-act="t-band" data-v="${b.id}"><i class="band-dot" style="background:${b.color}"></i>${b.name} <small>(${b.kg} kg)</small></button>`).join('')}</div></div>`;
}

// Ghost-Leiste: erledigte Sätze heute gegen dieselben Sätze beim letzten Mal (Wdh. bzw. Sekunden)
function ghostBar(def, entry, last) {
  if (!last?.sets?.length || def.mode === 'fixed') return '';
  const unit = def.mode === 'time' ? 's' : 'Wdh.';
  const val = (x) => (x.left != null ? Math.min(x.left, x.right ?? x.left) : x.value) || 0;
  const doneIdx = entry.sets.map((x, k) => (x.done ? k : -1)).filter((k) => k >= 0);
  const now = doneIdx.reduce((n, k) => n + val(entry.sets[k]), 0);
  const ghostSoFar = doneIdx.reduce((n, k) => n + (last.sets[k] ? val(last.sets[k]) : 0), 0);
  const ghostAll = last.sets.reduce((n, x) => n + val(x), 0);
  const max = Math.max(ghostAll, entry.sets.reduce((n, x) => n + val(x), 0), 1) * 1.1;
  const d = now - ghostSoFar;
  const txt = !doneIdx.length ? `Schatten: ${ghostAll} ${unit}` : d > 0 ? `+${d} ${unit} vor dem Schatten` : d < 0 ? `${d} ${unit} hinter dem Schatten` : 'gleichauf mit dem Schatten';
  return `<div class="ghost-bar"><div class="gb-head"><span>Heute gegen letztes Mal</span><b class="${d < 0 ? 'behind' : ''}">${txt}</b></div>
    <div class="gb-track"><i class="gb-ghost" style="width:${Math.round((ghostAll / max) * 100)}%"></i><i class="gb-now" style="width:${Math.round((now / max) * 100)}%"></i></div></div>`;
}

// Aufwärmsätze vor schweren Grundübungen: zählen nicht, kein Log. Volle Rampe nur bei der ersten.
function rampBlock(c, a, i, it, def, open) {
  if (!rampable(def, it) || a.log[i].sets.some((s) => s.done)) return '';
  const sets = rampSets(def, open.load ?? it.load, { first: firstRampIndex(a.plan.items, getDef) === i, kbWeights: profileContext(c.data.settings, a.plan.profile).settings.kbWeights || [] });
  if (!sets.length) return '';
  const done = a.ramp?.[i] || [];
  const all = sets.every((_, k) => done[k]);
  const txt = (s) => (def.load === 'belt' ? (s.load ? `+${kg(s.load)} kg` : 'Körpergewicht') : `${kg(s.load)} kg`);
  return `<details class="ramp"${all ? '' : ' open'}><summary>Aufwärmsätze ${all ? '✓' : `· ${sets.length}`}</summary>
    ${sets.map((s, k) => `<div class="ramp-row${done[k] ? ' done' : ''}"><span>${txt(s)} × ${s.reps}<small>${esc(s.label)}</small></span>
      <button class="check" data-act="t-ramp" data-k="${k}" aria-label="Aufwärmsatz erledigt">✓</button></div>`).join('')}
    <p class="muted small">Zählt nicht als Satz. Locker, schnell, kurze Pausen. Gewicht oben anpassen, die Rampe rechnet mit. ${helpDot('ramp')}</p></details>`;
}

// Freiwilliges Superset: Vorschlag am Übungspaar, Sätze wechseln ab
const pairOf = (a, i) => supersetOptions(a.plan.items).find((o) => o.a === i || o.b === i) || null;
const activePair = (a, i) => { const o = pairOf(a, i); return o && a.supersets?.includes(`${o.a}:${o.b}`) ? o : null; };
function supersetBlock(a, i) {
  const o = pairOf(a, i);
  if (!o) return '';
  const other = getDef(a.plan.items[o.a === i ? o.b : o.a].exId).name;
  if (activePair(a, i)) {
    return `<div class="superset on"><div><span class="ss-tag">SUPERSET</span> mit ${esc(other)}<small>${esc(o.why)} · ${SUPERSET_REST} s Wechsel, Pause nach dem Paar</small></div>
      <button class="btn small ghost" data-act="t-superset" data-v="off">Beenden</button></div>`;
  }
  return `<div class="superset"><div>Zeit sparen: als Superset mit <b>${esc(other)}</b>?<small>${esc(o.why)} · Sätze wechseln ab</small></div>
    <span class="row gap">${helpDot('superset')}<button class="btn small" data-act="t-superset" data-v="on">Superset</button></span></div>`;
}

// 4x4 in der Übungskarte (FORGE, Arc III): Phasen-Timer, danach RPE pro Intervall
function card4x4(a, i, entry) {
  const phases = intervalPhases(IV4);
  const iv = a.cardIv?.i === i ? a.cardIv : null;
  if (entry.sets.every((x) => x.done)) {
    const rpe = entry.intervals?.rpe || [];
    return `<p class="t-target">RPE pro Intervall</p>${Array.from({ length: 4 }, (_, k) => `<div class="rpe-row"><small>Intervall ${k + 1}</small>
      <div class="rpe-chips">${Array.from({ length: 10 }, (_, v) => `<button class="${rpe[k] === v + 1 ? 'on' : ''}" data-act="t-c4-rpe" data-k="${k}" data-v="${v + 1}">${v + 1}</button>`).join('')}</div></div>`).join('')}
      <div class="field"><span>Meter gesamt (optional)</span><input class="search" data-input="t-c4-meters" inputmode="numeric" value="${entry.intervals?.meters || ''}" autocomplete="off"></div>`;
  }
  if (!iv) return `<p class="muted">3 min Aufwärmen · 4 × (4 min hart, 3 min aktiv) · 3 min Auslaufen</p><button class="btn primary wide" data-act="t-c4-start">4x4-Timer starten</button>`;
  const now = Date.now();
  const st = phaseAt(phases, iv.startAt, now, iv);
  const label = st.phase === 'work' ? `Intervall ${st.round}/4 · ${PHASE_LABEL.work}` : PHASE_LABEL[st.phase];
  return `<div class="center iv-card phase-${st.phase}"><p class="t-target">${esc(label)}</p>
    <b class="clock num" ${iv.pausedAt ? '' : `data-clock="${now + st.left * 1000}"`}>${fmt(st.left)}</b>
    <div class="row gap center"><button class="btn" data-act="t-c4-pause">${iv.pausedAt ? 'Weiter' : 'Pause'}</button><button class="btn ghost" data-act="t-c4-skip">Phase überspringen</button></div>
    <p class="muted small">Bildschirm anlassen für das Signal.</p></div>`;
}

const formatShort = (day) => { const [, m, d] = day.split('-'); return `${Number(d)}.${Number(m)}.`; };

// Gesamtzeit der Einheit (lange Unterbrechungen zählen nicht, wie beim Verbuchen)
const elapsedOf = (a, now = Date.now()) => fmt(Math.floor(activeMinutes([a.startedAt, ...(a.marks || []), now]).ms / 1000));

function head(c, a, counter, comp) {
  // Beim Scrollen wird der Kopf zur schwebenden Leiste: aktuelle Übung und Satz statt Missionsname
  const entry = a.log?.[a.index];
  const sets = entry?.sets || [];
  const mini = entry?.exId && sets.length ? `${esc(getDef(entry.exId).name)} · Satz ${Math.min(sets.length, sets.filter((s) => s.done).length + 1)}/${sets.length}` : '';
  return `<header class="t-head"><button class="icon-btn" data-act="t-menu" aria-label="Menü">☰</button>
    <div><small>${a.plan.modifier?.type === 'deload' ? 'Deload' : a.plan.modifier?.type === 'comeback' ? 'Wiedereinstieg' : 'Mission'}</small><b>${esc(a.plan.name)}</b>${mini ? `<em class="t-mini">${mini}</em>` : ''}</div>
    <span class="t-head-r"><b class="num t-elapsed" data-elapsed aria-label="Gesamtzeit">${elapsedOf(a)}</b><small class="num">${counter}</small></span></header>
    <div class="t-progress"><i style="width:${Math.round(comp * 100)}%"></i></div>`;
}

function itemList(p) {
  return `<ol class="ex-list big">${p.items.map((it) => {
    const def = getDef(it.exId);
    const v = `${it.value} ${def.unit || (def.mode === 'time' ? 's' : '')}${def.perSide ? ' je Seite' : ''}`;
    const l = def.load && it.load ? ` · ${loadText(def, it.load)}` : '';
    return `<li><button class="link" data-act="t-info" data-id="${def.id}">${esc(def.name)}</button><span>${v}${l}</span></li>`;
  }).join('')}</ol>`;
}

// Vorher (Zirkel, SHADOWSTEP, 4x4): allgemeines Aufwärmen und der freie Mobility-Block. Wird nicht getrackt.
function prepBlock(a) {
  if (!['mission', 'express'].includes(a.plan.kind) || a.roundsDone > 0 || a.clockEnd || a.iv?.startAt) return '';
  const cues = (id) => `<ul class="cues">${getDef(id).cues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<details class="ramp prep" open><summary>Vorher · Aufwärmen und Mobility-Block</summary>
    <div class="label">General Warm-Up · 5–10 min</div>${cues('warmup_general')}
    <div class="label">Mobility-Block · 3–5 min, frei</div>${cues('mobility_block')}</details>`;
}

function circuitView(c, a) {
  const p = a.plan;
  const done = a.roundsDone;
  return `${head(c, a, `${done}/${p.rounds}`, completionOf(a))}
    <section class="t-card">
      <div class="rounds">${Array.from({ length: p.rounds }, (_, k) => `<i class="${k < done ? 'on' : ''}"></i>`).join('')}</div>
      <p class="t-target">${done < p.rounds ? `Runde ${done + 1} von ${p.rounds}` : 'Alle Runden geschafft'}${p.light ? ' · ruhiges Tempo' : ''}</p>
      <p class="rir">Übungen ohne Pause nacheinander. ${p.restBetween / 60} min Pause nach jeder Runde.</p>
      ${prepBlock(a)}
      ${p.wristPrelude ? `<div class="wrist-prelude"><div class="label">Vorher · Handgelenk-Aktivierung (3–4 min)</div>${itemList({ items: p.wristPrelude.map((x) => ({ exId: x.exId, value: x.target })) })}</div>` : ''}
      ${itemList(p)}
    </section>
    <footer class="t-nav">${done < p.rounds
      ? `<button class="btn primary grow" data-act="t-round">Runde ${done + 1} abgeschlossen</button>`
      : '<button class="btn" data-act="t-round">+ Runde</button>'}
      <button class="btn ${done >= p.rounds ? 'gold grow' : ''}" data-act="t-finish">${done >= p.rounds ? 'Mission abgeschlossen' : 'Beenden'}</button></footer>`;
}

function amrapView(c, a) {
  const p = a.plan;
  const running = !!a.clockEnd;
  return `${head(c, a, `${a.roundsDone} R`, running ? 1 - Math.max(0, a.clockEnd - Date.now()) / 900000 : 0)}
    <section class="t-card center">
      <b class="clock num" ${running && !a.clockFired ? `data-clock="${a.clockEnd}"` : ''}>${running ? (a.clockFired ? 'Zeit!' : fmt((a.clockEnd - Date.now()) / 1000)) : '15:00'}</b>
      ${running ? '' : `${prepBlock(a)}<button class="btn primary wide" data-act="t-clock">Uhr starten</button>`}
      <div class="counter"><small>Runden</small><b class="num">${a.roundsDone}</b></div>
      <div class="row gap center"><button class="btn" data-act="t-round-minus">−1</button><button class="btn primary big" data-act="t-round-plus">+1 Runde</button></div>
      ${itemList(p)}
    </section>
    <footer class="t-nav"><button class="btn gold grow" data-act="t-finish">Mission abgeschlossen</button></footer>`;
}

function intervalView(c, a) {
  const p = a.plan;
  const phases = intervalPhases(p);
  const iv = a.iv;
  const now = Date.now();
  const st = iv?.startAt ? phaseAt(phases, iv.startAt, now, iv) : null;
  const done = st?.phase === 'done' || iv?.ended;
  const exName = esc(getDef(p.exId).name);
  const plan = `${p.warmup ? `${p.warmup / 60} min Aufwärmen · ` : ''}${p.rounds} × ${p.work / 60} min, ${p.rest / 60} min ${p.warmup ? 'aktive ' : ''}Pause${p.cooldown ? ` · ${p.cooldown / 60} min Auslaufen` : ''}`;
  if (done && p.rpeLog) return ivLogView(c, a);
  const label = !st ? 'Bereit' : done ? 'Fertig'
    : st.phase === 'work' ? (p.calm ? 'Locker · Zone 2' : `Intervall ${st.round}/${p.rounds} · ${PHASE_LABEL.work}`) : PHASE_LABEL[st.phase];
  const next = st && !done ? phases[st.index + 1] : null;
  const running = st && !done && !iv.pausedAt;
  return `${head(c, a, `${a.roundsDone}/${p.rounds}`, completionOf(a))}
    <section class="t-card center iv-card phase-${st?.phase || 'ready'}">
      <p class="t-target">${esc(label)}</p>
      <b class="clock num ${st && st.phase !== 'work' ? 'calm' : ''}" ${running ? `data-clock="${now + st.left * 1000}"` : ''}>${st ? fmt(done ? 0 : st.left) : fmt(phases[0].sec)}</b>
      <div class="rounds">${Array.from({ length: p.rounds }, (_, k) => `<i class="${k < a.roundsDone ? 'on' : ''}"></i>`).join('')}</div>
      ${next ? `<p class="muted">Danach: ${PHASE_LABEL[next.phase]} · ${fmt(next.sec)}</p>` : ''}
      ${!iv ? `${prepBlock(a)}<button class="btn primary wide" data-act="t-iv-start">Start</button>` : !done ? `<div class="row gap center">
        <button class="btn" data-act="t-iv-pause">${iv.pausedAt ? 'Weiter' : 'Pause'}</button>
        <button class="btn ghost" data-act="t-iv-skip">Phase überspringen</button></div>` : ''}
      <p class="muted">${exName}: ${plan}.</p>
      <p class="muted small">Bildschirm anlassen für das Signal. Ein Ton = hart, zwei = Pause, drei = fertig.</p>
    </section>
    <footer class="t-nav"><button class="btn gold grow" data-act="t-finish">${done ? 'Mission abgeschlossen' : 'Beenden'}</button></footer>`;
}

// Nach dem 4x4: RPE pro Intervall (1–10), optional Meter oder Notiz
function ivLogView(c, a) {
  const p = a.plan;
  const log = a.ivLog || { rpe: [] };
  const n = Math.max(1, a.roundsDone);
  const rows = Array.from({ length: n }, (_, k) => `<div class="rpe-row"><small>Intervall ${k + 1}</small>
    <div class="rpe-chips">${Array.from({ length: 10 }, (_, v) => `<button class="${log.rpe[k] === v + 1 ? 'on' : ''}" data-act="t-iv-rpe" data-k="${k}" data-v="${v + 1}">${v + 1}</button>`).join('')}</div></div>`).join('');
  const rower = p.exId.startsWith('rower');
  return `${head(c, a, `${a.roundsDone}/${p.rounds}`, 1)}
    <section class="t-card">
      <p class="t-target">Wie hart war jedes Intervall? (RPE 1–10)</p>
      ${rows}
      <div class="field"><span>${rower ? 'Meter gesamt (optional)' : 'Runden oder Notiz (optional)'}</span>
        <input class="search" data-input="${rower ? 't-iv-meters' : 't-iv-note'}" inputmode="${rower ? 'numeric' : 'text'}" value="${esc(String((rower ? log.meters : log.note) || ''))}" autocomplete="off"></div>
    </section>
    <footer class="t-nav"><button class="btn gold grow" data-act="t-finish">Mission abgeschlossen</button></footer>`;
}

// ——— FLOW ———
const FLOW_SWITCH = 10; // Sekunden zum Umpositionieren zwischen zwei Übungen
function flowSeq(p) {
  if (p.seq) return p.seq; // HANDS: feste Folge mit Timer- und Wiederholungsschritten
  const seq = [];
  for (let r = 0; r < p.rounds; r++) p.items.forEach((it) => seq.push({ ...it, round: r + 1 }));
  return seq;
}

function advanceFlow(c, auto) {
  const a = c.data.active;
  const seq = flowSeq(a.plan);
  const i = a.flow.i + 1;
  if (i >= seq.length) {
    a.flow = { i: seq.length, done: true };
    a.roundsDone = a.plan.rounds;
    if (a.plan.seq) signal(3); else playTone('bell');
  } else {
    const st = seq[i];
    const now = Date.now();
    if (!a.plan.seq) {
      // FLOW: 10 s Umpositionieren, Doppelton = Übung zu Ende, 3-2-1-Klicks, Glocke = nächste Übung beginnt
      a.flow = { i, switchUntil: now + FLOW_SWITCH * 1000, endAt: now + (FLOW_SWITCH + a.plan.work) * 1000 };
      playTone('next');
    } else {
      // Wiederholungsschritt (HANDS): keine Uhr, weiter per Tipp
      a.flow = st.reps && !st.sec ? { i } : { i, endAt: now + (st.sec || a.plan.work) * 1000 };
      if (auto) beep(1, 660);
    }
  }
  save(c);
}

function flowView(c, a) {
  const p = a.plan;
  const seq = flowSeq(p);
  const f = a.flow;
  if (p.hands || p.feet) return handsView(c, a, seq, f);
  if (!f) {
    return `${head(c, a, `${seq.length}×`, 0)}
      <section class="t-card"><p class="t-target">${p.items.length} Positionen à ${p.work} s, ${p.rounds} Runden</p>
      <p class="rir">Weich in die Position, darin bewegen, atmen. Nie erzwingen.</p>${itemList({ items: p.items.map((x) => ({ ...x, value: p.work })) })}</section>
      <footer class="t-nav"><button class="btn primary grow" data-act="t-flow-start">FLOW starten</button></footer>`;
  }
  if (f.done) {
    return `${head(c, a, '✓', 1)}<section class="t-card center"><p class="t-target">FLOW abgeschlossen.</p></section>
      <footer class="t-nav"><button class="btn gold grow" data-act="t-finish">Abschließen</button></footer>`;
  }
  const cur = seq[f.i];
  const def = getDef(cur.exId);
  const next = seq[f.i + 1];
  const switching = f.switchUntil || (f.paused && f.switchLeft > 0);
  if (switching) {
    const sl = f.paused ? f.switchLeft : (f.switchUntil - Date.now()) / 1000;
    return `${head(c, a, `${f.i + 1}/${seq.length}`, f.i / seq.length)}
    <section class="t-card center flow switch">
      <small class="muted">Umpositionieren · gleich geht es weiter</small>
      <h1>${esc(def.name)}</h1>
      <b class="clock num calm" ${f.paused ? '' : `data-clock="${f.switchUntil}"`}>${fmt(sl)}</b>
      <ul class="cues">${def.cues.slice(0, 2).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="muted small">Doppelton = Übung zu Ende · Klicks = 3, 2, 1 · Glocke = los</p>
    </section>
    <footer class="t-nav"><button class="btn" data-act="t-flow-pause">${f.paused ? 'Weiter' : 'Pause'}</button><button class="btn primary grow" data-act="t-flow-skip">Jetzt starten</button></footer>`;
  }
  const left = f.paused ? f.left : (f.endAt - Date.now()) / 1000;
  return `${head(c, a, `${f.i + 1}/${seq.length}`, f.i / seq.length)}
    <section class="t-card center flow">
      <small class="muted">Runde ${cur.round} von ${p.rounds}${cur.focus ? ' · <b class="focus">Fokus</b>' : ''}</small>
      <h1>${esc(def.name)}</h1>
      <b class="clock num" ${f.paused ? '' : `data-clock="${f.endAt}"`}>${fmt(left)}</b>
      ${def.perSide ? '<p class="note">Seite nach der Hälfte wechseln.</p>' : ''}
      <ul class="cues">${def.cues.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${next ? `<p class="muted">Als Nächstes: ${esc(getDef(next.exId).name)}</p>` : ''}
    </section>
    <footer class="t-nav"><button class="btn" data-act="t-flow-pause">${f.paused ? 'Weiter' : 'Pause'}</button><button class="btn primary grow" data-act="t-flow-skip">Nächste</button></footer>`;
}

// HANDS: geführte Folge, Timer für Dehnungen, Wiederholungszähler für alles andere
function handsView(c, a, seq, f) {
  const p = a.plan;
  if (!f) {
    const first = p.feet ? !c.data.settings.feetIntroSeen : !c.data.settings.handsIntroSeen;
    const intro = p.feet ? 'Ein Wächter, der nicht steht, fällt.' : 'Ein Kämpfer ist nur so stark wie seine Hände.';
    return `${head(c, a, `${seq.length}`, 0)}
      <section class="t-card">${first ? `<p class="lore">${intro}</p>` : ''}
      ${p.feet && first ? `<details class="info-card" open><summary>Wann zum Arzt</summary><ul class="cues">${FEET_SIGNS.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
      <p class="t-target">${p.feet ? `${esc(p.focus)} · ca. ${p.minutes} min` : '5 Minuten für Hände und Handgelenke'}</p>
      ${p.weak ? `<p class="note">Die ${p.weak === 'l' ? 'linke' : 'rechte'} Seite ist laut Fuß-Check schwächer und bekommt bei einbeinigen Übungen einen Satz mehr.</p>` : ''}
      ${p.noJumps ? '<p class="note">Morgen hartes Sparring: heute ohne Sprünge, dafür schweres einbeiniges Fersenheben.</p>' : ''}
      <ol class="ex-list big">${p.items.map((it) => { const e = seq.find((x) => x.exId === it.exId); const n = seq.filter((x) => x.exId === it.exId).length;
        return `<li><button class="link" data-act="t-info" data-id="${it.exId}">${esc(getDef(it.exId).name)}</button><span>${n > 1 ? `${n} × ` : ''}${e.sec ? `${e.sec} s` : `${e.reps}`}</span></li>`; }).join('')}</ol>
      <p class="muted small">${p.feet ? 'Barfuß, Zehen bleiben lang. Einbeinig: Wand in Reichweite.' : 'Dehnungen nicht zusätzlich Richtung Kleinfinger kippen. Alles im schmerzfreien Bereich.'}</p></section>
      <footer class="t-nav"><button class="btn primary grow" data-act="t-flow-start">${p.feet ? 'FEET' : 'HANDS'} starten</button></footer>`;
  }
  if (f.done && p.feet) {
    return `${head(c, a, '✓', 1)}<section class="t-card center"><p class="t-target">FEET erledigt.</p><p class="muted">Stufe ${p.stage} · ${esc(p.focus)}</p></section>
      <footer class="t-nav"><button class="btn gold grow" data-act="t-finish">Abschließen</button></footer>`;
  }
  if (f.done) {
    return `${head(c, a, '✓', 1)}<section class="t-card center"><p class="t-target">HANDS erledigt.</p>
      <div class="label">Handgelenk-Gefühl (optional)</div>
      <div class="effort-chips mood">${[1, 2, 3, 4, 5].map((v) => `<button class="${a.feel === v ? 'on' : ''}" data-act="t-hands-feel" data-v="${v}">${v}</button>`).join('')}</div>
      <div class="effort-scale"><span>steif</span><span>frei</span></div></section>
      <footer class="t-nav"><button class="btn gold grow" data-act="t-finish">Abschließen</button></footer>`;
  }
  const cur = seq[f.i];
  const def = getDef(cur.exId);
  const next = seq[f.i + 1];
  const timed = !!cur.sec;
  const left = timed ? (f.paused ? f.left : (f.endAt - Date.now()) / 1000) : 0;
  return `${head(c, a, `${f.i + 1}/${seq.length}`, f.i / seq.length)}
    <section class="t-card center flow">
      <small class="muted">${cur.side ? `<b class="side-tag">${cur.side === 'l' ? 'Links' : 'Rechts'}</b> · ` : ''}${cur.of > 1 ? `Satz ${cur.round} von ${cur.of}` : '&nbsp;'}${cur.extra ? ' · Extra-Satz schwächere Seite' : ''}</small>
      <h1>${esc(def.name)}</h1>
      ${timed ? `<b class="clock num" ${f.paused ? '' : `data-clock="${f.endAt}"`}>${fmt(left)}</b>` : `<b class="clock num">${cur.reps}<small class="reps-unit"> Wdh.</small></b>`}
      ${cur.label ? `<p class="note">${esc(cur.label)}</p>` : ''}
      <ul class="cues">${def.cues.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${next ? `<p class="muted">Als Nächstes: ${esc(getDef(next.exId).name)}</p>` : ''}
    </section>
    <footer class="t-nav">${timed ? `<button class="btn" data-act="t-flow-pause">${f.paused ? 'Weiter' : 'Pause'}</button>` : ''}<button class="btn primary grow" data-act="t-flow-skip">${timed ? 'Nächste' : 'Fertig →'}</button></footer>`;
}

// ——— Abschluss ———
function finish(c) {
  const before = rankFor(totalXp(c.data));
  const active = c.data.active;
  let result;
  c.update((data) => {
    result = finishSession(data, active);
    return result.data;
  });
  rest = null;
  drawRest();
  keepAwake(false);
  const after = rankFor(totalXp(c.data));
  const s = result.session;
  const rec = s.records.map((r) => {
    if (r.exId === 'EXPRESS') return `<li>SHADOWSTEP: ${r.value} Runden</li>`;
    const def = getDef(r.exId);
    return `<li>${esc(def.name)}: ${r.value}${def.mode === 'time' ? ' s' : ''}${r.load ? ` · ${esc(loadText(def, r.load))}` : ''}</li>`;
  }).join('');
  const title = s.kind === 'flow' ? 'FLOW abgeschlossen.' : s.kind === 'hands' ? 'HANDS erledigt.' : s.kind === 'feet' ? 'FEET erledigt.' : s.kind === 'wrist' ? 'Handgelenk-Block erledigt.'
    : s.completion >= 0.999 ? 'Mission abgeschlossen.' : 'Einsatz verbucht.';
  const rankUp = after.index > before.index;
  const quote = quoteAfterMission(c.data, s);
  const reps = (s.exercises || []).reduce((n, e) => n + (e.sets || []).filter((x) => x.done && getDef(e.exId)?.mode === 'reps').reduce((m, x) => m + (x.value || 0), 0), 0);
  setStory({ kicker: s.completion >= 0.999 ? 'MISSION ABGESCHLOSSEN' : 'EINSATZ VERBUCHT', title: (MISSIONS_ALL[s.missionId]?.name || title).replace('.', ''),
    stats: [[s.minutes, 'Minuten'], reps ? [reps, 'Wiederholungen'] : [s.xp, 'XP'], [s.records?.length ? `+${s.records.length}` : `+${s.xp}`, s.records?.length ? 'Bestwerte' : 'XP']] });
  const burst = `<div class="victory-burst" aria-hidden="true">${Array.from({ length: 16 }, (_, k) => { const ang = (k / 16) * Math.PI * 2; const d = 60 + (k % 3) * 30; return `<i style="--vx:${Math.round(Math.cos(ang) * d)}px;--vy:${Math.round(Math.sin(ang) * d)}px;animation-delay:${(k % 4) * 0.04}s"></i>`; }).join('')}</div>`;
  c.go('heute');
  c.system(rankUp ? 'Rang-Prüfung bestanden' : title, `${burst}${rankUp ? `<div class="rankup epic">${guardianImage(guardianTier(after.id), { cls: 'rankup-guardian' })}
      <small>Neuer Rang</small><b>${esc(rankName(after))}</b></div>` : ''}
    <div class="xp-gain num">+${s.xp} XP</div>
    <dl class="session-eval"><div><dt>Dauer</dt><dd class="num">${s.minutes} min</dd></div>
      ${s.intensity != null ? `<div><dt>Intensität</dt><dd class="num">${s.intensity.toLocaleString('de-DE', { minimumFractionDigits: 1 })}</dd></div>` : ''}
      ${s.load ? `<div><dt>Trainingslast</dt><dd class="num">${s.load}</dd></div>` : ''}</dl>
    ${s.completion < 0.999 && s.kind === 'mission' ? `<p class="muted">${Math.round(s.completion * 100)} % geschafft. Zählt trotzdem.</p>` : ''}
    ${rec ? `<div class="record"><b>Rekord gebrochen</b><ul>${rec}</ul></div>` : ''}
    ${painPrompt(c, s)}
    ${quote ? `<blockquote class="quote">„${esc(quote.text)}“<cite>${esc(quote.person)} · ${esc(quote.source)}</cite></blockquote>` : ''}`,
  [['close-modal', 'Weiter', 'primary'], ['story-share', 'Story-Karte teilen']], `${rankUp ? 'gold aura' : rec ? 'gold' : 'sys'} victory`);
}

// ±15 s: läuft sofort und wird pro Übung gemerkt (gilt ab dem nächsten Satz)
function adjustRest(c, dir) {
  if (!rest) return;
  rest.endAt = Math.max(Date.now() + 1000, Math.max(rest.endAt, Date.now()) + dir * REST_STEP * 1000);
  rest.total = Math.max(1, (rest.total || 60) + dir * REST_STEP);
  rest.fired = false;
  drawRest();
  const id = rest.exId;
  if (!id) return;
  const adj = { ...(c.data.settings.restAdjust || {}) };
  adj[id] = (adj[id] || 0) + dir * REST_STEP;
  if (!adj[id]) delete adj[id];
  c.update((data) => ({ ...data, settings: { ...data.settings, restAdjust: adj } }));
}

function swapTo(c, id, scope) {
  const a = c.data.active;
  const old = a.plan.items[a.index];
  const it = itemFor(id, { data: c.data, profile: a.plan.profile, sets: old.sets, arcN: a.plan.arc?.n });
  Object.assign(it, { noFailure: old.noFailure, rir: old.rir, failLast: old.failLast, main: old.main, slotKey: old.slotKey,
    optional: old.optional, swappedFrom: old.swappedFrom || old.exId, swapScope: scope });
  a.plan.items[a.index] = it;
  a.log[a.index] = { key: it.key, exId: it.exId,
    sets: Array.from({ length: it.sets }, () => ({ value: it.target, load: it.load, done: false })) };
  c.modal(null);
  if (scope === 'arc' && old.slotKey) {
    // Gilt bis zum Arc-Wechsel; danach wieder der geplante Platz
    c.update((data) => ({ ...data, engine: { ...data.engine, arcSwaps: { ...(data.engine.arcSwaps || {}), [old.slotKey]: { id, arc: a.plan.arc.n, from: old.exId } } } }));
  } else save(c);
}

const training = {
  render(c) {
    const a = c.data.active;
    if (!a) return sys('Keine Mission aktiv', '<p>Starte eine Mission unter „Heute“.</p><button class="btn primary wide" data-act="go" data-to="heute">Zu Heute</button>');
    const p = a.plan;
    if (p.format === 'sets') return setsView(c, a);
    if (p.format === 'circuit') return circuitView(c, a);
    if (p.format === 'amrap') return amrapView(c, a);
    if (p.format === 'intervals') return intervalView(c, a);
    return flowView(c, a);
  },
  onInput(c, name, value) {
    if (name === 't-swap-q') {
      // Suche filtert direkt im Modal; bei Suche zählen alle Gruppen
      const q = value.trim().toLowerCase();
      document.querySelectorAll('[data-swap-list] .swap').forEach((el) => { el.hidden = !!q && !el.dataset.name.includes(q); });
      document.querySelectorAll('[data-swap-list] .label').forEach((el) => { el.hidden = !!q; });
      return;
    }
    const a = c.data.active;
    if (!a) return;
    a.ivLog ||= { rpe: [] };
    if (name === 't-iv-meters') a.ivLog.meters = Number(value.replace(/\D/g, '')) || null;
    if (name === 't-iv-note') a.ivLog.note = value.slice(0, 120);
    if (name === 't-c4-meters') {
      const e = a.log[a.index];
      e.intervals ||= { rpe: [] };
      e.intervals.meters = Number(value.replace(/\D/g, '')) || null;
    }
  },
  mount(c) {
    if (!c.data.active) return;
    keepAwake(true);
    startTicker(c);
    drawRest();
  },
  actions: {
    't-val': (c, d) => {
      const a = c.data.active;
      const [k, step] = d.idx.split(':').map(Number);
      const s = a.log[a.index].sets[k];
      s.value = Math.max(0, s.value + Number(d.dir) * step);
      save(c);
    },
    // Je Seite: links/rechts getrennt, gewertet wird die schwächere Seite
    't-side': (c, d) => {
      const a = c.data.active;
      const [k, side] = d.idx.split(':');
      const s = a.log[a.index].sets[Number(k)];
      s.left ??= s.value;
      s.right ??= s.value;
      if (side === 'L') s.left = Math.max(0, s.left + Number(d.dir)); else s.right = Math.max(0, s.right + Number(d.dir));
      s.value = Math.min(s.left, s.right);
      save(c);
    },
    't-load': (c, d) => {
      const a = c.data.active;
      const it = a.plan.items[a.index];
      const sets = a.log[a.index].sets;
      const open = sets.find((s) => !s.done) || sets[sets.length - 1];
      const nl = stepLoad(it.ladder, open.load, Number(d.dir));
      if (it.topSet && open.label === 'Top-Satz') {
        // Top-Satz bestimmt den Backdown: ca. 18 % weniger.
        open.load = nl;
        sets.forEach((s) => { if (!s.done && s.label === 'Backdown') s.load = snap(it.ladder, nl * 0.82); });
      } else {
        // Neue Last gilt für alle offenen Sätze.
        sets.forEach((s) => { if (!s.done) s.load = nl; });
        if (sets.every((s) => s.done)) sets[sets.length - 1].load = nl;
      }
      save(c);
    },
    't-done': (c, d) => {
      const a = c.data.active;
      const it = a.plan.items[a.index];
      const entry = a.log[a.index];
      const sets = entry.sets;
      const k = Number(d.k);
      sets[k].done = !sets[k].done;
      a.justDone = sets[k].done ? { i: a.index, k, at: Date.now() } : null;
      if (sets[k].done) haptic();
      if (sets[k].done) {
        // RIR vorausgewählt mit dem Ziel der Arc-Woche: ein Tap, wenn es passt
        if (sets[k].rir == null && it.rir != null && !it.explosive && !['fixed', 'time'].includes(getDef(entry.exId).mode)) sets[k].rir = it.rir;
        if (a.cardTimer?.i === a.index && a.cardTimer.k === k) a.cardTimer = null;
      }
      const pair = sets[k].done ? activePair(a, a.index) : null;
      if (pair) {
        const nx = supersetNext(a.log, pair, a.index);
        if (nx.rest) {
          const defs = [pair.a, pair.b].map((x) => getDef(a.log[x].exId));
          const sec = nx.rest === 'switch' ? SUPERSET_REST
            : Math.max(...defs.map((df, x) => restFor(df, { adjust: c.data.settings.restAdjust?.[a.log[[pair.a, pair.b][x]].exId] || 0 })));
          a.index = nx.index;
          startRest(sec, nx.rest === 'switch' ? `Wechsel · ${getDef(a.log[nx.index].exId).name}` : `Pause · Superset, gleich: ${getDef(a.log[nx.index].exId).name}`, entry.exId);
          save(c);
          return;
        }
      }
      const lastOverall = a.index === a.plan.items.length - 1 && sets.every((s) => s.done);
      if (sets[k].done && !lastOverall) {
        const def = getDef(entry.exId);
        const restSec = restFor(def, { topSet: sets[k].label === 'Top-Satz', rir: sets[k].rir ?? null,
          adjust: c.data.settings.restAdjust?.[entry.exId] || 0 });
        // Letzter Satz: auf der Karte bleiben, bis die Belastung getippt ist
        if (sets.every((s) => s.done)) startRest(restSec, `Pause · gleich: ${getDef(a.log[a.index + 1].exId).name}`, entry.exId);
        else {
          startRest(restSec, def.mode === 'fixed' && def.unit === 'min' ? `Pause · gleich Runde ${sets.filter((s) => s.done).length + 1}` : 'Pause', entry.exId);
          // Vor dem letzten Satz einer Hauptübung: „Reset?“ (TEMPER ab Episode 26, abschaltbar)
          rest.resetOffer = it.main && sets.filter((s) => !s.done).length === 1 && c.data.settings.temperResetHint !== false && book1Reached(c.data) >= 26;
        }
      }
      save(c);
    },
    // Sätze nur für diese Einheit: + kopiert den letzten Satz (Ziel und Gewicht), − entfernt den letzten offenen
    't-set-add': (c) => {
      const a = c.data.active;
      const sets = a.log[a.index].sets;
      const last = sets[sets.length - 1];
      sets.push({ value: last.value, load: last.load, ...(last.left != null ? { left: last.value, right: last.value } : {}), done: false });
      save(c);
    },
    't-set-del': (c) => {
      const a = c.data.active;
      const sets = a.log[a.index].sets;
      const k = sets.map((x) => x.done).lastIndexOf(false);
      if (sets.length > 1 && k >= 0) sets.splice(k, 1);
      save(c);
    },
    't-band': (c, d) => {
      const a = c.data.active;
      const entry = a.log[a.index];
      entry.band = d.v;
      c.data.settings = { ...c.data.settings, bandFor: { ...(c.data.settings.bandFor || {}), [entry.exId]: d.v } };
      save(c);
    },
    't-ramp': (c, d) => {
      const a = c.data.active;
      a.ramp ||= {};
      const row = a.ramp[a.index] || [];
      row[Number(d.k)] = !row[Number(d.k)];
      a.ramp[a.index] = row;
      save(c);
    },
    't-superset': (c, d) => {
      const a = c.data.active;
      const o = pairOf(a, a.index);
      if (!o) return;
      const key = `${o.a}:${o.b}`;
      a.supersets = (a.supersets || []).filter((x) => x !== key);
      if (d.v === 'on') { a.supersets.push(key); a.index = o.a; }
      save(c);
    },
    't-c4-start': (c) => { unlockAudio(); const a = c.data.active; a.cardIv = { i: a.index, startAt: Date.now(), pausedMs: 0, seen: 0 }; signal(1); save(c); },
    't-c4-pause': (c) => {
      const iv = c.data.active.cardIv;
      if (iv.pausedAt) { iv.pausedMs += Date.now() - iv.pausedAt; iv.pausedAt = null; } else iv.pausedAt = Date.now();
      save(c);
    },
    't-c4-skip': (c) => {
      const iv = c.data.active.cardIv;
      const st = phaseAt(intervalPhases(IV4), iv.startAt, Date.now(), iv);
      iv.startAt -= Math.ceil(st.left * 1000);
      if (iv.pausedAt) { iv.pausedMs += Date.now() - iv.pausedAt; iv.pausedAt = null; }
      tick(c);
    },
    't-c4-rpe': (c, d) => {
      const e = c.data.active.log[c.data.active.index];
      e.intervals ||= { rpe: [] };
      e.intervals.rpe[Number(d.k)] = Number(d.v);
      save(c);
    },
    't-rir': (c, d) => {
      const a = c.data.active;
      const set = a.log[a.index].sets[Number(d.k)];
      const was = set.rir;
      set.rir = Number(d.v);
      // RIR 0 nachgetragen: laufende Pause um 30 s verlängern
      if (set.rir === 0 && was !== 0 && rest && rest.exId === a.log[a.index].exId && rest.endAt > Date.now()) {
        rest.endAt += 30000;
        drawRest();
      }
      save(c);
    },
    't-fix': (c) => {
      const a = c.data.active;
      const it = a.plan.items[a.index];
      const sk = stateKey(a.plan.profile, it.key);
      it.fixed = !it.fixed || undefined;
      c.update((data) => {
        const fl = { ...(data.settings.fixedLoad || {}) };
        if (it.fixed) fl[sk] = true; else delete fl[sk];
        return { ...data, settings: { ...data.settings, fixedLoad: fl } };
      });
    },
    't-rpe': (c, d) => {
      const a = c.data.active;
      a.log[a.index].rpe = Number(d.v);
      if (a.index < a.plan.items.length - 1) a.index += 1;
      save(c);
    },
    't-timer': (c, d) => {
      unlockAudio();
      const a = c.data.active;
      const def = getDef(a.log[a.index].exId);
      const k = Number(d.k);
      const sets = a.log[a.index].sets;
      const target = timerTarget(def, sets[k]);
      // Runden-Übung (Sack, Seil in Minuten): alle offenen Runden am Stück mit 1 min Pause
      const ks = def.mode === 'fixed' ? sets.map((s, j) => (!s.done && j >= k ? j : -1)).filter((j) => j >= 0) : [k];
      const rounds = def.mode === 'fixed' && ks.length > 1;
      const it0 = a.plan.items[a.index];
      const phases = exercisePhases({ target, perSide: (def.perSide || it0.bothSides) && def.mode === 'time', rounds: rounds ? ks.length : 0, rest: 60, reps: it0.holdReps || 1 });
      a.cardTimer = { i: a.index, k, ks, rounds, phases, startAt: Date.now(), seen: 0, target };
      keepAwake(true);
      signal(1);
      rest = null;
      drawRest();
      save(c);
    },
    't-timer-stop': (c, d) => {
      const a = c.data.active;
      const ct = a.cardTimer;
      if (!ct) return;
      const def = getDef(a.log[ct.i].exId);
      const st = exerciseTimerAt(ct.phases, ct.startAt, Date.now());
      a.cardTimer = null;
      if (ct.rounds) {
        // Laufende Runde mit der echten Zeit abhaken, offene Runden bleiben offen
        const s = a.log[ct.i].sets[ct.ks[st.round - 1]];
        if (st.phase === 'work' && s && !s.done && st.elapsed >= 15) { s.sec = Math.round(st.elapsed); training.actions['t-done'](c, { k: ct.ks[st.round - 1] }); return; }
        save(c);
        return;
      }
      // Echte Zeit loggen (je Seite: die Zeit der zweiten Seite; Zeitübung in 5-s-Schritten wie der Stepper)
      const secs = Math.round(st.phase === 'switch' ? ct.phases[0].sec : st.elapsed);
      const s = a.log[ct.i].sets[ct.k];
      if (def.mode === 'time') s.value = Math.max(5, Math.round(secs / 5) * 5);
      else s.sec = secs;
      if (!s.done) training.actions['t-done'](c, { k: ct.k });
      else save(c);
    },
    't-swap': (c) => {
      const a = c.data.active;
      const entry = a.log[a.index];
      if (entry.sets.some((s) => s.done)) {
        c.system('Tausch nicht möglich', '<p>Für diese Übung sind schon Sätze geloggt. Tausche vor dem ersten Satz.</p>');
        return;
      }
      const g = swapGroups(entry.exId, { data: c.data, profile: a.plan.profile, today: c.today(), all: EXERCISES });
      const row = (o, why) => `<button class="swap${o.has ? '' : ' missing'}" data-act="t-swap-pick" data-id="${o.id}" data-name="${esc(o.name.toLowerCase())}"><b>${esc(o.name)}</b>
        <small>${why || (o.has ? esc(CATEGORIES[o.cat] || '') : 'Equipment fehlt im aktuellen Profil')}</small></button>`;
      c.modal(sys('Übung tauschen', `<input class="search" type="search" data-input="t-swap-q" placeholder="Alle Übungen durchsuchen …" autocomplete="off">
        <div class="swap-list" data-swap-list>
        ${g.recommended.length ? `<div class="label">Empfohlen · gleiches Muster</div>${g.recommended.map((o) => row(o, o.fills.length
          ? `<span class="focus">Lücke:</span> ${o.fills.map((x) => esc(ATTRIBUTES[x].name)).join(', ')}` : o.direct ? 'Alternative / Stufe' : 'ähnliches Muster')).join('')}` : ''}
        ${g.category.length ? `<div class="label">Gleiche Kategorie</div>${g.category.map((o) => row(o)).join('')}` : ''}
        <div class="label">Alle Übungen</div>${g.all.map((o) => row(o)).join('')}</div>
        <button class="btn ghost wide" data-act="close-modal">Abbrechen</button>`, { cls: 'pop swap-pop' }));
    },
    't-swap-pick': (c, d) => {
      const a = c.data.active;
      const it = a.plan.items[a.index];
      const arcOk = it.slotKey && a.plan.arc;
      c.ui.swapPick = d.id;
      c.system(`${getDef(d.id).name}`, `<p>Wie lange soll der Tausch gelten?</p>
        <p class="muted small">„Nur heute“ lässt die Arc-Planung und die Progression von ${esc(getDef(it.exId).name)} unberührt.</p>`,
      [['t-swap-today', 'Nur für heute', 'primary'], ...(arcOk ? [['t-swap-arc', 'Für den Rest des Arcs']] : []), ['close-modal', 'Abbrechen']]);
    },
    // Stufe jederzeit wechseln (vor dem ersten Satz): gilt ab sofort für diesen Platz
    't-step': (c, d) => {
      const a = c.data.active;
      const old = a.plan.items[a.index];
      const to = stepFrom(old.exId, Number(d.dir));
      if (!to || !old.slotKey) return;
      const it = itemFor(to, { data: c.data, profile: a.plan.profile, sets: old.sets, arcN: a.plan.arc?.n });
      Object.assign(it, { noFailure: old.noFailure, rir: old.rir, failLast: old.failLast, main: old.main, slotKey: old.slotKey, optional: old.optional });
      a.plan.items[a.index] = it;
      a.log[a.index] = { key: it.key, exId: it.exId, sets: Array.from({ length: it.sets }, () => ({ value: it.target, load: it.load, done: false })) };
      c.update((data) => logDecision({ ...data, engine: { ...data.engine, slotVariant: { ...(data.engine.slotVariant || {}), [old.slotKey]: to } } },
        { rule: `ladder:manual_${Number(d.dir) > 0 ? 'up' : 'down'}`, day: c.today(), input: { from: old.exId, slot: old.slotKey }, suggestion: to, decision: 'accepted' }));
    },
    't-swap-today': (c) => swapTo(c, c.ui.swapPick, 'today'),
    't-swap-arc': (c) => swapTo(c, c.ui.swapPick, 'arc'),
    't-elbow': (c) => {
      const a = c.data.active;
      const entry = a.log[a.index];
      if (entry.elbowReported) return;
      entry.elbowReported = true;
      c.update((data) => reportElbow(data, { day: a.day, exId: entry.exId, source: 'training' }));
    },
    't-goto': (c, d) => { c.data.active.index = Number(d.k); save(c); },
    't-next': (c) => { const a = c.data.active; a.index = Math.min(a.plan.items.length - 1, a.index + 1); save(c); },
    't-prev': (c) => { const a = c.data.active; a.index = Math.max(0, a.index - 1); save(c); },
    't-info': (c, d) => c.modal(`${exerciseDetail(getDef(d.id), { linkable: false })}<button class="btn wide" data-act="close-modal">Schließen</button>`),
    't-round': (c) => {
      const a = c.data.active;
      a.roundsDone += 1;
      if (a.roundsDone < a.plan.rounds) startRest(a.plan.restBetween, `Pause · gleich Runde ${a.roundsDone + 1}`);
      save(c);
    },
    't-clock': (c) => { c.data.active.clockEnd = Date.now() + 15 * 60000; save(c); },
    't-round-plus': (c) => { c.data.active.roundsDone += 1; save(c); },
    't-round-minus': (c) => { const a = c.data.active; a.roundsDone = Math.max(0, a.roundsDone - 1); save(c); },
    't-iv-start': (c) => { unlockAudio(); c.data.active.iv = { startAt: Date.now(), pausedMs: 0, seen: 0 }; signal(1); save(c); },
    't-iv-pause': (c) => {
      const iv = c.data.active.iv;
      if (iv.pausedAt) { iv.pausedMs += Date.now() - iv.pausedAt; iv.pausedAt = null; } else iv.pausedAt = Date.now();
      save(c);
    },
    't-iv-skip': (c) => {
      // Startzeit so verschieben, dass die aktuelle Phase jetzt endet
      const a = c.data.active;
      const st = phaseAt(intervalPhases(a.plan), a.iv.startAt, Date.now(), a.iv);
      a.iv.startAt -= Math.ceil(st.left * 1000);
      if (a.iv.pausedAt) { a.iv.pausedMs += Date.now() - a.iv.pausedAt; a.iv.pausedAt = null; }
      tick(c);
    },
    't-iv-rpe': (c, d) => {
      const a = c.data.active;
      a.ivLog ||= { rpe: [] };
      a.ivLog.rpe[Number(d.k)] = Number(d.v);
      save(c);
    },
    't-flow-start': (c) => {
      const a = c.data.active;
      const st = flowSeq(a.plan)[0];
      unlockAudio();
      a.flow = st.reps && !st.sec ? { i: 0 } : { i: 0, endAt: Date.now() + (st.sec || a.plan.work) * 1000 };
      if (!a.plan.seq) playTone('bell'); // FLOW: Glocke = los
      if (a.plan.hands && !c.data.settings.handsIntroSeen) c.data.settings = { ...c.data.settings, handsIntroSeen: true };
      if (a.plan.feet && !c.data.settings.feetIntroSeen) c.data.settings = { ...c.data.settings, feetIntroSeen: true };
      save(c);
    },
    't-hands-feel': (c, d) => { c.data.active.feel = Number(d.v); save(c); },
    't-flow-skip': (c) => {
      const a = c.data.active;
      // Im Umpositionieren: Übung sofort starten
      if (a.flow?.switchUntil) {
        a.flow = { i: a.flow.i, endAt: Date.now() + a.plan.work * 1000 };
        playTone('bell');
        save(c);
        return;
      }
      advanceFlow(c, false);
    },
    't-flow-pause': (c) => {
      const f = c.data.active.flow;
      const now = Date.now();
      if (f.paused) {
        c.data.active.flow = { i: f.i, endAt: now + f.left * 1000, ...(f.switchLeft > 0 ? { switchUntil: now + f.switchLeft * 1000 } : {}) };
      } else {
        c.data.active.flow = { i: f.i, paused: true, left: (f.endAt - now) / 1000, switchLeft: f.switchUntil ? Math.max(0, (f.switchUntil - now) / 1000) : 0 };
      }
      save(c);
    },
    'rest-add': (c) => adjustRest(c, +1),
    'rest-sub': (c) => adjustRest(c, -1),
    'rest-reset': () => { if (rest) { rest.reset = Date.now(); drawRest(); } },
    'rest-reset-stop': () => { if (rest) { rest.reset = null; drawRest(); } },
    'rest-skip': () => { rest = null; drawRest(); },
    'rest-toggle': () => { if (rest) { rest.min = !rest.min; drawRest(); } },
    't-menu': (c) => c.system('Mission', '<p>Was möchtest du tun?</p>',
      [['t-pause', 'Später weitermachen'], ['t-finish', 'Jetzt beenden (zählt anteilig)'], ['t-discard', 'Verwerfen']]),
    't-pause': (c) => { c.modal(null); rest = null; drawRest(); keepAwake(false); c.go('heute'); },
    't-discard': (c) => {
      c.modal(null);
      rest = null;
      drawRest();
      keepAwake(false);
      c.update((data) => ({ ...data, active: null }));
      c.go('heute');
    },
    't-finish': (c) => {
      c.modal(null);
      const a = c.data.active;
      const comp = completionOf(a);
      // Nichts erledigt (nur angeschaut): nicht verbuchen, sondern verwerfen
      if (comp === 0 && ['sets', 'circuit', 'intervals', 'amrap'].includes(a.plan.format)) {
        c.system('Noch nichts erledigt', '<p>Es ist noch kein Satz und keine Runde erledigt. Die Einheit wird nicht verbucht, Rotation und Tagesziel bleiben unverändert.</p>',
          [['t-discard', 'Verwerfen', 'primary'], ['t-cancel-finish', 'Weitermachen']]);
        return;
      }
      if (['sets', 'circuit', 'intervals'].includes(a.plan.format) && comp < 0.999 && !c.ui.confirmPartial) {
        c.ui.confirmPartial = true;
        c.system('Mission beenden?', `<p>${a.plan.format === 'sets' ? `${Math.round(comp * 100)} %` : `${a.roundsDone} von ${a.plan.rounds} Runden`} erledigt. Das zählt anteilig, und die Rotation geht weiter. Verbuchte Einheiten kannst du im Profil unter Verlauf wieder löschen.</p>`,
          [['t-finish', 'Beenden', 'primary'], ['t-cancel-finish', 'Weitermachen']]);
        return;
      }
      c.ui.confirmPartial = false;
      // Lücken über 30 min (App vergessen?) einmal nachfragen
      const gaps = activeMinutes([a.startedAt, ...(a.marks || []), Date.now()]).gaps;
      if (gaps.length && a.countGaps == null) {
        const g = gaps[0];
        c.system('Lücke in der Einheit', `<p>Zwischen ${clockOf(g.from)} und ${clockOf(g.to)} ist ${g.minutes} min nichts passiert${gaps.length > 1 ? ` (insgesamt ${gaps.length} Lücken)` : ''}. Soll die Zeit zur Dauer zählen?</p>`,
          [['t-gap-skip', 'Nicht mitzählen', 'primary'], ['t-gap-count', 'Mitzählen']]);
        return;
      }
      finish(c);
    },
    't-gap-skip': (c) => { c.modal(null); c.data.active.countGaps = false; finish(c); },
    't-gap-count': (c) => { c.modal(null); c.data.active.countGaps = true; finish(c); },
    't-cancel-finish': (c) => { c.ui.confirmPartial = false; c.modal(null); },
  },
};

export default training;

