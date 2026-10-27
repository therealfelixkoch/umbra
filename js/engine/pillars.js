// Die drei Säulen eines Saison-Wächters: Benchmark-Workout, Fortschritts-Index, Durchziehen.
// Ergebnis abgestuft: 1 Säule = Bronze, 2 = Silber, 3 = Gold, keine = Rückzug. Reine Funktionen.
import { BENCHMARKS } from '../data/benchmarks.js';
import { BOSS_BY_ARC } from '../data/lore.js';
import { MISSIONS } from '../data/missions.js';
import { arcOf, EXAM_WEEK, CHAPTER_WEEKS } from '../data/arcs.js';
import { setScore } from './progression.js';
import { REGION } from '../data/mobility.js';
import { advanceQueue } from './decide.js';
import { sessionXp } from './game.js';

export const MEDALS = ['bronze', 'silver', 'gold'];
export const MEDAL_NAMES = { bronze: 'Bronze', silver: 'Silber', gold: 'Gold' };

export const benchmarkOf = (n) => BENCHMARKS[BOSS_BY_ARC[((n % 4) + 4) % 4]];
export const benchState = (data, n) => data.benchmarks?.[n] || {};

/** Ist der Benchmark heute dran? 'baseline' im ersten Kapitel ohne Baseline, 'revenge' in der Prüfwoche. */
export function benchmarkDue(data, today = null) {
  const arc = data.engine.arc;
  if (!arc || (today && arc.startedDay && today < arc.startedDay)) return null; // Saison hat noch nicht begonnen
  const b = benchState(data, arc.n);
  if (!b.baseline && arc.week <= CHAPTER_WEEKS) return 'baseline';
  if (b.baseline && !b.revenge && arc.week >= EXAM_WEEK) return 'revenge';
  return null;
}

/** Schlägt der neue Wert den alten? Zeit: weniger ist besser, Anzahl: mehr ist besser. */
export const beats = (bench, base, value) => (bench.score === 'time' ? value < base : value > base);

/**
 * Benchmark verbuchen. Zählt als volle Mission auf dem Zirkel-Platz (ersetzt INFILTRATION einmal).
 * @param {{kind:'baseline'|'revenge', variant:'full'|'half', value:number, sub?:boolean, minutes?:number, day:string, now?:number}} r
 */
export function logBenchmark(data, { kind, variant, value, sub = false, minutes = 30, day, now = Date.now() }) {
  const arc = data.engine.arc;
  const n = arc.n;
  const bench = benchmarkOf(n);
  const prev = benchState(data, n);
  const entry = { day, value, sub: sub || undefined };
  const state = kind === 'baseline' ? { ...prev, variant, baseline: entry } : { ...prev, revenge: entry };
  const session = { id: `bm${now}`, day, kind: 'mission', missionId: 'BENCH', slot: 'D', completion: 1, minutes,
    arc: { n, week: arc.week }, benchmark: { id: bench.id, kind, variant: state.variant, value, sub: sub || undefined }, records: [] };
  session.xp = sessionXp(session);
  return { ...data, benchmarks: { ...(data.benchmarks || {}), [n]: state }, sessions: [...data.sessions, session],
    engine: { ...data.engine, queue: advanceQueue(data.engine.queue, 'D') } };
}

export function formatScore(bench, value) {
  if (value == null) return '–';
  if (bench.score === 'time') return `${Math.floor(value / 60)}:${String(Math.round(value % 60)).padStart(2, '0')} min`;
  return `${value} ${bench.unit}`;
}

// ——— Säule 2: Fortschritts-Index ———
// Früh = Saisonwochen 1–4, spät = Wochen 9–13. Fokus-Bereiche der Saison zählen doppelt.
const EARLY = (w) => w >= 1 && w <= 4;
const LATE = (w) => w >= 9 && w <= EXAM_WEEK;
const FOCUS = { WINTER: ['kraft'], SPRING: ['kondition', 'muaythai'], SUMMER: ['kondition'], AUTUMN: ['mobility'] };
export const GROUP_NAMES = { kraft: 'Kraft', kondition: 'Kondition', mobility: 'Mobility', muaythai: 'Muay Thai' };

const MAIN_IDS = new Set(Object.values(MISSIONS).flatMap((m) => (m.slots || []).filter((s) => s.main)
  .flatMap((s) => [s.ex, ...[].concat(s.gym || []), ...(s.variants || [])])));
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const max = (xs) => (xs.length ? Math.max(...xs) : null);

/** Bester Satz einer Übung, um RIR bereinigt (Wiederholungen im Tank zählen mit, höchstens 4). */
function bestScore(def, exEntry, bw) {
  const done = (exEntry.sets || []).filter((x) => x.done);
  if (!done.length) return null;
  return Math.max(...done.map((x) => setScore(def, { ...x, value: (x.value || 0) + Math.min(4, x.rir ?? 2) }, bw)));
}

/**
 * Bereiche mit Wert früh und spät. better: verbessert (> 1 %), worse: mehr als 10 % schlechter.
 * @returns {{areas:object[], weighted:number, weightedBetter:number, ratio:number|null, worse:object[], passed:boolean, enough:boolean}}
 */
export function progressIndex(data, n, getDef) {
  const ss = data.sessions.filter((s) => s.arc?.n === n);
  const wk = (s) => s.arc.week;
  const bw = data.settings.bodyweight || 80;
  const areas = [];
  const add = (key, label, group, before, after, lowerBetter = false) => {
    if (before == null || after == null || before === 0) return;
    const change = (after - before) / Math.abs(before) * (lowerBetter ? -1 : 1);
    areas.push({ key, label, group, before, after, lowerBetter, change, better: change > 0.01, worse: change < -0.1 });
  };

  // Kraft: Hauptübungen, bester RIR-bereinigter Satz früh vs. spät
  const exIds = new Set(ss.flatMap((s) => (s.exercises || []).map((e) => e.exId)).filter((id) => MAIN_IDS.has(id)));
  for (const id of exIds) {
    const def = getDef(id);
    if (!def) continue;
    const scores = (pred) => ss.filter((s) => pred(wk(s))).flatMap((s) => (s.exercises || []).filter((e) => e.exId === id).map((e) => bestScore(def, e, bw))).filter((x) => x != null);
    add(`ex:${id}`, def.name, 'kraft', max(scores(EARLY)), max(scores(LATE)));
  }

  // Kondition: Zirkelrunden, 4x4-RPE (weniger ist besser), SHADOWSTEP-Runden
  const rounds = (ids, pred) => avg(ss.filter((s) => ids.includes(s.missionId) && pred(wk(s)) && s.roundsDone).map((s) => s.roundsDone));
  add('cond:circuit', 'Zirkelrunden (INFILTRATION)', 'kondition', rounds(['D', 'HOTEL'], EARLY), rounds(['D', 'HOTEL'], LATE));
  add('cond:express', 'SHADOWSTEP-Runden', 'kondition', rounds(['EXPRESS'], EARLY), rounds(['EXPRESS'], LATE));
  const rpe = (pred) => avg(ss.filter((s) => s.missionId === 'NOR4X4' && pred(wk(s)) && s.intervals?.rpe?.length).map((s) => avg(s.intervals.rpe.filter((x) => x != null))));
  add('cond:4x4', '4x4 Anstrengung (RPE)', 'kondition', rpe(EARLY), rpe(LATE), true);

  // Mobility: letzter Test vor/zu Saisonbeginn vs. letzter Test in der Saison
  const hist = (data.engine.arcHistory || []).find((h) => h.n === n);
  const start = (data.engine.arc?.n === n ? data.engine.arc.startedDay : hist?.from) || ss.map((s) => s.day).sort()[0] || null;
  const tests = data.mobility || [];
  const inSeason = start ? tests.filter((t) => t.day >= start) : [];
  const before = start ? [...tests.filter((t) => t.day < start)].at(-1) || inSeason[0] : null;
  const after = inSeason.at(-1);
  if (before && after && before !== after) {
    for (const region of Object.keys(after.scores || {})) add(`mob:${region}`, `Mobility ${REGION[region]?.name || region}`, 'mobility', before.scores?.[region], after.scores[region]);
  }

  // Muay Thai: ARENA-Minuten pro Woche (Kapitel 1 vs. Kapitel 2 + Prüfwoche), Sparringsrunden, Technik-Check
  const arena = ss.filter((s) => s.kind === 'arena');
  const perWeek = (from, to) => {
    const weeks = new Set(ss.filter((s) => wk(s) >= from && wk(s) <= to).map(wk));
    return weeks.size ? arena.filter((s) => wk(s) >= from && wk(s) <= to).reduce((m, s) => m + (s.minutes || 0), 0) / weeks.size : null;
  };
  add('mt:minutes', 'ARENA-Minuten pro Woche', 'muaythai', perWeek(1, CHAPTER_WEEKS), perWeek(CHAPTER_WEEKS + 1, EXAM_WEEK));
  add('mt:spar', 'Sparringsrunden pro Einheit', 'muaythai', avg(arena.filter((s) => EARLY(wk(s)) && s.sparRounds).map((s) => s.sparRounds)), avg(arena.filter((s) => LATE(wk(s)) && s.sparRounds).map((s) => s.sparRounds)));
  const tech = Object.entries(data.techChecks || {}).filter(([, v]) => start && v.day >= start).sort((a, b) => a[0].localeCompare(b[0]));
  const techAvg = (v) => avg(Object.values(v?.scores || {}).filter((x) => typeof x === 'number'));
  if (tech.length >= 2) add('mt:tech', 'Technik-Check', 'muaythai', techAvg(tech[0][1]), techAvg(tech.at(-1)[1]));

  const focus = FOCUS[arcOf(n).id] || [];
  const w = (a) => (focus.includes(a.group) ? 2 : 1);
  const weighted = areas.reduce((m, a) => m + w(a), 0);
  const weightedBetter = areas.filter((a) => a.better).reduce((m, a) => m + w(a), 0);
  const worse = areas.filter((a) => a.worse);
  const enough = areas.length >= 3;
  const ratio = weighted ? weightedBetter / weighted : null;
  return { areas, weighted, weightedBetter, ratio, worse, enough, focus,
    better: areas.filter((a) => a.better).length, passed: enough && ratio >= 0.6 && !worse.length };
}

// ——— Alle drei Säulen ———
export function pillars(data, n, getDef) {
  const bench = benchmarkOf(n);
  const b = benchState(data, n);
  const benchmark = { bench, ...b, passed: !!(b.baseline && b.revenge && beats(bench, b.baseline.value, b.revenge.value)) };
  const index = progressIndex(data, n, getDef);
  const arc = data.engine.arc;
  const reached = arc?.n > n || (arc?.n === n && arc.week >= EXAM_WEEK);
  const chapters = { passed: !!reached };
  const count = [benchmark.passed, index.passed, chapters.passed].filter(Boolean).length;
  return { benchmark, index, chapters, count, medal: count ? MEDALS[count - 1] : null };
}
