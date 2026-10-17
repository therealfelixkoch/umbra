// Wochenrückblick (sonntags) und Arc-Debrief (Ende Woche 6) mit JSON-Export für den Coach.
import { weekStart, addDays } from './dates.js';
import { FULL_MISSIONS } from '../data/missions.js';
import { arcOf } from '../data/arcs.js';
import { countsForWeek } from './game.js';
import { loadClass } from './load.js';
import { elbowStatus, painPatterns, REGIONS } from './signals.js';
import { stagnationStatus, performance, mainSlots } from './stagnation.js';
import { bossStatus } from './boss.js';
import { getDef as defaultGetDef } from '../data/exercises.js';

const inRange = (day, from, to) => day >= from && day <= to;

// ——— Wochenrückblick ———
// Sonntags für die laufende Woche; montags noch für die Vorwoche, falls er fehlt.
export function reviewDue(data, today) {
  const ws = weekStart(today);
  const sunday = addDays(ws, 6);
  if (today === sunday && !data.reviews?.[ws]) return ws;
  const prev = addDays(ws, -7);
  if (today === ws && !data.reviews?.[prev] && data.sessions.some((s) => s.day >= prev && s.day < ws)) return prev;
  return null;
}

export function reviewSnapshot(data, ws, today) {
  const to = addDays(ws, 6);
  const week = data.sessions.filter((s) => inRange(s.day, ws, to));
  const classes = { high: 0, normal: 0, low: 0 };
  week.filter((s) => countsForWeek(s) || s.kind === 'flow').forEach((s) => { classes[loadClass(s)]++; });
  const regions = [...new Set((data.signals?.pain || []).filter((r) => inRange(r.day, ws, to)).map((r) => r.region))];
  const stag = stagnationStatus(data);
  return {
    week: ws,
    einsaetze: week.filter(countsForWeek).length,
    classes,
    elbow: { ...elbowStatus(data, today < to ? today : to), reportsThisWeek: (data.signals?.elbow || []).filter((r) => inRange(r.day, ws, to)).length },
    regions,
    stagnation: { stage1: stag.stage1.map((x) => x.exId), stage2: stag.stage2 },
    boss: bossStatus(data),
    patterns: painPatterns(data, { from: addDays(ws, -21), to }).map((p) => p.text),
  };
}

// ——— Arc-Debrief ———
export function arcRange(data, n, today) {
  const arc = data.engine.arc;
  if (arc && arc.n === n) return { from: arc.startedWeek, to: today };
  const h = (data.engine.arcHistory || []).find((x) => x.n === n);
  return h ? { from: h.from, to: h.to } : null;
}

// In Arc-Woche 6, oder bis 3 Wochen nach Arc-Ende, solange nicht beantwortet.
export function debriefDue(data, today) {
  const arc = data.engine.arc;
  if (arc?.week === 6 && !data.debriefs?.[arc.n]?.done) return arc.n;
  const open = (data.engine.arcHistory || []).filter((h) => !data.debriefs?.[h.n]?.done && addDays(h.to, 21) >= today);
  return open.length ? open[open.length - 1].n : null;
}

export function debriefStats(data, n, today, getDef = defaultGetDef) {
  const range = arcRange(data, n, today);
  if (!range) return null;
  const { from, to } = range;
  const ss = data.sessions.filter((s) => (s.arc ? s.arc.n === n : inRange(s.day, from, to)));
  const missions = ss.filter((s) => s.kind === 'mission' && FULL_MISSIONS.includes(s.missionId));
  const arena = ss.filter((s) => s.kind === 'arena');
  const flowDays = new Set(ss.filter((s) => s.kind === 'flow').map((s) => s.day)).size;

  // Längste Serie: Kalenderwochen in Folge mit mindestens 3 Einsätzen
  let streak = 0;
  let best = 0;
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) {
    const k = ss.filter((s) => countsForWeek(s) && s.day >= w && s.day < addDays(w, 7)).length;
    streak = k >= 3 ? streak + 1 : 0;
    best = Math.max(best, streak);
  }

  // Kraft: erster und bester Leistungswert je Hauptübung im Arc
  const bw = data.settings.bodyweight || 80;
  const strength = [];
  const seen = new Set();
  for (const { slot } of mainSlots()) {
    const ids = new Set([slot.ex, ...(slot.variants || [])]);
    for (const id of ids) {
      if (seen.has(id)) continue;
      const def = getDef(id);
      const values = missions.flatMap((s) => (s.exercises || []).filter((e) => e.exId === id).map((e) => performance(def, e.sets, bw))).filter((v) => v != null);
      if (!values.length) continue;
      seen.add(id);
      const best = Math.max(...values);
      strength.push({ exId: id, name: def.name, first: values[0], best, gain: Math.round((best - values[0]) * 10) / 10, unit: def.mode === 'time' ? (def.load ? 'kg·s gesamt' : 's gesamt') : def.load ? 'kg (1RM-Schätzung)' : 'Wdh. gesamt' });
    }
  }

  // Mobility vorher/nachher
  const tests = data.mobility || [];
  const before = [...tests].filter((t) => t.day < from).pop() || null;
  const after = [...tests].filter((t) => inRange(t.day, from, to)).pop() || null;
  const mobility = after ? Object.keys(after.scores).map((r) => ({ region: r, before: before?.scores[r] ?? null, after: after.scores[r] })) : [];

  const pain = (data.signals?.pain || []).filter((r) => inRange(r.day, from, to));
  const painByRegion = {};
  pain.forEach((r) => { painByRegion[REGIONS[r.region] || r.region] = (painByRegion[REGIONS[r.region] || r.region] || 0) + 1; });
  const log = (data.ruleLog || []).filter((e) => inRange(e.day || '', from, to));

  return {
    arc: { n, ...arcOf(n), from, to },
    missions: missions.length,
    compact: missions.filter((s) => s.compact).length,
    arena: arena.length,
    arenaHours: Math.round(arena.reduce((m, s) => m + (s.minutes || 0), 0) / 6) / 10,
    flowDays,
    longestStreak: best,
    records: ss.reduce((k, s) => k + (s.records?.length || 0), 0),
    strength,
    mobility,
    signals: {
      elbowReports: (data.signals?.elbow || []).filter((r) => inRange(r.day, from, to)).length,
      painByRegion,
      stagnations: log.filter((e) => e.rule?.startsWith('stagnation')).length,
      deloads: log.filter((e) => e.rule?.startsWith('deload') && e.decision === 'accepted').length,
      patterns: painPatterns(data, { from, to, getDef }).map((p) => p.text),
    },
    boss: data.engine.arc?.n === n ? bossStatus(data) : null,
  };
}

/** Komplette Debrief-Datei für den Coach: alle Logs des Arcs, Antworten, Wochenrückblicke, Regel-Protokoll. */
export function debriefExport(data, n, today, getDef = defaultGetDef) {
  const stats = debriefStats(data, n, today, getDef);
  const { from, to } = stats.arc;
  const pick = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => inRange(k, from, to)));
  return {
    type: 'umbra-debrief',
    version: 1,
    exportedAt: new Date().toISOString(),
    arc: stats.arc,
    answers: data.debriefs?.[n]?.answers || {},
    summary: stats,
    sessions: data.sessions.filter((s) => (s.arc ? s.arc.n === n : inRange(s.day, from, to))),
    checkins: pick(data.checkins),
    signals: {
      elbow: (data.signals?.elbow || []).filter((r) => inRange(r.day, from, to)),
      pain: (data.signals?.pain || []).filter((r) => inRange(r.day, from, to)),
    },
    weeklyReviews: pick(data.reviews),
    ruleLog: (data.ruleLog || []).filter((e) => inRange(e.day || '', from, to)),
    mobilityTests: (data.mobility || []).filter((t) => t.day <= to),
    exState: data.exState,
    records: data.records,
    settings: { bodyweight: data.settings.bodyweight, equipment: data.settings.equipment, kbWeights: data.settings.kbWeights,
      holiday: data.settings.holiday, elbowThreshold: data.settings.elbowThreshold },
    engine: { arc: data.engine.arc, slotVariant: data.engine.slotVariant, queue: data.engine.queue },
  };
}
