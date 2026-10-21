// Double Progression, Zeit-Progression, Varianten-Stufen und Rückschritt.
// Eine Übung hat einen Zustand: { exId (aktuelle Variante), load (kg Zusatzlast), target, miss, lastChange }.
import { rirOutcome } from './session.js';

export const TIME_STEP = 5;

// Verfügbare Laststufen für eine Lastart.
export function ladderFor(loadType, settings) {
  const kb = [...(settings.kbWeights || [])].sort((a, b) => a - b);
  switch (loadType) {
    case 'kb': return kb.length ? kb : [0];
    case 'belt': return [0, ...kb.filter((w) => w > 0)];
    case 'barbell': return Array.from({ length: 113 }, (_, i) => 20 + i * 2.5);
    case 'dumbbell': return Array.from({ length: 30 }, (_, i) => 2 + i * 2);
    case 'cable': return Array.from({ length: 40 }, (_, i) => 5 + i * 2.5);
    default: return [0];
  }
}

export function snap(ladder, kg) {
  return ladder.reduce((best, w) => (Math.abs(w - kg) < Math.abs(best - kg) ? w : best), ladder[0]);
}

export function stepLoad(ladder, kg, dir) {
  const cur = snap(ladder, kg);
  const i = ladder.indexOf(cur) + dir;
  return ladder[Math.max(0, Math.min(ladder.length - 1, i))];
}

// Darf die Übung Zusatzlast bekommen? (Gürtel-Übungen nur mit Dip-Gürtel und KB)
export function canLoad(def, equipment) {
  if (!def.load) return false;
  if (def.load === 'belt') return equipment.includes('belt') && equipment.includes('kb');
  return true;
}

/**
 * Startzustand einer Übung. Mit Startwerten (max. Wdh.) wird konservativ kalibriert.
 * @param {object} def Übungsdefinition
 * @param {object} ctx { settings, startValues, getDef, equipment (optional: Stufen ohne Equipment überspringen) }
 */
export function initialState(def, { settings, startValues = {}, getDef, equipment = null }) {
  const [lo, hi] = def.range || [1, 1];
  const ladder = ladderFor(def.load, settings);
  let load = def.load === 'belt' ? 0 : def.load ? snap(ladder, def.startKg ?? ladder[0]) : 0;
  const max = def.calibrate ? startValues[def.calibrate] : undefined;

  if (def.mode === 'amrap') {
    return { exId: def.id, load, target: max ? max : 0, miss: 0, lastChange: null };
  }
  if (max != null && def.mode === 'reps') {
    const est = Math.round(max * 0.6);
    // Leichtere Stufe der Leiter, Stufen ohne vorhandenes Equipment werden übersprungen
    let easy = def.easier && getDef?.(def.easier);
    while (easy && equipment && !(easy.equipment || []).every((e) => equipment.includes(e))) easy = easy.easier && getDef(easy.easier);
    if (est < lo && easy) {
      return { exId: easy.id, load: 0, target: easy.range[0], miss: 0, lastChange: null };
    }
    return { exId: def.id, load, target: Math.max(1, Math.min(hi, est)), miss: 0, lastChange: null };
  }
  return { exId: def.id, load, target: lo, miss: 0, lastChange: null };
}

/**
 * Nächster Zustand nach einer geloggten Einheit.
 * @param {object} def   Definition der aktuell ausgeführten Variante
 * @param {object} st    bisheriger Zustand
 * @param {{value:number, load:number}[]} sets erledigte Sätze
 * @param {object} ctx   { settings, equipment, getDef, rir (Ziel-RIR), fixed (Gewicht fix) }
 */
export function progress(def, st, sets, ctx) {
  if (!sets.length || def.mode === 'fixed') return { ...st, lastChange: null };
  // Echtes RIR: RIR 0 bei geplantem RIR ≥ 2 → nicht steigern; deutlich zu leicht → früher steigern.
  const feel = rirOutcome(sets, ctx.rir ?? null);
  // Leiter: oberes Spannenende in allen Sätzen mit RIR ≥ 2 (fehlendes RIR zählt mit)
  const [, hi] = def.range || [0, 0];
  const top = def.mode !== 'amrap' && sets.every((s) => s.value >= hi && (s.rir == null || s.rir >= 2));
  const topStreak = top ? (st.topStreak || 0) + 1 : 0;
  const next = { ...baseProgress(def, { ...st, topStreak }, sets, ctx, feel === 'easy'), topStreak };
  if (feel === 'grind' && raised(st, next)) {
    return { ...st, load: Math.max(...sets.map((s) => s.load || 0)), miss: 0, topStreak: 0, lastChange: 'held_rir' };
  }
  return feel === 'easy' && next.lastChange && next.lastChange !== 'top' ? { ...next, early: true } : next;
}

// Ziel, Last oder Variante gestiegen?
const raised = (st, n) => (n.load || 0) > (st.load || 0) || n.target > st.target || (n.extraSet && !st.extraSet) || (n.tempo && !st.tempo)
  || (n.suggest?.dir === 1 && n.lastChange === 'variant_ready');

function baseProgress(def, st, sets, ctx, easy = false) {
  const values = sets.map((s) => s.value);
  const best = Math.max(...values);

  if (def.mode === 'amrap') {
    return best >= st.target
      ? { ...st, target: best + 1, lastChange: 'reps_up' }
      : { ...st, lastChange: null };
  }

  const [lo, hi] = def.range;
  const step = def.mode === 'time' ? TIME_STEP : 1;
  // Lernen aus dem Log: die tatsächlich genutzte Last wird zur neuen Basis.
  const load = Math.max(...sets.map((s) => s.load || 0));
  const ladder = ladderFor(def.load, ctx.settings);
  const loadable = canLoad(def, ctx.equipment);
  const harder = def.harder && ctx.getDef(def.harder);
  const easier = def.easier && ctx.getDef(def.easier);

  const allTarget = values.every((v) => v >= st.target);
  // Zu leicht (RIR deutlich über Ziel) und Ziel geschafft: wie oberes Ende behandeln, ab der Bereichsmitte.
  const allHi = values.every((v) => v >= hi) || (easy && allTarget && st.target >= Math.floor((lo + hi) / 2));
  const missedLow = values.filter((v) => v < lo).length > values.length / 2;

  // Fixes Gewicht: nie mehr Last. Stattdessen der Reihe nach mehr Wdh. → +1 Satz → langsameres Tempo → schwerere Stufe.
  const fixed = !!ctx.fixed;
  if (allHi && fixed) {
    if (!st.extraSet) return { ...st, load, target: lo, miss: 0, extraSet: true, lastChange: 'set_up' };
    if (!st.tempo) return { ...st, load, target: lo, miss: 0, tempo: true, lastChange: 'tempo_up' };
    return ladderUp(st, { load, hi, harder, ctx });
  }
  if (missedLow && fixed && (st.tempo || st.extraSet)) {
    const miss = (st.miss || 0) + 1;
    if (miss < 2) return { ...st, load, miss, lastChange: null };
    // Erst das Tempo, dann den Zusatzsatz zurücknehmen
    return st.tempo ? { ...st, load, target: Math.round((lo + hi) / 2), miss: 0, tempo: false, lastChange: 'tempo_down' }
      : { ...st, load, target: Math.round((lo + hi) / 2), miss: 0, extraSet: false, lastChange: 'set_down' };
  }

  if (allHi) {
    if (loadable) {
      const up = stepLoad(ladder, load, +1);
      if (up > load) return { ...st, load: up, target: lo, miss: 0, lastChange: 'load_up' };
    }
    // Nächste Stufe nur vorschlagen (2× in Folge oben mit RIR ≥ 2); du wählst „Jetzt“ oder „Nächster Arc“.
    return ladderUp(st, { load, hi, harder, ctx });
  }

  if (missedLow) {
    const miss = (st.miss || 0) + 1;
    if (miss < 2) return { ...st, load, miss, lastChange: null };
    if (load > 0 && def.load && !fixed) {
      const down = stepLoad(ladder, load, -1);
      return { ...st, load: down, target: Math.round((lo + hi) / 2), miss: 0, lastChange: 'load_down' };
    }
    if (easier) {
      return { ...st, load, target: lo, miss: 0, suggest: { id: easier.id, dir: -1 }, lastChange: 'variant_down_ready' };
    }
    return { ...st, load, target: lo, miss: 0, lastChange: 'reps_down' };
  }

  if (allTarget) {
    return { ...st, load, target: Math.min(st.target + step * (easy ? 2 : 1), hi), miss: 0,
      lastChange: def.mode === 'time' ? 'time_up' : 'reps_up' };
  }
  return { ...st, load, miss: 0, lastChange: null };
}

function ladderUp(st, { load, hi, harder, ctx }) {
  if (harder && harderAvailable(harder, ctx.equipment) && (st.topStreak || 0) >= 2) {
    return { ...st, load, target: hi, miss: 0, suggest: { id: harder.id, dir: 1 }, lastChange: 'variant_ready' };
  }
  return { ...st, load, target: hi, miss: 0, lastChange: 'top' };
}

function harderAvailable(def, equipment) {
  return (def.equipment || []).every((e) => equipment.includes(e));
}

// Score für Bestleistungen: grob wie ein e1RM, inkl. Körpergewicht bei Bodyweight-Übungen.
export function setScore(def, set, bodyweight = 80) {
  const base = (def.bodyweight ? bodyweight : 0) + (set.load || 0);
  if (def.mode === 'time') return base > 0 ? base * set.value / 10 : set.value;
  if (base === 0) return set.value;
  return Math.round(base * (1 + set.value / 30) * 10) / 10;
}

/**
 * Stufenwechsel anwenden. „now“: Platz wechselt sofort auf die neue Stufe (beginnt am unteren Ende),
 * „arc“: wird für den nächsten Arc-Wechsel vorgemerkt. „dismiss“: Vorschlag verwerfen, Zähler neu.
 * @returns {{state:object, switchTo:string|null}} switchTo: neue Übung für den Platz (nur bei „now“)
 */
export function applyLadderChoice(st, choice) {
  const sug = st?.suggest;
  if (!sug) return { state: st, switchTo: null };
  const base = { ...st, suggest: undefined, topStreak: 0, miss: 0 };
  if (choice === 'now') return { state: { ...base, pendingVariant: undefined, extraSet: false, tempo: false }, switchTo: sug.id };
  if (choice === 'arc') return { state: { ...base, pendingVariant: sug.id }, switchTo: null };
  return { state: base, switchTo: null };
}
