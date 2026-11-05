// UMBRA 2.0: feste Wochentage statt Rotation. Reine Funktionen über Wochenplan, Muay-Thai-Tage und Log.
// Regeln (Interview 05.11.2026):
// - Legs (B) und Full Body (D) nie an einem Muay-Thai-Tag, und ein Tag Abstand zwischen beiden.
// - Verpasst: die App bietet den nächsten freien Tag in derselben Woche an. Kein Platz mehr: fällt aus, kein Nachholen.
// - Mini-Mission (Jobtag) ersetzt die Mission des Tages und zählt als erledigt.
import { addDays, weekStart } from './dates.js';
import { PROGRAM_MISSIONS } from '../data/program.js';

export const DEFAULT_WEEK_PLAN = { 1: 'C', 2: 'B', 4: 'A', 5: 'D' }; // ISO-Wochentag (1 = Mo) → Mission
export const DEFAULT_MT_DAYS = [1, 4]; // Muay Thai abends
export const DAY_NAMES = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So' };
export const LEG_MISSIONS = ['B', 'D'];

export const isoDow = (day) => { const d = new Date(`${day}T12:00:00Z`).getUTCDay(); return d === 0 ? 7 : d; };

// Welche Mission hat eine Session erledigt? Die Mini-Mission zählt für den Platz, den sie ersetzt hat.
const doneId = (s) => (s.kind === 'mission' && (PROGRAM_MISSIONS.includes(s.missionId) ? s.missionId
  : PROGRAM_MISSIONS.includes(s.slot) ? s.slot : null));

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
 * Was ist heute dran?
 * @returns {{missionId:string|null, kind:'planned'|'swap'|'catchup'|'free'|'done', reason:string, moved?:{id:string, to:string|null}}}
 */
export function todayPick({ weekPlan = DEFAULT_WEEK_PLAN, mtDays = DEFAULT_MT_DAYS, sessions, today, checkin = null, names = {} }) {
  const sched = weekSchedule({ weekPlan, sessions, today });
  const mt = mtOn(today, { mtDays, checkin });
  const around = legsAround(today, sched, sessions);
  const name = (id) => names[id] || id;
  const dayName = (d) => DAY_NAMES[isoDow(d)];
  if (sched.today) {
    const ok = allowedOn(sched.today, { mt, legsAround: around });
    if (ok.ok) return { missionId: sched.today, kind: 'planned', reason: `Heute laut Wochenplan: ${name(sched.today)}.`, sched };
    // Heute geht die geplante Mission nicht: auf den nächsten freien Tag schieben, heute eine andere vorziehen.
    const to = nextFreeDay(sched.today, { sched, today, mtDays, sessions });
    const alt = [...sched.open, ...sched.upcoming].map((p) => p.id)
      .find((x) => x !== sched.today && allowedOn(x, { mt, legsAround: around }).ok);
    const movedTxt = `${ok.why} ${name(sched.today)} rutscht ${to ? `auf ${dayName(to)}` : 'raus, diese Woche ist kein Tag mehr frei'}.`;
    if (alt) return { missionId: alt, kind: 'swap', reason: `${movedTxt} Heute stattdessen ${name(alt)}.`, moved: { id: sched.today, to }, sched };
    return { missionId: null, kind: 'free', reason: movedTxt, moved: { id: sched.today, to }, sched };
  }
  const catchup = sched.open.find((p) => allowedOn(p.id, { mt, legsAround: around }).ok);
  if (catchup) {
    return { missionId: catchup.id, kind: 'catchup', reason: `${name(catchup.id)} war für ${dayName(catchup.day)} geplant. Heute ist frei, du kannst sie hier machen.`, sched };
  }
  if (sched.todayPlanned) return { missionId: null, kind: 'done', reason: `${name(sched.todayPlanned)} ist für diese Woche schon erledigt.`, sched };
  const next = sched.upcoming[0];
  return { missionId: null, kind: 'free',
    reason: `Heute ist kein Kraft-Tag.${next ? ` Als Nächstes: ${name(next.id)} am ${dayName(next.day)}.` : ' Die Woche ist geschafft.'}`, sched };
}
