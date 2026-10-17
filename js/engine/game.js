// XP, Ränge, Wochen-Streak mit Schild, Kampfkraft.
import { weekStart, addDays, monthKey } from './dates.js';
import { FULL_MISSIONS } from '../data/missions.js';
import { isHolidayWeek } from './arc.js';

// Gesamtränge. Index = Wächter-Stufe (guardian-0 … guardian-5).
export const RANKS = [
  { id: 'SHADE', xp: 0 },
  { id: 'BLADE', xp: 1000 },
  { id: 'WARDEN', xp: 3000 },
  { id: 'PHANTOM', xp: 7000 },
  { id: 'UMBRA', xp: 15000 },
  { id: 'UNBREAKABLE', xp: 30000, name: 'Unzerbrechlich' },
];
export const rankName = (r) => r.name || r.id;

export const XP = { mission: 100, compact: 70, missionBonus: 25, light: 60, express: 50, flow: 20, rest: 10,
  arenaLight: 60, arenaHard: 80, record: 20, check: 50 };

export function sessionXp(s) {
  let xp = 0;
  if (s.kind === 'mission' && FULL_MISSIONS.includes(s.missionId)) {
    const c = Math.max(0.2, s.completion ?? 1);
    const base = s.compact ? XP.compact : XP.mission;
    xp = Math.round(base * c) + (c >= 0.999 ? XP.missionBonus : 0);
  } else if (s.missionId === 'D_LIGHT') xp = Math.round(XP.light * Math.max(0.3, s.completion ?? 1));
  else if (s.kind === 'express') xp = XP.express;
  else if (s.kind === 'flow') xp = XP.flow;
  else if (s.kind === 'rest') xp = XP.rest;
  else if (s.kind === 'check') xp = XP.check;
  else if (s.kind === 'arena') {
    const base = s.rpe ? 40 + s.rpe * 5 : s.intensity === 'hard' ? XP.arenaHard : XP.arenaLight;
    xp = Math.round(base * Math.min(1.5, Math.max(0.5, (s.minutes || 60) / 60)));
  }
  return xp + (s.records?.length || 0) * XP.record;
}

export function totalXp(sessions) {
  return sessions.reduce((sum, s) => sum + (s.xp ?? sessionXp(s)), 0);
}

export function rankFor(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  return { ...cur, index: i, next: next || null,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

// Einsätze, die für die Woche zählen: ARENA, Missionen, SHADOWSTEPs.
export const countsForWeek = (s) => s.kind === 'arena' || s.kind === 'mission' || s.kind === 'express';
export const WEEK_GOAL = 3;
export const HOLIDAY_GOAL = 2;

/**
 * Wochen-Streak. Laufende Woche bricht nichts, ein Schild pro Monat rettet eine verpasste Woche.
 * Feiertagswochen: Ziel 2 Einsätze, und auch FLOW zählt.
 */
export function weekStreak(sessions, today, holiday) {
  const counts = new Map();
  const holidayWeeks = new Map();
  const isHW = (w) => {
    if (!holidayWeeks.has(w)) holidayWeeks.set(w, isHolidayWeek(w, holiday));
    return holidayWeeks.get(w);
  };
  for (const s of sessions) {
    const w = weekStart(s.day);
    if (!countsForWeek(s) && !(s.kind === 'flow' && isHW(w))) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  const goalFor = (w) => (isHW(w) ? HOLIDAY_GOAL : WEEK_GOAL);
  const current = weekStart(today);
  const thisWeek = counts.get(current) || 0;
  const goal = goalFor(current);
  if (!counts.size) return { streak: 0, best: 0, thisWeek, goal, shieldUsedThisMonth: false };

  const first = [...counts.keys()].sort()[0];
  const shieldsUsed = new Set();
  let streak = 0;
  let best = 0;
  for (let w = first; w < current; w = addDays(w, 7)) {
    if ((counts.get(w) || 0) >= goalFor(w)) streak++;
    else if (streak > 0 && !shieldsUsed.has(monthKey(w))) shieldsUsed.add(monthKey(w));
    else streak = 0;
    best = Math.max(best, streak);
  }
  if (thisWeek >= goal) streak++;
  best = Math.max(best, streak);
  return { streak, best, thisWeek, goal, shieldUsedThisMonth: shieldsUsed.has(monthKey(today)) };
}

// Kampfkraft: Konstanz + Kraftwerte (Bestleistungen) + Erfahrung.
export function kampfkraft({ xp, streak, records, mobility = 0 }) {
  const strength = Object.values(records || {}).reduce((s, r) => s + (r.score || 0), 0);
  return Math.round(100 + xp * 0.4 + streak * 40 + strength * 0.5 + mobility * 4);
}

export function playerStats(data, today) {
  const xp = totalXp(data.sessions);
  const rank = rankFor(xp);
  const week = weekStreak(data.sessions, today, data.settings?.holiday);
  const last = data.mobility?.[data.mobility.length - 1];
  const vals = last ? Object.values(last.scores) : [];
  const mobility = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  return { xp, rank, week, kk: kampfkraft({ xp, streak: week.streak, records: data.records, mobility }) };
}
