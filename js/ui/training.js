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
import { beep, keepAwake } from './sound.js';

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
    beep(3);
    haptic([120, 80, 120]);
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
  if (p.format === 'intervals' && a.iv?.endAt && now >= a.iv.endAt) {
    advanceInterval(c);
    return;
  }
  if (p.format === 'amrap' && a.clockEnd && now >= a.clockEnd && !a.clockFired) {
    a.clockFired = true;
    beep(3);
    save(c);
    return;
  }
  document.querySelectorAll('[data-clock]').forEach((el) => {
    const end = Number(el.dataset.clock);
    el.textContent = fmt((end - now) / 1000);
  });
}

const save = (c) => c.update(() => null);

// ——— Sätze ———
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
  const rir = fixed ? '' : it.explosive
    ? '<p class="rir">Kontrast: jede Wiederholung maximal explosiv, volle Pause. Stopp, sobald die Explosivität nachlässt.</p>'
    : it.topSet ? '<p class="rir">Top-Satz: 3–5 Wdh., 1 Wdh. im Tank. Backdown: 6–10 Wdh. mit ca. 18 % weniger Last.</p>'
      : def.mode === 'amrap' ? `<p class="rir">${it.noFailure ? `Ein Satz, ${r} Wdh. im Tank.` : 'Ein Satz bis kurz vor Versagen, saubere Technik.'}</p>`
        : it.failLast && setCount > 1 ? `<p class="rir">Satz 1–${setCount - 1}: ${r} Wdh. im Tank. Letzter Satz darf ans Versagen.</p>`
          : `<p class="rir">Alle Sätze mit ${r} Wdh. im Tank${it.noFailure ? ', kein Versagen' : ''}.</p>`;

  const rows = entry.sets.map((s, k) => {
    const isNext = !s.done && entry.sets.findIndex((x) => !x.done) === k;
    if (fixed) {
      return `<div class="set-row${s.done ? ' done' : ''}${isNext ? ' next' : ''}"><span class="set-n">${k + 1}</span>
        <div class="set-fixed">${targetText(def)}</div>
        <button class="check" data-act="t-done" data-k="${k}" aria-label="Erledigt">✓</button></div>`;
    }
    const step = def.mode === 'time' ? 5 : 1;
    return `<div class="set-row${s.done ? ' done' : ''}${isNext ? ' next' : ''}"><span class="set-n">${s.label ? `<i class="set-tag">${s.label === 'Top-Satz' ? 'TOP' : 'BD'}</i>` : k + 1}</span>
      ${stepper('t-val', `${s.value}`, def.mode === 'time' ? 's' : 'Wdh.', { idx: `${k}:${step}`, big: true })}
      ${loadable && s.done ? `<small class="set-load">${kg(s.load)} kg</small>` : ''}
      <button class="check" data-act="t-done" data-k="${k}" aria-label="Satz erledigt">✓</button></div>`;
  }).join('');

  const open = entry.sets.find((s) => !s.done) || entry.sets[entry.sets.length - 1];
  const loadRow = loadable ? `<div class="load-row"><span>${def.load === 'belt' ? 'Zusatzgewicht' : 'Gewicht'}</span>
    ${stepper('t-load', kg(open.load), 'kg')}</div>` : '';
  const isLast = i === n - 1;
  return `${head(c, a, `${i + 1}/${n}`, comp)}
    <nav class="t-dots">${p.items.map((x, k) => {
      const done = a.log[k].sets.filter((s) => s.done).length;
      const st = done === a.log[k].sets.length ? 'done' : done ? 'part' : '';
      return `<button class="${st}${k === i ? ' cur' : ''}" data-act="t-goto" data-k="${k}" aria-label="Übung ${k + 1}"></button>`;
    }).join('')}</nav>
    <section class="t-card">
      <div class="t-name"><h1>${esc(def.name)}${it.optional ? ' <em>optional</em>' : ''}</h1><div class="row gap"><button class="info" data-act="t-swap" aria-label="Übung tauschen">⇄</button><button class="info" data-act="t-info" data-id="${def.id}" aria-label="Info">i</button></div></div>
      ${glyphChips(def, { small: true })}
      ${fixed ? `<p class="t-target">${targetText(def)}${entry.sets.length > 1 ? ` · ${entry.sets.length} Runden` : ''}</p>` : `
      <div class="t-compare">
        <div><small>Letztes Mal</small><b>${last ? setsText(def, last.sets) : '–'}</b></div>
        <span class="arrow">→</span>
        <div><small>Heute</small><b>${entry.sets.length} × ${targetText(def, it.target)}</b><em>${def.load ? esc(loadText(def, it.load)) : ''}</em></div>
      </div>${trendBadge(it.trend)}`}
      ${it.adjust ? `<p class="note">${esc(it.adjust)}</p>` : ''}
      ${rir}
      ${loadRow}
      <div class="sets">${rows}</div>
      ${showsElbowTap(def) && entry.sets.some((s) => s.done)
        ? `<button class="elbow-tap${entry.elbowReported ? ' done' : ''}" data-act="t-elbow" ${entry.elbowReported ? 'disabled' : ''}>${entry.elbowReported ? 'Ellbogen gemeldet' : 'Ellbogen gezwickt'}</button>` : ''}
    </section>
    <footer class="t-nav">
      <button class="btn" data-act="t-prev" ${i === 0 ? 'disabled' : ''}>←</button>
      ${isLast ? '<button class="btn gold grow" data-act="t-finish">Mission abgeschlossen</button>'
        : '<button class="btn primary grow" data-act="t-next">Nächste Übung →</button>'}
    </footer>`;
}

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
  const iv = a.iv;
  const label = !iv ? 'Bereit' : iv.phase === 'work' ? `Runde ${iv.round}/${p.rounds} · Arbeit` : iv.phase === 'rest' ? 'Pause' : 'Fertig';
  return `${head(c, a, `${a.roundsDone}/${p.rounds}`, completionOf(a))}
    <section class="t-card center">
      <p class="t-target">${esc(label)}</p>
      <b class="clock num ${iv?.phase === 'rest' ? 'calm' : ''}" ${iv?.endAt ? `data-clock="${iv.endAt}"` : ''}>${iv?.endAt ? fmt((iv.endAt - Date.now()) / 1000) : fmt(p.work)}</b>
      ${!iv ? '<button class="btn primary wide" data-act="t-iv-start">Start</button>' : ''}
      <p class="muted">${esc(getDef(p.exId).name)}: ${p.rounds} × ${p.work / 60} min, ${p.rest / 60} min Pause.</p>
    </section>
    <footer class="t-nav"><button class="btn gold grow" data-act="t-finish">${iv?.phase === 'done' ? 'Mission abgeschlossen' : 'Beenden'}</button></footer>`;
}

function advanceInterval(c) {
  const a = c.data.active;
  const p = a.plan;
  const iv = a.iv;
  if (iv.phase === 'work') {
    a.roundsDone = iv.round;
    if (iv.round >= p.rounds) a.iv = { phase: 'done' };
    else a.iv = { phase: 'rest', round: iv.round, endAt: Date.now() + p.rest * 1000 };
    beep(iv.round >= p.rounds ? 3 : 2);
  } else {
    a.iv = { phase: 'work', round: iv.round + 1, endAt: Date.now() + p.work * 1000 };
    beep(1, 1200);
  }
  save(c);
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
    beep(3);
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
  const before = rankFor(totalXp(c.data.sessions));
  const active = c.data.active;
  let result;
  c.update((data) => {
    result = finishSession(data, active);
    return result.data;
  });
  rest = null;
  drawRest();
  keepAwake(false);
  const after = rankFor(totalXp(c.data.sessions));
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
    ${s.completion < 0.999 && s.kind === 'mission' ? `<p class="muted">${Math.round(s.completion * 100)} % geschafft. Zählt trotzdem.</p>` : ''}
    ${rec ? `<div class="record"><b>Rekord gebrochen</b><ul>${rec}</ul></div>` : ''}
    ${quote ? `<blockquote class="quote">„${esc(quote.text)}“<cite>${esc(quote.person)} · ${esc(quote.source)}</cite></blockquote>` : ''}`,
  [['close-modal', 'Weiter', 'primary']], rankUp ? 'gold aura' : rec ? 'gold' : 'sys');
}

export default {
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
      const sets = a.log[a.index].sets;
      const k = Number(d.k);
      sets[k].done = !sets[k].done;
      if (sets[k].done) haptic();
      const lastOverall = a.index === a.plan.items.length - 1 && sets.every((s) => s.done);
      if (sets[k].done && !lastOverall) {
        const def = getDef(a.log[a.index].exId);
        const restSec = def.mode === 'fixed' ? 30 : c.data.settings.restSec;
        if (sets.every((s) => s.done)) {
          a.index = Math.min(a.plan.items.length - 1, a.index + 1);
          startRest(restSec, `Pause · gleich: ${getDef(a.log[a.index].exId).name}`);
        } else startRest(restSec);
      }
      save(c);
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
        <div class="swap-list">${opts.map((o) => `<button class="swap" data-act="t-swap-to" data-id="${o.id}"><b>${esc(getDef(o.id).name)}</b>
        <small>${o.fills.length ? `<span class="focus">Lücke:</span> ${o.fills.map((x) => esc(ATTRIBUTES[x].name)).join(', ')}` : o.direct ? 'Alternative / Stufe' : 'ähnliches Muster'}</small></button>`).join('') || '<p class="muted">Keine passende Alternative mit deinem Equipment.</p>'}</div>
        <button class="btn ghost wide" data-act="close-modal">Abbrechen</button>`, { cls: 'pop' }));
    },
    't-swap-to': (c, d) => {
      const a = c.data.active;
      const old = a.plan.items[a.index];
      const it = itemFor(d.id, { data: c.data, profile: a.plan.profile, sets: old.sets });
      it.noFailure = old.noFailure;
      a.plan.items[a.index] = it;
      a.log[a.index] = { key: it.key, exId: it.exId,
        sets: Array.from({ length: it.sets }, () => ({ value: it.target, load: it.load, done: false })) };
      c.modal(null);
      save(c);
    },
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
    't-iv-start': (c) => { c.data.active.iv = { phase: 'work', round: 1, endAt: Date.now() + c.data.active.plan.work * 1000 }; save(c); },
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
      finish(c);
    },
    't-cancel-finish': (c) => { c.ui.confirmPartial = false; c.modal(null); },
  },
};

