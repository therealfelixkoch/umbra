// Rotation, Deload (Arc-Woche 6) und Wiedereinstieg nach Pausen.
import { ROTATION } from './history.js';
import { advanceQueue } from './decide.js';
import { daysBetween } from './dates.js';
import { initialArc, jumpToDeload, inDeload } from './arc.js';
import { WEEK_PLAN } from '../data/arcs.js';

export function initialEngine(today = null) {
  return {
    queue: [...ROTATION],
    arc: today ? initialArc(today) : null, // wird beim ersten Laden gesetzt
    comeback: null, // { remaining, pct, dropSets, noFailure }
    slotVariant: {}, // `${missionId}:${slotIndex}` → Übung im laufenden Arc
    deloadSuggestDismissed: null,
    stagnationDismissed: {},
  };
}

// Was eine Pause (Tage seit der letzten vollen Einheit, ohne Feiertage) am Zustand ändert.
export function applyGap(engine, gap) {
  const e = { ...engine };
  if (gap == null) return e;
  if (gap >= 15) e.comeback = { remaining: 2, pct: 0.2, dropSets: 0, noFailure: true };
  else if (gap >= 8) e.comeback = { remaining: 1, pct: 0.1, dropSets: 1, noFailure: false };
  return e;
}

// Modifikator für die nächste volle Mission. Deload kommt aus der Arc-Woche 6.
export function modifierFor(engine, gap) {
  const e = applyGap(engine, gap);
  if (inDeload(e.arc)) {
    return { type: 'deload', setFactor: 0.5, pct: 0, dropSets: 0, noFailure: true, rir: WEEK_PLAN[6].rir };
  }
  if (e.comeback && e.comeback.remaining > 0) {
    return { type: 'comeback', ...e.comeback, gap };
  }
  return { type: 'none' };
}

// Rotation läuft ab dieser Mission weiter: A→B→C→D, nach C kommt D, dann A, B.
export function rotateFrom(missionId) {
  const i = ROTATION.indexOf(missionId);
  if (i < 0) return [...ROTATION];
  return [...ROTATION.slice(i + 1), ...ROTATION.slice(0, i + 1)];
}

/**
 * Zustand nach einer abgeschlossenen (auch teilweise) vollen Mission.
 * @param {object} p { missionId, slot (Rotationsplatz bei FORGE/4x4), rotate ('restart' = ab hier weiter), gap, modifier }
 */
export function completeMission(engine, { missionId, slot, rotate, gap, modifier }) {
  const pos = ROTATION.includes(missionId) ? missionId : slot;
  if (!pos) return { ...engine };
  const e = applyGap(engine, gap);
  e.queue = rotate === 'restart' ? rotateFrom(pos) : advanceQueue(e.queue, pos);
  if (modifier?.type === 'comeback' && e.comeback) {
    const remaining = e.comeback.remaining - 1;
    e.comeback = remaining > 0 ? { ...e.comeback, remaining } : null;
  }
  return e;
}

export function startDeload(engine) {
  return { ...engine, arc: jumpToDeload(engine.arc), comeback: null };
}

// 3x „Platt“ in 7 Tagen → in die Deload-Woche springen (Vorschlag; nach Ablehnung 7 Tage Ruhe).
export function shouldSuggestDeload(engine, plattCount, today) {
  if (inDeload(engine.arc) || plattCount < 3) return false;
  const d = engine.deloadSuggestDismissed;
  return !d || daysBetween(d, today) >= 7;
}
