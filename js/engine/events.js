// Events und Körpergewicht: reine Funktionen.
import { EVENTS } from '../data/events.js';
import { activeRun, UNITS_PER_CHAPTER } from './run.js';
import { weekStart } from './dates.js';

/** Event des Kapitels (deterministisch). */
export const eventOf = (n, c) => EVENTS[((n * 2 + c) % EVENTS.length + EVENTS.length) % EVENTS.length];

// BANG COMBAT (19.11.2026): Events hängen an Einheiten statt an Wochenenden.
export const EVENT_ANNOUNCE_FROM = 6; // ab Einheit 6 des Kapitels angekündigt
export const EVENT_FROM = 8; // ab Einheit 8 angeboten, bis das Kapitel fertig ist (Einheit 15)

/**
 * Event-Stand für heute: 'announce' bei Einheit 6–7 als nächster, 'live' ab Einheit 8 bis Kapitelende, solange nicht erledigt.
 * Freiwillig, an jedem Tag, zählt nicht als Einheit.
 */
export function eventToday(data, today) {
  const run = activeRun(data.engine);
  if (!run || (run.startedDay && today < run.startedDay)) return null;
  const next = run.done + 1;
  if (run.done >= UNITS_PER_CHAPTER) return null;
  const c = run.chapter;
  const ev = eventOf(run.n, c);
  const done = data.sessions.some((s) => s.kind === 'event' && s.n === run.n && s.chapter === c);
  if (done) return null;
  if (next >= EVENT_FROM) return { state: 'live', event: ev, day: today, n: run.n, chapter: c, unit: next };
  if (next >= EVENT_ANNOUNCE_FROM) return { state: 'announce', event: ev, day: null, n: run.n, chapter: c, unit: next, from: EVENT_FROM };
  return null;
}

// ——— Körpergewicht (optional, wöchentlich) ———
export const bodyLogOf = (data) => data.bodyLog || {};

/** Einträge sortiert, optional ab einem Tag. */
export function weightSeries(data, from = null) {
  return Object.entries(bodyLogOf(data)).filter(([d]) => !from || d >= from).sort((a, b) => a[0].localeCompare(b[0])).map(([day, kg]) => ({ day, kg }));
}

export const weightLoggedThisWeek = (data, today) => Object.keys(bodyLogOf(data)).some((d) => d >= weekStart(today) && d <= today);
