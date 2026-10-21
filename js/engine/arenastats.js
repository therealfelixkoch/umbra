// ARENA-Status: Einheiten, Stunden, Sparringsrunden, Inhalte und monatlicher Technik-Check. Reine Funktionen.
import { monthKey } from './dates.js';

export const ARENA_CONTENT = ['Technik', 'Pratzen', 'Sack', 'Clinch', 'Sparring', 'Kondition'];

export const TECH_SKILLS = [
  ['teep', 'Teep'], ['roundhouse', 'Roundhouse'], ['knee', 'Knie'], ['elbow', 'Ellbogen'], ['clinch', 'Clinch'],
  ['boxing', 'Boxen'], ['defense', 'Verteidigung / Checks'], ['footwork', 'Footwork'], ['cardio', 'Kondition Runde 3+'],
];

// Intensität = RPE 1–10 (für Trainingslast)
export const arenaIntensity = (s) => s.rpe ?? null;

function summarize(list) {
  const content = Object.fromEntries(ARENA_CONTENT.map((k) => [k, 0]));
  for (const s of list) for (const k of s.content || []) if (k in content) content[k] += 1;
  return {
    sessions: list.length,
    hours: Math.round(list.reduce((n, s) => n + (s.minutes || 0), 0) / 6) / 10,
    sparRounds: list.reduce((n, s) => n + (s.sparRounds || 0), 0),
    content,
  };
}

/** Gesamt, pro Monat (neueste zuerst) und pro Arc. */
export function arenaStats(sessions) {
  const arena = sessions.filter((s) => s.kind === 'arena');
  const byMonth = new Map();
  const byArc = new Map();
  for (const s of arena) {
    const m = monthKey(s.day);
    byMonth.set(m, [...(byMonth.get(m) || []), s]);
    if (s.arc?.n != null) byArc.set(s.arc.n, [...(byArc.get(s.arc.n) || []), s]);
  }
  return {
    total: summarize(arena),
    months: [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, l]) => ({ key: k, ...summarize(l) })),
    arcs: [...byArc.entries()].sort((a, b) => b[0] - a[0]).map(([n, l]) => ({ n, ...summarize(l) })),
  };
}

/** Stats für einen Zeitraum (Debrief). */
export function arenaRange(sessions, from, to) {
  return summarize(sessions.filter((s) => s.kind === 'arena' && s.day >= from && s.day <= to));
}

/** Technik-Check fällig? Einmal pro Kalendermonat. */
export const techCheckDue = (checks, today) => !checks?.[monthKey(today)];

/** Aktueller Monat (bzw. letzter Check) gegen den Check davor. */
export function techCompare(checks) {
  const keys = Object.keys(checks || {}).sort();
  const cur = keys.at(-1);
  const prev = keys.at(-2);
  return { current: cur ? { key: cur, ...checks[cur] } : null, previous: prev ? { key: prev, ...checks[prev] } : null };
}

/** Lore-Zeile nach Erfahrung in der Arena. */
export function arenaLore(total) {
  if (total.sessions >= 100) return 'Die Arena kennt deinen Namen. Und sie spricht ihn mit Respekt.';
  if (total.sessions >= 40) return 'Die Arena kennt deinen Namen.';
  if (total.sessions >= 12) return 'Die Matte erinnert sich an deine Schritte.';
  if (total.sessions >= 1) return 'Ein neuer Schatten auf der Matte. Noch fremd, nicht mehr lange.';
  return 'Die Arena wartet.';
}
