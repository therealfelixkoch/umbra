// Progressionsleitern im UI: Vorschläge auf Heute (Jetzt / Ab dem nächsten Arc / Nicht jetzt)
// und die Stufen-Anzeige in der Übungskarte (jederzeit eine Stufe leichter oder schwerer).
import { sys, esc } from './kit.js';
import { getDef } from '../data/exercises.js';
import { ladderOf } from '../data/ladders.js';
import { applyLadderChoice } from '../engine/progression.js';
import { logDecision } from '../engine/rulelog.js';

/** Offene Stufen-Vorschläge aus dem Übungszustand. */
export function ladderSuggestions(data) {
  return Object.entries(data.exState || {})
    .filter(([k, st]) => st?.suggest?.slotKey && !k.startsWith('travel:'))
    .map(([key, st]) => ({ key, from: st.exId || key, ...st.suggest }));
}

export function ladderCard(c) {
  const list = ladderSuggestions(c.data);
  if (!list.length) return '';
  return sys('Progressionsleiter', list.map((s) => {
    const from = getDef(s.from);
    const to = getDef(s.id);
    const lad = ladderOf(s.id);
    const pos = lad ? ` · Stufe ${lad.index + 1}/${lad.ladder.steps.length}` : '';
    if (s.dir > 0) {
      return `<div class="ladder-sug"><p><b>${esc(from?.name || s.from)}</b> sitzt: zweimal in Folge oben mit Luft im Tank.</p>
        <p class="muted small">Nächste Stufe: <b>${esc(to.name)}</b>${pos}. Sie beginnt am unteren Ende der Spanne.</p>
        <div class="row gap"><button class="btn primary small" data-act="lad-now" data-key="${s.key}">Jetzt</button>
        <button class="btn small" data-act="lad-arc" data-key="${s.key}">Ab dem nächsten Arc</button>
        <button class="btn ghost small" data-act="lad-no" data-key="${s.key}">Nicht jetzt</button></div></div>`;
    }
    return `<div class="ladder-sug"><p><b>${esc(from?.name || s.from)}</b>: zweimal das untere Ende verfehlt.</p>
      <p class="muted small">Vorschlag: eine Stufe leichter, <b>${esc(to.name)}</b>${pos}.</p>
      <div class="row gap"><button class="btn primary small" data-act="lad-now" data-key="${s.key}">Leichter</button>
      <button class="btn ghost small" data-act="lad-no" data-key="${s.key}">Weiter so</button></div></div>`;
  }).join(''), { tone: 'gold' });
}

function choose(c, key, choice) {
  const today = c.today();
  c.update((data) => {
    const st = data.exState[key];
    const sug = st?.suggest;
    if (!sug) return null;
    const r = applyLadderChoice(st, choice);
    const exState = { ...data.exState, [key]: r.state };
    const engine = r.switchTo ? { ...data.engine, slotVariant: { ...(data.engine.slotVariant || {}), [sug.slotKey]: r.switchTo } } : data.engine;
    return logDecision({ ...data, exState, engine }, { rule: `ladder:${sug.dir > 0 ? 'up' : 'down'}`, day: today,
      input: { from: st.exId || key, slot: sug.slotKey }, suggestion: sug.id, decision: choice === 'no' ? 'declined' : choice });
  });
}

export const ladderActions = {
  'lad-now': (c, d) => choose(c, d.key, 'now'),
  'lad-arc': (c, d) => choose(c, d.key, 'arc'),
  'lad-no': (c, d) => choose(c, d.key, 'no'),
};

/** Stufen-Zeile in der Übungskarte (nur für Übungen auf einer Leiter). */
export function ladderLine(it, def, canChange) {
  const lad = ladderOf(def.id);
  if (!lad) return '';
  const { steps } = lad.ladder;
  const btn = (dir, label) => {
    const to = steps[lad.index + dir];
    return to && canChange ? `<button class="lad-step" data-act="t-step" data-dir="${dir}" aria-label="${esc(getDef(to)?.name || to)}">${label}</button>` : '';
  };
  return `<div class="ladder-line">${btn(-1, '▼')}<span>${esc(lad.ladder.name)} · Stufe ${lad.index + 1}/${steps.length}</span>${btn(1, '▲')}</div>`;
}
