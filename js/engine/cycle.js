// Rotation, Deload und Wiedereinstieg nach Pausen.
import { ROTATION } from './history.js';
import { advanceQueue } from './decide.js';
import { daysBetween } from './dates.js';

export const DELOAD_AFTER = 18;
export const DELOAD_SESSIONS = 4;

export function initialEngine() {
  return {
    queue: [...ROTATION],
    fullSinceDeload: 0,
    deloadRemaining: 0,
    comeback: null, // { remaining, pct, dropSets, noFailure }
    deloadSuggestDismissed: null,
  };
}

// Was eine Pause (Tage seit der letzten vollen Einheit) am Zustand ändert.
export function applyGap(engine, gap) {
  const e = { ...engine };
  if (gap == null) return e;
  if (gap >= 10) {
    // Eine lange Pause gilt als Deload.
    e.fullSinceDeload = 0;
    e.deloadRemaining = 0;
  }
  if (gap >= 15) e.comeback = { remaining: 2, pct: 0.2, dropSets: 0, noFailure: true };
  else if (gap >= 8) e.comeback = { remaining: 1, pct: 0.1, dropSets: 1, noFailure: false };
  return e;
}

// Modifikator für die nächste volle Einheit (A–D).
export function modifierFor(engine, gap) {
  const e = applyGap(engine, gap);
  if (e.deloadRemaining > 0) {
    return { type: 'deload', setFactor: 0.5, pct: 0, dropSets: 0, noFailure: true,
      left: e.deloadRemaining };
  }
  if (e.comeback && e.comeback.remaining > 0) {
    return { type: 'comeback', ...e.comeback, gap };
  }
  return { type: 'none' };
}

// Zustand nach einer abgeschlossenen (auch teilweise) Einheit.
export function completeMission(engine, { missionId, gap, modifier }) {
  if (!ROTATION.includes(missionId)) return { ...engine };
  const e = applyGap(engine, gap);
  e.queue = advanceQueue(e.queue, missionId);
  if (modifier?.type === 'deload') {
    e.deloadRemaining = Math.max(0, e.deloadRemaining - 1);
    e.comeback = null;
  } else if (modifier?.type === 'comeback' && e.comeback) {
    const remaining = e.comeback.remaining - 1;
    e.comeback = remaining > 0 ? { ...e.comeback, remaining } : null;
  } else {
    e.fullSinceDeload += 1;
    if (e.fullSinceDeload >= DELOAD_AFTER) {
      e.deloadRemaining = DELOAD_SESSIONS;
      e.fullSinceDeload = 0;
    }
  }
  return e;
}

export function startDeload(engine) {
  return { ...engine, deloadRemaining: DELOAD_SESSIONS, fullSinceDeload: 0, comeback: null };
}

// 3x „Platt“ in 7 Tagen → Deload vorschlagen (nicht erneut innerhalb von 7 Tagen nach Ablehnung).
export function shouldSuggestDeload(engine, plattCount, today) {
  if (engine.deloadRemaining > 0 || plattCount < 3) return false;
  const d = engine.deloadSuggestDismissed;
  return !d || daysBetween(d, today) >= 7;
}
