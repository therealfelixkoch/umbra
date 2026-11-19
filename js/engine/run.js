// BANG COMBAT (Interview 19.11.2026): Reihenfolge statt Wochentage, Kapitel = 15 Einheiten, Programm-Bibliothek.
// Reine Funktionen über engine.programs = { active, runs: { [programId]: run } }.
// run = { n: Saison-Nummer (0 = Winter 2026/27), chapter: 0|1, done: erledigte Einheiten im Kapitel (0–15),
//         next: nächste Einheit (Missions-ID), startedDay, lastDay, choice: Empfehlung am Kapitelende oder null }
// - Die App zeigt immer die nächste Einheit (A → B → C). Nichts verfällt, kein „verpasst“.
// - Einheit 1–3 Einstieg (+1 RIR), 4–9 normal, 10–12 Spitze, 13–15 leicht (Deload).
// - Ein laufendes Kapitel wird nie unterbrochen. Erst am Kapitelende empfiehlt die App das nächste Kapitel:
//   nach Kapitel 1 Kapitel 2 derselben Saison, nach Kapitel 2 die nächste Saison (auch früher als der Kalender).
//   Ist der Kalender schon weiter (lange Pause), empfiehlt sie Kapitel 1 der Kalendersaison.
import { programOf, DEFAULT_PROGRAM } from '../data/library.js';
import { arcOf, chapterOf, CHAPTER_WEEKS } from '../data/arcs.js';
import { CHAPTER_SETUP, UNIT_LETTER } from '../data/program.js';
import { weekStart, addDays } from './dates.js';

export const UNITS_PER_CHAPTER = 15;
const SEASON_EPOCH = 2026; // Saison 0 = Winter 2026/27 (November 2026 bis Januar 2027)

/** Phase einer Kapiteleinheit (1–15). */
export function phaseOf(unitNo) {
  if (unitNo <= 3) return 'intro';
  if (unitNo <= 9) return 'normal';
  if (unitNo <= 12) return 'peak';
  return 'deload';
}
export const PHASE_LABEL = { intro: 'Einstieg', normal: 'Aufbau', peak: 'Spitze', deload: 'Leicht' };

/**
 * Kapitelwoche (1–6) für eine Einheit, damit RIR, Spitze und Deload in plan.js und cycle.js gleich bleiben:
 * 1–3 → Woche 1 (+1 RIR), 4–9 → Woche 2–3, 10–12 → Woche 4–5 (Spitze), 13–15 → Woche 6 (Deload).
 */
export function weekOfUnit(unitNo) {
  if (unitNo <= 3) return 1;
  if (unitNo <= 6) return 2;
  if (unitNo <= 9) return 3;
  if (unitNo <= 11) return 4;
  if (unitNo === 12) return 5;
  return 6;
}

/** Saison-Nummer nach Kalender (0 = Winter 2026/27, 1 = Frühling 2027 …). Vor dem Start: 0. */
export function calendarSeasonN(today) {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const startYear = m >= 11 ? y : y - 1;
  const idx = m >= 11 || m === 1 ? 0 : m <= 4 ? 1 : m <= 7 ? 2 : 3;
  return Math.max(0, (startYear - SEASON_EPOCH) * 4 + idx);
}

export function initialRun(today, { n = calendarSeasonN(today), chapter = 0, done = 0, programId = DEFAULT_PROGRAM } = {}) {
  const prog = programOf(programId);
  return { n, chapter, done, next: prog.units[0], startedDay: today, lastDay: null, choice: null };
}

export function initialPrograms(today, opts = {}) {
  return { active: DEFAULT_PROGRAM, runs: { [DEFAULT_PROGRAM]: initialRun(today, opts) } };
}

/** engine mit Programm-Stand (legt ihn bei Bedarf an). */
export function ensurePrograms(engine, today) {
  if (engine?.programs?.runs?.[engine.programs.active]) return engine;
  const arc = engine?.arc;
  const opts = arc ? { n: Math.max(0, arc.n), chapter: chapterOf(arc.week) === 1 ? 1 : 0 } : {};
  const programs = { active: DEFAULT_PROGRAM, ...(engine?.programs || {}), runs: { ...(engine?.programs?.runs || {}) } };
  if (!programs.runs[programs.active]) programs.runs[programs.active] = initialRun(today, { ...opts, programId: programs.active });
  return { ...engine, programs };
}

export const activeProgramId = (engine) => engine?.programs?.active || DEFAULT_PROGRAM;
export const activeRun = (engine) => engine?.programs?.runs?.[activeProgramId(engine)] || null;
export const isProgramUnit = (engine, missionId) => !!programOf(activeProgramId(engine))?.units.includes(missionId);

/** Empfehlung am Kapitelende. @returns {{n:number, chapter:number, why:'next'|'early'|'calendar'|'repeat', text:string}} */
export function recommendNext(run, today) {
  const cal = calendarSeasonN(today);
  let rec = run.chapter === 0 ? { n: run.n, chapter: 1, why: 'next' } : { n: run.n + 1, chapter: 0, why: 'next' };
  if (cal > rec.n) rec = { n: cal, chapter: 0, why: 'calendar' };
  else if (rec.n > cal + 1) rec = { n: run.n, chapter: run.chapter, why: 'repeat' }; // höchstens eine Saison voraus
  else if (rec.n > cal) rec = { ...rec, why: 'early' };
  const a = arcOf(rec.n);
  const now = arcOf(cal);
  const ch = CHAPTER_SETUP[a.id][rec.chapter].name;
  const text = rec.why === 'early' ? `Kapitel geschafft. Empfohlen: BANG COMBAT · ${a.sub}, Kapitel 1 · ${ch}, etwas früher als der Kalender.`
    : rec.why === 'repeat' ? `Du bist dem Kalender weit voraus. Empfohlen: BANG COMBAT · ${a.sub} · ${ch} noch einmal.`
      : `Es ist ${now.name === 'WINTER ARC' ? 'Winter' : now.name.charAt(0) + now.name.slice(1).toLowerCase()}. Empfohlen: BANG COMBAT · ${a.sub}, Kapitel ${rec.chapter + 1} · ${ch}.`;
  return { ...rec, text };
}

/** Neues Kapitel starten (Empfehlung angenommen oder selbst gewählt). */
export function startChapter(run, { n, chapter }, today) {
  return { ...run, n, chapter, done: 0, startedDay: today, choice: null };
}

/**
 * Was kommt als Nächstes? Wartet ein Kapitelwechsel, gilt schon das empfohlene Kapitel (Einheit 1),
 * und `choice` trägt die Empfehlung für die Oberfläche.
 */
export function nextUnit(engine, today) {
  const programId = activeProgramId(engine);
  const prog = programOf(programId);
  const run = activeRun(engine);
  if (!prog || !run) return null;
  const choice = run.done >= prog.unitsPerChapter ? (run.choice || recommendNext(run, today)) : null;
  const n = choice ? choice.n : run.n;
  const chapter = choice ? choice.chapter : run.chapter;
  const unitNo = choice ? 1 : run.done + 1;
  const a = arcOf(n);
  const setup = CHAPTER_SETUP[a.id][chapter];
  const phase = phaseOf(unitNo);
  return {
    programId, programName: prog.name, missionId: run.next, letter: UNIT_LETTER[run.next] || run.next,
    n, seasonId: a.id, sub: a.sub, chapter, chapterName: setup.name, unitNo, unitsPerChapter: prog.unitsPerChapter,
    phase, phaseLabel: PHASE_LABEL[phase], week: weekOfUnit(unitNo), choice,
    label: `${prog.name} · ${a.sub}, Einheit ${unitNo} von ${prog.unitsPerChapter}`,
  };
}

/** Kurzstand eines Programms für die Bibliothek („BANG COMBAT · IRON, Einheit 9 von 15“). */
export function programStatus(engine, programId, today) {
  const prog = programOf(programId);
  if (!prog) return null;
  const run = engine?.programs?.runs?.[programId];
  if (!run) return { programId, name: prog.name, started: false, label: prog.name };
  const sim = nextUnit({ ...engine, programs: { ...engine.programs, active: programId } }, today);
  return { programId, name: prog.name, started: true, active: activeProgramId(engine) === programId, ...sim };
}

/**
 * Eine Einheit des aktiven Programms ist erledigt (auch Kurzversion oder nur teilweise).
 * @returns {{engine:object, events:object[]}} events: chapter_start, arc_complete (Saisonwechsel), chapter_complete
 */
export function completeUnit(engine, missionId, today) {
  const prog = programOf(activeProgramId(engine));
  const i = prog ? prog.units.indexOf(missionId) : -1;
  let run = activeRun(engine);
  if (i < 0 || !run) return { engine, events: [] };
  const events = [];
  if (run.done >= prog.unitsPerChapter) {
    const choice = run.choice || recommendNext(run, today);
    if (choice.n !== run.n) events.push({ type: 'arc_complete', n: run.n, to: choice.n });
    run = startChapter(run, choice, today);
    events.push({ type: 'chapter_start', n: run.n, chapter: run.chapter });
  }
  run = { ...run, done: run.done + 1, next: prog.units[(i + 1) % prog.units.length], lastDay: today };
  if (run.done >= prog.unitsPerChapter) {
    run.choice = recommendNext(run, today);
    events.push({ type: 'chapter_complete', n: run.n, chapter: run.chapter, choice: run.choice });
  }
  return { engine: withRun(engine, run), events };
}

/** Kapitel selbst wählen (am Kapitelende „Anderes wählen“, oder bewusst neu anfangen). */
export function chooseChapter(engine, { n, chapter }, today) {
  const run = activeRun(engine);
  if (!run) return engine;
  return withRun(engine, startChapter(run, { n, chapter }, today));
}

/** Programm wechseln. Der Stand des alten bleibt gespeichert, ein neues startet bei Einheit 1. */
export function switchProgram(engine, programId, today) {
  if (!programOf(programId)) return engine;
  const runs = { ...(engine.programs?.runs || {}) };
  if (!runs[programId]) runs[programId] = initialRun(today, { programId, n: activeRun(engine)?.n ?? calendarSeasonN(today) });
  return { ...engine, programs: { ...(engine.programs || {}), active: programId, runs } };
}

/** 3× „Platt“ oder der Knopf: direkt in die leichten Einheiten (13–15) springen. */
export function jumpToLight(engine) {
  const run = activeRun(engine);
  const prog = programOf(activeProgramId(engine));
  if (!run || !prog || run.done >= 12) return engine;
  return withRun(engine, { ...run, done: 12, jumped: true });
}

const withRun = (engine, run) => ({ ...engine, programs: { ...engine.programs, runs: { ...engine.programs.runs, [engine.programs.active]: run } } });

/**
 * Saison-Stand im alten Format (engine.arc), abgeleitet aus dem aktiven Programm.
 * week = Kapitel × 6 + Kapitelwoche der nächsten Einheit, damit weekInfo, inDeload und die Story weiterlaufen.
 */
// Wartet ein Kapitelwechsel, bleibt der Saison-Stand beim abgeschlossenen Kapitel (Einheit 15), bis die nächste Einheit erledigt ist.
export function arcFromRun(engine, today, prev = null) {
  const run = activeRun(engine);
  if (!run) return prev;
  const unitNo = Math.min(run.done + 1, UNITS_PER_CHAPTER);
  const week = run.chapter * CHAPTER_WEEKS + weekOfUnit(unitNo);
  const same = prev && prev.n === run.n;
  const startedDay = same && prev.startedDay ? prev.startedDay : (run.startedDay || today);
  return { ...(prev || {}), n: run.n, week, through: today ? addDays(weekStart(today), -7) : prev?.through ?? null,
    startedWeek: same && prev.startedWeek ? prev.startedWeek : startedDay ? weekStart(startedDay) : null, startedDay,
    jumped: !!run.jumped && weekOfUnit(unitNo) === 6, unit: unitNo };
}

/** Kapitel-Infos für den Plan der nächsten Einheit (gleiche Felder wie weekInfo aus arc.js, die plan.js braucht). */
export function unitInfo(engine, today) {
  const u = nextUnit(engine, today);
  if (!u) return null;
  return { arc: arcOf(u.n), chapterIndex: u.chapter, chapterWeek: u.week, unitNo: u.unitNo, phase: u.phase,
    deload: u.phase === 'deload', rules: {}, unit: u };
}
