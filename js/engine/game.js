// XP, Ränge, Wochen-Streak mit Schild, Kampfkraft.
import { weekStart, addDays, monthKey } from './dates.js';
import { ROTATION } from './history.js';

export const RANKS = [
  { id: 'E', xp: 0 },
  { id: 'D', xp: 1000 },
  { id: 'C', xp: 3000 },
  { id: 'B', xp: 7000 },
  { id: 'A', xp: 15000 },
  { id: 'S', xp: 30000 },
  { id: 'U', xp: 60000, name: 'Unzerbrechlich' },
];

export const XP = { mission: 100, missionBonus: 25, light: 60, express: 50, flow: 20, rest: 10,
  arenaLight: 60, arenaHard: 80, record: 20 };

export function sessionXp(s) {
  let xp = 0;
  if (s.kind === 'mission' && ROTATION.includes(s.missionId)) {
    const c = Math.max(0.2, s.completion ?? 1);
    xp = Math.round(XP.mission * c) + (c >= 0.999 ? XP.missionBonus : 0);
  } else if (s.missionId === 'D_LIGHT') xp = Math.round(XP.light * Math.max(0.3, s.completion ?? 1));
  else if (s.kind === 'express') xp = XP.express;
  else if (s.kind === 'flow') xp = XP.flow;
  else if (s.kind === 'rest') xp = XP.rest;
  else if (s.kind === 'arena') {
    const base = s.intensity === 'hard' ? XP.arenaHard : XP.arenaLight;
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

// Einsätze, die für die Woche zählen: Arena, Missionen, Kurzeinsätze.
export const countsForWeek = (s) => s.kind === 'arena' || s.kind === 'mission' || s.kind === 'express';
export const WEEK_GOAL = 3;

/** Wochen-Streak. Laufende Woche bricht nichts, ein Schild pro Monat rettet eine verpasste Woche. */
export function weekStreak(sessions, today) {
  const counts = new Map();
  for (const s of sessions) {
    if (!countsForWeek(s)) continue;
    const w = weekStart(s.day);
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  const current = weekStart(today);
  const thisWeek = counts.get(current) || 0;
  if (!counts.size) return { streak: 0, best: 0, thisWeek, shieldUsedThisMonth: false };

  const first = [...counts.keys()].sort()[0];
  const shieldsUsed = new Set();
  let streak = 0;
  let best = 0;
  for (let w = first; w < current; w = addDays(w, 7)) {
    if ((counts.get(w) || 0) >= WEEK_GOAL) streak++;
    else if (streak > 0 && !shieldsUsed.has(monthKey(w))) shieldsUsed.add(monthKey(w));
    else streak = 0;
    best = Math.max(best, streak);
  }
  if (thisWeek >= WEEK_GOAL) streak++;
  best = Math.max(best, streak);
  return { streak, best, thisWeek, shieldUsedThisMonth: shieldsUsed.has(monthKey(today)) };
}

// Kampfkraft: Konstanz + Kraftwerte (Bestleistungen) + Erfahrung.
export function kampfkraft({ xp, streak, records }) {
  const strength = Object.values(records || {}).reduce((s, r) => s + (r.score || 0), 0);
  return Math.round(100 + xp * 0.4 + streak * 40 + strength * 0.5);
}

export function playerStats(data, today) {
  const xp = totalXp(data.sessions);
  const rank = rankFor(xp);
  const week = weekStreak(data.sessions, today);
  return { xp, rank, week, kk: kampfkraft({ xp, streak: week.streak, records: data.records }) };
}
