// Handgelenk-Modul (TFCC): Ampel, Stufen, Status-Check, Dosis-Regeln, Blöcke. Reine Funktionen.
// Grundlage: docs/tfcc-protokoll.md. Die App empfiehlt, du entscheidest. Keine Diagnosen.
import { addDays, daysBetween, weekStart } from './dates.js';
import { WRIST_BLOCKS, WRIST_DIRS, WRIST_DIRS_S1, FLAT_HAND, DIP_BARS, NEUTRAL_GRIP, ROW_GRIP } from '../data/wrist.js';

export const emptyWrist = () => ({
  on: false, side: null, stage: null, startStage: null, onSince: null, stageLog: [],
  checks: [], pain: [], levels: {}, greens: {}, redFrom: null, lastVariant: null,
  flags: {}, ended: null,
});
export const W = (data) => ({ ...emptyWrist(), ...(data?.wrist || {}), ...(jointsPaused(data) ? { on: false } : {}) });
/** Gelenk-Pause (Profil → Gelenke): Handgelenk-Modul und Ellbogen-Prehab ruhen, Daten bleiben erhalten. */
export const jointsPaused = (data) => data?.settings?.jointPause === true;

export const RED_DAYS = 3; // 2–3 Tage nur Aktivierung (leicht) und HANDS
export const STRENGTH_PER_WEEK = 3;
export const CHECK_EVERY = 7;
export const NO_PROGRESS_DAYS = 42; // 6 Wochen

// ——— Ampel ———
/**
 * Ampel einer Einheit. during = Schmerz während (0–10), next = „Handgelenk heute“ am Folgetag,
 * base = Wert am Morgen des Einheitstags (Ausgangsniveau, sonst 0).
 * Rot: während ≥ 5 oder Klicken mit Schmerz oder am nächsten Morgen deutlich schlechter (+3).
 * Gelb: während 3–4 oder am nächsten Tag leicht erhöht (+1 bis +2). Grün: während 0–2 und zurück auf Ausgangsniveau.
 * Ohne Folgetag-Wert: vorläufig (final = false), außer Rot steht schon fest.
 */
export function ampelOf({ during = 0, click = false }, next = null, base = 0) {
  if (during >= 5 || click) return { color: 'red', final: true };
  if (next != null) {
    const delta = next - (base || 0);
    if (delta >= 3) return { color: 'red', final: true };
    if (delta >= 1 || during >= 3) return { color: 'yellow', final: true };
    return { color: 'green', final: true };
  }
  return { color: during >= 3 ? 'yellow' : 'green', final: false };
}

const morning = (checkins, day) => checkins?.[day]?.wristToday ?? null;

/** Schmerz-Eintrag einer Einheit (während). Rot wird sofort wirksam, Grün/Gelb erst mit dem Folgetag. */
export function logWristPain(data, { day, during, click = false, source, exercises = [], now = Date.now() }) {
  const w = W(data);
  const entry = { id: `wp${now}`, day, during, click: !!click, source, exercises, base: morning(data.checkins, day) ?? 0 };
  const a = ampelOf(entry, null, entry.base);
  entry.color = a.color;
  entry.final = a.final;
  let next = { ...w, pain: [...w.pain, entry] };
  let events = [];
  if (a.final) ({ wrist: next, events } = applyAmpel(next, entry));
  return { data: { ...data, wrist: next }, entry, events };
}

/**
 * Folgen einer finalen Ampel:
 * Grün → jede Übung der Einheit zählt einen grünen Durchgang, nach 3 in Folge nächste Steigerungsstufe.
 * Gelb → halten (Serie neu). Rot → 2–3 Tage nur Aktivierung leicht + HANDS, die Übungen eine Stufe zurück.
 */
export function applyAmpel(w, entry, maxLevels = {}) {
  const greens = { ...w.greens };
  const levels = { ...w.levels };
  const events = [];
  for (const key of entry.exercises || []) {
    if (entry.color === 'green') {
      greens[key] = (greens[key] || 0) + 1;
      if (greens[key] >= 3) {
        const max = maxLevels[key] ?? Infinity;
        if ((levels[key] || 0) < max) { levels[key] = (levels[key] || 0) + 1; events.push({ type: 'level_up', key, level: levels[key] }); }
        greens[key] = 0;
      }
    } else {
      greens[key] = 0;
      if (entry.color === 'red' && (levels[key] || 0) > 0) { levels[key] -= 1; events.push({ type: 'level_down', key, level: levels[key] }); }
    }
  }
  const redFrom = entry.color === 'red' ? entry.day : w.redFrom;
  if (entry.color === 'red') events.push({ type: 'red', day: entry.day });
  return { wrist: { ...w, greens, levels, redFrom }, events };
}

/** Offene Einträge mit dem Folgetag-Wert abschließen (beim Check-in). */
export function resolvePain(data, maxLevels = {}) {
  let w = W(data);
  const events = [];
  const pain = w.pain.map((e) => {
    if (e.final) return e;
    const nx = morning(data.checkins, addDays(e.day, 1));
    if (nx == null) return e;
    const a = ampelOf(e, nx, e.base);
    return { ...e, next: nx, color: a.color, final: true, justResolved: true };
  });
  w = { ...w, pain };
  for (const e of pain.filter((x) => x.justResolved)) {
    const r = applyAmpel(w, e, maxLevels);
    w = r.wrist;
    events.push(...r.events);
  }
  w = { ...w, pain: w.pain.map(({ justResolved, ...e }) => e) };
  return { data: { ...data, wrist: w }, events };
}

/** Rot-Fenster: am roten Tag und 3 Tage danach nur Aktivierung (leicht) und HANDS. */
export const inRedWindow = (w, today) => !!w.redFrom && daysBetween(w.redFrom, today) >= 0 && daysBetween(w.redFrom, today) <= RED_DAYS;

/** Ampel je Tag der letzten n Tage (schlechteste des Tages; ohne Eintrag null). */
export function ampelDays(w, today, n = 14) {
  const rank = { green: 0, yellow: 1, red: 2 };
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(today, -(n - 1 - i));
    const es = w.pain.filter((e) => e.day === day);
    const color = es.length ? es.reduce((m, e) => (rank[e.color] > rank[m] ? e.color : m), 'green') : null;
    return { day, color };
  });
}

// ——— Status-Check und Stufen ———
/** Griffkraft-Verhältnis betroffen/gesund in % (Bestwert je Hand). Bei „beide“ kein Vergleich. */
export function gripPct(grip, side) {
  if (!grip || side === 'beide' || !side) return null;
  const best = (a) => (a?.length ? Math.max(...a.filter((x) => x > 0)) : null);
  const l = best(grip.l);
  const r = best(grip.r);
  if (!l || !r) return null;
  const inj = side === 'links' ? l : r;
  const ok = side === 'links' ? r : l;
  return Math.round((inj / ok) * 100);
}

/**
 * Stufe aus dem Status-Check (Protokoll Abschnitt 3).
 * rest = Ruheschmerz, Schwellung oder Instabilitätsgefühl → 1 · Test 2–4 > 3 → 2 · Griffkraft < 90 % oder Test 2–4 bei 3 → 3 ·
 * sonst 4. „bereit zum Ausschalten“: alle Tests 0–1 und Griffkraft ≥ 95 % (ohne Messung zählt nur der Schmerz).
 */
export function stageFromCheck({ rest = false, t2, t3, t4, t5, pct = null }) {
  const m = Math.max(t2, t3, t4);
  let stage;
  if (rest) stage = 1;
  else if (m > 3) stage = 2;
  else if ((pct != null && pct < 90) || m === 3) stage = 3;
  else stage = 4;
  const offReady = !rest && Math.max(t2, t3, t4, t5) <= 1 && (pct == null || pct >= 95);
  return { stage, offReady };
}

export const lastCheck = (w) => w.checks.at(-1) || null;
export const checkDue = (w, today) => w.on && (!lastCheck(w) || daysBetween(lastCheck(w).day, today) >= CHECK_EVERY);

/** Test 2 (Push-off) grün = flache Hand wieder erlaubt (zusammen mit Stufe 4). */
export const flatHandOk = (w) => (w.stage || 0) >= 4 && (lastCheck(w)?.t2 ?? 10) <= 2;

export function addCheck(data, check) {
  const w = W(data);
  const pct = gripPct(check.grip, w.side);
  const r = stageFromCheck({ ...check, pct });
  const entry = { ...check, pct, suggested: r.stage, offReady: r.offReady };
  return { data: { ...data, wrist: { ...w, checks: [...w.checks, entry] } }, ...r, pct };
}

/** Du bestätigst die Stufe. Aufstieg wird gemeldet. */
export function confirmStage(data, stage, day) {
  const w = W(data);
  const up = w.stage != null && stage > w.stage;
  const checks = w.checks.map((c, i) => (i === w.checks.length - 1 ? { ...c, confirmed: stage } : c));
  return { data: { ...data, wrist: { ...w, stage, startStage: w.startStage ?? stage, checks, stageLog: [...w.stageLog, { day, stage }] } }, up };
}

/** Ausschalt-Vorschlag: 3 Wochen in Folge bereit (je ein Check pro Woche) und keine roten Tage darin. */
export function offSuggested(w, today) {
  if (!w.on) return false;
  const byWeek = new Map();
  for (const c of w.checks) byWeek.set(weekStart(c.day), c);
  const weeks = [...byWeek.keys()].sort().slice(-3);
  if (weeks.length < 3) return false;
  for (let i = 1; i < 3; i++) if (daysBetween(weeks[i - 1], weeks[i]) !== 7) return false;
  if (!weeks.every((k) => byWeek.get(k).offReady)) return false;
  const from = weeks[0];
  if (w.pain.some((e) => e.color === 'red' && e.day >= from && e.day <= today)) return false;
  return !(w.flags.offDeclined && daysBetween(w.flags.offDeclined, today) < 7);
}

/** Kein-Fortschritt-Hinweis (einmal): 6 Wochen AN, keine Stufe aufgestiegen, Griffkraft nicht gestiegen. */
export function noProgress(w, today) {
  if (!w.on || !w.onSince || w.flags.noProgressShown || daysBetween(w.onSince, today) < NO_PROGRESS_DAYS) return false;
  if ((w.stage || 0) > (w.startStage || 0)) return false;
  const pcts = w.checks.map((c) => c.pct).filter((x) => x != null);
  return !(pcts.length >= 2 && pcts.at(-1) > pcts[0]);
}

/** Wochentrend: Morgenschmerz-Schnitt oder rote Tage steigen gegenüber der Vorwoche → eine Stufe zurück vorschlagen. */
export function trendDown(w, checkins, today) {
  if (!w.on || (w.stage || 0) <= 1) return false;
  const ws = weekStart(today);
  const prev = addDays(ws, -7);
  const avg = (from) => {
    const v = Array.from({ length: 7 }, (_, i) => checkins?.[addDays(from, i)]?.wristToday).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const reds = (from) => w.pain.filter((e) => e.color === 'red' && e.day >= from && e.day <= addDays(from, 6)).length;
  const a = avg(prev);
  const b = avg(ws);
  const worse = (a != null && b != null && b > a + 0.5) || reds(ws) > reds(prev);
  return worse && w.flags.trendWeek !== ws;
}

// ——— Dosis-Regeln ———
const strengthDays = (sessions) => sessions.filter((s) => s.wristBlock === 'strength').map((s) => s.day);

/**
 * Darf heute ein Kraftblock kommen? Höchstens 3 pro Woche, nie an zwei Tagen in Folge, nicht nach einem harten
 * ARENA-Abend, nicht im Rot-Fenster. Gibt den Grund mit, wenn nicht.
 */
export function strengthAllowed(data, today) {
  const w = W(data);
  const days = strengthDays(data.sessions || []);
  const ws = weekStart(today);
  const y = addDays(today, -1);
  if (inRedWindow(w, today)) return { ok: false, reason: 'Ampel war rot: ein paar Tage nur Aktivierung, leicht.' };
  if (days.includes(y)) return { ok: false, reason: 'Gestern war schon ein Handgelenk-Kraftblock. Heute nur Aktivierung.' };
  const hardArena = (data.sessions || []).some((s) => s.kind === 'arena' && s.day === y && (s.intensity === 'hard' || (s.rpe ?? 0) >= 7))
    || data.checkins?.[today]?.yesterdayMT === 'hard';
  if (hardArena) return { ok: false, reason: 'Gestern harter ARENA-Abend, das zählt als Handgelenk-Last. Heute nur Aktivierung.' };
  if (days.filter((d) => d >= ws && d <= today).length >= STRENGTH_PER_WEEK) return { ok: false, reason: 'Diese Woche schon 3 Kraftblöcke. Heute nur Aktivierung.' };
  return { ok: true };
}

/** Welcher Handgelenk-Block gehört in eine Mission? upper = ASCENT, IMPACT, FORGE. */
export function blockForMission(data, missionId, today) {
  const w = W(data);
  if (!w.on) return null;
  const upper = ['A', 'C', 'FORGE'].includes(missionId);
  const lower = ['B', 'D', 'D_LIGHT', 'HOTEL'].includes(missionId);
  if (!upper && !lower) return null;
  if (lower) return { kind: 'activation', reason: 'Handgelenk-Aktivierung im Aufwärmen.' };
  const s = strengthAllowed(data, today);
  return s.ok ? { kind: 'strength', reason: `Handgelenk-Kraftblock Stufe ${w.stage || 2} am Ende, ersetzt das Unterarm-Prehab.` }
    : { kind: 'activation', reason: s.reason };
}

// ——— Blöcke bauen ———
/** Variante des Kraftblocks (Stufe 3/4 wechseln A/B). */
export function strengthVariant(w) {
  const st = WRIST_BLOCKS.strength[w.stage || 2] || WRIST_BLOCKS.strength[2];
  if (!st.B) return 'A';
  return w.lastVariant === 'A' ? 'B' : 'A';
}

/**
 * Einträge eines Blocks. kind: strength | activation | minimal | maintenance.
 * Ergebnis: [{ key, sets, target, dirs?: string[], holdReps?, flat? }] (Übungen noch nicht nach Equipment aufgelöst).
 */
export function blockEntries(w, kind, today) {
  const light = inRedWindow(w, today);
  const stage = w.stage || 2;
  let list;
  if (kind === 'strength') list = (WRIST_BLOCKS.strength[stage] || WRIST_BLOCKS.strength[2])[strengthVariant(w)];
  else if (kind === 'activation') list = light || stage === 1 ? WRIST_BLOCKS.activation[1] : WRIST_BLOCKS.activation.default;
  else list = WRIST_BLOCKS[kind];
  return list
    .filter((e) => e.ex !== 'w_ulnar' || (w.levels.w_radial || 0) > 0 || (w.greens.w_radial || 0) > 0) // Ulnar erst, wenn Radial grün läuft
    .map((e) => {
      const dirs = e.dirs === 'S1' || light ? WRIST_DIRS_S1 : e.dirs === 'all' ? WRIST_DIRS : null;
      return { key: e.ex, sets: dirs ? dirs.length : e.sets || 1, target: e.target ?? null, dirs, holdReps: e.reps || null, flat: !!e.flat };
    });
}

/** Hinweise und Tausche im normalen Training (solange AN). */
export function wristAdjust(w, exId) {
  if (!w.on) return null;
  if (FLAT_HAND.includes(exId) && !flatHandOk(w)) return { note: 'Handgelenk-Protokoll: auf Fäusten, Griffen oder Parallettes, Handgelenk gerade.' };
  if (DIP_BARS.includes(exId)) return { note: 'Handgelenk-Protokoll: Handgelenk gerade über dem Griff, nicht abknicken.' };
  if (NEUTRAL_GRIP[exId]) return { swap: NEUTRAL_GRIP[exId], note: 'Handgelenk-Protokoll: neutraler Griff bevorzugt.' };
  if (ROW_GRIP.includes(exId)) return { note: 'Handgelenk-Protokoll: neutraler Griff bevorzugt.' };
  return null;
}

/** Zusammenfassung für Debrief: „Stufe 3 → 4 · Griffkraft 86 % → 94 %“. */
export function wristLine(w, from, to) {
  const log = w.stageLog.filter((s) => s.day <= to);
  if (!log.length) return null;
  const before = [...log].filter((s) => s.day < from).at(-1) || log[0];
  const after = log.at(-1);
  const pcts = w.checks.filter((c) => c.day <= to && c.pct != null);
  const parts = [`Stufe ${before.stage} → ${after.stage}`];
  if (pcts.length >= 2) parts.push(`Griffkraft ${pcts[0].pct} % → ${pcts.at(-1).pct} %`);
  return parts.join(' · ');
}
