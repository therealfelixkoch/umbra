// Vergleichstest und Fortschritts-Index (BANG COMBAT, 19.11.2026). Keine Säulen, keine Medaillen, kein „besiegt“.
// Der Vergleichstest ist freiwillig: angeboten nach Einheit 15 eines Kapitels, wegklickbar, verglichen mit dem letzten Mal.
// Reine Funktionen.
import { PROGRAM_MAIN_IDS } from '../data/program.js';
import { BENCHMARKS, BENCH_BY_SEASON } from '../data/benchmarks.js';
import { BENCH_TEXT } from '../data/story.js';
import { MISSIONS } from '../data/missions.js';
import { arcOf, EXAM_WEEK, CHAPTER_WEEKS } from '../data/arcs.js';
import { setScore } from './progression.js';
import { REGION } from '../data/mobility.js';
import { sessionXp } from './game.js';
import { activeRun, activeProgramId, UNITS_PER_CHAPTER } from './run.js';

export const benchmarkOf = (n) => BENCHMARKS[BENCH_BY_SEASON[arcOf(n).id]];

/** Alle Ergebnisse eines Tests, alt nach neu: neue Vergleichstests und ältere Baseline/Revanche-Einträge. */
export function benchHistory(data, benchId) {
  const out = (data.benchTests || []).filter((t) => t.id === benchId).map((t) => ({ ...t }));
  for (const [n, b] of Object.entries(data.benchmarks || {})) {
    if (benchmarkOf(Number(n))?.id !== benchId) continue;
    for (const kind of ['baseline', 'revenge']) {
      if (b[kind]) out.push({ id: benchId, day: b[kind].day, value: b[kind].value, variant: b.variant, cardio: b.cardio, pulse: b[kind].pulse, sub: b[kind].sub, legacy: kind });
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

/** Letztes Ergebnis derselben Version (voll/halb, gleicher Cardio-Block). */
export function lastResult(data, bench, variant = null, cardio = null) {
  const list = benchHistory(data, bench.id).filter((t) => (!variant || t.variant === variant) && (!bench.cardio || !cardio || (t.cardio || 'rope') === cardio));
  return list.at(-1) || null;
}

const offerKey = (data) => { const r = activeRun(data.engine); return r ? `${activeProgramId(data.engine)}:${r.n}:${r.chapter}` : null; };

/**
 * Vergleichstest anbieten? Nur nach Einheit 15 (Kapitel fertig, nächstes noch nicht begonnen),
 * nur einmal je Kapitel, und nicht, wenn weggeklickt.
 * @returns {{bench:object, n:number, chapter:number, last:object|null, text:string[]}|null}
 */
export function benchOffer(data) {
  const run = activeRun(data.engine);
  if (!run || run.done < UNITS_PER_CHAPTER) return null;
  const key = offerKey(data);
  if (data.engine.benchDismissed?.[key] || (data.benchTests || []).some((t) => t.key === key)) return null;
  const bench = benchmarkOf(run.n);
  return { bench, n: run.n, chapter: run.chapter, last: lastResult(data, bench), text: BENCH_TEXT.offer };
}

/** Angebot wegklicken (gilt für dieses Kapitel). */
export function dismissBench(data) {
  const key = offerKey(data);
  return key ? { ...data, engine: { ...data.engine, benchDismissed: { ...(data.engine.benchDismissed || {}), [key]: true } } } : data;
}

/** Schlägt der neue Wert den alten? Zeit: weniger ist besser, Anzahl: mehr ist besser. */
export const beats = (bench, base, value) => (bench.score === 'time' ? value < base : value > base);

/** Vergleich ohne Urteil: 'first' | 'better' | 'same' (unter 2 % Unterschied) | 'lower', mit Text aus BENCH_TEXT. */
export function benchCompare(bench, prev, value) {
  if (!prev) return { kind: 'first', text: BENCH_TEXT.first };
  const delta = bench.score === 'time' ? prev.value - value : value - prev.value;
  if (Math.abs(delta) / Math.max(1, Math.abs(prev.value)) < 0.02) return { kind: 'same', delta, text: BENCH_TEXT.same };
  if (delta > 0) {
    const diff = bench.score === 'time' ? `${Math.floor(delta / 60) ? `${Math.floor(delta / 60)}:${String(Math.round(delta % 60)).padStart(2, '0')} min` : `${Math.round(delta)} s`}` : `${delta} ${bench.unit}`;
    return { kind: 'better', delta, text: BENCH_TEXT.better.map((l) => l.replace('{diff}', diff)) };
  }
  return { kind: 'lower', delta, text: BENCH_TEXT.lower };
}

/**
 * Vergleichstest verbuchen. Zählt nicht als Einheit von A/B/C, die Reihenfolge bleibt.
 * @param {{variant:'full'|'half', cardio?:string, value:number, pulse?:number, sub?:boolean, minutes?:number, day:string, now?:number}} r
 */
export function logBenchTest(data, { variant, cardio, value, pulse, sub = false, minutes = 30, day, now = Date.now() }) {
  const run = activeRun(data.engine);
  const n = run ? run.n : data.engine.arc?.n ?? 0;
  const bench = benchmarkOf(n);
  const card = bench.cardio ? cardio || 'rope' : undefined;
  const prev = lastResult(data, bench, variant, card);
  const result = benchCompare(bench, prev, value);
  const test = { id: bench.id, key: offerKey(data), n, chapter: run?.chapter ?? null, day, value, variant, cardio: card,
    pulse: pulse || undefined, sub: sub || undefined, result: result.kind };
  const session = { id: `bm${now}`, day, kind: 'mission', missionId: 'BENCH', completion: 1, minutes,
    arc: data.engine.arc ? { n: data.engine.arc.n, week: data.engine.arc.week } : undefined,
    benchmark: { id: bench.id, kind: 'test', variant, cardio: card, value, pulse: pulse || undefined, sub: sub || undefined, result: result.kind }, records: [] };
  session.xp = sessionXp(session);
  return { data: { ...data, benchTests: [...(data.benchTests || []), test], sessions: [...data.sessions, session] }, result, prev };
}

/** Ablauf einer Version, mit dem gewählten Cardio-Block (Cave-Murph: Seil oder Rudergerät). */
export function partsOf(bench, variant, cardio) {
  const v = bench.variants[variant];
  if (!bench.cardio || !cardio || cardio === 'rope') return v.parts;
  return v.parts.map((p) => (p === bench.cardio.rope[variant] ? bench.cardio[cardio][variant] : p));
}

/** Kurzform für Listen: „voll · Rudergerät · Puls 158“ */
export function versionText(bench, variant, cardio, pulse) {
  return [variant === 'half' ? 'halb' : 'voll', bench.cardio && cardio ? bench.cardio[cardio].label : null, pulse ? `Puls ${pulse}` : null].filter(Boolean).join(' · ');
}

/**
 * Einmalige Korrektur (v41): Der erste Cave-Murph lief mit 1000 m Rudern statt Seil, Puls direkt danach 158.
 * Greift nur bei einer Baseline bis 03.11.2026 ohne Cardio-Angabe und nur einmal (settings.murphRowFix).
 */
export function fixCaveMurph(data) {
  if (data.settings?.murphRowFix || !data.benchmarks) return data;
  let hit = null;
  for (const [n, b] of Object.entries(data.benchmarks)) {
    if (benchmarkOf(Number(n))?.id === 'coldiron' && b.baseline && !b.cardio && b.baseline.day <= '2026-11-03') hit = n;
  }
  if (hit == null) return data;
  const b = data.benchmarks[hit];
  const pulse = b.baseline.pulse ?? 158;
  return { ...data,
    settings: { ...data.settings, murphRowFix: true },
    benchmarks: { ...data.benchmarks, [hit]: { ...b, cardio: 'row', baseline: { ...b.baseline, pulse } } },
    sessions: data.sessions.map((s) => (s.benchmark?.id === 'coldiron' && s.benchmark.kind === 'baseline' && s.arc?.n === Number(hit)
      ? { ...s, benchmark: { ...s.benchmark, cardio: 'row', pulse } } : s)) };
}

export function formatScore(bench, value) {
  if (value == null) return '–';
  if (bench.score === 'time') return `${Math.floor(value / 60)}:${String(Math.round(value % 60)).padStart(2, '0')} min`;
  return `${value} ${bench.unit}`;
}


// ——— Fortschritts-Index (Anzeige, kein Urteil) ———
// Früh = Saisonwochen 1–4, spät = Wochen 9–13. Fokus-Bereiche der Saison zählen doppelt.
const EARLY = (w) => w >= 1 && w <= 4;
const LATE = (w) => w >= 9 && w <= EXAM_WEEK;
const FOCUS = { WINTER: ['kraft'], SPRING: ['kondition', 'muaythai'], SUMMER: ['kondition'], AUTUMN: ['mobility'] };
export const GROUP_NAMES = { kraft: 'Kraft', kondition: 'Kondition', mobility: 'Mobility', muaythai: 'Muay Thai' };

const MAIN_IDS = new Set([...PROGRAM_MAIN_IDS, ...Object.values(MISSIONS).flatMap((m) => (m.slots || []).filter((s) => s.main)
  .flatMap((s) => [s.ex, ...[].concat(s.gym || []), ...(s.variants || [])]))]);
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

// ——— Übergang für die Screens (bis die UI umgestellt ist), danach löschen ———
// Kein Ergebnis, keine Medaille: Säulen gibt es nicht mehr.
export const MEDALS = [];
export const MEDAL_NAMES = {};
export const benchState = (data, n) => {
  const bench = benchmarkOf(n);
  const last = lastResult(data, bench);
  return { ...(data.benchmarks?.[n] || {}), variant: data.benchmarks?.[n]?.variant || last?.variant, cardio: data.benchmarks?.[n]?.cardio || last?.cardio };
};
/** Früher Baseline/Revanche: jetzt nur noch das freiwillige Angebot nach Einheit 15. */
export function benchmarkDue(data) {
  const o = benchOffer(data);
  return o ? (o.last ? 'revenge' : 'baseline') : null;
}
/** Früher Baseline/Revanche verbuchen: jetzt ein Vergleichstest. Gibt nur die Daten zurück (wie früher). */
export const logBenchmark = (data, r) => logBenchTest(data, r).data;
/** Früher die drei Säulen. Jetzt nur noch Vergleichstest-Stand und Fortschritts-Index, ohne Medaille. */
export function pillars(data, n, getDef) {
  const bench = benchmarkOf(n);
  const st = benchState(data, n);
  return { benchmark: { bench, ...st, passed: false }, index: progressIndex(data, n, getDef), chapters: { passed: false }, count: 0, medal: null };
}
