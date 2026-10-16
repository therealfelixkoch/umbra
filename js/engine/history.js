// Was die App aus dem Log selbst weiß. Reine Funktionen über die Session-Liste.
import { addDays, daysBetween } from './dates.js';

export const ROTATION = ['A', 'B', 'C', 'D'];

export function isFullMission(s) {
  return s.kind === 'mission' && ROTATION.includes(s.missionId);
}

export function isHard(s) {
  return s.kind === 'arena' || isFullMission(s);
}

// Harte Tage am Stück, endend gestern.
export function hardStreak(sessions, today) {
  const hardDays = new Set(sessions.filter(isHard).map((s) => s.day));
  let n = 0;
  let d = addDays(today, -1);
  while (hardDays.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function lastFullDay(sessions, before) {
  let last = null;
  for (const s of sessions) {
    if (!isFullMission(s)) continue;
    if (before && s.day >= before) continue;
    if (!last || s.day > last) last = s.day;
  }
  return last;
}

// Tage seit der letzten vollen Einheit (A–D) vor heute; null, wenn es noch keine gab.
export function gapDays(sessions, today) {
  const last = lastFullDay(sessions, today);
  return last ? daysBetween(last, today) : null;
}

// Arena von gestern laut Log: 'none' | 'light' | 'hard'.
export function arenaOn(sessions, day) {
  const a = sessions.filter((s) => s.kind === 'arena' && s.day === day);
  if (a.some((s) => s.intensity === 'hard')) return 'hard';
  return a.length ? 'light' : 'none';
}

// Wie oft „Platt“ in den letzten 7 Tagen (inkl. heute).
export function plattCount(checkins, today) {
  return Object.values(checkins).filter(
    (c) => c.feeling === 'platt' && daysBetween(c.day, today) >= 0 && daysBetween(c.day, today) < 7,
  ).length;
}

// Letzte Session, in der eine Übung vorkam (für „letztes Mal“).
export function lastSetsFor(sessions, exId) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const ex = (sessions[i].exercises || []).find((e) => e.exId === exId && e.sets.some((x) => x.done));
    if (ex) return { day: sessions[i].day, sets: ex.sets.filter((x) => x.done) };
  }
  return null;
}
