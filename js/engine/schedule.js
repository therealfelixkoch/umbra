// BANG COMBAT (Interview 19.11.2026): Reihenfolge statt Wochentage. Die App zeigt die nächste Einheit (A → B → C),
// nichts verfällt, kein „verpasst“, keine Nachhol-Liste. Gute Woche = 2× Gym + 1× Muay Thai, alles darüber ist Bonus.
// Muay Thai planen Felix und sein Partner selbst, die App plant es nicht voraus.
// Die festen Wochentage von UMBRA 2.0 (v43/v44) stehen unten noch als Altlast (weekSchedule, allowedOn, nextFreeDay),
// bis die Oberfläche umgestellt ist. todayPick liefert schon die nächste Einheit.
import { addDays, weekStart } from './dates.js';
import { PROGRAM_MISSIONS } from '../data/program.js';
import { programOf, DEFAULT_PROGRAM } from '../data/library.js';
import { MISSIONS } from '../data/missions.js';

export const DEFAULT_WEEK_PLAN = { 1: 'C', 2: 'B', 4: 'A', 5: 'D' }; // ISO-Wochentag (1 = Mo) → Mission
export const DEFAULT_MT_DAYS = [1, 4]; // Muay Thai abends
export const DAY_NAMES = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So' };
export const LEG_MISSIONS = ['B', 'D'];

export const isoDow = (day) => { const d = new Date(`${day}T12:00:00Z`).getUTCDay(); return d === 0 ? 7 : d; };

// Welche Mission hat eine Session erledigt? Die Mini-Mission zählt für den Platz, den sie ersetzt hat.
const OLD_MISSIONS = ['A', 'B', 'C', 'D'];
const doneId = (s) => (s.kind === 'mission' && ([...PROGRAM_MISSIONS, ...OLD_MISSIONS].includes(s.missionId) ? s.missionId
  : OLD_MISSIONS.includes(s.slot) ? s.slot : null));

/** Nächste Einheit nach dem Log: nach der zuletzt erledigten A/B/C-Einheit die folgende, sonst A. */
export function nextInOrder(sessions, units = PROGRAM_MISSIONS) {
  const last = [...sessions].reverse().find((s) => s.kind === 'mission' && units.includes(s.missionId));
  return last ? units[(units.indexOf(last.missionId) + 1) % units.length] : units[0];
}

/**
 * Stand der Woche nach der Regel „Gute Woche = 2× Gym + 1× Muay Thai“. Darunter ist kein Problem, darüber Bonus.
 * @returns {{gym:number, arena:number, good:boolean, bonus:number, units:{id:string, day:string}[]}}
 */
export function weekTally(sessions, today, goal = programOf(DEFAULT_PROGRAM).goodWeek) {
  const ws = weekStart(today);
  const list = sessions.filter((s) => s.day >= ws && s.day <= addDays(ws, 6));
  const units = list.filter((s) => s.kind === 'mission' && PROGRAM_MISSIONS.includes(s.missionId)).map((s) => ({ id: s.missionId, day: s.day }));
  const gym = list.filter((s) => s.kind === 'mission').length;
  const arena = list.filter((s) => s.kind === 'arena').length;
  const good = gym >= goal.gym && arena >= goal.arena;
  return { gym, arena, good, bonus: Math.max(0, gym - goal.gym) + Math.max(0, arena - goal.arena), units, goal };
}

// „Was geht heute?“ – Antworten und was die App daraus vorschlägt (die Oberfläche fragt, Felix entscheidet).
export const TODAY_ANSWERS = { gym: 'Gym', mt: 'Muay Thai', both: 'Beides', none: 'Nichts' };

/**
 * Vorschlag für heute.
 * @param {'gym'|'mt'|'both'|'none'} answer
 * @param {{next:string, partner?:boolean}} o next = nächste Einheit, partner = false, wenn der Partner abgesagt hat
 * @returns {{items:{kind:'unit'|'arena'|'bag', missionId?:string, compact?:boolean, optional?:boolean, minutes?:number}[], text:string}}
 */
export function todaySuggestion(answer, { next, partner = true } = {}) {
  if (answer === 'gym') return { items: [{ kind: 'unit', missionId: next }], text: 'Heute die nächste Einheit.' };
  if (answer === 'both') {
    return { items: [{ kind: 'unit', missionId: next }, { kind: 'arena' }], text: 'Nächste Einheit und Muay Thai, die Reihenfolge ist egal.' };
  }
  if (answer === 'mt') {
    return partner ? { items: [{ kind: 'arena' }], text: 'Heute Muay Thai.' }
      : { items: [{ kind: 'bag', minutes: 30 }, { kind: 'unit', missionId: next, compact: true, optional: true }],
        text: 'Partner sagt ab: ca. 30 min am Sack, nach Lust dazu die nächste Einheit als Kurzversion.' };
  }
  return { items: [], text: 'Heute nichts. Die nächste Einheit wartet, es verfällt nichts.' };
}

/**
 * Stand der laufenden Woche.
 * @returns {{planned:{dow:number,id:string,day:string}[], done:string[], today:string|null, todayPlanned:string|null,
 *            open:{dow:number,id:string,day:string}[], upcoming:{dow:number,id:string,day:string}[], doneOn:object}}
 */
export function weekSchedule({ weekPlan = DEFAULT_WEEK_PLAN, sessions, today }) {
  const ws = weekStart(today);
  const doneOn = {};
  for (const s of sessions) {
    if (s.day < ws || s.day > addDays(ws, 6)) continue;
    const id = doneId(s);
    if (id && !doneOn[id]) doneOn[id] = s.day;
  }
  const planned = Object.entries(weekPlan || {}).filter(([, id]) => id)
    .map(([dow, id]) => ({ dow: Number(dow), id, day: addDays(ws, Number(dow) - 1) }))
    .sort((a, b) => a.dow - b.dow);
  const todays = planned.find((p) => p.day === today) || null;
  return {
    planned, doneOn, done: Object.keys(doneOn),
    todayPlanned: todays?.id || null,
    today: todays && !doneOn[todays.id] ? todays.id : null,
    open: planned.filter((p) => p.day < today && !doneOn[p.id]),
    upcoming: planned.filter((p) => p.day > today && !doneOn[p.id]),
  };
}

/** Ist an diesem Tag Muay Thai? Check-in schlägt den Plan (Ja/Vielleicht = ja, Nein = nein). */
export function mtOn(day, { mtDays = DEFAULT_MT_DAYS, checkin = null } = {}) {
  if (checkin?.tonightMT === 'yes' || checkin?.tonightMT === 'maybe') return true;
  if (checkin?.tonightMT === 'no') return false;
  return mtDays.includes(isoDow(day));
}

/**
 * Darf diese Mission an diesem Tag laufen?
 * @param {{mt:boolean, legsAround:string[]}} ctx legsAround = Legs/Full-Body-Missionen am Vortag und Folgetag
 */
export function allowedOn(id, { mt, legsAround = [] }) {
  if (!LEG_MISSIONS.includes(id)) return { ok: true };
  if (mt) return { ok: false, why: 'Legs und Full Body nicht an einem Muay-Thai-Tag.' };
  const other = id === 'B' ? 'D' : 'B';
  if (legsAround.includes(other)) return { ok: false, why: 'Zwischen Legs und Full Body ein Tag ohne Beine.' };
  return { ok: true };
}

// Legs/Full Body am Vortag (erledigt) und am Folgetag (geplant, offen)
function legsAround(day, sched, sessions) {
  const prev = addDays(day, -1);
  const next = addDays(day, 1);
  const out = sessions.filter((s) => s.day === prev).map(doneId).filter((x) => LEG_MISSIONS.includes(x));
  for (const p of sched.planned) if (p.day === next && LEG_MISSIONS.includes(p.id) && !sched.doneOn[p.id]) out.push(p.id);
  return out;
}

/** Nächster freier Tag dieser Woche (nach heute) für eine Mission, oder null. */
export function nextFreeDay(id, { sched, today, mtDays = DEFAULT_MT_DAYS, sessions = [] }) {
  const ws = weekStart(today);
  for (let d = addDays(today, 1); d <= addDays(ws, 6); d = addDays(d, 1)) {
    if (sched.planned.some((p) => p.day === d && !sched.doneOn[p.id])) continue;
    if (allowedOn(id, { mt: mtDays.includes(isoDow(d)), legsAround: legsAround(d, sched, sessions) }).ok) return d;
  }
  return null;
}

/**
 * Was ist heute dran? BANG COMBAT: immer die nächste Einheit, egal welcher Tag.
 * Gleiche Rückgabe wie früher, damit die alte Oberfläche weiterläuft (kind 'next' statt 'planned').
 * @returns {{missionId:string, kind:'next', reason:string, sched:object}}
 */
export function todayPick({ weekPlan = DEFAULT_WEEK_PLAN, sessions, today, names = {}, next = null }) {
  const sched = weekSchedule({ weekPlan: {}, sessions, today });
  const id = next || nextInOrder(sessions);
  const name = names[id] || MISSIONS[id]?.name || id;
  const done = sessions.some((s) => s.day === today && s.kind === 'mission' && PROGRAM_MISSIONS.includes(s.missionId));
  return { missionId: id, kind: 'next', sched,
    reason: done ? `Heute schon trainiert. Als Nächstes: ${name}, wann es passt.` : `Nächste Einheit: ${name}.` };
}
