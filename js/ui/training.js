// Training: Übung für Übung, Satz-Logging, Pausen-Timer, Zirkel, SHADOWSTEP, FLOW.
import { sys, esc, glyphChips, targetText, loadText, setsText, trendBadge, stepper, kg } from './kit.js';
import { getDef } from '../data/exercises.js';
import { finishSession, completionOf, swapOptions, itemFor } from '../engine/plan.js';
import { EXERCISES } from '../data/exercises.js';
import { ATTRIBUTES } from '../data/glyphs.js';
import { stepLoad, snap } from '../engine/progression.js';
import { rankFor, totalXp } from '../engine/game.js';
import { exerciseDetail } from './kodex.js';
import { showsElbowTap, reportElbow } from '../engine/signals.js';
import { haptic } from './haptics.js';
import { quoteAfterMission } from '../engine/story.js';
import { guardianImage } from './lore.js';
import { guardianTier } from '../data/lore.js';
import { rankName } from '../engine/game.js';
import { beep, keepAwake, signal, unlockAudio } from './sound.js';
import { RIR_CHOICES, timerState, intervalPhases, phaseAt, workDone, PHASE_LABEL, activeMinutes } from '../engine/session.js';

const fmt = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ——— Pausen-Timer (Overlay außerhalb des Render-Baums) ———
const restEl = () => document.getElementById('rest');
let rest = null;
function startRest(sec, label = 'Pause') {
  rest = { endAt: Date.now() + sec * 1000, label, fired: false };
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
  el.innerHTML = `<div class="rest-inner"><small>${esc(rest.label)}</small><b class="num">${left > 0 ? fmt(left) : 'Los'}</b>
    <div class="row gap"><button class="btn" data-act="rest-add">+15 s</button><button class="btn primary" data-act="rest-skip">${left > 0 ? 'Überspringen' : 'Weiter'}</button></div></div>`;
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
  const p = a.plan;
  if (p.format === 'flow' && a.flow?.endAt && !a.flow.paused) {
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
  if (ct && !ct.stoppedAt && !ct.fired && now - ct.startAt >= ct.target * 1000) {
    ct.fired = true;
    signal(3);
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
  const showRir = !fixed && !it.explosive && it.rir != null;
  const hasTimer = timed(def);
  const ct = a.cardTimer?.i === i ? a.cardTimer : null;
  const rir = fixed ? '' : it.explosive
    ? '<p class="rir">Kontrast: jede Wiederholung maximal explosiv, volle Pause. Stopp, sobald die Explosivität nachlässt.</p>'
    : it.topSet ? '<p class="rir">Top-Satz: 3–5 Wdh., 1 Wdh. im Tank. Backdown: 6–10 Wdh. mit ca. 18 % weniger Last.</p>'
      : def.mode === 'amrap' ? `<p class="rir">${it.noFailure ? `Ein Satz, ${r} Wdh. im Tank.` : 'Ein Satz bis kurz vor Versagen, saubere Technik.'}</p>`
        : it.failLast && setCount > 1 ? `<p class="rir">Satz 1–${setCount - 1}: ${r} Wdh. im Tank. Letzter Satz darf ans Versagen.</p>`
          : `<p class="rir">Alle Sätze mit ${r} Wdh. im Tank${it.noFailure ? ', kein Versagen' : ''}.</p>`;

  const nextK = entry.sets.findIndex((x) => !x.done);
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
      return `<div class="set-wrap"><div class="set-row${s.done ? ' done' : ''}${isNext ? ' next' : ''}"><span class="set-n">${k + 1}</span>
        <div class="set-fixed">${targetText(def)}${s.sec ? ` <small class="muted">· ${fmt(s.sec)}</small>` : ''}</div>
        <button class="check" data-act="t-done" data-k="${k}" aria-label="Erledigt">✓</button></div>${timer}</div>`;
    }
    const step = def.mode === 'time' ? 5 : 1;
    return `<div class="set-wrap${s.done ? ' done' : ''}"><div class="set-row${s.done ? ' done' : ''}${isNext ? ' next' : ''}"><span class="set-n">${s.label ? `<i class="set-tag">${s.label === 'Top-Satz' ? 'TOP' : 'BD'}</i>` : k + 1}</span>
      <div class="set-mid">${stepper('t-val', `${s.value}`, def.mode === 'time' ? 's' : 'Wdh.', { idx: `${k}:${step}`, big: true })}${lastLine}</div>
      ${loadable && s.done ? `<small class="set-load">${kg(s.load)} kg</small>` : ''}
      <button class="check" data-act="t-done" data-k="${k}" aria-label="Satz erledigt">✓</button></div>
      ${timer}${showRir && s.done ? rirChips(k, s.rir) : ''}</div>`;
  }).join('');

  const open = entry.sets.find((s) => !s.done) || entry.sets[entry.sets.length - 1];
  const loadRow = loadable ? `<div class="load-row"><span>${def.load === 'belt' ? 'Zusatzgewicht' : 'Gewicht'}</span>
    ${stepper('t-load', kg(open.load), 'kg')}</div>` : '';
  const allDone = entry.sets.every((s) => s.done);
  const effort = allDone ? `<div class="effort${entry.effort ? ' set' : ''}"><small>Wie hart war die Übung insgesamt?</small>
    <div class="effort-chips">${[1, 2, 3, 4, 5].map((v) => `<button class="${entry.effort === v ? 'on' : ''}" data-act="t-effort" data-v="${v}">${v}</button>`).join('')}</div>
    <div class="effort-scale"><span>locker</span><span>am Limit</span></div></div>` : '';
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
      ${it.swappedFrom ? `<p class="muted small">Getauscht statt ${esc(getDef(it.swappedFrom)?.name || it.swappedFrom)} · ${it.swapScope === 'arc' ? 'für den Rest des Arcs' : 'nur heute'}</p>` : ''}
      ${glyphChips(def, { small: true })}
      ${fixed ? `<p class="t-target">${targetText(def)}${entry.sets.length > 1 ? ` · ${entry.sets.length} Runden` : ''}</p>` : `
      <div class="t-compare">
        <div><small>Letztes Mal${last ? ` · ${esc(formatShort(last.day))}` : ''}</small>${lastFull}</div>
        <span class="arrow">→</span>
        <div><small>Heute</small><b>${entry.sets.length} × ${targetText(def, it.target)}</b><em>${def.load ? esc(loadText(def, it.load)) : ''}</em></div>
      </div>${trendBadge(it.trend)}`}
      ${it.adjust ? `<p class="note">${esc(it.adjust)}</p>` : ''}
      ${rir}
      ${hasTimer ? '<p class="muted small">Timer starten, Bildschirm anlassen für das Signal. Stopp loggt die echte Zeit.</p>' : ''}
      ${loadRow}
      ${is4x4(def) ? card4x4(a, i, entry) : `<div class="sets">${rows}</div>`}
      ${effort}
      ${showsElbowTap(def) && entry.sets.some((s) => s.done)
        ? `<button class="elbow-tap${entry.elbowReported ? ' done' : ''}" data-act="t-elbow" ${entry.elbowReported ? 'disabled' : ''}>${entry.elbowReported ? 'Ellbogen gemeldet' : 'Ellbogen gezwickt'}</button>` : ''}
    </section>
    <footer class="t-nav">
      <button class="btn" data-act="t-prev" ${i === 0 ? 'disabled' : ''}>←</button>
      ${isLast ? '<button class="btn gold grow" data-act="t-finish">Mission abgeschlossen</button>'
        : '<button class="btn primary grow" data-act="t-next">Nächste Übung →</button>'}
    </footer>`;
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

function head(c, a, counter, comp) {
  return `<header class="t-head"><button class="icon-btn" data-act="t-menu" aria-label="Menü">☰</button>
    <div><small>${a.plan.modifier?.type === 'deload' ? 'Deload' : a.plan.modifier?.type === 'comeback' ? 'Wiedereinstieg' : 'Mission'}</small><b>${esc(a.plan.name)}</b></div><span class="num">${counter}</span></header>
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

function circuitView(c, a) {
  const p = a.plan;
  const done = a.roundsDone;
  return `${head(c, a, `${done}/${p.rounds}`, completionOf(a))}
    <section class="t-card">
      <div class="rounds">${Array.from({ length: p.rounds }, (_, k) => `<i class="${k < done ? 'on' : ''}"></i>`).join('')}</div>
      <p class="t-target">${done < p.rounds ? `Runde ${done + 1} von ${p.rounds}` : 'Alle Runden geschafft'}${p.light ? ' · ruhiges Tempo' : ''}</p>
      <p class="rir">Übungen ohne Pause nacheinander. ${p.restBetween / 60} min Pause nach jeder Runde.</p>
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
      ${running ? '' : '<button class="btn primary wide" data-act="t-clock">Uhr starten</button>'}
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
    : st.phase === 'work' ? `Intervall ${st.round}/${p.rounds} · ${PHASE_LABEL.work}` : PHASE_LABEL[st.phase];
  const next = st && !done ? phases[st.index + 1] : null;
  const running = st && !done && !iv.pausedAt;
  return `${head(c, a, `${a.roundsDone}/${p.rounds}`, completionOf(a))}
    <section class="t-card center iv-card phase-${st?.phase || 'ready'}">
      <p class="t-target">${esc(label)}</p>
      <b class="clock num ${st && st.phase !== 'work' ? 'calm' : ''}" ${running ? `data-clock="${now + st.left * 1000}"` : ''}>${st ? fmt(done ? 0 : st.left) : fmt(phases[0].sec)}</b>
      <div class="rounds">${Array.from({ length: p.rounds }, (_, k) => `<i class="${k < a.roundsDone ? 'on' : ''}"></i>`).join('')}</div>
      ${next ? `<p class="muted">Danach: ${PHASE_LABEL[next.phase]} · ${fmt(next.sec)}</p>` : ''}
      ${!iv ? '<button class="btn primary wide" data-act="t-iv-start">Start</button>' : !done ? `<div class="row gap center">
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
function flowSeq(p) {
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
    signal(3);
  } else {
    a.flow = { i, endAt: Date.now() + a.plan.work * 1000 };
    if (auto) beep(1, 660);
  }
  save(c);
}

function flowView(c, a) {
  const p = a.plan;
  const seq = flowSeq(p);
  const f = a.flow;
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
  const title = s.kind === 'flow' ? 'FLOW abgeschlossen.' : s.completion >= 0.999 ? 'Mission abgeschlossen.' : 'Einsatz verbucht.';
  const rankUp = after.index > before.index;
  const quote = quoteAfterMission(c.data, s);
  c.go('heute');
  if (rankUp) haptic([60, 40, 60, 40, 160]);
  c.system(rankUp ? 'Rang-Prüfung bestanden' : title, `${rankUp ? `<div class="rankup epic">${guardianImage(guardianTier(after.id), { cls: 'rankup-guardian' })}
      <small>Neuer Rang</small><b>${esc(rankName(after))}</b></div>` : ''}
    <div class="xp-gain num">+${s.xp} XP</div>
    <dl class="session-eval"><div><dt>Dauer</dt><dd class="num">${s.minutes} min</dd></div>
      ${s.intensity != null ? `<div><dt>Intensität</dt><dd class="num">${s.intensity.toLocaleString('de-DE', { minimumFractionDigits: 1 })}</dd></div>` : ''}
      ${s.load ? `<div><dt>Trainingslast</dt><dd class="num">${s.load}</dd></div>` : ''}</dl>
    ${s.completion < 0.999 && s.kind === 'mission' ? `<p class="muted">${Math.round(s.completion * 100)} % geschafft. Zählt trotzdem.</p>` : ''}
    ${rec ? `<div class="record"><b>Rekord gebrochen</b><ul>${rec}</ul></div>` : ''}
    ${quote ? `<blockquote class="quote">„${esc(quote.text)}“<cite>${esc(quote.person)} · ${esc(quote.source)}</cite></blockquote>` : ''}`,
  [['close-modal', 'Weiter', 'primary']], rankUp ? 'gold aura' : rec ? 'gold' : 'sys');
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
      if (sets[k].done) {
        haptic();
        // RIR vorausgewählt mit dem Ziel der Arc-Woche: ein Tap, wenn es passt
        if (sets[k].rir == null && it.rir != null && !it.explosive && getDef(entry.exId).mode !== 'fixed') sets[k].rir = it.rir;
        if (a.cardTimer?.i === a.index && a.cardTimer.k === k) a.cardTimer = null;
      }
      const lastOverall = a.index === a.plan.items.length - 1 && sets.every((s) => s.done);
      if (sets[k].done && !lastOverall) {
        const def = getDef(entry.exId);
        const restSec = def.mode === 'fixed' ? (def.unit === 'min' ? 60 : 30) : c.data.settings.restSec;
        // Letzter Satz: auf der Karte bleiben, bis die Belastung getippt ist
        if (sets.every((s) => s.done)) startRest(restSec, `Pause · gleich: ${getDef(a.log[a.index + 1].exId).name}`);
        else startRest(restSec, def.mode === 'fixed' && def.unit === 'min' ? `Pause · gleich Runde ${sets.filter((s) => s.done).length + 1}` : 'Pause');
      }
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
      a.log[a.index].sets[Number(d.k)].rir = Number(d.v);
      save(c);
    },
    't-effort': (c, d) => {
      const a = c.data.active;
      a.log[a.index].effort = Number(d.v);
      if (a.index < a.plan.items.length - 1) a.index += 1;
      save(c);
    },
    't-timer': (c, d) => {
      unlockAudio();
      const a = c.data.active;
      const def = getDef(a.log[a.index].exId);
      const k = Number(d.k);
      a.cardTimer = { i: a.index, k, startAt: Date.now(), target: timerTarget(def, a.log[a.index].sets[k]) };
      rest = null;
      drawRest();
      save(c);
    },
    't-timer-stop': (c, d) => {
      const a = c.data.active;
      const ct = a.cardTimer;
      if (!ct) return;
      const def = getDef(a.log[a.index].exId);
      const secs = Math.round(timerState(ct, Date.now()).elapsed);
      const s = a.log[a.index].sets[Number(d.k)];
      // Echte Zeit loggen (Zeitübung: in 5-s-Schritten wie der Stepper)
      if (def.mode === 'time') s.value = Math.max(5, Math.round(secs / 5) * 5);
      else s.sec = secs;
      a.cardTimer = null;
      if (!s.done) training.actions['t-done'](c, { k: d.k });
      else save(c);
    },
    't-swap': (c) => {
      const a = c.data.active;
      const entry = a.log[a.index];
      if (entry.sets.some((s) => s.done)) {
        c.system('Tausch nicht möglich', '<p>Für diese Übung sind schon Sätze geloggt. Tausche vor dem ersten Satz.</p>');
        return;
      }
      const opts = swapOptions(entry.exId, { data: c.data, profile: a.plan.profile, today: c.today(), all: EXERCISES });
      c.modal(sys('Übung tauschen', `<p class="muted small">Ersatz mit ähnlichem Muster. <b class="focus">Lücke</b> = deckt diese Woche etwas ab, das noch fehlt.</p>
        <div class="swap-list">${opts.map((o) => `<button class="swap" data-act="t-swap-pick" data-id="${o.id}"><b>${esc(getDef(o.id).name)}</b>
        <small>${o.fills.length ? `<span class="focus">Lücke:</span> ${o.fills.map((x) => esc(ATTRIBUTES[x].name)).join(', ')}` : o.direct ? 'Alternative / Stufe' : 'ähnliches Muster'}</small></button>`).join('') || '<p class="muted">Keine passende Alternative mit deinem Equipment.</p>'}</div>
        <button class="btn ghost wide" data-act="close-modal">Abbrechen</button>`, { cls: 'pop' }));
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
    't-round-plus': (c) => { c.data.active.roundsDone += 1; haptic(); save(c); },
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
    't-flow-start': (c) => { c.data.active.flow = { i: 0, endAt: Date.now() + c.data.active.plan.work * 1000 }; save(c); },
    't-flow-skip': (c) => advanceFlow(c, false),
    't-flow-pause': (c) => {
      const f = c.data.active.flow;
      if (f.paused) c.data.active.flow = { i: f.i, endAt: Date.now() + f.left * 1000 };
      else c.data.active.flow = { i: f.i, paused: true, left: (f.endAt - Date.now()) / 1000 };
      save(c);
    },
    'rest-add': () => { if (rest) { rest.endAt = Math.max(rest.endAt, Date.now()) + 15000; rest.fired = false; drawRest(); } },
    'rest-skip': () => { rest = null; drawRest(); },
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
      if (a.plan.format === 'sets' && comp < 0.999 && !c.ui.confirmPartial) {
        c.ui.confirmPartial = true;
        c.system('Mission beenden?', `<p>${Math.round(comp * 100)} % erledigt. Das zählt anteilig, und die Rotation geht weiter.</p>`,
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

