// FEET: Stufen, Aufstieg aus dem Fuß-Check, schwächere Seite, Sparring-Regel, Equipment-Ersatz, Barfuß-Zeit.
// Reine Funktionen. An nichts gekoppelt: zählt nicht für Rotation, Arc-Woche oder Wochenziel.
import { addDays, daysBetween, weekStart } from './dates.js';
import { FEET_STAGES, NO_JUMP_SWAP } from '../data/feet.js';

export const emptyFeet = () => ({ stage: 1, stageLog: [], checks: [], steps: {}, flags: {} });
export const FT = (data) => ({ ...emptyFeet(), ...(data?.feet || {}) });

export const CHECK_DAYS = 28; // alle 4 Wochen
export const WEEK_TARGET = [3, 5];

export const STAGE_NAMES = { 1: 'Erwachen', 2: 'Aufrichten', 3: 'Tragen', 4: 'Federn', 5: 'Erhaltung' };

export const lastCheck = (f) => f.checks.at(-1) || null;
export const checkDue = (f, today) => !lastCheck(f) || daysBetween(lastCheck(f).day, today) >= CHECK_DAYS;

const both = (o, min) => o && o.l != null && o.r != null && o.l >= min && o.r >= min;

/**
 * Aufstiegskriterien (Protokoll Abschnitt 4), immer nur die nächste Stufe.
 * 1→2: Zehenspreizen ≥ 2 und Großzeh-Druck ≥ 2 beidseitig, Short Foot im Sitzen sauber.
 * 2→3: Gewölbe einbeinig 30 s, Einbeinstand Augen offen 30 s stabil.
 * 3→4: 15+ einbeinige Fersenhebungen je Seite, Einbeinstand Augen zu 20+ s.
 * 4→Erhaltung: 20+ Fersenhebungen, 30+ s Augen zu, Pogos ohne Einknicken, 4 Wochen auf Stufe 4.
 */
export function nextStageFrom(check, stage, { stageSince = null, today = check.day } = {}) {
  if (stage === 1 && both(check.spread, 2) && both(check.toe, 2) && check.shortClean) return 2;
  if (stage === 2 && both(check.arch, 30) && check.openStance30) return 3;
  if (stage === 3 && both(check.heel, 15) && both(check.eyes, 20)) return 4;
  if (stage === 4 && both(check.heel, 20) && both(check.eyes, 30) && check.pogoClean
    && stageSince && daysBetween(stageSince, today) >= 28) return 5;
  return null;
}

/** Schwächere Seite: deutlicher Unterschied bei Fersenheben (3+) oder Einbeinstand (10+ s). */
export function weakerSide(check) {
  if (!check) return null;
  const h = check.heel;
  const e = check.eyes;
  if (h?.l != null && h?.r != null && Math.abs(h.l - h.r) >= 3) return h.l < h.r ? 'l' : 'r';
  if (e?.l != null && e?.r != null && Math.abs(e.l - e.r) >= 10) return e.l < e.r ? 'l' : 'r';
  return null;
}

export function addCheck(data, check) {
  const f = FT(data);
  const since = [...f.stageLog].reverse().find((s) => s.stage === f.stage)?.day || null;
  const suggest = nextStageFrom(check, f.stage, { stageSince: since, today: check.day });
  const entry = { ...check, suggested: suggest };
  return { data: { ...data, feet: { ...f, checks: [...f.checks, entry] } }, suggest, weaker: weakerSide(check) };
}

/** Stufe setzen (bestätigter Aufstieg oder Zurückschalten, jederzeit). */
export function setStage(data, stage, day) {
  const f = FT(data);
  const up = stage > f.stage;
  return { data: { ...data, feet: { ...f, stage, stageLog: [...f.stageLog, { day, stage }] } }, up };
}

/** Morgen hartes Sparring? Dann Stufe-4-Einheit ohne Sprünge. */
export const sparTomorrow = (data, today) => data.checkins?.[today]?.sparTomorrow === true || data.checkins?.[today]?.feetSpar === true;

/**
 * Die Einheit als Schrittfolge. Einbeinige Übungen: links und rechts als eigene Schritte,
 * die schwächere Seite bekommt einen Satz mehr. Fehlendes Equipment → Ersatz-Übung.
 * @param {(id:string)=>string|null} resolve Übung nach vorhandenem Equipment auflösen (null = weglassen)
 */
export function feetSequence(f, { resolve, noJumps = false, getDef }) {
  const stage = FEET_STAGES[f.stage] || FEET_STAGES[1];
  const weak = weakerSide(lastCheck(f));
  const seq = [];
  let swapped = false;
  for (const raw of stage.steps) {
    let st = raw;
    if (noJumps && getDef(raw.ex)?.jump) { st = { ...NO_JUMP_SWAP, rounds: raw.rounds }; swapped = true; }
    const id = resolve(st.ex);
    if (!id) continue; // optional ohne Equipment (z. B. Balance Pipes)
    const base = { exId: id, sec: st.sec || null, reps: st.reps || null, label: st.label || null };
    if (st.oneLeg) {
      for (const side of ['l', 'r']) {
        const extra = !st.noExtra && weak === side ? 1 : 0;
        for (let r = 1; r <= st.rounds + extra; r++) {
          seq.push({ ...base, side, round: r, of: st.rounds + extra, extra: extra && r === st.rounds + 1 });
        }
      }
    } else {
      for (let r = 1; r <= st.rounds; r++) seq.push({ ...base, round: r, of: st.rounds });
    }
  }
  return { seq, weak, swapped, name: stage.name, minutes: stage.minutes };
}

/** Einheiten pro Woche (Ziel 3–5, nur Anzeige). */
export function feetWeek(sessions, today) {
  const ws = weekStart(today);
  return sessions.filter((s) => s.kind === 'feet' && s.day >= ws && s.day <= today).length;
}

// ——— Barfuß-Zeit ———
export const BAREFOOT_START = 2500;
export const BAREFOOT_STEP = 500; // pro Woche vorsichtig mehr

/** Steigerungsvorschlag: Start 2.500 Schritte/Tag, je Woche seit dem ersten Eintrag +500. */
export function barefootTarget(f, today) {
  const days = Object.keys(f.steps).sort();
  if (!days.length) return BAREFOOT_START;
  const weeks = Math.max(0, Math.floor(daysBetween(days[0], today) / 7));
  return BAREFOOT_START + weeks * BAREFOOT_STEP;
}

/** Schnitt der letzten 7 Tage (nur Tage mit Eintrag). */
export function barefootAvg(f, today) {
  const v = Array.from({ length: 7 }, (_, i) => f.steps[addDays(today, -i)]).filter((x) => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** Debrief: „FEET: Stufe 2 → 3 · Fersenheben L 12 → 17 / R 14 → 18“. */
export function feetLine(f, from, to) {
  const log = f.stageLog.filter((s) => s.day <= to);
  const checks = f.checks.filter((c) => c.day <= to && c.heel);
  if (!log.length && !checks.length) return null;
  const before = [...log].filter((s) => s.day < from).at(-1)?.stage ?? log[0]?.stage ?? f.stage;
  const after = log.at(-1)?.stage ?? f.stage;
  const parts = [`Stufe ${before} → ${after}`];
  if (checks.length >= 2) {
    const a = checks[0].heel;
    const b = checks.at(-1).heel;
    parts.push(`Fersenheben L ${a.l} → ${b.l} / R ${a.r} → ${b.r}`);
  }
  return parts.join(' · ');
}
