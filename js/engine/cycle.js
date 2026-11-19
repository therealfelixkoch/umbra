// Deload, Wiedereinstieg nach Pausen und (für alte Missionen) die Rotation.
// BANG COMBAT: Reihenfolge und Kapitel-Stand in run.js, Deload = Einheiten 13–15 des Kapitels.
import { ROTATION } from './history.js';
import { advanceQueue } from './decide.js';
import { daysBetween } from './dates.js';
import { initialPrograms, completeUnit, jumpToLight, arcFromRun, isProgramUnit } from './run.js';
import { initialArc, jumpToDeload, inDeload } from './arc.js';
import { WEEK_PLAN } from '../data/arcs.js';

export function initialEngine(today = null) {
  const arc = today ? initialArc(today) : null; // wird beim ersten Laden gesetzt
  return {
    queue: [...ROTATION],
    arc,
    programs: today ? initialPrograms(today, { n: arc.n }) : null, // Programm-Bibliothek (run.js)
    comeback: null, // { remaining, rirPlus } – Vorschlag nach langer Pause
    comebackDismissed: null, // Tag, an dem der Vorschlag weggeklickt wurde
    slotVariant: {}, // `${missionId}:${slotIndex}` → Übung im laufenden Arc
    deloadSuggestDismissed: null,
    stagnationDismissed: {},
  };
}

// Wiedereinstieg (Interview 19.11.2026): ab 10 Tagen Pause schlägt die App für die nächsten 2 Einheiten +1 RIR vor.
// Kapitel-Stand bleibt, die Einheiten zählen normal, keine Strafe. Wegklicken gilt für diese Pause.
export const COMEBACK_GAP = 10;

// Was eine Pause (Tage seit der letzten vollen Einheit, ohne Feiertage) am Zustand ändert.
export function applyGap(engine, gap, today = null) {
  const e = { ...engine };
  if (gap == null || gap < COMEBACK_GAP) return e;
  const dismissed = e.comebackDismissed && today && daysBetween(e.comebackDismissed, today) < gap;
  if (!dismissed) e.comeback = { remaining: 2, rirPlus: 1 };
  return e;
}

/** Vorschlag „+1 RIR“ wegklicken (gilt bis zur nächsten langen Pause). */
export function dismissComeback(engine, today) {
  return { ...engine, comeback: null, comebackDismissed: today };
}

/**
 * Modifikator für die nächste volle Mission. Deload: Einheiten 13–15 (unit aus run.js) bzw. Arc-Woche 6.
 * @param {{today?:string, unit?:object}} [o] unit = nextUnit(); dann zählt die Phase der Einheit statt engine.arc
 */
export function modifierFor(engine, gap, { today = null, unit = null } = {}) {
  const e = applyGap(engine, gap, today);
  if (unit ? unit.phase === 'deload' : inDeload(e.arc)) {
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
export function completeMission(engine, { missionId, slot, rotate, gap, modifier, today = null }) {
  // BANG COMBAT: Einheit zählt im Kapitel, die Reihenfolge läuft ab dieser Einheit weiter.
  if (isProgramUnit(engine, missionId)) {
    const e = applyGap(engine, gap, today);
    const r = completeUnit(e, missionId, today);
    const out = { ...r.engine }; // engine.arc zieht syncData nach (dort entstehen Saison-Ereignisse und Story)
    if (modifier?.type === 'comeback' && out.comeback) {
      const remaining = out.comeback.remaining - 1;
      out.comeback = remaining > 0 ? { ...out.comeback, remaining } : null;
    }
    out.lastEvents = r.events;
    return out;
  }
  const pos = ROTATION.includes(missionId) ? missionId : slot;
  if (!pos) return { ...engine };
  const e = applyGap(engine, gap, today);
  e.queue = rotate === 'restart' ? rotateFrom(pos) : advanceQueue(e.queue, pos);
  if (modifier?.type === 'comeback' && e.comeback) {
    const remaining = e.comeback.remaining - 1;
    e.comeback = remaining > 0 ? { ...e.comeback, remaining } : null;
  }
  return e;
}

export function startDeload(engine, today = null) {
  if (engine.programs) {
    const e = jumpToLight(engine);
    return { ...e, arc: arcFromRun(e, today, e.arc), comeback: null };
  }
  return { ...engine, arc: jumpToDeload(engine.arc), comeback: null };
}

// 3x „Platt“ in 7 Tagen → in die Deload-Woche springen (Vorschlag; nach Ablehnung 7 Tage Ruhe).
export function shouldSuggestDeload(engine, plattCount, today) {
  if (inDeload(engine.arc) || plattCount < 3) return false;
  const d = engine.deloadSuggestDismissed;
  return !d || daysBetween(d, today) >= 7;
}
