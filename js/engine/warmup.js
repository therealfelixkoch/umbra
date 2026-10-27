// Aufwärmsätze (Ramping) vor schweren Grundübungen und freiwillige Supersets. Reine Funktionen.
// Aufwärmsätze zählen nicht als Sätze: kein Log, keine XP, keine Progression.

const RAMP_LOADS = ['barbell', 'dumbbell', 'belt', 'kb'];
const BAR = 20;
const round = (x, step) => Math.round(x / step) * step;

/** Bekommt diese Übung Aufwärmsätze? Schwere Grundübung mit Last, nicht explosiv. */
export const rampable = (def, it = {}) => !!def && def.rest === 'heavy' && RAMP_LOADS.includes(def.load) && !it.explosive && !it.wrist;

/**
 * Aufwärmsätze zur Arbeitslast.
 * Erste schwere Grundübung der Einheit: volle Rampe (ca. 40–50 % × 6–8, 70 % × 3, 85 % × 1).
 * Weitere schwere Übungen: nur ein Feeder-Satz (ca. 70 % × 3), der Körper ist schon warm.
 * @param {object} def Übung
 * @param {number} load Arbeitslast (kg; bei belt = Zusatzgewicht)
 * @param {{first?:boolean, kbWeights?:number[]}} o
 * @returns {{load:number|null, reps:number, label:string}[]}
 */
export function rampSets(def, load, { first = true, kbWeights = [] } = {}) {
  if (!def || !RAMP_LOADS.includes(def.load)) return [];
  const w = Number(load) || 0;
  if (def.load === 'belt') {
    if (!w) return first ? [{ load: 0, reps: 5, label: 'Körpergewicht' }] : [];
    return first ? [{ load: 0, reps: 5, label: 'Körpergewicht' }, { load: round(w * 0.5, 2.5), reps: 3, label: '+50 %' }]
      : [{ load: 0, reps: 3, label: 'Körpergewicht' }];
  }
  if (def.load === 'kb') {
    const lighter = [...kbWeights].filter((k) => k < w).sort((a, b) => b - a);
    if (!lighter.length) return [];
    return first && lighter[1] ? [{ load: lighter[1], reps: 8, label: 'leicht' }, { load: lighter[0], reps: 3, label: 'mittel' }]
      : [{ load: lighter[0], reps: 3, label: 'Feeder' }];
  }
  const step = def.load === 'barbell' ? 2.5 : 2;
  const min = def.load === 'barbell' ? BAR : 2;
  const plan = first ? [[0.45, 8], [0.7, 3], [0.85, 1]] : [[0.7, 3]];
  const out = [];
  if (first && def.load === 'barbell' && w >= 50) out.push({ load: BAR, reps: 10, label: 'Leere Stange' });
  for (const [pct, reps] of plan) {
    const l = Math.max(min, round(w * pct, step));
    if (l >= w || out.some((s) => s.load === l)) continue;
    out.push({ load: l, reps, label: `${Math.round(pct * 100)} %` });
  }
  return out;
}

/** Index der ersten schweren Grundübung einer Einheit (bekommt die volle Rampe). */
export function firstRampIndex(items, getDef) {
  return items.findIndex((it) => rampable(getDef(it.exId), it));
}

// ——— Supersets ———
// Paare, die sich nicht gegenseitig ermüden (Gegenspieler oder andere Region). Freiwillig, nur Vorschlag.
export const SUPERSET_PAIRS = [
  ['push_press', 'db_row_one_arm', 'Drücken ↔ Ziehen'],
  ['bench_press', 'db_row_one_arm', 'Drücken ↔ Ziehen'],
  ['pike_pushup_box', 'band_pull_apart', 'Drücken ↔ hintere Schulter'],
  ['pushup_max', 'band_pull_apart', 'Drücken ↔ hintere Schulter'],
  ['pseudo_planche_pushup', 'band_pull_apart', 'Drücken ↔ hintere Schulter'],
  ['calf_raise_sl', 'tibialis_raise', 'Wade ↔ Schienbein'],
  ['neck_ext_harness', 'neck_flex_side', 'Nacken hinten ↔ vorne/seitlich'],
  ['ab_rollout', 'hammer_curl_kb', 'Rumpf ↔ Arme'],
  ['ab_rollout', 'db_hammer_curl', 'Rumpf ↔ Arme'],
  ['hanging_leg_raise', 'kb_overhead_triceps', 'Rumpf ↔ Arme'],
  ['kb_halo', 'hanging_leg_raise', 'Schulter ↔ Rumpf'],
];
export const SUPERSET_REST = 20; // Wechsel zwischen den beiden Übungen

/**
 * Supersets, die in dieser Einheit möglich sind: beide Übungen vorhanden, beide mit Sätzen, keine Handgelenk-/Explosiv-Übung.
 * @returns {{a:number, b:number, why:string}[]} Indizes in plan.items
 */
export function supersetOptions(items) {
  const idx = (id) => items.findIndex((it) => it.exId === id && !it.wrist && !it.explosive);
  const used = new Set();
  const out = [];
  for (const [x, y, why] of SUPERSET_PAIRS) {
    const a = idx(x);
    const b = idx(y);
    if (a < 0 || b < 0 || used.has(a) || used.has(b)) continue;
    used.add(a);
    used.add(b);
    out.push({ a: Math.min(a, b), b: Math.max(a, b), why });
  }
  return out;
}

/**
 * Nach einem erledigten Satz im Superset: wohin als Nächstes, und wie lange Pause?
 * Erst Übung A Satz k, kurzer Wechsel, Übung B Satz k, dann die normale Pause und zurück zu A.
 * @returns {{index:number, rest:'switch'|'full'|null}}
 */
export function supersetNext(log, pair, cur) {
  const other = cur === pair.a ? pair.b : pair.a;
  const open = (i) => log[i].sets.some((s) => !s.done);
  if (cur === pair.a) return open(other) ? { index: other, rest: 'switch' } : { index: open(cur) ? cur : other, rest: open(cur) ? 'full' : null };
  return open(pair.a) ? { index: pair.a, rest: 'full' } : { index: cur, rest: open(cur) ? 'full' : null };
}
