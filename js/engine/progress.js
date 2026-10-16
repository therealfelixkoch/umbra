// Phase 3: Wochenabdeckung der Glyphen, Wochen-Quest, Ascensions, Attribut-Ränge.
import { getDef as defaultGetDef } from '../data/exercises.js';
import { PROFILES } from '../data/glyphs.js';
import { weekStart, addDays, daysBetween } from './dates.js';
import { weekStreak, countsForWeek } from './game.js';
import { latestTest } from './mobility.js';

// Was ein Muay-Thai-Abend trainiert.
export const ARENA_TAGS = [['strike', 'explosiv'], ['strike', 'proprio'], ['rotation', 'explosiv'], ['hip_rot', 'elastisch'],
  ['cardio', 'ausdauer'], ['ankle', 'elastisch'], ['neck', 'stabil'], ['hip_flex', 'explosiv']];

const uniq = (tags) => [...new Map(tags.map((t) => [t.join(':'), t])).values()];

// Tags der tatsächlich erledigten Arbeit einer Session, mit Gewicht (Sätze/Runden).
export function sessionWork(s, getDef = defaultGetDef) {
  const out = [];
  if (s.kind === 'arena') ARENA_TAGS.forEach((t) => out.push({ tag: t, n: Math.max(1, Math.round((s.minutes || 60) / 15)) }));
  for (const e of s.exercises || []) {
    const done = (e.sets || []).filter((x) => x.done).length;
    const def = getDef(e.exId);
    if (done && def) def.tags.forEach((t) => out.push({ tag: t, n: done }));
  }
  const rounds = s.kind === 'flow' ? 2 : s.roundsDone || (s.kind === 'express' ? 1 : 0);
  if (rounds) {
    for (const id of s.items || []) {
      const def = getDef(id);
      if (def) def.tags.forEach((t) => out.push({ tag: t, n: rounds }));
    }
  }
  return out;
}

export function sessionTags(s, getDef) {
  return uniq(sessionWork(s, getDef).map((w) => w.tag));
}

export const weekSessions = (sessions, ws) => sessions.filter((s) => s.day >= ws && s.day < addDays(ws, 7));

/** Abdeckung einer Woche: welche Attribute mit welchen Ausprägungen, und wie oft jede Ausprägung. */
export function weekCoverage(sessions, ws, getDef) {
  const attrs = {};
  const expressions = {};
  for (const s of weekSessions(sessions, ws)) {
    for (const [a, x] of sessionTags(s, getDef)) {
      (attrs[a] ||= []).includes(x) || attrs[a].push(x);
      expressions[x] = (expressions[x] || 0) + 1;
    }
  }
  return { attrs, expressions };
}

export function gapsFor(coverage, profileId) {
  const p = PROFILES[profileId];
  return {
    attrs: p.attributes.filter((a) => !coverage.attrs[a]),
    expressions: p.expressions.filter((x) => !coverage.expressions[x]),
  };
}

// ——— Wochen-Quests ———
const countSessions = (list, pred) => list.filter(pred).length;
const hasTag = (s, getDef, fn) => sessionTags(s, getDef).some(fn);

export const QUESTS = [
  { id: 'neck', title: 'Stahlnacken', desc: '3 Einheiten mit Nackentraining', target: 3, gap: { attrs: ['neck'] },
    progress: (l, g) => countSessions(l, (s) => s.kind !== 'arena' && hasTag(s, g, ([a, x]) => a === 'neck' && x !== 'mobil')) },
  { id: 'flow5', title: 'Fließender Schatten', desc: 'Fluss an 5 Tagen', target: 5, gap: { expressions: ['mobil'] },
    progress: (l) => new Set(l.filter((s) => s.kind === 'flow').map((s) => s.day)).size },
  { id: 'carry', title: 'Lastträger', desc: '2 Einheiten mit einseitigem Tragen', target: 2, gap: { attrs: ['carry', 'anti_lat'] },
    progress: (l, g) => countSessions(l, (s) => hasTag(s, g, ([a]) => a === 'carry' || a === 'anti_lat')) },
  { id: 'rotation', title: 'Drehmoment', desc: '2 Einheiten mit Rotation', target: 2, gap: { attrs: ['rotation'] },
    progress: (l, g) => countSessions(l, (s) => s.kind !== 'arena' && hasTag(s, g, ([a, x]) => a === 'rotation' && x !== 'mobil')) },
  { id: 'explosive', title: 'Zündung', desc: '2 Einheiten mit Sprüngen oder Swings', target: 2, gap: { expressions: ['explosiv'] },
    progress: (l, g) => countSessions(l, (s) => s.kind !== 'arena' && hasTag(s, g, ([, x]) => x === 'explosiv')) },
  { id: 'arena2', title: 'Arenaruf', desc: '2 Arena-Einheiten', target: 2, gap: { attrs: ['strike'] },
    progress: (l) => countSessions(l, (s) => s.kind === 'arena') },
  { id: 'legs', title: 'Fundament', desc: 'Mission Fundament abschließen', target: 1, gap: { attrs: ['squat', 'lunge'] },
    progress: (l) => countSessions(l, (s) => s.missionId === 'B') },
  { id: 'hinge', title: 'Hintere Kette', desc: '2 Einheiten mit Hip Hinge', target: 2, gap: { attrs: ['hinge'] },
    progress: (l, g) => countSessions(l, (s) => hasTag(s, g, ([a, x]) => a === 'hinge' && x !== 'mobil')) },
];

const isGap = (q, cov) => (q.gap.attrs || []).some((a) => !cov.attrs[a]) || (q.gap.expressions || []).some((x) => !cov.expressions[x]);

/** Quest der Woche: aus den Lücken der Vorwoche, stabil über die ganze Woche. */
export function questForWeek(sessions, today, getDef) {
  const ws = weekStart(today);
  const lastCov = weekCoverage(sessions, addDays(ws, -7), getDef);
  const hadWeek = weekSessions(sessions, addDays(ws, -7)).length > 0;
  const candidates = hadWeek ? QUESTS.filter((q) => isGap(q, lastCov)) : QUESTS;
  const list = candidates.length ? candidates : QUESTS;
  const idx = Math.floor(Math.abs(daysBetween('2024-01-01', ws)) / 7) % list.length;
  return list[idx];
}

export function questStatus(data, today, getDef = defaultGetDef) {
  const ws = weekStart(today);
  const quest = questForWeek(data.sessions, today, getDef);
  const list = weekSessions(data.sessions, ws);
  const progress = Math.min(quest.target, quest.progress(list, getDef));
  const rewarded = data.sessions.some((s) => s.kind === 'quest' && s.week === ws);
  return { quest, progress, target: quest.target, done: progress >= quest.target, rewarded, week: ws };
}

// ——— Ascensions ———
const recordLoad = (data, id) => data.records?.[id]?.load || 0;
const count = (data, pred) => data.sessions.filter(pred).length;

export const ASCENSIONS = [
  { id: 'erwacht', name: 'Erwachen', aura: '#4fe3ff', desc: 'Erste Mission abgeschlossen', target: 1,
    value: (d) => count(d, (s) => s.kind === 'mission' || s.kind === 'express') },
  { id: 'arena10', name: 'Arenablut', aura: '#ff4d5e', desc: '10 Arena-Einheiten', target: 10,
    value: (d) => count(d, (s) => s.kind === 'arena') },
  { id: 'fluss30', name: 'Fließender Schatten', aura: '#3fd68a', desc: 'Fluss an 30 Tagen', target: 30,
    value: (d) => new Set(d.sessions.filter((s) => s.kind === 'flow').map((s) => s.day)).size },
  { id: 'stahlnacken', name: 'Stahlnacken', aura: '#ff9a3c', desc: '20 Einheiten mit Nackentraining', target: 20,
    value: (d) => count(d, (s) => s.kind !== 'arena' && sessionTags(s).some(([a, x]) => a === 'neck' && x !== 'mobil')) },
  { id: 'eisengriff', name: 'Eisengriff', aura: '#ffcf5a', desc: 'Gewichteter Klimmzug mit +16 kg', target: 16, unit: 'kg',
    value: (d) => recordLoad(d, 'pullup_tactical') },
  { id: 'offenehuefte', name: 'Offene Hüfte', aura: '#4da3ff', desc: 'Mobility Hüfte über 70', target: 71,
    value: (d) => {
      const t = latestTest(d.mobility);
      if (!t) return 0;
      const v = ['hueftbeuger', 'adduktoren', 'hueftrotation'].map((r) => t.scores[r] ?? 0);
      return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
    } },
  { id: 'unbeugsam', name: 'Unbeugsam', aura: '#a874ff', desc: '12 Wochen Konstanz am Stück', target: 12,
    value: (d, today) => weekStreak(d.sessions, today).best },
  { id: 'nachtwaechter', name: 'Wächter der Nacht', aura: '#ffffff', desc: '100 Einsätze', target: 100,
    value: (d) => count(d, countsForWeek) },
];

export function ascensionStatus(data, today) {
  const unlocked = new Set(data.sessions.filter((s) => s.kind === 'ascension').map((s) => s.ascension));
  return ASCENSIONS.map((a) => {
    const v = a.value(data, today);
    return { ...a, current: Math.min(v, a.target), unlocked: unlocked.has(a.id), reached: v >= a.target };
  });
}

// ——— Attribut-Ränge ———
export const ATTR_GROUPS = [
  { id: 'kraft', name: 'Kraft', expressions: ['kraft'], color: '#ff4d5e' },
  { id: 'explosiv', name: 'Explosivität', expressions: ['explosiv', 'elastisch'], color: '#ff5fc8' },
  { id: 'ausdauer', name: 'Ausdauer', expressions: ['ausdauer'], color: '#ffd23f' },
  { id: 'mobil', name: 'Mobilität', expressions: ['mobil'], color: '#4da3ff' },
  { id: 'stabil', name: 'Stabilität', expressions: ['stabil', 'proprio'], color: '#ff9a3c' },
  { id: 'nacken', name: 'Nacken & Griff', attrs: ['neck', 'grip'], color: '#3fd68a' },
];
export const ATTR_RANKS = [['E', 0], ['D', 40], ['C', 120], ['B', 300], ['A', 700], ['S', 1400], ['U', 2800]];

export function attributePoints(data, getDef = defaultGetDef) {
  const pts = Object.fromEntries(ATTR_GROUPS.map((g) => [g.id, 0]));
  for (const s of data.sessions) {
    if (s.kind === 'check') pts.mobil += 10;
    for (const { tag: [a, x], n } of sessionWork(s, getDef)) {
      for (const g of ATTR_GROUPS) {
        if (g.expressions?.includes(x) || g.attrs?.includes(a)) pts[g.id] += n;
      }
    }
  }
  return pts;
}

export function attrRank(points) {
  let i = 0;
  while (i + 1 < ATTR_RANKS.length && points >= ATTR_RANKS[i + 1][1]) i++;
  const [id, from] = ATTR_RANKS[i];
  const next = ATTR_RANKS[i + 1];
  return { id, progress: next ? (points - from) / (next[1] - from) : 1, next: next?.[0] || null, toNext: next ? next[1] - points : 0 };
}

// ——— Belohnungen verbuchen ———
export const QUEST_XP = 100;
export const ASCENSION_XP = 150;

/** Prüft Quest und Ascensions; neue Erfolge werden als XP-Einträge ins Log geschrieben. */
export function checkProgress(data, today, now = Date.now(), getDef = defaultGetDef) {
  const added = [];
  const events = [];
  const q = questStatus(data, today, getDef);
  if (q.done && !q.rewarded) {
    added.push({ id: `q${now}`, day: today, kind: 'quest', week: q.week, quest: q.quest.id, xp: QUEST_XP });
    events.push({ type: 'quest', quest: q.quest });
  }
  for (const a of ascensionStatus(data, today)) {
    if (a.reached && !a.unlocked) {
      added.push({ id: `x${now}${a.id}`, day: today, kind: 'ascension', ascension: a.id, xp: ASCENSION_XP });
      events.push({ type: 'ascension', ascension: a });
    }
  }
  if (!added.length) return { data, events };
  return { data: { ...data, sessions: [...data.sessions, ...added] }, events };
}

export function highestAscension(data) {
  const last = data.sessions.filter((s) => s.kind === 'ascension').pop();
  return last ? ASCENSIONS.find((a) => a.id === last.ascension) : null;
}
