// OATHS: drei Wenn-dann-Gelübde pro Arc. Gezählt wird nur, was gehalten wurde. Reine Funktionen.
// Datenform: { list: [Gelübde], kept: { [Tag]: { ids: [], arc: {n, week} } }, slips: [], alcoholInfoSeen, reviewedArc, askedArc }
import { addDays, weekStart } from './dates.js';

export const MAX_OATHS = 3;
export const SEAL_WEEKS = 3; // 3 Wochen in Folge Automatik ≥ 4 → besiegelt
export const SEAL_MIN = 4;
export const OATH_DAMAGE = 0.1; // Boss-Schaden pro gehaltenem Gelübde und Tag
export const EVENING_HOUR = 20;

export const TEMPLATES = [
  { when: 'ich ins Bett gehe', then: 'bleibt das Handy in der Küche' },
  { when: 'ich nach 19 Uhr hungrig heimkomme', then: 'esse ich zuerst das Vorbereitete' },
  { when: 'mein zweites Getränk leer ist', then: 'kommt ein Wasser', alcohol: true },
  { when: 'der Wecker klingelt', then: 'gehe ich zuerst 5 Minuten raus ins Licht' },
  { when: 'ich ohne Grund zum Handy greife', then: 'lege ich es mit dem Display nach unten weg' },
];

export const SITUATIONS = ['ich ins Bett gehe', 'der Wecker klingelt', 'ich nach Hause komme', 'ich hungrig bin', 'ich ohne Grund zum Handy greife',
  'mein zweites Getränk leer ist', 'ich vom Training komme', 'der Abend lang wird'];
export const ACTIONS = ['bleibt das Handy in der Küche', 'gehe ich 5 Minuten raus ins Licht', 'trinke ich zuerst ein Glas Wasser',
  'esse ich zuerst das Vorbereitete', 'mache ich 5 physiologische Seufzer', 'lege ich das Handy weg', 'mache ich 10 Minuten FLOW'];

const ALCOHOL = /getränk|drink|alkohol|bier|wein|schnaps|cocktail/i;
export const isAlcohol = (o) => !!o.alcohol || ALCOHOL.test(`${o.when} ${o.then}`);
export const oathText = (o) => `Wenn ${o.when}, dann ${o.then}.`;

export const emptyOaths = () => ({ list: [], kept: {}, slips: [], alcoholInfoSeen: false, reviewedArc: null, askedArc: null });
const norm = (o) => ({ ...emptyOaths(), ...(o || {}) });

export const activeOaths = (oaths) => norm(oaths).list.filter((o) => o.status === 'active');
export const sealedOaths = (oaths) => norm(oaths).list.filter((o) => o.status === 'sealed');

const clean = (s) => String(s || '').trim().replace(/^wenn\s+/i, '').replace(/^dann\s+/i, '').replace(/[.,]+$/, '');

/** Neues Gelübde (höchstens 3 aktiv). */
export function addOath(oaths, { when, then, alcohol, day, arc = null, now = Date.now() }) {
  const o = norm(oaths);
  if (activeOaths(o).length >= MAX_OATHS) throw new Error('Es sind schon drei Gelübde aktiv.');
  const w = clean(when);
  const t = clean(then);
  if (!w || !t) throw new Error('Wenn und Dann brauchen beide einen Text.');
  const oath = { id: `o${now}`, when: w, then: t, alcohol: !!alcohol || undefined, created: day, arc, status: 'active', auto: {}, history: [] };
  return { ...o, list: [...o.list, oath] };
}

/** Umformulieren: gleicher Eid, neuer Wortlaut (alter bleibt in der Historie). */
export function rephraseOath(oaths, id, { when, then, day }) {
  const o = norm(oaths);
  return { ...o, list: o.list.map((x) => (x.id === id
    ? { ...x, when: clean(when) || x.when, then: clean(then) || x.then, history: [...(x.history || []), { day, when: x.when, then: x.then }] } : x)) };
}

/** Ersetzen: alter Eid wird abgelegt (nicht gelöscht, nicht als gebrochen markiert). */
export function retireOath(oaths, id, day) {
  const o = norm(oaths);
  return { ...o, list: o.list.map((x) => (x.id === id ? { ...x, status: 'retired', retired: day } : x)) };
}

/** Abend-Tap: gehalten an/aus. */
export function toggleKept(oaths, day, id, arc = null) {
  const o = norm(oaths);
  const cur = o.kept[day]?.ids || [];
  const ids = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  const kept = { ...o.kept };
  if (ids.length) kept[day] = { ids, arc: arc || o.kept[day]?.arc || null };
  else delete kept[day];
  return { ...o, kept };
}

export const keptOn = (oaths, day) => norm(oaths).kept[day]?.ids || [];

/** Karte ab 20 Uhr (am Folgetag bis 12 Uhr noch für gestern nachholbar). */
export function eveningDay(today, hour) {
  if (hour >= EVENING_HOUR) return today;
  if (hour < 12) return addDays(today, -1);
  return null;
}

/**
 * Wöchentliche Automatik 1–5. Drei Wochen in Folge ≥ 4 → besiegelt.
 * @returns {{oaths:object, sealed:string[]}}
 */
export function rateAutomaticity(oaths, ws, id, value, day) {
  const o = norm(oaths);
  const sealed = [];
  const list = o.list.map((x) => {
    if (x.id !== id) return x;
    const auto = { ...(x.auto || {}), [ws]: value };
    const streak = Array.from({ length: SEAL_WEEKS }, (_, k) => auto[addDays(ws, -7 * k)]).every((v) => v >= SEAL_MIN);
    if (x.status === 'active' && streak) {
      sealed.push(x.id);
      return { ...x, auto, status: 'sealed', sealedDay: day };
    }
    return { ...x, auto };
  });
  return { oaths: { ...o, list }, sealed };
}

/** Ausrutscher als Datenpunkt: Auslöser und neuer Wortlaut. */
export function logSlip(oaths, { day, id, trigger, rewrite }) {
  const o = norm(oaths);
  return { ...o, slips: [...o.slips, { day, id, trigger: String(trigger || '').trim(), rewrite: String(rewrite || '').trim() }] };
}

/** Nächte mit mindestens einem gehaltenen Gelübde im Zeitraum. */
export const nightsKept = (oaths, from, to) => Object.entries(norm(oaths).kept).filter(([d, k]) => d >= from && d <= to && k.ids.length).length;

/** Boss-Schaden aus gehaltenen Gelübden in den Arc-Wochen 1–5. */
export function oathDamage(oaths, n, maxWeek = 5) {
  let k = 0;
  for (const v of Object.values(norm(oaths).kept)) if (v.arc?.n === n && v.arc.week <= maxWeek) k += v.ids.length;
  return Math.round(k * OATH_DAMAGE * 10) / 10;
}

/** XP-Einträge: 10 pro gehaltenem Gelübde (Nebenquelle), 100 pro Siegel. */
export function oathXpEntries(oaths, src) {
  const o = norm(oaths);
  const out = [];
  for (const [day, v] of Object.entries(o.kept)) for (const _ of v.ids) out.push({ day, source: 'oath', xp: src.oath, raw: src.oath, arc: v.arc?.n });
  for (const x of o.list) if (x.sealedDay) out.push({ day: x.sealedDay, source: 'oathSealed', xp: src.oathSealed, raw: src.oathSealed, arc: x.arc ?? undefined });
  return out;
}

/** Beim Arc-Start: Gelübde aus einem früheren Arc prüfen (behalten, umformulieren, ersetzen). */
export function arcReviewDue(oaths, arcN) {
  const o = norm(oaths);
  if (arcN == null || o.reviewedArc === arcN) return false;
  return activeOaths(o).some((x) => x.arc != null && x.arc < arcN);
}

/** Noch keine Gelübde in diesem Arc gewählt (Hinweis, abweisbar pro Arc). */
export const chooseDue = (oaths, arcN) => arcN != null && norm(oaths).askedArc !== arcN && activeOaths(oaths).length === 0;

/** Automatik der Woche schon bewertet? */
export const ratedWeek = (oaths, ws) => activeOaths(oaths).every((x) => x.auto?.[ws] != null);

export const weekOf = (day) => weekStart(day);
