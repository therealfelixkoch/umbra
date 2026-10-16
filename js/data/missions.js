// Missionen als Daten. Slots: { ex, sets, range?, gym?, gymSets?, only?: 'room'|'gym', optional? }
// gym: Übung(en) im Home Gym; bei mehreren wird zwischen ihnen abgewechselt.

export const MISSIONS = {
  A: {
    id: 'A', name: 'Nachtaufstieg', focus: 'Ziehen · Nacken · Tragen', minutes: 40, format: 'sets',
    slots: [
      { ex: 'jump_rope', sets: 1, gym: 'rower_warmup' },
      { ex: 'pullup_tactical', sets: 4 },
      { ex: 'bw_row', sets: 3, gym: 'barbell_row' },
      { ex: 'lat_pulldown', sets: 2, only: 'gym' },
      { ex: 'kb_row_ballistic', sets: 3, only: 'room' },
      { ex: 'suitcase_carry', sets: 3 },
      { ex: 'neck_ext_harness', sets: 2 },
      { ex: 'neck_flex_side', sets: 2 },
      { ex: 'ab_rollout', sets: 3 },
      { ex: 'goblet_curl', sets: 2, optional: true },
    ],
  },
  B: {
    id: 'B', name: 'Fundament', focus: 'Beine · Hüfte', minutes: 45, format: 'sets',
    slots: [
      { ex: 'warmup_general', sets: 1, gym: 'rower_warmup' },
      { ex: 'broad_jump', sets: 4 },
      { ex: 'bulgarian_split_squat', sets: 3, gym: ['back_squat', 'deadlift'], gymSets: 4 },
      { ex: 'kickstand_deadlift', sets: 3 },
      { ex: 'cossack_squat', sets: 2 },
      { ex: 'nordic_curl', sets: 3 },
      { ex: 'calf_raise_sl', sets: 2 },
      { ex: 'tibialis_raise', sets: 2 },
    ],
  },
  C: {
    id: 'C', name: 'Stoßkraft', focus: 'Drücken · Rumpf', minutes: 40, format: 'sets',
    slots: [
      { ex: 'bag_rounds', sets: 3, gym: 'rower_warmup', gymSets: 1 },
      { ex: 'dip', sets: 4 },
      { ex: 'pike_pushup_box', sets: 3 },
      { ex: 'kb_halo', sets: 2 },
      { ex: 'pushup_max', sets: 1 },
      { ex: 'band_pull_apart', sets: 2 },
      { ex: 'hanging_leg_raise', sets: 3 },
      { ex: 'lizard_crawl', sets: 2 },
    ],
  },
  D: {
    id: 'D', name: 'Infiltration', focus: 'Zirkel · Ganzkörper', minutes: 30, format: 'circuit',
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
    id: 'D_LIGHT', name: 'Infiltration (leicht)', focus: 'Zirkel · ruhiges Tempo', minutes: 20, format: 'circuit',
    rounds: [2, 2], restBetween: 120, base: 'D', light: true,
  },
  EXPRESS: {
    id: 'EXPRESS', name: 'Kurzeinsatz', focus: '15 Minuten · so viele Runden wie möglich', minutes: 15,
    format: 'amrap',
    items: [
      { ex: 'pullup', value: 5 },
      { ex: 'dip', value: 10 },
      { ex: 'kb_swing', value: 15 },
      { ex: 'suitcase_carry', value: 30 },
    ],
  },
  EXPRESS_BAG: {
    id: 'EXPRESS_BAG', name: 'Kurzeinsatz: Sack', focus: '5 × 2 min Sack, 1 min Pause', minutes: 15,
    format: 'intervals', kind: 'express', rounds: 5, work: 120, rest: 60, ex: 'bag_rounds',
  },
  FLOW: {
    id: 'FLOW', name: 'Fluss', focus: 'Mobility · 10 Minuten', minutes: 10, format: 'flow',
    work: 30, rounds: 2,
    base: ['prayer_squat', 'shoulder_dislocate', 'crab_reach', 'elephant_walk', 'vw_stretch',
      'roundhouse_stretch', 'hip_flexor_stretch', 'lateral_gorilla'],
    pool: ['atg_split_squat', 'resting_squat', 'horse_stance', 'cossack_flow', 'overhead_squat',
      'wrist_stretch', 'neck_stretch', 'ninety_ninety'],
  },
};

export const MISSION_KIND = (id) =>
  id === 'FLOW' ? 'flow' : id === 'EXPRESS' || id === 'EXPRESS_BAG' ? 'express' : 'mission';
