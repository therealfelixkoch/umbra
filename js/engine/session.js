// Session-Auswertung und Timer-Logik. Reine Funktionen, alle Uhren laufen über Zeitstempel.

export const GAP_MIN = 30; // Lücken über 30 min zählen nicht zur Dauer
export const RIR_CHOICES = [0, 1, 2, 3, 4]; // 4 = „4+“

/**
 * Wie fühlten sich die Sätze im Vergleich zum Ziel-RIR an?
 * 'grind': ein Satz bei RIR 0, obwohl mindestens 2 geplant waren → nicht steigern.
 * 'easy':  jeder Satz mindestens 2 über dem Ziel → früher steigern.
 * @param {{rir?:number}[]} sets erledigte Sätze
 * @param {number|null} planned Ziel-RIR der Arc-Woche
 */
export function rirOutcome(sets, planned) {
  if (planned == null) return null;
  const rirs = sets.map((s) => s.rir).filter((r) => r != null);
  if (!rirs.length) return null;
  if (planned >= 2 && rirs.some((r) => r === 0)) return 'grind';
  if (rirs.length === sets.length && rirs.every((r) => r >= planned + 2)) return 'easy';
  return null;
}

/**
 * Aktive Dauer aus Aktivitäts-Zeitstempeln (Start, jeder Satz, Ende).
 * Lücken über GAP_MIN werden gemeldet; ohne `countGaps` zählen sie nicht mit.
 */
export function activeMinutes(marks, { countGaps = false, gapMin = GAP_MIN } = {}) {
  const ts = [...marks].filter(Number.isFinite).sort((a, b) => a - b);
  if (ts.length < 2) return { minutes: 0, gaps: [] };
  let ms = 0;
  const gaps = [];
  for (let i = 1; i < ts.length; i++) {
    const d = ts[i] - ts[i - 1];
    if (d > gapMin * 60000) {
      gaps.push({ from: ts[i - 1], to: ts[i], minutes: Math.round(d / 60000) });
      if (!countGaps) continue;
    }
    ms += d;
  }
  return { minutes: Math.round(ms / 60000), gaps };
}

/** Session-Intensität: RPE 1–10 der Übungen, gewichtet nach erledigten Sätzen, eine Nachkommastelle. */
export function sessionIntensity(exercises) {
  let w = 0;
  let sum = 0;
  for (const e of exercises || []) {
    if (e.rpe == null) continue;
    const n = (e.sets || []).filter((s) => s.done).length || 1;
    w += n;
    sum += e.rpe * n;
  }
  return w ? Math.round((sum / w) * 10) / 10 : null;
}

/** Intensität aus RPE 1–10 (Intervalle): Schnitt. */
export const intensityFromRpe = (rpes) => {
  const r = (rpes || []).filter((x) => x != null);
  return r.length ? Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 10) / 10 : null;
};

/** Belastung 1–5 aus v3 grob auf RPE: 1→2, 2→4, 3→6, 4→8, 5→10. */
export const effortToRpe = (e) => (e == null ? null : Math.max(1, Math.min(10, Math.round(e * 2))));

/** Trainingslast = Session-RPE × Minuten. Nur Anzeige, keine Regeln daran. */
export const trainingLoad = (intensity, minutes) => (intensity && minutes ? Math.round(intensity * minutes) : null);

/** Wochensumme der Trainingslast (Sessions mit `load`). */
export function weekLoad(sessions, ws, we) {
  return sessions.filter((s) => s.day >= ws && s.day <= we && s.load).reduce((n, s) => n + s.load, 0);
}

// ——— Intervall-Phasen ———
/**
 * Phasenfolge eines Intervall-Plans. 4x4: 3 min Aufwärmen → 4 × (4 hart · 3 aktiv) → 3 min Auslaufen
 * (nach dem letzten harten Intervall direkt ins Auslaufen).
 */
export function intervalPhases(p) {
  const out = [];
  if (p.warmup) out.push({ phase: 'warmup', sec: p.warmup, round: 0 });
  for (let r = 1; r <= p.rounds; r++) {
    out.push({ phase: 'work', sec: p.work, round: r });
    if (r < p.rounds) out.push({ phase: 'rest', sec: p.rest, round: r });
  }
  if (p.cooldown) out.push({ phase: 'cooldown', sec: p.cooldown, round: p.rounds });
  return out;
}

export const PHASE_LABEL = { warmup: 'Aufwärmen', work: 'Hart', rest: 'Aktive Pause', cooldown: 'Auslaufen', done: 'Fertig' };

/**
 * Wo steht der Intervall-Timer? Rein aus Startzeitpunkt und Jetzt, auch nach Hintergrund korrekt.
 * Pausen werden als `pausedMs` (bereits pausierte Zeit) und optional `pausedAt` berücksichtigt.
 */
export function phaseAt(phases, startAt, now, { pausedMs = 0, pausedAt = null } = {}) {
  const elapsed = ((pausedAt ?? now) - startAt - pausedMs) / 1000;
  let t = 0;
  for (let i = 0; i < phases.length; i++) {
    const end = t + phases[i].sec;
    if (elapsed < end) return { index: i, ...phases[i], left: end - elapsed, elapsed: elapsed - t, total: phases.length };
    t = end;
  }
  return { index: phases.length, phase: 'done', left: 0, round: phases.at(-1)?.round ?? 0, total: phases.length };
}

/** Wie viele Arbeitsintervalle sind vollständig vorbei? */
export function workDone(phases, idx) {
  return phases.slice(0, idx).filter((x) => x.phase === 'work').length;
}

// ——— Karten-Timer (Zeitübungen) ———
/** Stand eines Countdown-Timers auf eine Zielzeit. */
export function timerState(t, now) {
  if (!t) return null;
  const elapsed = Math.max(0, ((t.stoppedAt ?? now) - t.startAt) / 1000);
  return { elapsed, left: t.target - elapsed, over: elapsed >= t.target };
}

/** Rundenfolge für Runden-Übungen (z. B. Sack 3 × 2 min, 1 min Pause). */
export function roundPhases(rounds, work, rest) {
  const out = [];
  for (let r = 1; r <= rounds; r++) {
    out.push({ phase: 'work', sec: work, round: r });
    if (r < rounds) out.push({ phase: 'rest', sec: rest, round: r });
  }
  return out;
}

// ——— Satzpausen nach Schwere der Übung ———
export const REST_SEC = { heavy: 150, medium: 90, light: 60, explosive: 90, warmup: 30 };
export const REST_STEP = 15;

/**
 * Vorgeschlagene Pause nach einem Satz.
 * @param {object} def Übung (mit `rest`-Klasse)
 * @param {{topSet?:boolean, rir?:number|null, adjust?:number, rounds?:boolean}} o
 *   topSet/RIR 0 → +30 s; adjust = gemerkte manuelle Anpassung (± 15-s-Schritte) für diese Übung
 */
export function restFor(def, { topSet = false, rir = null, adjust = 0 } = {}) {
  let sec = def.mode === 'fixed' && def.unit === 'min' ? 60 : REST_SEC[def.rest] ?? REST_SEC.medium;
  if (topSet || rir === 0) sec += 30;
  return Math.max(REST_STEP, sec + (adjust || 0));
}

// ——— Vollbild-Timer in der Übung ———
export const SWITCH_SEC = 5;

/**
 * Phasen eines Übungs-Timers.
 * - Zeitübung: eine Arbeitsphase (darf überzogen werden, die echte Zeit wird geloggt)
 * - je Seite: Seite 1 → 5 s Seitenwechsel → Seite 2
 * - Runden (z. B. Sack 3 × 2 min): Arbeit → Pause → Arbeit …
 */
export function exercisePhases({ target, perSide = false, rounds = 0, rest = 60 }) {
  if (rounds > 0) {
    const out = [];
    for (let r = 1; r <= rounds; r++) {
      out.push({ phase: 'work', sec: target, round: r });
      if (r < rounds) out.push({ phase: 'rest', sec: rest, round: r });
    }
    return out;
  }
  if (perSide) return [{ phase: 'side1', sec: target }, { phase: 'switch', sec: SWITCH_SEC }, { phase: 'side2', sec: target }];
  return [{ phase: 'work', sec: target }];
}

/** Stand des Übungs-Timers. Die letzte Phase läuft über ihr Ende hinaus weiter (Überzeit). */
export function exerciseTimerAt(phases, startAt, now) {
  const t = Math.max(0, (now - startAt) / 1000);
  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const last = i === phases.length - 1;
    if (t < acc + p.sec || last) {
      const el = t - acc;
      return { index: i, ...p, elapsed: el, left: p.sec - el, over: el >= p.sec, last };
    }
    acc += p.sec;
  }
  return null;
}
