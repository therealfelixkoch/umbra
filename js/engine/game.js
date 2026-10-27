// XP, Ränge, Wochen-Streak mit Schild, Kampfkraft.
import { weekStart, addDays, monthKey } from './dates.js';
import { FULL_MISSIONS } from '../data/missions.js';
import { XP_CONFIG } from '../data/xp-config.js';
import { isHolidayWeek } from './arc.js';

// Gesamtränge und XP-Werte kommen aus js/data/xp-config.js (eine Stelle zum Anpassen).
export const RANKS = XP_CONFIG.ranks;
export const rankName = (r) => r.name || r.id;
const SRC = XP_CONFIG.sources;

/**
 * XP-Gutschriften einer Session, aufgeteilt nach Quelle: [[quelle, xp], …].
 * Bestleistungen sind eine eigene Quelle.
 */
export function sessionEntries(s) {
  const out = [];
  const c = Math.max(XP_CONFIG.partialMin, s.completion ?? 1);
  if (s.kind === 'mission' && FULL_MISSIONS.includes(s.missionId)) out.push([s.compact ? 'compact' : 'mission', Math.round((s.compact ? SRC.compact : SRC.mission) * c)]);
  else if (s.missionId === 'D_LIGHT') out.push(['light', Math.round(SRC.light * Math.max(0.3, s.completion ?? 1))]);
  else if (s.kind === 'express') out.push(['express', SRC.express]);
  else if (s.kind === 'flow') out.push(['flow', SRC.flow]);
  else if (s.kind === 'rest') out.push(['rest', SRC.rest]);
  else if (s.kind === 'check') out.push(['check', SRC.check]);
  else if (s.kind === 'arena') out.push(['arena', SRC.arena]);
  else if (s.kind === 'quest') out.push(['quest', SRC.quest]);
  else if (s.kind === 'ascension') out.push(['ascension', s.xp ?? SRC.ascension]);
  else if (s.kind === 'micro') out.push(['micro', s.xp ?? SRC.micro]);
  else if (SRC[s.kind] != null) out.push([s.kind, SRC[s.kind]]); // temper
  if (s.records?.length) out.push(['record', s.records.length * SRC.record]);
  return out;
}

// Roh-XP einer Session (ohne Tagesdeckel). Wird beim Verbuchen in session.xp gespeichert.
export function sessionXp(s) {
  return sessionEntries(s).reduce((n, [, x]) => n + x, 0);
}

/**
 * XP-Buch: alle Gutschriften mit Tag und Quelle, Tagesdeckel für Nebenquellen,
 * plus berechnete Boni (Wochenziel, Boss besiegt). Grundlage für Rang, Kampfkraft und „XP pro Quelle“.
 */
export function xpLedger(data, today) {
  const sessions = Array.isArray(data) ? data : data.sessions || [];
  const holiday = Array.isArray(data) ? undefined : data.settings?.holiday;
  const entries = [];
  for (const s of sessions) for (const [source, xp] of sessionEntries(s)) entries.push({ day: s.day, source, xp, raw: xp, arc: s.arc?.n });
  // Wochenziel erreicht (laufende Woche zählt, sobald das Ziel erreicht ist)
  const counts = weekCounts(sessions, holiday);
  for (const [ws, n] of counts) {
    if (n >= (isHolidayWeek(ws, holiday) ? HOLIDAY_GOAL : WEEK_GOAL)) {
      const arc = sessions.find((x) => x.day >= ws && x.day <= addDays(ws, 6) && x.arc?.n != null)?.arc.n;
      entries.push({ day: addDays(ws, 6), source: 'weekGoal', xp: SRC.weekGoal, raw: SRC.weekGoal, arc });
    }
  }
  // Boss besiegt
  if (!Array.isArray(data)) {
    for (const [n, e] of Object.entries(data.engine?.bossEvents || {})) {
      if (!e.defeated) continue;
      const xp = e.medal ? SRC.guardian[e.medal] : SRC.boss; // Saison-Wächter nach Medaille
      entries.push({ day: e.defeated, source: e.medal ? 'guardian' : 'boss', xp, raw: xp, arc: Number(n) });
    }
  }
  // Tagesdeckel für Nebenquellen
  entries.sort((a, b) => a.day.localeCompare(b.day));
  const sideUsed = new Map();
  for (const e of entries) {
    if (!XP_CONFIG.sideSources.includes(e.source)) continue;
    const used = sideUsed.get(e.day) || 0;
    e.xp = Math.max(0, Math.min(e.raw, XP_CONFIG.sideDailyCap - used));
    sideUsed.set(e.day, used + e.xp);
  }
  const bySource = {};
  let total = 0;
  for (const e of entries) {
    bySource[e.source] = (bySource[e.source] || 0) + e.xp;
    total += e.xp;
  }
  return { total, bySource, entries };
}

// Gutschriften gruppiert: pro Woche oder pro Arc → { schlüssel: { quelle: xp } }
export function xpBySource(ledger, by = 'week') {
  const out = {};
  for (const e of ledger.entries) {
    const key = by === 'arc' ? (e.arc ?? 'ohne Arc') : weekStart(e.day);
    out[key] ||= {};
    out[key][e.source] = (out[key][e.source] || 0) + e.xp;
  }
  return out;
}

// Noch verfügbare Neben-XP an einem Tag (für die Anzeige „+15 XP“ beim Verbuchen)
export function sideCapLeft(data, day) {
  const used = xpLedger(data).entries.filter((e) => e.day === day && XP_CONFIG.sideSources.includes(e.source)).reduce((n, e) => n + e.xp, 0);
  return Math.max(0, XP_CONFIG.sideDailyCap - used);
}

export function totalXp(data) {
  return xpLedger(data).total;
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

export function weekCounts(sessions, holiday) {
  const counts = new Map();
  for (const s of sessions) {
    const w = weekStart(s.day);
    if (!countsForWeek(s) && !(s.kind === 'flow' && isHolidayWeek(w, holiday))) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return counts;
}

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
  const xp = totalXp(data);
  const rank = rankFor(xp);
  const week = weekStreak(data.sessions, today, data.settings?.holiday);
  const last = data.mobility?.[data.mobility.length - 1];
  const vals = last ? Object.values(last.scores) : [];
  const mobility = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  return { xp, rank, week, kk: kampfkraft({ xp, streak: week.streak, records: data.records, mobility }) };
}
