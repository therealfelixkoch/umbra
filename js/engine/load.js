// Belastungsklassen: high / normal / low.
import { addDays } from './dates.js';

const RANK = { low: 0, normal: 1, high: 2 };

// Klasse einer geplanten oder erledigten Einheit.
export function loadClass({ kind, missionId, compact, intensity, rpe }) {
  if (kind === 'arena') return (rpe ?? (intensity === 'hard' ? 8 : 4)) >= 7 ? 'high' : 'low';
  if (kind !== 'mission') return 'low';
  if (compact) return 'low';
  if (['B', 'FORGE', 'NOR4X4'].includes(missionId)) return 'high';
  if (['A', 'C', 'D', 'HOTEL'].includes(missionId)) return 'normal';
  return 'low'; // D leicht
}

export function maxClass(list) {
  return list.reduce((m, c) => (RANK[c] > RANK[m] ? c : m), 'low');
}

// Klasse von gestern: alle Einheiten gestern plus die Check-in-Angabe zum Muay Thai.
export function yesterdayClass(sessions, today, yesterdayMT) {
  const y = addDays(today, -1);
  const classes = sessions.filter((s) => s.day === y).map(loadClass);
  if (yesterdayMT === 'hard') classes.push('high');
  return classes.length ? maxClass(classes) : null;
}

export const LOAD_LABEL = { high: 'High', normal: 'Normal', low: 'Low' };
