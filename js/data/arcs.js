// Arcs: 6-Wochen-Mesozyklen. Vier Arcs bilden einen Zyklus.
// plyo: Plyo-Stufe je Arc-Woche (Index 0 = Woche 1).

export const ARC_WEEKS = 6;
export const MIN_MISSIONS_PER_WEEK = 2;

export const ARCS = [
  { id: 'I', name: 'IRONROOT', focus: 'Muskel, Kraftausdauer, Sehnen',
    desc: 'Wiederholungsbereiche oben, sauberes Volumen, Sehnen stärken.', plyo: [1, 1, 2, 2, 2, 1] },
  { id: 'II', name: 'IGNITION', focus: 'Maximalkraft, Explosivität',
    desc: 'Kontrastpaare und Top-Satz mit Backdown bei den Hauptübungen.', plyo: [3, 4, 4, 4, 4, 2] },
  { id: 'III', name: 'ENDLESS NIGHT', focus: 'Aerobe Basis',
    desc: 'Einmal pro Woche ersetzt eine 4x4-Einheit die Infiltration.', plyo: [3, 3, 3, 3, 3, 2] },
  { id: 'IV', name: 'STILL WATER', focus: 'Mobilität, Regeneration',
    desc: 'Ein Satz weniger pro Übung, belastete Mobility rückt nach vorn.', plyo: [1, 1, 2, 2, 2, 1] },
];

export const arcOf = (n) => ARCS[((n % 4) + 4) % 4];

// RIR-Ziel je Arc-Woche
export const WEEK_PLAN = {
  1: { rir: 3, label: 'Einstieg, Gewichte finden' },
  2: { rir: 2, label: 'Aufbau' },
  3: { rir: 2, label: 'Aufbau' },
  4: { rir: 1, label: 'Zuspitzung', failLast: true },
  5: { rir: 1, label: 'Zuspitzung', failLast: true },
  6: { rir: 3, label: 'Deload und Re-Test', deload: true },
};

// Plyo-Stufen → Übung (bei Stufe 4 wechseln Broad und Box Jump pro Arc-Woche)
export const PLYO = {
  1: ['landing_drill'],
  2: ['pogo_jumps'],
  3: ['lateral_hops'],
  4: ['broad_jump', 'box_jump'],
  5: ['depth_jump_low'],
};
export const PLYO_NAMES = { 1: 'Landung', 2: 'extensiv', 3: 'reaktiv', 4: 'intensiv', 5: 'fortgeschritten' };

// Kontrastpaare: schwere Übung → explosiver Partner desselben Musters
export const CONTRAST = {
  bulgarian_split_squat: 'broad_jump',
  back_squat: 'box_jump',
  pullup_tactical: 'pullup_explosive',
  pullup_neutral: 'pullup_explosive',
  pullup_lsit: 'pullup_explosive',
  dip: 'plyo_pushup',
  kb_swing: 'bag_knee_series',
  deadlift: 'vertical_jump',
  snatch_grip_deadlift: 'vertical_jump',
};
