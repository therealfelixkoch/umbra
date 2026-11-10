// UMBRA 2.0 (Interview 05.11.2026): jede Mission in Blöcken, Übungen je Saison und Kapitel.
// Missionen: C IMPACT (Push), A ASCENT (Pull), B BEDROCK (Legs), D INFILTRATION (Full Body).
// Slot: { b: Block, ex: Übung im Home Gym, room?: Übung im Fighting Cave, sets, range?, role?: 'anchor'|'partner',
//         note?, optional?, arms?, contrast?: explosiver Partner nach dem Top-Satz, top?/bd?/bdRange?: Abweichung vom Kapitel }
// Aufwärmen und der freie Mobility-Block kommen beim Bauen dazu (Home Gym: Rudern, Fighting Cave: Seil).

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
// tempo: Hauptübung 3 s ablassen · noZero: letzter Satz RIR 1 statt 0 · mobilityEach: belastete Mobility in jeder Mission
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

const pw = (ex, sets, reps, o = {}) => ({ b: 'power', ex, sets, range: [reps, reps], ...o });
const mn = (ex, room, o = {}) => ({ b: 'main', ex, room, sets: 1, ...o });
const an = (ex, range) => ({ b: 'cmpnd', role: 'anchor', ex, sets: 3, range });
const pa = (ex, sets, range, o = {}) => ({ b: 'cmpnd', role: 'partner', ex, sets, range, ...o });
const co = (ex, sets, range, o = {}) => ({ b: 'core', ex, sets, range, ...o });
const arm = (ex, sets, range, o = {}) => ({ b: 'core', arms: true, ex, sets, range, ...o });
const opt = (ex, room) => ({ b: 'core', arms: true, optional: true, ex, room, sets: 2, range: [10, 15] });
const mo = (ex, sets, range, o = {}) => ({ b: 'mobility', ex, sets, range, ...o });
const fin = (ex, room) => ({ b: 'finisher', ex, room, sets: 1 });

// Anker bleiben das ganze Jahr gleich (Maßstab für jede Prüfwoche)
export const ANCHORS = { C: 'dip', A: 'pullup_tactical', B: 'bulgarian_split_squat', D: 'chinup' };
const DIP = an('dip', [6, 10]);
const PULL = an('pullup_tactical', [5, 8]);
const BSS = an('bulgarian_split_squat', [8, 10]);
const CHIN = an('chinup', [6, 10]);

// Zusätze, die das ganze Jahr bleiben
const PUSH_X = [co('band_pull_apart', 2, [20, 25]), co('neck_curl_plate', 2, [12, 15]), co('neck_lateral_plate', 2, [10, 15])];
const PULL_X = [co('suitcase_carry', 2, [40, 60]), co('neck_ext_harness', 2, [15, 20])];
const LEG_X = [co('nordic_curl', 3, [3, 6]), co('calf_raise_sl', 2, [15, 20]), co('tibialis_raise', 2, [20, 25])];

export const PROGRAM = {
  WINTER: [
    { // Kapitel 1 · Fundament
      C: [pw('plyo_pushup_incline', 3, 4), mn('strict_press', 'kb_press_sa'), DIP, pa('pushup_deficit', 3, [10, 15]),
        co('pallof_press', 3, [10, 10]), arm('bw_skull_crusher', 2, [8, 15]), ...PUSH_X],
      A: [pw('ball_slam', 3, 5), mn('barbell_row', 'kb_row_sa'), PULL, pa('ring_row', 3, [10, 15], { note: '3 s ablassen' }),
        co('fl_tuck_hold', 3, [10, 20]), arm('db_hammer_curl', 2, [10, 15], { room: 'hammer_curl_kb' }), ...PULL_X],
      B: [pw('landing_drill', 3, 4, { note: 'Drop and Stick, danach 1–2 weiche Squat Jumps' }), mn('pause_squat', 'goblet_squat_pause'), BSS,
        pa('cossack_squat', 2, [6, 8]), ...LEG_X],
      D: [pw('side_slam', 3, 4), mn('rdl_bb', 'sl_rdl'), CHIN, pa('pike_pushup_box', 3, [8, 12]),
        mo('deep_squat_hold_kb', 2, [45, 45]), mo('jefferson_curl', 2, [8, 8]), fin('fin_circuit_kb'),
        opt('sz_curl', 'hammer_curl_kb'), opt('cable_overhead_triceps', 'bw_skull_crusher')],
    },
    { // Kapitel 2 · Kraft
      C: [pw('plyo_pushup', 3, 4), mn('push_press', 'kb_push_press_sa'), DIP, pa('archer_pushup', 2, [6, 10]),
        co('landmine_rotation', 3, [8, 8], { room: 'band_rotation' }), arm('sz_skull_crusher', 2, [10, 12], { room: 'kb_floor_skull_crusher' }), ...PUSH_X],
      A: [pw('kb_high_pull', 3, 5), mn('pendlay_row', 'kb_row_ballistic'), PULL, pa('ring_row_elevated', 2, [8, 12]),
        co('fl_tuck_raise', 3, [5, 8]), arm('pelican_curl', 2, [8, 12]), ...PULL_X],
      B: [pw('broad_jump', 3, 4), mn('back_squat', 'dkb_front_squat'), BSS, pa('lateral_lunge_kb', 2, [8, 8]), ...LEG_X],
      D: [pw('rot_slam_stance', 3, 4), mn('deadlift', 'dkb_deadlift'), CHIN, pa('ring_pushup', 2, [8, 12]),
        mo('copenhagen_plank', 2, [20, 20]), mo('ninety_ninety_loaded', 2, [6, 6]), fin('fin_emom_kb'),
        opt('bayesian_curl', 'pelican_curl'), opt('bw_triceps_press_bar')],
    },
  ],
  SPRING: [
    { // Kapitel 1 · Kontrast
      C: [pw('plyo_pushup', 3, 4), mn('push_press', 'kb_push_press_sa', { contrast: 'ball_slam' }), DIP, pa('ring_pushup_explosive', 3, [6, 8]),
        co('landmine_rotation', 3, [5, 5], { room: 'band_rotation', note: 'explosiv' }), arm('floor_skull_crusher', 2, [10, 12], { room: 'kb_floor_skull_crusher' }), ...PUSH_X],
      A: [pw('pullup_explosive', 3, 3), mn('pendlay_row', 'kb_row_ballistic', { contrast: 'ball_slam' }), PULL, pa('ring_row_explosive', 3, [8, 8]),
        co('fl_adv_tuck_hold', 3, [8, 15]), arm('sz_curl', 2, [8, 12], { room: 'hammer_curl_kb' }), ...PULL_X],
      B: [pw('lateral_bound', 3, 4), mn('back_squat', 'dkb_front_squat', { contrast: 'broad_jump' }), BSS, pa('skater_squat', 2, [6, 8]), ...LEG_X],
      D: [pw('kb_swing', 3, 5, { note: 'schwer und explosiv' }), mn('deadlift', 'dkb_deadlift', { contrast: 'vertical_jump' }), CHIN, pa('pike_pushup_box', 3, [8, 12]),
        mo('cossack_squat', 2, [5, 5]), mo('couch_stretch', 2, [45, 45]), fin('fin_3030_row'),
        opt('db_hammer_curl', 'hammer_curl_kb'), opt('bw_skull_crusher')],
    },
    { // Kapitel 2 · Motor
      C: [pw('depth_pushup', 3, 3), mn('landmine_press_sa', 'kb_push_press_sa'), DIP, pa('pike_pushup_high', 2, [6, 10]),
        co('band_punch_rotation', 3, [8, 8]), arm('cable_overhead_triceps', 2, [10, 15], { room: 'bw_skull_crusher' }), ...PUSH_X],
      A: [pw('ball_slam_sa', 3, 4), mn('meadows_row', 'kb_gorilla_row'), PULL, pa('archer_ring_row', 2, [6, 8]),
        co('hanging_knee_raise_rot', 3, [8, 8]), arm('bayesian_curl', 2, [10, 15], { room: 'pelican_curl' }), ...PULL_X],
      B: [pw('depth_jump_low', 3, 3), mn('front_squat', 'goblet_squat_pause', { contrast: 'vertical_jump' }), BSS, pa('split_squat_jump', 2, [4, 4]), ...LEG_X],
      D: [pw('rot_slam_stance', 3, 4), mn('hang_power_clean', 'kb_clean_sa', { top: [3, 3], bd: 2, bdRange: [3, 3], noContrast: true }), CHIN, pa('ring_pushup', 2, [8, 12]),
        mo('copenhagen_plank', 2, [20, 20]), mo('jefferson_curl', 2, [8, 8]), fin('fin_2x4_row'),
        opt('pelican_curl'), opt('bw_triceps_press_bar')],
    },
  ],
  SUMMER: [
    { // Kapitel 1 · Athletik
      C: [pw('plyo_pushup_switch', 3, 4), mn('bench_press', 'kb_floor_press'), DIP, pa('pike_pushup_box', 2, [8, 12]),
        co('kb_woodchop', 3, [8, 8]), arm('bw_skull_crusher', 2, [8, 15]), ...PUSH_X],
      A: [pw('pullup_explosive', 3, 3), mn('yates_row', 'kb_row_sa'), PULL, pa('ring_row_elevated', 2, [8, 12]),
        co('fl_tuck_raise', 3, [5, 8]), arm('db_hammer_curl', 2, [10, 15], { room: 'hammer_curl_kb' }), ...PULL_X],
      B: [pw('sl_lateral_hop', 3, 4), mn('zercher_squat', 'dkb_front_squat'), BSS, pa('cossack_squat', 2, [6, 8]), ...LEG_X],
      D: [pw('rot_slam_stance', 3, 4), mn('sumo_deadlift', 'dkb_sumo'), CHIN, pa('ring_pushup', 2, [8, 12]),
        mo('copenhagen_plank', 2, [20, 20]), mo('ninety_ninety_loaded', 2, [6, 6]), fin('fin_sprint_row'),
        opt('sz_curl', 'hammer_curl_kb'), opt('cable_overhead_triceps', 'bw_skull_crusher')],
    },
    { // Kapitel 2 · Motor
      C: [pw('ring_pushup_explosive', 3, 4), mn('close_grip_bench', 'ring_pushup'), DIP, pa('pushup_deficit', 2, [10, 15]),
        co('landmine_rotation', 3, [8, 8], { room: 'band_rotation' }), arm('sz_skull_crusher', 2, [10, 12], { room: 'kb_floor_skull_crusher' }), ...PUSH_X],
      A: [pw('ball_slam_sa', 3, 4), mn('pendlay_row', 'kb_row_ballistic'), PULL, pa('ring_row', 2, [10, 15], { note: '3 s ablassen' }),
        co('fl_adv_tuck_hold', 3, [8, 15]), arm('pelican_curl', 2, [8, 12]), ...PULL_X],
      B: [pw('skater_bound', 3, 4), mn('box_squat', 'goblet_box_squat'), BSS, pa('step_up_explosive', 2, [5, 5]), ...LEG_X],
      D: [pw('kb_swing', 3, 5, { note: 'schwer und explosiv' }), mn('sl_rdl_bb', 'sl_rdl'), CHIN, pa('pike_pushup_box', 2, [8, 12]),
        mo('deep_squat_hold_kb', 2, [45, 45]), mo('jefferson_curl', 2, [8, 8]), fin('fin_2x4_row'),
        opt('bayesian_curl', 'pelican_curl'), opt('bw_triceps_press_bar')],
    },
  ],
  AUTUMN: [
    { // Kapitel 1 · Reset
      C: [pw('plyo_pushup_incline', 2, 4), mn('floor_press_bb', 'kb_floor_press'), DIP, pa('pushup', 2, [10, 15], { note: '3 s ablassen' }),
        co('pallof_press', 3, [10, 10]), arm('cable_overhead_triceps', 2, [12, 15], { room: 'bw_skull_crusher' }), mo('kb_arm_bar', 2, [30, 30]), ...PUSH_X],
      A: [pw('ball_slam', 2, 5, { note: 'leicht' }), mn('meadows_row', 'kb_row_sa'), PULL, pa('ring_row', 2, [10, 15], { note: '3 s ablassen' }),
        co('fl_tuck_hold', 3, [10, 20]), arm('bayesian_curl', 2, [12, 15], { room: 'pelican_curl' }), mo('dead_hang', 2, [30, 45]), ...PULL_X],
      B: [pw('landing_drill', 2, 4), mn('box_squat', 'goblet_box_squat'), BSS, pa('cossack_squat', 2, [6, 6], { note: 'langsam' }),
        mo('copenhagen_plank', 2, [20, 20]), ...LEG_X],
      D: [pw('kb_swing', 2, 5, { note: 'leicht und explosiv' }), mn('good_morning', 'kb_rdl'), CHIN, pa('ring_pushup', 2, [8, 12]),
        mo('deep_squat_hold_kb', 2, [45, 45]), mo('ninety_ninety_loaded', 2, [6, 6]), fin('fin_circuit_easy'),
        opt('sz_curl', 'hammer_curl_kb'), opt('bw_skull_crusher')],
    },
    { // Kapitel 2 · Basis
      C: [pw('plyo_pushup', 3, 4), mn('strict_press', 'kb_press_sa', { note: '3 s ablassen' }), DIP, pa('pike_pushup_box', 3, [8, 12]),
        co('band_punch_rotation', 3, [8, 8]), arm('floor_skull_crusher', 2, [10, 12], { room: 'kb_floor_skull_crusher' }), ...PUSH_X],
      A: [pw('pullup_explosive', 3, 3), mn('barbell_row', 'kb_row_sa'), PULL, pa('ring_row_elevated', 3, [8, 12]),
        co('fl_tuck_raise', 3, [5, 8]), arm('db_hammer_curl', 2, [10, 15], { room: 'hammer_curl_kb' }), ...PULL_X],
      B: [pw('squat_jump', 3, 4), mn('front_squat', 'dkb_front_squat'), BSS, pa('lateral_lunge_kb', 3, [8, 8]), ...LEG_X],
      D: [pw('side_slam', 3, 4), mn('rdl_bb', 'sl_rdl', { note: '3 s ablassen' }), CHIN, pa('pike_pushup_box', 3, [8, 12]),
        mo('jefferson_curl', 2, [8, 8]), mo('couch_stretch', 2, [45, 45]), fin('fin_circuit_easy'),
        opt('pelican_curl'), opt('bw_triceps_press_bar')],
    },
  ],
};

export const PROGRAM_MISSIONS = ['A', 'B', 'C', 'D'];

/**
 * Programm für Saison-ID und Kapitel (0, 1; Prüfwoche = Kapitel 2 der Saison).
 * @returns {{setup:object, slots:object[]}|null}
 */
export function programSlots(seasonId, chapter, missionId) {
  const ch = chapter === 'exam' ? 1 : chapter;
  const season = PROGRAM[seasonId];
  if (!season || !PROGRAM_MISSIONS.includes(missionId)) return null;
  return { setup: CHAPTER_SETUP[seasonId][ch], slots: season[ch][missionId], chapter: ch };
}

/** Alle Hauptübungen des Jahres (für Fortschritts-Index, Fokus und Säulen). */
export const PROGRAM_MAIN_IDS = [...new Set(Object.values(PROGRAM).flatMap((s) => s.flatMap((ch) =>
  Object.values(ch).flatMap((slots) => slots.filter((x) => x.b === 'main' || x.role === 'anchor').flatMap((x) => [x.ex, x.room].filter(Boolean))))))];
