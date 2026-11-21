// BANG COMBAT (Interview 19.11.2026): 3× Ganzkörper A / B / C in fester Reihenfolge, Übungen je Saison und Kapitel.
// A: Kniebeuge + Drücken · B: Hüfte + Ziehen · C: Einbeinig + Athletik.
// Drücken und Rudern sind kreuzweise CMPND-Partner (A: Dip + Rudern, B: Tactical Pull-up + Drücken),
// C: Chin-up + Drück-Partner, der Bein-Partner des Kapitels steht in Rumpf & Zusätze.
// Prehab verteilt: A Nacken vorne/seitlich, Band Pull-apart, Tibialis · B Nordic, Suitcase Carry, Nacken hinten ·
// C Waden, eine belastete Mobility, Finisher.
// Slot: { b: Block, ex: Übung im Home Gym, room?: Übung im Fighting Cave, sets, range?, role?: 'anchor'|'partner',
//         note?, optional?, arms?, contrast?: explosiver Partner nach dem Top-Satz, top?/bd?/bdRange?: Abweichung vom Kapitel }
// Aufwärmen und der freie Mobility-Block kommen beim Bauen dazu (Home Gym: Rudern, Fighting Cave: Seil).
// Das alte Programm (Push/Pull/Legs/Full Body, v43/v44) liegt nicht mehr hier; alte Einheiten im Log behalten ihre Mission.

export const BLOCKS = {
  warmup: { name: 'Aufwärmen', color: 'var(--blk-warmup)' },
  power: { name: 'Power', color: 'var(--blk-power)' },
  main: { name: 'Hauptübung', color: 'var(--blk-main)' },
  cmpnd: { name: 'CMPND Block', color: 'var(--blk-cmpnd)' },
  core: { name: 'Rumpf & Zusätze', color: 'var(--blk-core)' },
  mobility: { name: 'Mobility', color: 'var(--blk-mobility)' },
  finisher: { name: 'Finisher', color: 'var(--blk-finisher)' },
};
export const BLOCK_ORDER = ['warmup', 'power', 'main', 'cmpnd', 'core', 'mobility', 'finisher'];

// Regler je Kapitel: Top-Satz-Bereich, Zahl und Bereich der Backdowns, RIR des Top-Satzes.
// tempo: Hauptübung 3 s ablassen · noZero: letzter Satz RIR 1 statt 0 · mobilityEach: belastete Mobility in jeder Einheit
export const CHAPTER_SETUP = {
  WINTER: [
    { name: 'Fundament', top: [6, 8], bd: 2, bdRange: [8, 10], topRir: 1 },
    { name: 'Kraft', top: [3, 5], bd: 2, bdRange: [5, 7], topRir: 1 },
  ],
  SPRING: [
    { name: 'Kontrast', top: [3, 5], bd: 1, bdRange: [5, 7], topRir: 1, contrast: true },
    { name: 'Motor', top: [3, 5], bd: 2, bdRange: [4, 6], topRir: 1, optional4x4: true },
  ],
  SUMMER: [
    { name: 'Athletik', top: [4, 6], bd: 1, bdRange: [6, 8], topRir: 1 },
    { name: 'Motor', top: [3, 5], bd: 1, bdRange: [5, 7], topRir: 1, zone2: true },
  ],
  AUTUMN: [
    { name: 'Reset', top: [10, 12], bd: 1, bdRange: [10, 12], topRir: 2, tempo: true, noZero: true, mobilityEach: true },
    { name: 'Basis', top: [8, 10], bd: 2, bdRange: [10, 12], topRir: 1 },
  ],
};

export const BACKDOWN_PCT = 0.85; // Backdowns ca. −15 % vom Top-Satz

// Die drei Einheiten von BANG COMBAT (Missions-IDs) in ihrer Reihenfolge
export const PROGRAM_MISSIONS = ['BC_A', 'BC_B', 'BC_C'];
export const UNIT_LETTER = { BC_A: 'A', BC_B: 'B', BC_C: 'C' };

const pw = (ex, sets, reps, o = {}) => ({ b: 'power', ex, sets, range: [reps, reps], ...o });
const mn = (ex, room, o = {}) => ({ b: 'main', ex, ...(room ? { room } : {}), sets: 1, ...o });
const an = (ex, range) => ({ b: 'cmpnd', role: 'anchor', ex, sets: 3, range });
const pa = (ex, sets, range, o = {}) => ({ b: 'cmpnd', role: 'partner', ex, sets, range, ...o });
const co = (ex, sets, range, o = {}) => ({ b: 'core', ex, sets, range, ...o });
const arm = (ex, sets, range, o = {}) => ({ b: 'core', arms: true, optional: true, ex, sets, range, ...o });
const mo = (ex, sets, range, o = {}) => ({ b: 'mobility', ex, sets, range, ...o });
const fin = (ex, room) => ({ b: 'finisher', ex, ...(room ? { room } : {}), sets: 1 });

// Anker bleiben das ganze Jahr gleich (Maßstab für den Jahresvergleich). BSS ist in C die Hauptübung.
export const ANCHORS = { BC_A: 'dip', BC_B: 'pullup_tactical', BC_C: 'chinup' };
export const ANCHOR_IDS = ['dip', 'pullup_tactical', 'bulgarian_split_squat', 'chinup'];
const DIP = an('dip', [6, 10]);
const PULL = an('pullup_tactical', [5, 8]);
const CHIN = an('chinup', [6, 10]);
// BSS als Hauptübung: mit Kettlebell/Kurzhantel nicht unter 5 Wiederholungen
const BSS = (o = {}) => mn('bulgarian_split_squat', null, o);
const BSS_HEAVY = { top: [5, 7], bdRange: [7, 9] };

// Prehab und Zusätze, die das ganze Jahr bleiben
const A_X = [co('band_pull_apart', 2, [20, 25]), co('neck_curl_plate', 2, [12, 15]), co('neck_lateral_plate', 2, [10, 15]),
  co('tibialis_raise', 2, [20, 25])];
const B_X = [co('nordic_curl', 3, [3, 6]), co('suitcase_carry', 2, [40, 60]), co('neck_ext_harness', 2, [15, 20])];
const C_X = [co('calf_raise_sl', 2, [15, 20])];

export const PROGRAM = {
  WINTER: [
    { // Kapitel 1 · Fundament
      BC_A: [pw('plyo_pushup_incline', 3, 4), mn('pause_squat', 'goblet_squat_pause'), DIP, pa('pendlay_row', 3, [6, 8], { room: 'kb_row_sa' }),
        co('pallof_press', 3, [10, 10]), arm('bw_skull_crusher', 2, [8, 15]), ...A_X],
      BC_B: [pw('ball_slam', 3, 5), mn('rdl_bb', 'sl_rdl'), PULL, pa('strict_press', 3, [8, 10], { room: 'kb_press_sa' }),
        co('fl_tuck_hold', 3, [10, 20]), arm('db_hammer_curl', 2, [10, 15], { room: 'hammer_curl_kb' }), ...B_X],
      BC_C: [pw('landing_drill', 3, 4, { note: 'Drop and Stick, danach 1–2 weiche Squat Jumps' }), BSS(), CHIN, pa('pike_pushup_box', 3, [8, 12]),
        co('cossack_squat', 2, [6, 8]), ...C_X, mo('deep_squat_hold_kb', 2, [45, 45]), fin('fin_circuit_kb')],
    },
    { // Kapitel 2 · Kraft
      BC_A: [pw('plyo_pushup', 3, 4), mn('back_squat', 'dkb_front_squat'), DIP, pa('pendlay_row', 3, [5, 8], { room: 'kb_row_ballistic' }),
        co('landmine_rotation', 3, [8, 8], { room: 'band_rotation' }), arm('sz_skull_crusher', 2, [10, 12], { room: 'kb_floor_skull_crusher' }), ...A_X],
      BC_B: [pw('kb_high_pull', 3, 5), mn('deadlift', 'dkb_deadlift'), PULL, pa('push_press', 3, [5, 8], { room: 'kb_push_press_sa' }),
        co('fl_tuck_raise', 3, [5, 8]), arm('pelican_curl', 2, [8, 12]), ...B_X],
      BC_C: [pw('broad_jump', 3, 4), BSS(BSS_HEAVY), CHIN, pa('ring_pushup', 3, [8, 12]),
        co('lateral_lunge_kb', 2, [8, 8]), ...C_X, mo('copenhagen_plank', 2, [20, 20]), fin('fin_emom_kb')],
    },
  ],
  SPRING: [
    { // Kapitel 1 · Kontrast
      BC_A: [pw('plyo_pushup', 3, 4), mn('back_squat', 'dkb_front_squat', { contrast: 'broad_jump' }), DIP, pa('pendlay_row', 3, [5, 8], { room: 'kb_row_ballistic' }),
        co('landmine_rotation', 3, [5, 5], { room: 'band_rotation', note: 'explosiv' }), arm('floor_skull_crusher', 2, [10, 12], { room: 'kb_floor_skull_crusher' }), ...A_X],
      BC_B: [pw('pullup_explosive', 3, 3), mn('deadlift', 'dkb_deadlift', { contrast: 'vertical_jump' }), PULL, pa('push_press', 3, [5, 8], { room: 'kb_push_press_sa' }),
        co('fl_adv_tuck_hold', 3, [8, 15]), arm('sz_curl', 2, [8, 12], { room: 'hammer_curl_kb' }), ...B_X],
      BC_C: [pw('lateral_bound', 3, 4), BSS({ ...BSS_HEAVY, contrast: 'split_squat_jump' }), CHIN, pa('ring_pushup_explosive', 3, [6, 8]),
        co('skater_squat', 2, [6, 8]), ...C_X, mo('couch_stretch', 2, [45, 45]), fin('fin_3030_row')],
    },
    { // Kapitel 2 · Motor
      BC_A: [pw('depth_pushup', 3, 3), mn('front_squat', 'goblet_squat_pause'), DIP, pa('meadows_row', 3, [6, 8], { room: 'kb_gorilla_row' }),
        co('band_punch_rotation', 3, [8, 8]), arm('cable_overhead_triceps', 2, [10, 15], { room: 'bw_skull_crusher' }), ...A_X],
      BC_B: [pw('ball_slam_sa', 3, 4), mn('hang_power_clean', 'kb_clean_sa', { top: [3, 3], bd: 2, bdRange: [3, 3] }), PULL,
        pa('landmine_press_sa', 3, [6, 8], { room: 'kb_push_press_sa' }),
        co('hanging_knee_raise_rot', 3, [8, 8]), arm('bayesian_curl', 2, [10, 15], { room: 'pelican_curl' }), ...B_X],
      BC_C: [pw('depth_jump_low', 3, 3), BSS({ top: [5, 7], bdRange: [6, 8] }), CHIN, pa('ring_pushup', 2, [8, 12]),
        co('split_squat_jump', 2, [4, 4]), ...C_X, mo('copenhagen_plank', 2, [20, 20]), fin('fin_2x4_row')],
    },
  ],
  SUMMER: [
    { // Kapitel 1 · Athletik
      BC_A: [pw('plyo_pushup_switch', 3, 4), mn('zercher_squat', 'dkb_front_squat'), DIP, pa('pendlay_row', 2, [6, 8], { room: 'kb_row_sa' }),
        co('kb_woodchop', 3, [8, 8]), arm('bw_skull_crusher', 2, [8, 15]), ...A_X],
      BC_B: [pw('pullup_explosive', 3, 3), mn('sumo_deadlift', 'dkb_sumo'), PULL, pa('bench_press', 2, [6, 8], { room: 'kb_floor_press' }),
        co('fl_tuck_raise', 3, [5, 8]), arm('db_hammer_curl', 2, [10, 15], { room: 'hammer_curl_kb' }), ...B_X],
      BC_C: [pw('sl_lateral_hop', 3, 4), BSS(BSS_HEAVY), CHIN, pa('ring_pushup', 2, [8, 12]),
        co('cossack_squat', 2, [6, 8]), ...C_X, mo('ninety_ninety_loaded', 2, [6, 6]), fin('fin_sprint_row')],
    },
    { // Kapitel 2 · Motor
      BC_A: [pw('ring_pushup_explosive', 3, 4), mn('box_squat', 'goblet_box_squat'), DIP, pa('pendlay_row', 2, [5, 8], { room: 'kb_row_ballistic' }),
        co('landmine_rotation', 3, [8, 8], { room: 'band_rotation' }), arm('sz_skull_crusher', 2, [10, 12], { room: 'kb_floor_skull_crusher' }), ...A_X],
      BC_B: [pw('ball_slam_sa', 3, 4), mn('sl_rdl_bb', 'sl_rdl'), PULL, pa('close_grip_bench', 2, [5, 8], { room: 'ring_pushup' }),
        co('fl_adv_tuck_hold', 3, [8, 15]), arm('pelican_curl', 2, [8, 12]), ...B_X],
      BC_C: [pw('skater_bound', 3, 4), BSS(BSS_HEAVY), CHIN, pa('pike_pushup_box', 2, [8, 12]),
        co('step_up_explosive', 2, [5, 5]), ...C_X, mo('deep_squat_hold_kb', 2, [45, 45]), fin('fin_2x4_row')],
    },
  ],
  AUTUMN: [
    { // Kapitel 1 · Reset (belastete Mobility in jeder Einheit)
      BC_A: [pw('plyo_pushup_incline', 2, 4), mn('box_squat', 'goblet_box_squat'), DIP, pa('meadows_row', 2, [10, 12], { room: 'kb_row_sa' }),
        co('pallof_press', 3, [10, 10]), arm('cable_overhead_triceps', 2, [12, 15], { room: 'bw_skull_crusher' }), ...A_X, mo('kb_arm_bar', 2, [30, 30])],
      BC_B: [pw('ball_slam', 2, 5, { note: 'leicht' }), mn('good_morning', 'kb_rdl'), PULL, pa('floor_press_bb', 2, [10, 12], { room: 'kb_floor_press' }),
        co('fl_tuck_hold', 3, [10, 20]), arm('bayesian_curl', 2, [12, 15], { room: 'pelican_curl' }), ...B_X, mo('dead_hang', 2, [30, 45])],
      BC_C: [pw('landing_drill', 2, 4), BSS(), CHIN, pa('ring_pushup', 2, [8, 12]),
        co('cossack_squat', 2, [6, 6], { note: 'langsam' }), ...C_X, mo('ninety_ninety_loaded', 2, [6, 6]), fin('fin_circuit_easy')],
    },
    { // Kapitel 2 · Basis
      BC_A: [pw('plyo_pushup', 3, 4), mn('front_squat', 'dkb_front_squat'), DIP, pa('pendlay_row', 3, [6, 8], { room: 'kb_row_sa' }),
        co('band_punch_rotation', 3, [8, 8]), arm('floor_skull_crusher', 2, [10, 12], { room: 'kb_floor_skull_crusher' }), ...A_X],
      BC_B: [pw('pullup_explosive', 3, 3), mn('rdl_bb', 'sl_rdl', { note: '3 s ablassen' }), PULL,
        pa('strict_press', 3, [8, 10], { room: 'kb_press_sa', note: '3 s ablassen' }),
        co('fl_tuck_raise', 3, [5, 8]), arm('db_hammer_curl', 2, [10, 15], { room: 'hammer_curl_kb' }), ...B_X],
      BC_C: [pw('squat_jump', 3, 4), BSS(), CHIN, pa('pike_pushup_box', 3, [8, 12]),
        co('lateral_lunge_kb', 2, [8, 8]), ...C_X, mo('jefferson_curl', 2, [8, 8]), fin('fin_circuit_easy')],
    },
  ],
};

/**
 * Programm für Saison-ID und Kapitel (0, 1; 'exam' = Kapitel 2 der Saison).
 * @returns {{setup:object, slots:object[], chapter:number}|null}
 */
export function programSlots(seasonId, chapter, missionId) {
  const ch = chapter === 'exam' ? 1 : chapter;
  const season = PROGRAM[seasonId];
  if (!season || !PROGRAM_MISSIONS.includes(missionId)) return null;
  return { setup: CHAPTER_SETUP[seasonId][ch], slots: season[ch][missionId], chapter: ch };
}

/** Alle Hauptübungen und der CMPND Block (Anker + Partner) des Jahres (für Fortschritts-Index, Fokus und Säulen).
 *  Drücken und Rudern sind in BANG COMBAT Partner, zählen aber weiter als Kraftübungen. */
export const PROGRAM_MAIN_IDS = [...new Set([...ANCHOR_IDS, ...Object.values(PROGRAM).flatMap((s) => s.flatMap((ch) =>
  Object.values(ch).flatMap((slots) => slots.filter((x) => x.b === 'main' || x.b === 'cmpnd').flatMap((x) => [x.ex, x.room].filter(Boolean)))))])];
