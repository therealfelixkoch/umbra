// Double Progression, Zeit-Progression, Varianten-Stufen und Rückschritt.
// Eine Übung hat einen Zustand: { exId (aktuelle Variante), load (kg Zusatzlast), target, miss, lastChange }.

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
 * @param {object} ctx { settings, startValues, getDef }
 */
export function initialState(def, { settings, startValues = {}, getDef }) {
  const [lo, hi] = def.range || [1, 1];
  const ladder = ladderFor(def.load, settings);
  let load = def.load === 'belt' ? 0 : def.load ? snap(ladder, def.startKg ?? ladder[0]) : 0;
  const max = def.calibrate ? startValues[def.calibrate] : undefined;

  if (def.mode === 'amrap') {
    return { exId: def.id, load, target: max ? max : 0, miss: 0, lastChange: null };
  }
  if (max != null && def.mode === 'reps') {
    const est = Math.round(max * 0.6);
    if (est < lo && def.easier && getDef?.(def.easier)) {
      const easy = getDef(def.easier);
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
 * @param {object} ctx   { settings, equipment, getDef }
 */
export function progress(def, st, sets, ctx) {
  if (!sets.length || def.mode === 'fixed') return { ...st, lastChange: null };
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

  const allHi = values.every((v) => v >= hi);
  const allTarget = values.every((v) => v >= st.target);
  const missedLow = values.filter((v) => v < lo).length > values.length / 2;

  if (allHi) {
    if (loadable) {
      const up = stepLoad(ladder, load, +1);
      if (up > load) return { ...st, load: up, target: lo, miss: 0, lastChange: 'load_up' };
    }
    // Varianten wechseln nur beim Arc-Wechsel: hier nur vormerken.
    if (harder && harderAvailable(harder, ctx.equipment)) {
      return { ...st, load, target: hi, miss: 0, pendingVariant: harder.id, lastChange: 'variant_ready' };
    }
    return { ...st, load, target: hi, miss: 0, lastChange: 'top' };
  }

  if (missedLow) {
    const miss = (st.miss || 0) + 1;
    if (miss < 2) return { ...st, load, miss, lastChange: null };
    if (load > 0 && def.load) {
      const down = stepLoad(ladder, load, -1);
      return { ...st, load: down, target: Math.round((lo + hi) / 2), miss: 0, lastChange: 'load_down' };
    }
    if (easier) {
      return { ...st, load, target: lo, miss: 0, pendingVariant: easier.id, lastChange: 'variant_down_ready' };
    }
    return { ...st, load, target: lo, miss: 0, lastChange: 'reps_down' };
  }

  if (allTarget) {
    return { ...st, load, target: Math.min(st.target + step, hi), miss: 0,
      lastChange: def.mode === 'time' ? 'time_up' : 'reps_up' };
  }
  return { ...st, load, miss: 0, lastChange: null };
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
