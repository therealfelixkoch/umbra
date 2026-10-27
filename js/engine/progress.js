// Wochenabdeckung der Glyphen, saisonale Wochen-Quest, Mikro-Erfolge pro Kapitel, Ascensions (Abzeichen bis große Errungenschaften), Attribut-Ränge.
import { getDef as defaultGetDef } from '../data/exercises.js';
import { PROFILES } from '../data/glyphs.js';
import { weekStart, addDays, daysBetween } from './dates.js';
import { weekStreak, countsForWeek } from './game.js';
import { latestTest } from './mobility.js';
import { XP_CONFIG } from '../data/xp-config.js';
import { MISSIONS } from '../data/missions.js';
import { arcOf } from '../data/arcs.js';

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

const doneSets = (s, pred) => (s.exercises || []).filter((e) => pred(e.exId)).flatMap((e) => (e.sets || []).filter((x) => x.done));

// Wochen-Quests pro Saison (seasons: WINTER, SPRING, SUMMER, AUTUMN). Sie bereiten die Säulen vor.
export const QUESTS = [
  { id: 'neck', title: 'STEEL NECK', desc: '3 Einheiten mit Nackentraining', target: 3, gap: { attrs: ['neck'] }, seasons: ['WINTER', 'AUTUMN'],
    progress: (l, g) => countSessions(l, (s) => s.kind !== 'arena' && hasTag(s, g, ([a, x]) => a === 'neck' && x !== 'mobil')) },
  { id: 'flow5', title: 'FLOWING SHADOW', desc: 'FLOW an 5 Tagen', target: 5, gap: { expressions: ['mobil'] }, seasons: ['SUMMER', 'AUTUMN'],
    progress: (l) => new Set(l.filter((s) => s.kind === 'flow').map((s) => s.day)).size },
  { id: 'carry', title: 'BURDEN', desc: '2 Einheiten mit einseitigem Tragen', target: 2, gap: { attrs: ['carry', 'anti_lat'] }, seasons: ['WINTER', 'AUTUMN'],
    progress: (l, g) => countSessions(l, (s) => hasTag(s, g, ([a]) => a === 'carry' || a === 'anti_lat')) },
  { id: 'rotation', title: 'TORQUE', desc: '2 Einheiten mit Rotation', target: 2, gap: { attrs: ['rotation'] }, seasons: ['SPRING', 'AUTUMN'],
    progress: (l, g) => countSessions(l, (s) => s.kind !== 'arena' && hasTag(s, g, ([a, x]) => a === 'rotation' && x !== 'mobil')) },
  { id: 'explosive', title: 'SPARK', desc: '2 Einheiten mit Sprüngen oder Swings', target: 2, gap: { expressions: ['explosiv'] }, seasons: ['SPRING', 'SUMMER'],
    progress: (l, g) => countSessions(l, (s) => s.kind !== 'arena' && hasTag(s, g, ([, x]) => x === 'explosiv')) },
  { id: 'arena2', title: 'CALL OF THE ARENA', desc: '2 ARENA-Einheiten', target: 2, gap: { attrs: ['strike'] }, seasons: ['SPRING', 'SUMMER'],
    progress: (l) => countSessions(l, (s) => s.kind === 'arena') },
  { id: 'legs', title: 'BEDROCK', desc: 'Mission BEDROCK abschließen', target: 1, gap: { attrs: ['squat', 'lunge'] }, seasons: ['WINTER'],
    progress: (l) => countSessions(l, (s) => s.missionId === 'B') },
  { id: 'hinge', title: 'POSTERIOR CHAIN', desc: '2 Einheiten mit Hip Hinge', target: 2, gap: { attrs: ['hinge'] }, seasons: ['WINTER', 'SUMMER'],
    progress: (l, g) => countSessions(l, (s) => hasTag(s, g, ([a, x]) => a === 'hinge' && x !== 'mobil')) },
  // Saison-Fokus
  { id: 'pullvol', title: 'IRON CLIMB', desc: '40 Klimmzüge in der Woche', target: 40, gap: { attrs: ['v_pull'] }, seasons: ['WINTER'],
    progress: (l) => l.reduce((n, s) => n + doneSets(s, (id) => id.startsWith('pullup')).reduce((m, x) => m + (x.value || 0), 0), 0) },
  { id: 'mainsets', title: 'FULL LOAD', desc: '2 Missionen mit allen Sätzen der Hauptübungen', target: 2, gap: { expressions: ['kraft'] }, seasons: ['WINTER'],
    progress: (l) => countSessions(l, (s) => s.kind === 'mission' && (s.exercises || []).length > 0 && (s.completion ?? 0) >= 0.999) },
  { id: 'topsets', title: 'PEAK', desc: '2 Top-Sätze erledigt', target: 2, gap: { expressions: ['kraft'] }, seasons: ['WINTER', 'SPRING'],
    progress: (l) => l.reduce((n, s) => n + (s.exercises || []).flatMap((e) => e.sets || []).filter((x) => x.done && x.label === 'Top-Satz').length, 0) },
  { id: 'engine', title: 'SECOND WIND', desc: 'Eine 4x4-Einheit oder ein voller Zirkel', target: 1, gap: { attrs: ['cardio'] }, seasons: ['SPRING', 'SUMMER'],
    progress: (l) => countSessions(l, (s) => s.missionId === 'NOR4X4' || (['D', 'HOTEL'].includes(s.missionId) && (s.completion ?? 0) >= 0.999)) },
  { id: 'spar', title: 'BLOODED', desc: '2 ARENA-Einheiten mit Sparring', target: 2, gap: { attrs: ['strike'] }, seasons: ['SPRING'],
    progress: (l) => countSessions(l, (s) => s.kind === 'arena' && (s.sparRounds > 0 || s.intensity === 'hard')) },
  { id: 'mobload', title: 'DEEP ROOTS', desc: '3 Einheiten mit belasteter Mobility oder FLOW', target: 3, gap: { expressions: ['mobil'] }, seasons: ['AUTUMN'],
    progress: (l, g) => countSessions(l, (s) => s.kind === 'flow' || hasTag(s, g, ([, x]) => x === 'mobil')) },
];

const seasonOf = (data) => (data.engine?.arc ? arcOf(data.engine.arc.n).id : null);
const isGap = (q, cov) => (q.gap.attrs || []).some((a) => !cov.attrs[a]) || (q.gap.expressions || []).some((x) => !cov.expressions[x]);

/**
 * Side Quest der Woche: aus den Lücken der Vorwoche, stabil über die ganze Woche,
 * nie zweimal hintereinander dieselbe (`previousId` = Quest der Vorwoche).
 */
export function questForWeek(sessions, today, getDef, previousId = null, season = null) {
  const ws = weekStart(today);
  const lastCov = weekCoverage(sessions, addDays(ws, -7), getDef);
  const hadWeek = weekSessions(sessions, addDays(ws, -7)).length > 0;
  const seasonal = season ? QUESTS.filter((q) => q.seasons.includes(season)) : QUESTS;
  const pool = seasonal.filter((q) => q.id !== previousId);
  const candidates = hadWeek ? pool.filter((q) => isGap(q, lastCov)) : pool;
  const list = candidates.length ? candidates : pool;
  const idx = Math.floor(Math.abs(daysBetween('2024-01-01', ws)) / 7) % list.length;
  return list[idx];
}

// Wählt die Quest der laufenden Woche einmal und merkt sie sich (data.sideQuests[Woche] = id).
export function ensureSideQuest(data, today, getDef) {
  const ws = weekStart(today);
  if (data.sideQuests?.[ws]) return data;
  const prev = data.sideQuests?.[addDays(ws, -7)] || null;
  const q = questForWeek(data.sessions, today, getDef, prev, seasonOf(data));
  return { ...data, sideQuests: { ...(data.sideQuests || {}), [ws]: q.id } };
}

export function questStatus(data, today, getDef = defaultGetDef) {
  const ws = weekStart(today);
  const stored = data.sideQuests?.[ws];
  const quest = (stored && QUESTS.find((q) => q.id === stored))
    || questForWeek(data.sessions, today, getDef, data.sideQuests?.[addDays(ws, -7)] || null, seasonOf(data));
  const list = weekSessions(data.sessions, ws);
  const progress = Math.min(quest.target, quest.progress(list, getDef));
  const rewarded = data.sessions.some((s) => s.kind === 'quest' && s.week === ws);
  return { quest, progress, target: quest.target, done: progress >= quest.target, rewarded, week: ws };
}

// ——— Ascensions ———
const recordLoad = (data, id) => data.records?.[id]?.load || 0;
const count = (data, pred) => data.sessions.filter(pred).length;

const bw = (d) => d.settings?.bodyweight || 80;
const loadOf = (d, ids) => Math.max(0, ...ids.map((id) => (d.records?.[id]?.value >= 1 ? d.records[id].load || 0 : 0)));
const mobLevels = (d) => (d.mobility || []).at(-1)?.levels || {};
const guardiansInYear = (d) => {
  const by = {};
  for (const [n, e] of Object.entries(d.engine?.bossEvents || {})) if (e.defeated && Number(n) >= 0) (by[Math.floor(Number(n) / 4)] ||= new Set()).add(Number(n) % 4);
  return Math.max(0, ...Object.values(by).map((x) => x.size));
};

// tier: badge = Abzeichen (leicht), feat = Errungenschaft (mittel), legend = große Errungenschaft (selten, stolz).
export const TIERS = { badge: 'Abzeichen', feat: 'Errungenschaften', legend: 'Große Errungenschaften' };
export const ASCENSIONS = [
  // Abzeichen
  { id: 'erwacht', tier: 'badge', name: 'AWAKENING', aura: '#4fe3ff', desc: 'Erste Mission abgeschlossen', target: 1,
    value: (d) => count(d, (s) => s.kind === 'mission' || s.kind === 'express') },
  { id: 'arena10', tier: 'badge', name: 'ARENA BLOOD', aura: '#ff4d5e', desc: '10 ARENA-Einheiten', target: 10,
    value: (d) => count(d, (s) => s.kind === 'arena') },
  { id: 'fluss30', tier: 'badge', name: 'FLOWING SHADOW', aura: '#3fd68a', desc: 'FLOW an 30 Tagen', target: 30,
    value: (d) => new Set(d.sessions.filter((s) => s.kind === 'flow').map((s) => s.day)).size },
  { id: 'stahlnacken', tier: 'badge', name: 'STEEL NECK', aura: '#ff9a3c', desc: '20 Einheiten mit Nackentraining', target: 20,
    value: (d) => count(d, (s) => s.kind !== 'arena' && sessionTags(s).some(([a, x]) => a === 'neck' && x !== 'mobil')) },
  // Errungenschaften
  { id: 'eisengriff', tier: 'feat', name: 'WEIGHTED ASCENT', aura: '#ffcf5a', desc: 'Gewichteter Klimmzug mit +16 kg', target: 16, unit: 'kg',
    value: (d) => recordLoad(d, 'pullup_tactical') },
  { id: 'offenehuefte', tier: 'feat', name: 'OPEN HIPS', aura: '#4da3ff', desc: 'Mobility Hüfte über 70', target: 71,
    value: (d) => {
      const t = latestTest(d.mobility);
      if (!t) return 0;
      const v = ['hueftbeuger', 'adduktoren', 'hueftrotation'].map((r) => t.scores[r] ?? 0);
      return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
    } },
  { id: 'irongrip', tier: 'feat', name: 'IRON GRIP', aura: '#c9d1ff', desc: 'Dead Hang 90 Sekunden', target: 90, unit: 's',
    value: (d) => d.records?.dead_hang?.value || 0 },
  { id: 'unbeugsam', tier: 'feat', name: 'UNBENDING', aura: '#a874ff', desc: '12 Wochen Konstanz am Stück', target: 12,
    value: (d, today) => weekStreak(d.sessions, today).best },
  { id: 'eclipse', tier: 'feat', name: 'ECLIPSE FORM', aura: '#ffcf5a', desc: 'Ersten Saison-Wächter besiegt', target: 1,
    value: (d) => Object.entries(d.engine?.bossEvents || {}).filter(([, e]) => e.defeated && e.medal).length },
  // Große Errungenschaften: Kraft
  { id: 'pull50', tier: 'legend', name: 'SKYWARD', aura: '#ffcf5a', desc: 'Klimmzug mit +50 % Körpergewicht', target: 50, unit: '%',
    value: (d) => Math.round((loadOf(d, ['pullup_tactical', 'pullup_neutral']) / bw(d)) * 100) },
  { id: 'dead2x', tier: 'legend', name: 'DOUBLE WEIGHT', aura: '#ff4d5e', desc: 'Kreuzheben mit 2 × Körpergewicht', target: 200, unit: '%',
    value: (d) => Math.round((loadOf(d, ['deadlift', 'snatch_grip_deadlift']) / bw(d)) * 100) },
  { id: 'squat15', tier: 'legend', name: 'IRON PILLAR', aura: '#ff4d5e', desc: 'Kniebeuge mit 1,5 × Körpergewicht', target: 150, unit: '%',
    value: (d) => Math.round((loadOf(d, ['back_squat']) / bw(d)) * 100) },
  { id: 'dips20', tier: 'legend', name: 'TWENTY DEEP', aura: '#ff9a3c', desc: '20 saubere Dips am Stück', target: 20,
    value: (d) => Math.max(0, ...d.sessions.flatMap((s) => (s.exercises || []).filter((e) => e.exId === 'dip').flatMap((e) => (e.sets || []).filter((x) => x.done && !x.load).map((x) => x.value || 0)))) },
  // Große Errungenschaften: Ausdauer und Kampf
  { id: 'murph', tier: 'legend', name: 'FULL MURPH', aura: '#4fe3ff', desc: 'Voller Cave-Murph', target: 1,
    value: (d) => count(d, (s) => s.benchmark?.id === 'coldiron' && s.benchmark.variant === 'full') },
  { id: 'row1000', tier: 'legend', name: 'ENGINE', aura: '#ffd23f', desc: '4x4 mit 1.000 m pro Intervall', target: 4000, unit: 'm',
    value: (d) => Math.max(0, ...d.sessions.filter((s) => s.missionId === 'NOR4X4' && s.intervals?.meters).map((s) => Number(s.intervals.meters) || 0)) },
  { id: 'arena100', tier: 'legend', name: 'ARENA LEGEND', aura: '#ff4d5e', desc: '100 ARENA-Einheiten', target: 100,
    value: (d) => count(d, (s) => s.kind === 'arena') },
  { id: 'spar5', tier: 'legend', name: 'FIVE ROUNDS', aura: '#ff5fc8', desc: '5 Sparringsrunden in einer Einheit', target: 5,
    value: (d) => Math.max(0, ...d.sessions.filter((s) => s.kind === 'arena').map((s) => s.sparRounds || 0)) },
  // Große Errungenschaften: Durchhalten
  { id: 'nachtwaechter', tier: 'legend', name: 'NIGHT WARDEN', aura: '#ffffff', desc: '100 Einsätze', target: 100,
    value: (d) => count(d, countsForWeek) },
  { id: 'unbroken', tier: 'legend', name: 'UNBROKEN', aura: '#ff9a3c', desc: 'Ein ganzes Jahr: alle vier Saison-Wächter besiegt', target: 4,
    value: (d) => guardiansInYear(d) },
  { id: 'streak52', tier: 'legend', name: 'ALL SEASONS', aura: '#a874ff', desc: '52 Wochen Konstanz am Stück', target: 52,
    value: (d, today) => weekStreak(d.sessions, today).best },
  { id: 'years3', tier: 'legend', name: 'THREE WINTERS', aura: '#c9d1ff', desc: '3 Jahre UMBRA', target: 3, unit: 'Jahre',
    value: (d, today) => {
      const first = d.sessions.map((s) => s.day).sort()[0];
      return first ? Math.floor(daysBetween(first, today) / 365) : 0;
    } },
  // Große Errungenschaften: Beweglichkeit
  { id: 'mob75', tier: 'legend', name: 'FLUID', aura: '#4da3ff', desc: 'Alle Mobility-Regionen mindestens 75', target: 75,
    value: (d) => { const t = latestTest(d.mobility); const v = t ? Object.values(t.scores) : []; return v.length ? Math.min(...v) : 0; } },
  { id: 'split', tier: 'legend', name: 'SIDE SPLIT', aura: '#4da3ff', desc: 'Seitspagat (Mobility-Check Adduktoren Stufe 5)', target: 5,
    value: (d) => mobLevels(d).adduktoren || 0 },
  { id: 'pancake', tier: 'legend', name: 'PANCAKE', aura: '#4da3ff', desc: 'Vorbeuge mit Brust am Boden (Hamstrings Stufe 5)', target: 5,
    value: (d) => mobLevels(d).hamstrings || 0 },
];
export const ASCENSION_TIER_XP = { badge: XP_CONFIG.sources.ascension, feat: XP_CONFIG.sources.feat, legend: XP_CONFIG.sources.legend };

export function ascensionStatus(data, today) {
  const unlocked = new Set(data.sessions.filter((s) => s.kind === 'ascension').map((s) => s.ascension));
  return ASCENSIONS.map((a) => {
    const v = a.value(data, today);
    return { ...a, current: Math.min(v, a.target), unlocked: unlocked.has(a.id), reached: v >= a.target };
  });
}

// ——— Mikro-Erfolge pro Kapitel ———
// Pro Saison und Kapitel: durchgezogen (100 XP), 3 Bestleistungen in Hauptübungen, neue Stufe, eine Saison-Tat (je 50 XP).
const FOCUS_MAIN = new Set(Object.values(MISSIONS).flatMap((m) => (m.slots || []).filter((x) => x.main).flatMap((x) => [x.ex, ...[].concat(x.gym || []), ...(x.variants || [])])));
const DEEDS = {
  WINTER: [
    { id: 'deed', name: 'VOLLE LAST', desc: '3 Missionen mit allen Sätzen', test: (ss) => ss.filter((s) => s.kind === 'mission' && (s.exercises || []).length && (s.completion ?? 0) >= 0.999).length >= 3 },
    { id: 'deed', name: 'SAUBERE SPITZE', desc: 'Alle Top-Sätze des Kapitels erledigt (mindestens 6)', test: (ss) => {
      const tops = ss.flatMap((s) => (s.exercises || []).flatMap((e) => (e.sets || []).filter((x) => x.label === 'Top-Satz')));
      return tops.length >= 6 && tops.every((x) => x.done);
    } },
  ],
  SPRING: [
    { id: 'deed', name: 'ZEHN RUNDEN', desc: '10 Sparringsrunden im Kapitel', test: (ss) => ss.reduce((n, s) => n + (s.sparRounds || 0), 0) >= 10 },
    { id: 'deed', name: 'ERSTES 4x4', desc: 'Ein 4x4 komplett', test: (ss) => ss.some((s) => s.missionId === 'NOR4X4' && (s.completion ?? 0) >= 0.999) },
  ],
  SUMMER: [
    { id: 'deed', name: 'LEICHTE FÜSSE', desc: 'Sprungplatz mit Plyo-Stufe 4 komplett', test: (ss) => ss.some((s) => (s.exercises || []).some((e) => ['broad_jump', 'box_jump', 'depth_jump_low'].includes(e.exId) && (e.sets || []).length && e.sets.every((x) => x.done))) },
    { id: 'deed', name: 'DREI ZIRKEL', desc: '3 Zirkel mit allen Runden', test: (ss) => ss.filter((s) => ['D', 'HOTEL'].includes(s.missionId) && (s.completion ?? 0) >= 0.999).length >= 3 },
  ],
  AUTUMN: [
    { id: 'deed', name: 'WEITER', desc: 'Eine Mobility-Region eine Stufe höher', test: (ss, d, from, to) => {
      const t = (d.mobility || []).filter((x) => x.day >= from && x.day <= to);
      const before = (d.mobility || []).filter((x) => x.day < from).at(-1);
      return !!before && t.some((x) => Object.entries(x.levels || {}).some(([r, l]) => l > (before.levels?.[r] || 0)));
    } },
    { id: 'deed', name: 'STILLE GELENKE', desc: 'Ganzes Kapitel ohne Schmerz- oder Ellbogenmeldung', test: (ss, d, from, to) =>
      ![...(d.signals?.pain || []), ...(d.signals?.elbow || [])].some((x) => x.day >= from && x.day <= to) },
  ],
};

/** Mikro-Erfolge eines Kapitels (n = Saison, c = 0 oder 1). */
export function microStatus(data, n, c) {
  const arc = data.engine?.arc;
  const ss = data.sessions.filter((s) => s.arc?.n === n && s.arc.week > c * 6 && s.arc.week <= (c + 1) * 6);
  const days = ss.map((s) => s.day).sort();
  const from = days[0] || '9999';
  const to = days.at(-1) || '0000';
  const doneChapter = !!arc && (arc.n > n || (arc.n === n && arc.week > (c + 1) * 6));
  const records = ss.flatMap((s) => s.records || []).filter((r) => FOCUS_MAIN.has(r.exId)).length;
  const levelUp = (data.ruleLog || []).some((e) => /^ladder:(up|manual_up)$/.test(e.rule) && e.decision !== 'declined' && e.day >= from && e.day <= to);
  const deed = (DEEDS[arcOf(n).id] || [])[c];
  const got = new Set(data.sessions.filter((s) => s.kind === 'micro' && s.n === n && s.chapter === c).map((s) => s.micro));
  const list = [
    { id: 'chapter', name: 'KAPITEL DURCHGEZOGEN', desc: 'Alle 6 Wochen inklusive Deload', reached: doneChapter, xp: XP_CONFIG.sources.chapter },
    { id: 'records', name: 'NEUE BESTWERTE', desc: '3 Bestleistungen in Hauptübungen', reached: records >= 3, current: Math.min(3, records), target: 3, xp: XP_CONFIG.sources.micro },
    { id: 'level', name: 'NEUE STUFE', desc: 'Eine Übung eine Progressionsstufe höher', reached: levelUp, xp: XP_CONFIG.sources.micro },
    deed && { id: 'deed', name: deed.name, desc: deed.desc, reached: !!ss.length && deed.test(ss, data, from, to), xp: XP_CONFIG.sources.micro },
  ].filter(Boolean);
  return list.map((m) => ({ ...m, unlocked: got.has(m.id) }));
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
export const ATTR_RANKS = [['E', 0], ['D', 40], ['C', 120], ['B', 300], ['A', 700], ['S', 1400]];

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
export const QUEST_XP = XP_CONFIG.sources.quest;
export const ASCENSION_XP = XP_CONFIG.sources.ascension;

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
      const xp = ASCENSION_TIER_XP[a.tier] ?? ASCENSION_XP;
      added.push({ id: `x${now}${a.id}`, day: today, kind: 'ascension', ascension: a.id, tier: a.tier, xp });
      events.push({ type: 'ascension', ascension: { ...a, xp } });
    }
  }
  // Mikro-Erfolge: laufendes und vorheriges Kapitel (nur Saisons ab n = 0)
  const arc = data.engine?.arc;
  if (arc) {
    const chapters = [[arc.n, 0], [arc.n, 1], [arc.n - 1, 1]].filter(([n]) => n >= 0);
    for (const [n, c] of chapters) {
      for (const m of microStatus(data, n, c)) {
        if (!m.reached || m.unlocked) continue;
        added.push({ id: `m${now}${n}${c}${m.id}`, day: today, kind: 'micro', n, chapter: c, micro: m.id, name: m.name, xp: m.xp });
        events.push({ type: 'micro', micro: m, n, chapter: c });
      }
    }
  }
  if (!added.length) return { data, events };
  return { data: { ...data, sessions: [...data.sessions, ...added] }, events };
}

export function highestAscension(data) {
  const last = data.sessions.filter((s) => s.kind === 'ascension').pop();
  return last ? ASCENSIONS.find((a) => a.id === last.ascension) : null;
}
