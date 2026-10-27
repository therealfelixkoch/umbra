// Missionen als Daten. Slots: { ex, sets, range?, gym?, gymSets?, only?: 'room'|'gym', optional?, main?, plyo?, variants?, arcOnly? }
// gym: Übung(en) im Home Gym; bei mehreren wird zwischen ihnen abgewechselt.
// main: Hauptübung (Kompakt-Modus, Top-Satz in Arc II, Stagnation).
// plyo: Sprungplatz, die Übung kommt aus der Plyo-Stufe des Arcs.
// variants: Varianten für den Arc-Wechsel (nur Plätze mit sinnvoller Alternative).
// arcOnly: Platz erscheint nur in diesem Arc (z. B. belastete Mobility in Arc IV).
// prehab: Ellbogen-Prehab (unter 3 Minuten, nicht im Kompakt-Modus).

export const MISSIONS = {
  A: {
    id: 'A', name: 'ASCENT', focus: 'Ziehen · Nacken · Tragen', minutes: 40, format: 'sets',
    slots: [
      { ex: 'jump_rope', sets: 1, gym: 'rower_warmup' },
      { ex: 'pullup_tactical', sets: 4, main: true, variants: ['pullup_tactical', 'pullup_neutral'] },
      { ex: 'bw_row', sets: 3, gym: 'barbell_row', variants: ['bw_row', 'bw_row_table'] },
      { ex: 'lat_pulldown', sets: 2, only: 'gym' },
      { ex: 'kb_row_ballistic', sets: 3, only: 'room', main: true },
      { ex: 'suitcase_carry', sets: 3, main: true, variants: ['suitcase_carry', 'farmers_walk'] },
      { ex: 'neck_ext_harness', sets: 2 },
      { ex: 'neck_flex_side', sets: 2 },
      { ex: 'ab_rollout', sets: 3 },
      { ex: 'hammer_curl_kb', sets: 2, optional: true, gym: 'db_hammer_curl' }, // Arm-Finisher Bizeps (neutraler Griff, ellbogenfreundlich)
      { ex: 'forearm_rotation', sets: 1, prehab: true },
      { ex: 'wrist_ext_eccentric', sets: 1, prehab: true },
      { ex: 'dead_hang', sets: 1, prehab: true },
      { ex: 'kb_windmill', sets: 2, arcOnly: 'IV' },
    ],
  },
  B: {
    id: 'B', name: 'BEDROCK', focus: 'Beine · Hüfte', minutes: 45, format: 'sets',
    slots: [
      { ex: 'warmup_general', sets: 1, gym: 'rower_warmup' },
      { ex: 'broad_jump', sets: 4, plyo: true },
      { ex: 'bulgarian_split_squat', sets: 3, gym: ['back_squat', 'deadlift'], gymSets: 4, main: true },
      { ex: 'kickstand_deadlift', sets: 3, main: true, variants: ['kickstand_deadlift', 'gladiator_deadlift'] },
      { ex: 'cossack_squat', sets: 2 },
      { ex: 'nordic_curl', sets: 3, main: true },
      { ex: 'calf_raise_sl', sets: 2 },
      { ex: 'tibialis_raise', sets: 2 },
      { ex: 'copenhagen_plank', sets: 2, arcOnly: 'IV' },
      { ex: 'long_lunge_hold', sets: 2, arcOnly: 'IV' },
    ],
  },
  C: {
    id: 'C', name: 'IMPACT', focus: 'Drücken · Rumpf', minutes: 40, format: 'sets',
    slots: [
      { ex: 'bag_rounds', sets: 3, gym: 'rower_warmup', gymSets: 1 },
      { ex: 'dip', sets: 4, main: true },
      { ex: 'pike_pushup_box', sets: 3, main: true },
      { ex: 'kb_halo', sets: 2 },
      { ex: 'pushup_max', sets: 1, variants: ['pushup_max', 'pseudo_planche_pushup'] },
      { ex: 'band_pull_apart', sets: 2 },
      { ex: 'hanging_leg_raise', sets: 3, main: true },
      { ex: 'lizard_crawl', sets: 2 },
      { ex: 'kb_overhead_triceps', sets: 2, optional: true, gym: 'cable_pushdown' }, // Arm-Finisher Trizeps
      { ex: 'forearm_rotation', sets: 1, prehab: true },
      { ex: 'wrist_ext_eccentric', sets: 1, prehab: true },
      { ex: 'dead_hang', sets: 1, prehab: true },
      { ex: 'seated_shoulder_ext', sets: 2, arcOnly: 'IV' },
    ],
  },
  D: {
    id: 'D', name: 'INFILTRATION', focus: 'Zirkel · Ganzkörper', minutes: 30, format: 'circuit',
    rounds: [3, 4], restBetween: 120,
    items: [
      { ex: 'kb_swing', value: 20 },
      { ex: 'bear_crawl', value: 3 },
      { ex: 'box_stepup', value: 8 },
      { ex: 'atlas_swing', value: 10 },
      { ex: 'squat_walk', value: 30 },
      { ex: 'pullup', value: 5 },
      { ex: 'bag_kicks_knees', value: 60, gym: 'rower_sprint' },
      { ex: 'hollow_body', value: 30 },
    ],
  },
  D_LIGHT: {
    id: 'D_LIGHT', name: 'INFILTRATION · leicht', focus: 'Zirkel · ruhiges Tempo', minutes: 20, format: 'circuit',
    rounds: [2, 2], restBetween: 120, base: 'D', light: true,
  },
  // Home-Gym-Tag: ersetzt die nächste Mission auf derselben Rotationsposition. Kontrastpaare immer.
  FORGE: {
    id: 'FORGE', name: 'FORGE', focus: 'Home Gym · Kraft und Power', minutes: 60, format: 'sets', contrast: true,
    slots: [
      { ex: 'forge_warmup', sets: 1 },
      { ex: 'deadlift', sets: 4, main: true, variants: ['deadlift', 'snatch_grip_deadlift'] },
      { ex: 'push_press', sets: 4, main: true, variants: ['push_press', 'bench_press'] },
      { ex: 'db_row_one_arm', sets: 3, main: true },
      { ex: 'step_up_explosive', sets: 3 },
      { ex: 'rower_4x4', sets: 1, arcOnly: 'III' },
    ],
  },
  // Unterwegs: Zirkel ohne Geräte nach dem Muster von INFILTRATION. Belegt wie FORGE den nächsten Rotationsplatz.
  HOTEL: {
    id: 'HOTEL', name: 'HOTEL', focus: 'Zirkel ohne Geräte · 20–30 min', minutes: 25, format: 'circuit',
    rounds: [3, 4], restBetween: 90,
    items: [
      { ex: 'broad_jump', value: 5 },
      { ex: 'bear_crawl', value: 3 },
      { ex: 'split_squat', value: 10 },
      { ex: 'pushup_deficit', value: 12 },
      { ex: 'squat_walk', value: 30 },
      { ex: 'towel_row', value: 10 },
      { ex: 'shadow_kicks', value: 60 },
      { ex: 'hollow_body', value: 30 },
    ],
  },
  // Arc III: ersetzt einmal pro Woche die Infiltration.
  // Benchmark-Workout des Saison-Wächters (Baseline Woche 1, Revanche Prüfwoche). Belegt einmal den Zirkel-Platz.
  BENCH: { id: 'BENCH', name: 'BENCHMARK', focus: 'Benchmark-Workout des Wächters', minutes: 30, format: 'benchmark' },
  // Lockere Ausdauer (Sommer Kapitel 2 einmal pro Woche, sonst frei wählbar). Zählt nicht für Rotation und Wochenziel.
  ZONE2: { id: 'ZONE2', name: 'ZONE 2', focus: '30 min locker, Nasenatmung', minutes: 30, format: 'intervals', rounds: 1, work: 1800, rest: 0, warmup: 0, cooldown: 0, ex: 'zone2', calm: true },
  NOR4X4: {
    id: 'NOR4X4', name: 'NORWEGIAN 4x4', focus: '3 min warm · 4 × 4 min hart, 3 min aktiv · 3 min aus', minutes: 31,
    format: 'intervals', rounds: 4, work: 240, rest: 180, warmup: 180, cooldown: 180, ex: 'norwegian_4x4', gymEx: 'rower_4x4',
    rpeLog: true,
  },
  // Handgelenk-Modul als eigene Einheit (Block wird beim Bauen gewählt) und HANDS
  WRIST: { id: 'WRIST', name: 'HANDGELENK', focus: 'Handgelenk-Block', minutes: 10, format: 'sets', slots: [] },
  HANDS: { id: 'HANDS', name: 'HANDS', focus: 'Hände und Handgelenke · 5 min', minutes: 5, format: 'flow', hands: true },
  FEET: { id: 'FEET', name: 'FEET', focus: 'Fußtraining barfuß · 5–8 min', minutes: 7, format: 'flow', feet: true },
  EXPRESS: {
    id: 'EXPRESS', name: 'SHADOWSTEP', focus: '15 Minuten · so viele Runden wie möglich', minutes: 15,
    format: 'amrap',
    items: [
      { ex: 'pullup', value: 5 },
      { ex: 'dip', value: 10 },
      { ex: 'kb_swing', value: 15 },
      { ex: 'suitcase_carry', value: 30 },
    ],
  },
  EXPRESS_BAG: {
    id: 'EXPRESS_BAG', name: 'SHADOWSTEP · Sack', focus: '5 × 2 min Sack, 1 min Pause', minutes: 15,
    format: 'intervals', kind: 'express', rounds: 5, work: 120, rest: 60, ex: 'bag_rounds',
  },
  FLOW: {
    id: 'FLOW', name: 'FLOW', focus: 'Mobility · 10 Minuten', minutes: 10, format: 'flow',
    work: 30, rounds: 2,
    base: ['prayer_squat', 'shoulder_dislocate', 'crab_reach', 'elephant_walk', 'vw_stretch',
      'roundhouse_stretch', 'hip_flexor_stretch', 'lateral_gorilla'],
    pool: ['atg_split_squat', 'resting_squat', 'horse_stance', 'cossack_flow', 'overhead_squat',
      'wrist_stretch', 'neck_stretch', 'ninety_ninety'],
    // nur als personalisierte Fokus-Stretches (Mobility-Check)
    focusPool: ['frog_stretch', 'pigeon', 'thread_needle', 'open_book', 'ankle_rock', 'neck_cars', 'pancake',
      'pike_fold', 'wall_slide'],
  },
};

export const MISSION_KIND = (id) =>
  id === 'FLOW' ? 'flow' : id === 'EXPRESS' || id === 'EXPRESS_BAG' ? 'express' : id === 'WRIST' ? 'wrist' : id === 'HANDS' ? 'hands' : id === 'FEET' ? 'feet' : id === 'ZONE2' ? 'zone2' : 'mission';

// Missionen, die als volle Mission zählen (Rotation, Arc-Woche, Pausen). FORGE und 4x4 belegen einen Rotationsplatz.
export const FULL_MISSIONS = ['A', 'B', 'C', 'D', 'FORGE', 'NOR4X4', 'HOTEL', 'BENCH'];

// Unterwegs: bevorzugter Ersatz mit gleichem Bewegungsmuster (vor den allgemeinen Alternativen).
export const TRAVEL_SWAP = {
  pullup: ['towel_row', 'bw_row_table'],
  pullup_tactical: ['towel_row', 'bw_row_table'],
  pullup_neutral: ['towel_row', 'bw_row_table'],
  chinup: ['towel_row', 'bw_row_table'],
  weighted_pullup: ['towel_row', 'bw_row_table'],
  bw_row: ['towel_row', 'bw_row_table'],
  dip: ['chair_dip', 'pushup_deficit'],
  bulgarian_split_squat: ['bw_bulgarian', 'split_squat'],
  kb_swing: ['broad_jump', 'sl_hip_thrust'],
  atlas_swing: ['broad_jump', 'sl_hip_thrust'],
  box_stepup: ['bw_bulgarian', 'split_squat'],
  bag_kicks_knees: ['shadow_kicks'],
  bag_rounds: ['shadow_boxing'],
  jump_rope: ['shadow_boxing'],
};
