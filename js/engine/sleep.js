// Schlaf: eigene Zusammenhänge aus deinen Daten. Erst ab 3 Wochen Schlafdaten und je Vergleichsgruppe
// mindestens 5 Datenpunkten. Neutral formuliert, keine Diagnose. Reine Funktionen.
import { addDays, daysBetween } from './dates.js';
import { performance, mainSlots } from './stagnation.js';
import { getDef as defaultGetDef } from '../data/exercises.js';

export const MIN_POINTS = 5;
export const MIN_DAYS = 21;

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const r1 = (x) => Math.round(x * 10) / 10;
const de = (x) => String(r1(x)).replace('.', ',');

/** Schlaf aus dem Check-in eines Tages = die Nacht davor. */
export const sleepOf = (checkins, day) => checkins?.[day]?.sleep ?? null;

/** Genug Daten insgesamt? (erste Schlafangabe mindestens 3 Wochen her) */
export function sleepDataReady(checkins, today) {
  const days = Object.values(checkins || {}).filter((c) => c.sleep != null).map((c) => c.day).sort();
  return days.length > 0 && daysBetween(days[0], today) >= MIN_DAYS;
}

function anchorIds() {
  const ids = new Set();
  for (const { slot } of mainSlots()) for (const id of [slot.ex, ...(slot.variants || [])]) ids.add(id);
  return ids;
}

/**
 * Zusammenhänge. Jeder Eintrag: { id, title, a:{label,n,value}, b:{label,n,value}, text }.
 * Nur Vergleiche, bei denen beide Gruppen ≥ 5 Punkte haben.
 */
export function sleepInsights(data, today, { getDef = defaultGetDef, from = null, to = today } = {}) {
  if (!sleepDataReady(data.checkins, today)) return [];
  const inRange = (d) => (!from || d >= from) && d <= to;
  const out = [];
  const bw = data.settings?.bodyweight || 80;

  // 1) Ankerübungen nach Nächten ≤ 2 vs. ≥ 4: Leistung relativ zum eigenen Schnitt der Übung
  const anchors = anchorIds();
  const perEx = {};
  const rows = [];
  for (const s of data.sessions) {
    if (s.kind !== 'mission' || !s.exercises) continue;
    for (const e of s.exercises) {
      if (!anchors.has(e.exId)) continue;
      const def = getDef(e.exId);
      const p = def && performance(def, e.sets, bw);
      if (p == null) continue;
      (perEx[e.exId] ||= []).push(p);
      rows.push({ day: s.day, exId: e.exId, p });
    }
  }
  const mean = Object.fromEntries(Object.entries(perEx).map(([k, v]) => [k, avg(v)]));
  const bySession = {};
  for (const r of rows) {
    if (!inRange(r.day) || !mean[r.exId]) continue;
    (bySession[r.day] ||= []).push(r.p / mean[r.exId]);
  }
  const low = [];
  const high = [];
  for (const [day, ratios] of Object.entries(bySession)) {
    const sl = sleepOf(data.checkins, day);
    if (sl == null) continue;
    if (sl <= 2) low.push(avg(ratios));
    if (sl >= 4) high.push(avg(ratios));
  }
  if (low.length >= MIN_POINTS && high.length >= MIN_POINTS) {
    const a = (avg(low) - 1) * 100;
    const b = (avg(high) - 1) * 100;
    out.push({ id: 'anchor', title: 'Ankerübungen und Schlaf',
      a: { label: 'nach Nächten ≤ 2', n: low.length, value: r1(a) }, b: { label: 'nach Nächten ≥ 4', n: high.length, value: r1(b) },
      text: `Nach Nächten mit Schlaf ≤ 2 lag deine Leistung bei ${a >= 0 ? '+' : ''}${de(a)} % zum eigenen Schnitt, nach Nächten ≥ 4 bei ${b >= 0 ? '+' : ''}${de(b)} %.` });
  }

  return out;
}

export const INSIGHT_NOTE = 'Deine Daten, keine Diagnose. Zusammenhang heißt nicht Ursache.';
