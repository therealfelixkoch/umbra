// Arc-Stand mit dem Log abgleichen: Wochen weiterzählen, beim Arc-Wechsel Varianten setzen.
import { MISSIONS } from '../data/missions.js';
import { initialArc, syncArc, DEFAULT_HOLIDAY } from './arc.js';
import { gapDays } from './history.js';
import { addDays } from './dates.js';
import { ensureSideQuest } from './progress.js';
import { storyEvents, unlockCodex } from './story.js';

const SET_MISSIONS = ['A', 'B', 'C', 'FORGE'];

/**
 * Beim Arc-Wechsel: Pro Platz die nächste Variante.
 * - Hauptübungen wechseln nur zur vorgemerkten Stufe (schwerer/leichter aus der Progression).
 * - Nebenplätze mit Variantenliste rotieren zur nächsten Variante (vorgemerkte Stufe hat Vorrang).
 */
export function applyArcChange(engine, exState) {
  const slotVariant = { ...(engine.slotVariant || {}) };
  const ex = { ...exState };
  for (const id of SET_MISSIONS) {
    MISSIONS[id].slots.forEach((s, i) => {
      if (s.plyo || s.arcOnly) return;
      const key = `${id}:${i}`;
      const current = slotVariant[key] || s.ex;
      const st = ex[current];
      let next = null;
      if (st?.pendingVariant) {
        next = st.pendingVariant;
        ex[current] = { ...st, pendingVariant: undefined };
      } else if (!s.main && s.variants?.length > 1) {
        const at = s.variants.indexOf(current);
        next = s.variants[(at + 1) % s.variants.length];
      }
      if (next && next !== current) slotVariant[key] = next;
    });
  }
  return { engine: { ...engine, slotVariant }, exState: ex };
}

/** @returns {{data:object, events:object[], changed:boolean}} */
export function syncData(data, today) {
  const holiday = data.settings.holiday ?? DEFAULT_HOLIDAY;
  let engine = data.engine;
  let changed = false;
  if (!engine.arc) {
    engine = { ...engine, arc: initialArc(today) };
    changed = true;
  }
  const gap = gapDays(data.sessions, today, holiday);
  const { arc, events } = syncArc(engine.arc, data.sessions, today, { holiday, gap });
  if (JSON.stringify(arc) !== JSON.stringify(engine.arc)) {
    engine = { ...engine, arc };
    changed = true;
  }
  let exState = data.exState;
  const done = events.filter((e) => e.type === 'arc_complete');
  if (done.length) {
    // Abgeschlossene Arcs merken (Zeitraum für Debrief und Export)
    const prev = data.engine.arc || engine.arc;
    const history = [...(engine.arcHistory || [])];
    done.forEach((e) => history.push({ n: e.n, from: e.n === prev.n ? prev.startedWeek : arc.startedWeek, to: addDays(arc.startedWeek, -1), byPause: !!e.byPause }));
    engine = { ...engine, arcHistory: history };
    ({ engine, exState } = applyArcChange(engine, exState));
    changed = true;
  }
  let out = changed ? { ...data, engine, exState } : data;
  const withQuest = ensureSideQuest(out, today);
  if (withQuest !== out) { out = withQuest; changed = true; }
  // Story: Nemesis, Boss-Ausgang, Arc-Intro, Codex
  const story = storyEvents(out, today, events);
  if (story.data !== out) { out = story.data; changed = true; }
  const withCodex = unlockCodex(out, today);
  if (withCodex !== out) { out = withCodex; changed = true; }
  return { data: out, events: [...events, ...story.events], changed: changed || story.events.length > 0 };
}
