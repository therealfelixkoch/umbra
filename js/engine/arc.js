// Arcs: 6-Wochen-Mesozyklen. Eine Arc-Woche zählt nur, wenn darin mindestens 2 volle Missionen stattfanden.
import { ARC_WEEKS, MIN_MISSIONS_PER_WEEK, WEEK_PLAN, arcOf } from '../data/arcs.js';
import { FULL_MISSIONS } from '../data/missions.js';
import { weekStart, addDays } from './dates.js';

export const DEFAULT_HOLIDAY = { enabled: true, from: '12-21', to: '01-03' };

export function initialArc(today) {
  // Die laufende Kalenderwoche ist Woche 1; ausgewertet wird sie, sobald sie vorbei ist.
  return { n: 0, week: 1, through: addDays(weekStart(today), -7), startedWeek: weekStart(today) };
}

// ——— Feiertagsmodus ———
export function isHoliday(day, holiday = DEFAULT_HOLIDAY) {
  if (!holiday?.enabled) return false;
  const md = day.slice(5);
  return holiday.from <= holiday.to ? md >= holiday.from && md <= holiday.to : md >= holiday.from || md <= holiday.to;
}

// Eine Kalenderwoche gilt als Feiertagswoche, wenn mindestens 4 ihrer Tage im Zeitraum liegen.
export function isHolidayWeek(ws, holiday) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (isHoliday(addDays(ws, i), holiday)) n++;
  return n >= 4;
}

// Tage zwischen zwei Daten ohne Feiertage (für die Pausenlogik).
export function workingGap(fromDay, toDay, holiday) {
  let n = 0;
  for (let d = addDays(fromDay, 1); d <= toDay; d = addDays(d, 1)) if (!isHoliday(d, holiday)) n++;
  return n;
}

export const countsForArc = (s) => s.kind === 'mission' && FULL_MISSIONS.includes(s.missionId);

export function weekInfo(arc) {
  const a = arcOf(arc.n);
  return { ...WEEK_PLAN[arc.week], arc: a, week: arc.week, cycle: Math.floor(arc.n / 4) };
}

/**
 * Wertet alle abgeschlossenen Kalenderwochen seit dem letzten Stand aus.
 * - ≥ 2 volle Missionen (Kompakt zählt, Express nicht): Arc-Woche weiter.
 * - weniger: Woche wird wiederholt.
 * - Feiertagswoche: Arc pausiert, nichts ändert sich.
 * - Woche 6 und eine Pause von 10+ Tagen: Die Pause zählt als Deload, der nächste Arc beginnt.
 * @returns {{arc:object, events:object[]}}
 */
export function syncArc(arc, sessions, today, { holiday, gap } = {}) {
  let a = { ...arc };
  const events = [];
  const current = weekStart(today);
  for (let ws = addDays(a.through, 7); ws < current; ws = addDays(ws, 7)) {
    a.through = ws;
    if (isHolidayWeek(ws, holiday)) {
      events.push({ type: 'paused', week: ws });
      continue;
    }
    const count = sessions.filter((s) => countsForArc(s) && s.day >= ws && s.day < addDays(ws, 7)).length;
    if (count >= MIN_MISSIONS_PER_WEEK) {
      if (a.week >= ARC_WEEKS) {
        events.push({ type: 'arc_complete', n: a.n });
        a = { ...a, n: a.n + 1, week: 1, startedWeek: addDays(ws, 7), jumped: false };
      } else {
        a.week += 1;
        events.push({ type: 'week_done', week: a.week });
      }
    } else {
      events.push({ type: 'week_repeat', week: a.week, count });
    }
  }
  if (a.week === ARC_WEEKS && gap != null && gap >= 10) {
    events.push({ type: 'arc_complete', n: a.n, byPause: true });
    a = { ...a, n: a.n + 1, week: 1, startedWeek: current, jumped: false };
  }
  return { arc: a, events };
}

// 3× „Platt“, Stagnation Stufe 2 oder der manuelle Knopf: direkt in die Deload-Woche.
export function jumpToDeload(arc) {
  return { ...arc, week: ARC_WEEKS, jumped: true };
}

export const inDeload = (arc) => arc?.week === ARC_WEEKS;

export function holidayActive(today, holiday) {
  return isHoliday(today, holiday);
}

export function daysToHoliday(today, holiday) {
  if (!holiday?.enabled) return null;
  for (let i = 0; i < 60; i++) if (isHoliday(addDays(today, i), holiday)) return i;
  return null;
}

