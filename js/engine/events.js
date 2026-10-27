// Events und Körpergewicht: reine Funktionen.
import { EVENTS } from '../data/events.js';
import { CHAPTER_WEEKS, chapterOf } from '../data/arcs.js';
import { weekStart, addDays } from './dates.js';

/** Event des Kapitels (deterministisch). */
export const eventOf = (n, c) => EVENTS[((n * 2 + c) % EVENTS.length + EVENTS.length) % EVENTS.length];

/**
 * Event-Stand für heute: 'announce' in Kapitelwoche 3 (Samstag danach ist Event-Woche),
 * 'live' am Samstag/Sonntag der Kapitelwoche 4, solange nicht erledigt.
 */
export function eventToday(data, today) {
  const arc = data.engine?.arc;
  if (!arc || arc.n < 0 || (arc.startedDay && today < arc.startedDay)) return null;
  const c = chapterOf(arc.week);
  if (c === 'exam') return null;
  const cw = arc.week - c * CHAPTER_WEEKS;
  const ev = eventOf(arc.n, c);
  const done = data.sessions.some((s) => s.kind === 'event' && s.n === arc.n && s.chapter === c);
  if (done) return null;
  const sat = addDays(weekStart(today), 5);
  if (cw === 3) return { state: 'announce', event: ev, day: addDays(sat, 7), n: arc.n, chapter: c };
  if (cw === 4 && today >= sat) return { state: 'live', event: ev, day: sat, n: arc.n, chapter: c };
  if (cw === 4) return { state: 'announce', event: ev, day: sat, n: arc.n, chapter: c };
  return null;
}

// ——— Körpergewicht (optional, wöchentlich) ———
export const bodyLogOf = (data) => data.bodyLog || {};

/** Einträge sortiert, optional ab einem Tag. */
export function weightSeries(data, from = null) {
  return Object.entries(bodyLogOf(data)).filter(([d]) => !from || d >= from).sort((a, b) => a[0].localeCompare(b[0])).map(([day, kg]) => ({ day, kg }));
}

export const weightLoggedThisWeek = (data, today) => Object.keys(bodyLogOf(data)).some((d) => d >= weekStart(today) && d <= today);
