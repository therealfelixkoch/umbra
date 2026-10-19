// SUNDAY RESET: 5 Häkchen ab Sonntag 16 Uhr, montags nachholbar. Dazu ein grober Wochenplan als Hinweis.
import { weekStart, addDays } from './dates.js';

export const RESET_ITEMS = [
  ['review', 'Rückblick', 'Zahlen, Trainingslast, Automatik der Gelübde'],
  ['walk', 'Spaziergang im Tageslicht', ''],
  ['meals', '2–3 Essen für Mo/Di vorbereitet', ''],
  ['plan', 'Woche grob geplant', 'Wann ARENA, wann Missionen'],
  ['oaths', 'Gelübde für die Woche bestätigt', ''],
];
export const RESET_HOUR = 16;
export const PLAN_KINDS = [['', '–'], ['arena', 'ARENA'], ['mission', 'Mission'], ['frei', 'Frei']];
export const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Welche Woche steht zum Reset an? Sonntag ab 16 Uhr die laufende, Montag die vergangene. */
export function resetDue(data, today, hour) {
  const ws = weekStart(today);
  const dow = Math.round((Date.parse(today) - Date.parse(ws)) / 86400000);
  const target = dow === 6 && hour >= RESET_HOUR ? ws : dow === 0 ? addDays(ws, -7) : null;
  if (!target) return null;
  return resetDone(data, target) ? null : target;
}

/** Häkchen-Stand; Rückblick und Wochenplan haken sich selbst ab, sobald sie erledigt sind. */
export function resetState(data, ws) {
  const r = data.resets?.[ws] || {};
  const plan = data.weekPlans?.[addDays(ws, 7)] || {};
  return {
    review: !!data.reviews?.[ws],
    walk: !!r.walk,
    meals: !!r.meals,
    plan: !!r.plan || Object.values(plan).some(Boolean),
    oaths: !!r.oaths,
  };
}

export const resetDone = (data, ws) => !!data.resets?.[ws]?.done;

export function toggleReset(data, ws, key, today) {
  const cur = { ...(data.resets?.[ws] || {}) };
  cur[key] = !resetState(data, ws)[key];
  let next = { ...data, resets: { ...(data.resets || {}), [ws]: cur } };
  const st = resetState(next, ws);
  if (RESET_ITEMS.every(([k]) => st[k]) && !cur.done) {
    next = { ...next, resets: { ...next.resets, [ws]: { ...cur, done: today } } };
  }
  return next;
}

/** Abschluss nachziehen, wenn Rückblick oder Plan das letzte Häkchen waren. */
export function settleReset(data, ws, today) {
  if (resetDone(data, ws)) return data;
  const st = resetState(data, ws);
  if (!RESET_ITEMS.every(([k]) => st[k])) return data;
  return { ...data, resets: { ...(data.resets || {}), [ws]: { ...(data.resets?.[ws] || {}), done: today } } };
}

/** Wochenplan-Tag durchschalten: – → ARENA → Mission → Frei → –. */
export function cyclePlan(data, ws, dayIdx) {
  const plan = { ...(data.weekPlans?.[ws] || {}) };
  const order = PLAN_KINDS.map(([k]) => k);
  plan[dayIdx] = order[(order.indexOf(plan[dayIdx] || '') + 1) % order.length];
  if (!plan[dayIdx]) delete plan[dayIdx];
  return { ...data, weekPlans: { ...(data.weekPlans || {}), [ws]: plan } };
}

/** Hinweis für heute aus dem Wochenplan (nur Hinweis, keine Regel). */
export function planHint(data, today) {
  const ws = weekStart(today);
  const idx = Math.round((Date.parse(today) - Date.parse(ws)) / 86400000);
  return data.weekPlans?.[ws]?.[idx] || null;
}

/** XP: 50 pro komplettem Reset. */
export const resetXpEntries = (data, src) => Object.values(data.resets || {}).filter((r) => r.done)
  .map((r) => ({ day: r.done, source: 'sundayReset', xp: src.sundayReset, raw: src.sundayReset }));
