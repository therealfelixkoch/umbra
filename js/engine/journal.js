// Verlauf: vergangene Einheiten filtern und pro Übung eine Kurve bilden. Reine Funktionen.
import { setScore } from './progression.js';

/** Sessions nach Mission, Arc und Übung filtern, neueste zuerst. */
export function filterSessions(sessions, { mission = null, arc = null, exId = null } = {}) {
  return sessions
    .filter((s) => !mission || s.missionId === mission)
    .filter((s) => arc == null || s.arc?.n === arc)
    .filter((s) => !exId || (s.exercises || []).some((e) => e.exId === exId) || (s.items || []).includes(exId))
    .slice()
    .sort((a, b) => (a.day === b.day ? String(b.id).localeCompare(String(a.id)) : b.day.localeCompare(a.day)));
}

/** Welche Missionen, Arcs und Übungen kommen im Log vor (für die Filter). */
export function filterOptions(sessions) {
  const missions = new Set();
  const arcs = new Set();
  const ex = new Set();
  for (const s of sessions) {
    missions.add(s.missionId);
    if (s.arc?.n != null) arcs.add(s.arc.n);
    for (const e of s.exercises || []) if (e.sets.some((x) => x.done)) ex.add(e.exId);
  }
  return { missions: [...missions], arcs: [...arcs].sort((a, b) => a - b), exercises: [...ex] };
}

/** Bestes Satzergebnis pro Einheit für eine Übung, chronologisch. */
export function exerciseCurve(sessions, exId, getDef, bodyweight = 80) {
  const def = getDef(exId);
  if (!def) return [];
  const out = [];
  for (const s of [...sessions].sort((a, b) => a.day.localeCompare(b.day))) {
    const e = (s.exercises || []).find((x) => x.exId === exId);
    const done = e?.sets.filter((x) => x.done) || [];
    if (!done.length) continue;
    const best = done.reduce((a, x) => (setScore(def, x, bodyweight) > setScore(def, a, bodyweight) ? x : a));
    out.push({ day: s.day, score: setScore(def, best, bodyweight), value: best.value, load: best.load || 0 });
  }
  return out;
}

/** Erledigte Sätze einer Übung in einer Session (für Belastung pro Übung). */
export const doneSets = (e) => (e.sets || []).filter((x) => x.done);
