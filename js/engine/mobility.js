// Mobility-Check: Scores, Prioritäten nach Muay-Thai-Gewicht, Auswahl der Fokus-Stretches.
import { REGIONS, RETEST_DAYS } from '../data/mobility.js';
import { daysBetween } from './dates.js';

export const FOCUS_COUNT = 3;

// Stufe 1–5 → Score 0–100
export const levelToScore = (level) => (level - 1) * 25;

export function latestTest(tests = []) {
  return tests.length ? tests[tests.length - 1] : null;
}

export function previousTest(tests = []) {
  return tests.length > 1 ? tests[tests.length - 2] : null;
}

export function isDue(tests = [], today) {
  const last = latestTest(tests);
  return !last || daysBetween(last.day, today) >= RETEST_DAYS;
}

export function averageScore(scores) {
  const vals = Object.values(scores || {});
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

// Priorität pro Region = (100 − Score) × Muay-Thai-Gewicht, absteigend sortiert.
export function priorities(scores, regions = REGIONS) {
  return regions
    .filter((r) => scores[r.id] != null)
    .map((r) => ({ region: r.id, priority: (100 - scores[r.id]) * r.weight }))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Drei Fokus-Stretches: je einer für die drei wichtigsten Regionen.
 * Pro Region wechselt die Wahl täglich zwischen den zwei besten passenden Stretches (Variabilität).
 * @param {object} scores  { regionId: 0–100 }
 * @param {object[]} pool  Stretches mit `regions`
 * @param {number} dayIndex fortlaufende Tageszahl
 */
export function selectStretches(scores, pool, dayIndex, n = FOCUS_COUNT) {
  const prio = Object.fromEntries(priorities(scores).map((p) => [p.region, p.priority]));
  const value = (s) => (s.regions || []).reduce((sum, r) => sum + (prio[r] || 0), 0);
  const top = priorities(scores).filter((p) => p.priority > 0).slice(0, n);
  const chosen = [];
  for (const { region } of top) {
    const options = pool
      .filter((s) => (s.regions || []).includes(region) && !chosen.includes(s.id))
      .sort((a, b) => value(b) - value(a) || a.id.localeCompare(b.id));
    if (!options.length) continue;
    const pick = options[dayIndex % Math.min(2, options.length)];
    chosen.push(pick.id);
  }
  // Falls Regionen fehlen: mit den insgesamt wertvollsten auffüllen.
  const rest = pool.filter((s) => !chosen.includes(s.id) && value(s) > 0).sort((a, b) => value(b) - value(a));
  while (chosen.length < Math.min(n, top.length) && rest.length) chosen.push(rest.shift().id);
  return chosen;
}
