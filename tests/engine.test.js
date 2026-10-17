import { describe, it, expect } from './runner.js';
import { decide, advanceQueue } from '../js/engine/decide.js';
import { hardStreak, gapDays, plattCount } from '../js/engine/history.js';
import { initialEngine, modifierFor, completeMission, startDeload, shouldSuggestDeload, rotateFrom } from '../js/engine/cycle.js';
import { progress, initialState, ladderFor, stepLoad } from '../js/engine/progression.js';
import { buildPlan, createActive, finishSession, resolveExercise, logArena } from '../js/engine/plan.js';
import { weekStreak, rankFor, sessionXp } from '../js/engine/game.js';
import { addDays, weekStart, daysBetween } from '../js/engine/dates.js';
import { getDef } from '../js/data/exercises.js';
import { defaultData, normalize } from '../js/state.js';
import { startTimer, advanceTo, nextPhase, totalMinutes } from '../js/engine/roundtimer.js';
import { levelToScore, priorities, selectStretches, isDue } from '../js/engine/mobility.js';
import { MISSIONS } from '../js/data/missions.js';
import { schedule, nextCommand, rng, COMMANDS } from '../js/engine/footwork.js';
import { weekCoverage, gapsFor, questForWeek, questStatus, checkProgress, ascensionStatus, attributePoints, attrRank, QUESTS } from '../js/engine/progress.js';
import { swapOptions, plyoFor } from '../js/engine/plan.js';
import { initialArc, syncArc, jumpToDeload, isHoliday, isHolidayWeek, weekInfo } from '../js/engine/arc.js';
import { applyArcChange, syncData } from '../js/engine/arcsync.js';
import { loadClass, yesterdayClass } from '../js/engine/load.js';
import { stagnationStatus, isStalled, performance } from '../js/engine/stagnation.js';
import { logDecision } from '../js/engine/rulelog.js';
import { migrate, SCHEMA_VERSION } from '../js/state.js';
import { WEEK_PLAN } from '../js/data/arcs.js';
import { EXERCISES } from '../js/data/exercises.js';

const T = '2026-10-16'; // Freitag
const ci = (o = {}) => ({ yesterdayMT: 'none', feeling: 'normal', tonightMT: 'no', where: 'room', ...o });
const Q = ['A', 'B', 'C', 'D'];
const mission = (day, missionId, extra = {}) => ({ day, kind: 'mission', missionId, ...extra });
const arena = (day, intensity = 'hard') => ({ day, kind: 'arena', intensity, minutes: 60 });

describe('Datum', () => {
  it('daysBetween und addDays', () => {
    expect(daysBetween('2026-10-01', T)).toBe(15);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('weekStart ist Montag', () => {
    expect(weekStart(T)).toBe('2026-10-12');
    expect(weekStart('2026-10-12')).toBe('2026-10-12');
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
  });
});

describe('Entscheidung', () => {
  it('Regel 0: Arena heute Abend ohne Morgeneinheit → nur Fluss', () => {
    const r = decide({ checkin: { yesterdayMT: 'none', feeling: 'frisch', tonightMT: 'yes' }, hardStreak: 0, queue: Q });
    expect(r.rule).toBe(0);
    expect(r.kind).toBe('arenaday');
  });
  it('Regel 0 entfällt bei gewollter Morgeneinheit oder „Vielleicht“', () => {
    expect(decide({ checkin: ci({ tonightMT: 'yes', morning: true }), hardStreak: 0, queue: Q }).rule).toBe(7);
    expect(decide({ checkin: ci({ tonightMT: 'maybe' }), hardStreak: 0, queue: Q }).rule).toBe(7);
  });
  it('Regel 1: Nur Mobility → Fluss + Spaziergang', () => {
    const r = decide({ checkin: ci({ where: 'mobility', feeling: 'platt' }), hardStreak: 5, queue: Q });
    expect(r.rule).toBe(1);
    expect(r.missionId).toBe('FLOW');
    expect(r.walk).toBe(true);
  });
  it('Regel 2: 3 harte Tage → Ruhetag, überstimmbar', () => {
    const r = decide({ checkin: ci(), hardStreak: 3, queue: Q });
    expect(r.rule).toBe(2);
    expect(r.kind).toBe('rest');
    expect(r.canOverride).toBe(true);
    const o = decide({ checkin: ci(), hardStreak: 3, queue: Q, overrideRest: true });
    expect(o.rule).toBe(7);
  });
  it('Regel 3: Platt + hartes Sparring → nur Fluss', () => {
    const r = decide({ checkin: ci({ feeling: 'platt', yesterdayMT: 'hard' }), hardStreak: 1, queue: Q });
    expect(r.rule).toBe(3);
    expect(r.kind).toBe('flow');
  });
  it('Regel 4: Platt ODER Sparring → D leicht, bei 15 min Express', () => {
    expect(decide({ checkin: ci({ feeling: 'platt' }), hardStreak: 0, queue: Q }).missionId).toBe('D_LIGHT');
    expect(decide({ checkin: ci({ yesterdayMT: 'hard' }), hardStreak: 0, queue: Q }).missionId).toBe('D_LIGHT');
    expect(decide({ checkin: ci({ feeling: 'platt', where: 'express' }), hardStreak: 0, queue: Q }).missionId).toBe('EXPRESS');
  });
  it('Regel 5: Nur 15 Minuten → Express', () => {
    const r = decide({ checkin: ci({ where: 'express' }), hardStreak: 0, queue: Q });
    expect(r.rule).toBe(5);
    expect(r.missionId).toBe('EXPRESS');
  });
  it('Regel 6: Arena heute Abend + B ist dran → nächste Nicht-B-Einheit', () => {
    const r = decide({ checkin: ci({ tonightMT: 'yes', morning: true }), hardStreak: 0, queue: ['B', 'C', 'D', 'A'] });
    expect(r.rule).toBe(6);
    expect(r.missionId).toBe('C');
    expect(decide({ checkin: ci({ tonightMT: 'maybe' }), hardStreak: 0, queue: ['B', 'C', 'D', 'A'] }).missionId).toBe('C');
  });
  it('Regel 6 greift nicht, wenn nicht B dran ist', () => {
    expect(decide({ checkin: ci({ tonightMT: 'yes', morning: true }), hardStreak: 0, queue: ['C', 'D', 'A', 'B'] }).missionId).toBe('C');
  });
  it('Regel 7: nächste Einheit, im Home Gym als FORGE auf diesem Platz', () => {
    const r = decide({ checkin: ci({ where: 'gym' }), hardStreak: 0, queue: ['D', 'A', 'B', 'C'] });
    expect(r.rule).toBe(7);
    expect(r.missionId).toBe('FORGE');
    expect(r.slot).toBe('D');
    expect(r.profile).toBe('gym');
    expect(decide({ checkin: ci(), hardStreak: 0, queue: ['D', 'A', 'B', 'C'] }).missionId).toBe('D');
  });
  it('jede Empfehlung hat eine Begründung', () => {
    const r = decide({ checkin: ci(), hardStreak: 0, queue: Q });
    expect(r.reason.length > 5).toBeTruthy();
  });
  it('Queue: C statt B lässt B vorn', () => {
    expect(advanceQueue(['B', 'C', 'D', 'A'], 'C')).toEqual(['B', 'D', 'A', 'C']);
    expect(advanceQueue(['A', 'B', 'C', 'D'], 'A')).toEqual(['B', 'C', 'D', 'A']);
    expect(advanceQueue(Q, 'EXPRESS')).toEqual(Q);
  });
});

describe('Log-Wissen', () => {
  it('harte Tage am Stück bis gestern', () => {
    const s = [arena(addDays(T, -1)), mission(addDays(T, -2), 'A'), arena(addDays(T, -3), 'light'),
      mission(addDays(T, -5), 'B')];
    expect(hardStreak(s, T)).toBe(3);
  });
  it('Express und D leicht sind keine harten Tage', () => {
    const s = [{ day: addDays(T, -1), kind: 'express', missionId: 'EXPRESS' }, mission(addDays(T, -2), 'D_LIGHT')];
    expect(hardStreak(s, T)).toBe(0);
  });
  it('Tage seit letzter voller Einheit', () => {
    expect(gapDays([mission('2026-10-06', 'A'), arena('2026-10-15')], T)).toBe(10);
    expect(gapDays([], T)).toBe(null);
  });
  it('Platt-Zähler über 7 Tage', () => {
    const c = { a: { day: T, feeling: 'platt' }, b: { day: addDays(T, -6), feeling: 'platt' },
      c: { day: addDays(T, -7), feeling: 'platt' } };
    expect(plattCount(c, T)).toBe(2);
  });
});

describe('Pausen und Wiedereinstieg', () => {
  it('bis 7 Tage: normal', () => {
    expect(modifierFor(initialEngine(), 7).type).toBe('none');
  });
  it('8–14 Tage: −10 %, ein Satz weniger, nur eine Einheit', () => {
    const m = modifierFor(initialEngine(), 9);
    expect(m.type).toBe('comeback');
    expect(m.pct).toBe(0.1);
    expect(m.dropSets).toBe(1);
    const e = completeMission(initialEngine(), { missionId: 'A', gap: 9, modifier: m });
    expect(modifierFor(e, 1).type).toBe('none');
  });
  it('15+ Tage: zwei Einheiten −20 % ohne Versagen', () => {
    let e = initialEngine();
    const m1 = modifierFor(e, 20);
    expect(m1.pct).toBe(0.2);
    expect(m1.noFailure).toBe(true);
    e = completeMission(e, { missionId: 'A', gap: 20, modifier: m1 });
    const m2 = modifierFor(e, 2);
    expect(m2.type).toBe('comeback');
    e = completeMission(e, { missionId: 'B', gap: 2, modifier: m2 });
    expect(modifierFor(e, 2).type).toBe('none');
  });
  it('Rotation läuft beim Wiedereinstieg weiter', () => {
    const e = { ...initialEngine(), queue: ['C', 'D', 'A', 'B'] };
    const m = modifierFor(e, 30);
    expect(completeMission(e, { missionId: 'C', gap: 30, modifier: m }).queue).toEqual(['D', 'A', 'B', 'C']);
  });
});

describe('Deload (Arc-Woche 6)', () => {
  it('Deload-Woche liefert halbe Sätze ohne Versagen', () => {
    const e = startDeload(initialEngine(T));
    expect(e.arc.week).toBe(6);
    const m = modifierFor(e, 2);
    expect(m.type).toBe('deload');
    expect(m.setFactor).toBe(0.5);
    expect(m.noFailure).toBe(true);
  });
  it('Express und D leicht drehen die Rotation nicht', () => {
    expect(completeMission(initialEngine(T), { missionId: 'EXPRESS', gap: 1, modifier: { type: 'none' } }).queue).toEqual(Q);
    expect(completeMission(initialEngine(T), { missionId: 'D_LIGHT', gap: 1, modifier: { type: 'none' } }).queue).toEqual(Q);
  });
  it('3x Platt in 7 Tagen → Vorschlag, nach Ablehnung 7 Tage Ruhe', () => {
    expect(shouldSuggestDeload(initialEngine(), 3, T)).toBe(true);
    expect(shouldSuggestDeload(initialEngine(), 2, T)).toBe(false);
    expect(shouldSuggestDeload({ ...initialEngine(), deloadSuggestDismissed: addDays(T, -3) }, 3, T)).toBe(false);
    expect(shouldSuggestDeload(startDeload(initialEngine(T)), 3, T)).toBe(false);
  });
  it('Deload halbiert die Sätze bei gleichem Gewicht', () => {
    const d = defaultData();
    d.engine = startDeload(d.engine);
    d.sessions = [mission(addDays(T, -2), 'D')];
    d.exState.dip = { exId: 'dip', load: 0, target: 8, miss: 0 };
    const plan = buildPlan({ missionId: 'C', profile: 'room', data: d, today: T });
    const dip = plan.items.find((i) => i.exId === 'dip');
    expect(dip.sets).toBe(2);
    expect(dip.target).toBe(8);
    expect(dip.noFailure).toBe(true);
  });
});

const settings = { kbWeights: [8, 12, 16, 20, 24] };
const ctx = (equipment = ['kb', 'bar', 'dipbars', 'box']) => ({ settings, equipment, getDef });
const sets = (vals, load = 0) => vals.map((value) => ({ value, load }));

describe('Progression', () => {
  it('alle Sätze am oberen Ende → nächste KB-Stufe, Ziel unteres Ende', () => {
    const def = getDef('bulgarian_split_squat'); // 8–10
    const r = progress(def, { exId: def.id, load: 12, target: 10, miss: 0 }, sets([10, 10, 10], 12), ctx());
    expect(r.load).toBe(16);
    expect(r.target).toBe(8);
    expect(r.lastChange).toBe('load_up');
  });
  it('sonst +1 Wiederholung bei gleichem Gewicht', () => {
    const def = getDef('bulgarian_split_squat');
    const r = progress(def, { exId: def.id, load: 12, target: 8, miss: 0 }, sets([8, 8, 9], 12), ctx());
    expect(r.load).toBe(12);
    expect(r.target).toBe(9);
  });
  it('Ziel verfehlt (aber über Untergrenze) → Ziel bleibt', () => {
    const def = getDef('bulgarian_split_squat');
    const r = progress(def, { exId: def.id, load: 12, target: 10, miss: 0 }, sets([10, 9, 8], 12), ctx());
    expect(r.target).toBe(10);
  });
  it('zweimal unteres Ende verfehlt → eine Stufe leichter', () => {
    const def = getDef('bulgarian_split_squat');
    let st = { exId: def.id, load: 16, target: 8, miss: 0 };
    st = progress(def, st, sets([6, 6, 5], 16), ctx());
    expect(st.load).toBe(16);
    expect(st.miss).toBe(1);
    st = progress(def, st, sets([7, 6, 6], 16), ctx());
    expect(st.load).toBe(12);
    expect(st.lastChange).toBe('load_down');
  });
  it('gewichtete Klimmzüge: Gürtel-Last nur mit Dip-Gürtel', () => {
    const def = getDef('pullup_tactical'); // 5–8
    const st = { exId: def.id, load: 0, target: 8, miss: 0 };
    const withBelt = progress(def, st, sets([8, 8, 8, 8]), ctx(['kb', 'bar', 'belt']));
    expect(withBelt.load).toBe(8);
    expect(withBelt.target).toBe(5);
    const noBelt = progress(def, st, sets([8, 8, 8, 8]), ctx(['kb', 'bar']));
    expect(noBelt.exId).toBe('pullup_tactical');
    expect(noBelt.pendingVariant).toBe('pullup_lsit');
    expect(noBelt.lastChange).toBe('variant_ready');
  });
  it('Bodyweight ohne Last → schwerere Variante wird vorgemerkt', () => {
    const def = getDef('pike_pushup_box'); // 8–12
    const r = progress(def, { exId: def.id, load: 0, target: 12, miss: 0 }, sets([12, 12, 12]), ctx());
    expect(r.exId).toBe('pike_pushup_box');
    expect(r.pendingVariant).toBe('hspu_negative');
  });
  it('Bodyweight zu schwer → leichtere Variante wird vorgemerkt', () => {
    const def = getDef('hanging_leg_raise'); // 8–12
    let st = { exId: def.id, load: 0, target: 8, miss: 0 };
    st = progress(def, st, sets([5, 4, 4]), ctx());
    st = progress(def, st, sets([5, 5, 4]), ctx());
    expect(st.exId).toBe('hanging_leg_raise');
    expect(st.pendingVariant).toBe('hanging_knee_raise');
  });
  it('Zeit-Übung: +5 s bis Obergrenze, dann mehr Gewicht', () => {
    const def = getDef('suitcase_carry'); // 40–60
    const a = progress(def, { exId: def.id, load: 16, target: 45, miss: 0 }, sets([45, 45, 50], 16), ctx());
    expect(a.target).toBe(50);
    expect(a.lastChange).toBe('time_up');
    const b = progress(def, { exId: def.id, load: 16, target: 60, miss: 0 }, sets([60, 60, 60], 16), ctx());
    expect(b.load).toBe(20);
    expect(b.target).toBe(40);
  });
  it('Ziel nie über die Obergrenze', () => {
    const def = getDef('hollow_body'); // 30–45
    const r = progress(def, { exId: def.id, load: 0, target: 44, miss: 0 }, sets([44, 44, 44]), ctx());
    expect(r.target).toBe(45);
  });
  it('max-Satz: Ziel = Bestwert + 1', () => {
    const def = getDef('pushup_max');
    expect(progress(def, { exId: def.id, load: 0, target: 20, miss: 0 }, sets([24]), ctx()).target).toBe(25);
  });
  it('Logging-Last wird neue Basis (App lernt)', () => {
    const def = getDef('kb_row_ballistic');
    const r = progress(def, { exId: def.id, load: 16, target: 10, miss: 0 }, sets([10, 10, 11], 20), ctx());
    expect(r.load).toBe(20);
  });
  it('Kalibrierung aus Startwerten', () => {
    const c = { settings, startValues: { pullups: 12 }, getDef };
    expect(initialState(getDef('pullup_tactical'), c).target).toBe(7);
    const weak = initialState(getDef('pullup_tactical'), { ...c, startValues: { pullups: 3 } });
    expect(weak.exId).toBe('pullup_negative');
    expect(initialState(getDef('pullup_tactical'), { settings, getDef }).target).toBe(5);
  });
  it('Lastleitern', () => {
    expect(ladderFor('belt', settings)).toEqual([0, 8, 12, 16, 20, 24]);
    expect(stepLoad(ladderFor('barbell', settings), 60, 1)).toBe(62.5);
    expect(stepLoad([8, 12], 12, 1)).toBe(12);
  });
});

describe('Plan', () => {
  it('fehlendes Equipment → Alternative', () => {
    expect(resolveExercise('jump_rope', ['kb'])).toBe('shadow_boxing');
    expect(resolveExercise('jump_rope', ['rope'])).toBe('jump_rope');
    expect(resolveExercise('ab_rollout', [])).toBe('hollow_body');
  });
  it('Mission A im eigenen Raum ohne Zusatz-Equipment', () => {
    const plan = buildPlan({ missionId: 'A', profile: 'room', data: defaultData(), today: T });
    const ids = plan.items.map((i) => i.exId);
    expect(ids).toContain('shadow_boxing');
    expect(ids).toContain('neck_iso_manual');
    expect(ids).toContain('hollow_body');
    expect(ids.includes('lat_pulldown')).toBe(false);
  });
  it('Home Gym: B wechselt Kniebeuge/Kreuzheben, 4 Sätze', () => {
    const d = defaultData();
    const p1 = buildPlan({ missionId: 'B', profile: 'gym', data: d, today: T });
    const main1 = p1.items.find((i) => ['back_squat', 'deadlift'].includes(i.exId));
    expect(main1.exId).toBe('back_squat');
    expect(main1.sets).toBe(4);
    d.sessions = [mission('2026-10-10', 'B', { profile: 'gym' })];
    const p2 = buildPlan({ missionId: 'B', profile: 'gym', data: d, today: T });
    expect(p2.items.some((i) => i.exId === 'deadlift')).toBe(true);
  });
  it('Wiedereinstieg 8–14 Tage: ein Satz weniger, −10 % Wdh.', () => {
    const d = defaultData();
    d.sessions = [mission('2026-10-06', 'A')];
    d.exState.dip = { exId: 'dip', load: 0, target: 10, miss: 0 };
    const plan = buildPlan({ missionId: 'C', profile: 'room', data: d, today: T });
    const dip = plan.items.find((i) => i.exId === 'dip');
    expect(plan.modifier.type).toBe('comeback');
    expect(dip.sets).toBe(3);
    expect(dip.target).toBe(9);
  });
  it('Fluss hat 8 Stretches und variiert täglich', () => {
    const a = buildPlan({ missionId: 'FLOW', profile: 'room', data: defaultData(), today: T });
    const b = buildPlan({ missionId: 'FLOW', profile: 'room', data: defaultData(), today: addDays(T, 1) });
    expect(a.items.length).toBe(8);
    expect(JSON.stringify(a.items) !== JSON.stringify(b.items)).toBe(true);
  });
});

describe('Verbuchen', () => {
  const run = (data, missionId, mutate) => {
    const plan = buildPlan({ missionId, profile: 'room', data, today: T });
    const active = createActive(plan, T, 0);
    mutate?.(active);
    return finishSession(data, active, { now: 40 * 60000 });
  };
  it('Mission verbucht, Rotation dreht, Progression läuft', () => {
    const d = defaultData();
    const { data, session } = run(d, 'A', (a) => a.log.forEach((e) => e.sets.forEach((s) => { s.done = true; })));
    expect(session.completion).toBe(1);
    expect(data.engine.queue).toEqual(['B', 'C', 'D', 'A']);
    expect(data.exState.pullup_tactical.target).toBe(6);
    expect(session.xp).toBe(125);
  });
  it('unvollständige Mission zählt anteilig', () => {
    const { session, data } = run(defaultData(), 'C', (a) => { a.log[1].sets[0].done = true; });
    expect(session.completion > 0 && session.completion < 1).toBe(true);
    expect(session.xp < 100).toBe(true);
    expect(data.engine.queue[3]).toBe('C');
  });
  it('D leicht dreht die Rotation nicht', () => {
    const { data } = run(defaultData(), 'D_LIGHT', (a) => { a.roundsDone = 2; });
    expect(data.engine.queue).toEqual(Q);
  });
  it('Rekord gebrochen wird erkannt', () => {
    let d = defaultData();
    d = run(d, 'C', (a) => { a.log.forEach((e) => e.sets.forEach((s) => { s.done = true; })); }).data;
    const r = run(d, 'C', (a) => {
      a.log.forEach((e) => e.sets.forEach((s) => { s.done = true; }));
      a.log.find((e) => e.exId === 'pushup_max').sets[0].value = 40;
    });
    expect(r.session.records.some((x) => x.exId === 'pushup_max')).toBe(true);
  });
  it('Arena-Log', () => {
    const { session } = logArena(defaultData(), { day: T, intensity: 'hard', minutes: 60 });
    expect(session.xp).toBe(80);
  });
  it('Arena mit Gefühl 1–10: ab 7 hart, XP nach Intensität und Dauer', () => {
    const hard = logArena(defaultData(), { day: T, rpe: 7, minutes: 90 }).session;
    expect(hard.intensity).toBe('hard');
    expect(hard.xp).toBe(113);
    const light = logArena(defaultData(), { day: T, rpe: 4, minutes: 60 }).session;
    expect(light.intensity).toBe('light');
    expect(light.xp).toBe(60);
  });
  it('Sparring per Gefühl ≥ 7 löst Regel 4 am nächsten Tag aus', () => {
    const d = logArena(defaultData(), { day: addDays(T, -1), rpe: 8, minutes: 60 }).data;
    expect(d.sessions[0].intensity).toBe('hard');
  });
});

describe('Gamification', () => {
  it('Wochen-Streak: 3 Einsätze pro Woche, laufende Woche bricht nichts', () => {
    const s = [];
    for (const w of ['2026-09-28', '2026-10-05']) for (let i = 0; i < 3; i++) s.push(arena(addDays(w, i)));
    s.push(arena('2026-10-12'));
    const r = weekStreak(s, T);
    expect(r.streak).toBe(2);
    expect(r.thisWeek).toBe(1);
  });
  it('Fluss zählt nicht als Einsatz, Kurzeinsatz schon', () => {
    const s = [{ day: '2026-10-12', kind: 'flow' }, { day: '2026-10-13', kind: 'express' }];
    expect(weekStreak(s, T).thisWeek).toBe(1);
  });
  it('Schild rettet eine verpasste Woche pro Monat', () => {
    const s = [];
    for (const w of ['2026-09-07', '2026-09-21']) for (let i = 0; i < 3; i++) s.push(arena(addDays(w, i)));
    // 14.09. verpasst → Schild (September)
    expect(weekStreak(s, '2026-09-28').streak).toBe(2);
    // zwei verpasste Wochen im selben Monat → Streak bricht
    const s2 = s.filter((x) => x.day < '2026-09-14');
    for (let i = 0; i < 3; i++) s2.push(arena(addDays('2026-09-28', i)));
    expect(weekStreak(s2, '2026-10-05').streak).toBe(1);
  });
  it('Ränge', () => {
    expect(rankFor(0).id).toBe('SHADE');
    expect(rankFor(1000).id).toBe('BLADE');
    expect(rankFor(3500).id).toBe('WARDEN');
    expect(rankFor(16000).id).toBe('UMBRA');
    expect(rankFor(99999).name).toBe('Unzerbrechlich');
  });
  it('XP: Express zählt, Fluss klein', () => {
    expect(sessionXp({ kind: 'express', missionId: 'EXPRESS' })).toBe(50);
    expect(sessionXp({ kind: 'flow', missionId: 'FLOW' })).toBe(20);
  });
});

describe('Daten', () => {
  it('Import normalisiert und ergänzt Felder', () => {
    const n = normalize({ sessions: [], settings: { bodyweight: 90 } });
    expect(n.settings.bodyweight).toBe(90);
    expect(n.settings.kbWeights.length > 0).toBe(true);
    expect(n.engine.queue).toEqual(Q);
  });
  it('Import lehnt Unsinn ab', () => {
    let threw = false;
    try { normalize({ foo: 1 }); } catch { threw = true; }
    expect(threw).toBe(true);
  });
});

describe('Arena-Rundentimer', () => {
  const cfg = { work: 180, rest: 60, rounds: 3 };
  it('Bereit → Runde 1 mit Glocke', () => {
    const st = startTimer(cfg, 0);
    const r = advanceTo(st, cfg, 10000);
    expect(r.st.phase).toBe('work');
    expect(r.st.round).toBe(1);
    expect(r.event).toBe('bell');
  });
  it('Rundenende → Pause mit Gong', () => {
    const r = nextPhase({ phase: 'work', round: 1, endAt: 0 }, cfg, 0);
    expect(r.phase).toBe('rest');
    expect(r.event).toBe('gong');
  });
  it('letzte Runde → fertig mit Gong', () => {
    const r = nextPhase({ phase: 'work', round: 3, endAt: 0 }, cfg, 0);
    expect(r.phase).toBe('done');
    expect(r.event).toBe('gong');
  });
  it('ohne Pause direkt nächste Runde', () => {
    const r = nextPhase({ phase: 'work', round: 1, endAt: 0 }, { ...cfg, rest: 0 }, 0);
    expect(r.phase).toBe('work');
    expect(r.round).toBe(2);
  });
  it('holt verpasste Phasen auf, ohne Zeit zu verlieren', () => {
    const r = advanceTo(startTimer(cfg, 0), cfg, 10000 + 180000 + 60000 + 5000);
    expect(r.st.phase).toBe('work');
    expect(r.st.round).toBe(2);
    expect(r.st.endAt).toBe(10000 + 180000 + 60000 + 180000);
  });
  it('Dauer fürs Log', () => {
    expect(totalMinutes(cfg, 3)).toBe(11);
  });
});

describe('Mobility-Check', () => {
  const full = { hueftbeuger: 50, adduktoren: 25, hamstrings: 75, hueftrotation: 50, sprunggelenk: 0,
    bws: 75, schulter: 100, nacken: 75 };
  const flow = MISSIONS.FLOW;
  const pool = [...new Set([...flow.base, ...flow.pool, ...flow.focusPool])].map(getDef);
  it('Stufe → Score', () => {
    expect(levelToScore(1)).toBe(0);
    expect(levelToScore(5)).toBe(100);
  });
  it('Priorität = (100 − Score) × Muay-Thai-Gewicht', () => {
    const p = priorities(full);
    expect(p[0].region).toBe('adduktoren'); // 75 × 1,5 = 112,5
    expect(p[1].region).toBe('sprunggelenk'); // 100 × 0,8 = 80
    expect(p[p.length - 1].region).toBe('schulter');
  });
  it('3 Fokus-Stretches decken die Top-Regionen ab', () => {
    const ids = selectStretches(full, pool, 0);
    expect(ids.length).toBe(3);
    expect(getDef(ids[0]).regions.includes('adduktoren')).toBe(true);
    expect(getDef(ids[1]).regions.includes('sprunggelenk')).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });
  it('Auswahl rotiert leicht von Tag zu Tag', () => {
    expect(JSON.stringify(selectStretches(full, pool, 0)) !== JSON.stringify(selectStretches(full, pool, 1))).toBe(true);
  });
  it('alles 100 → keine Fokus-Stretches', () => {
    const perfect = Object.fromEntries(Object.keys(full).map((k) => [k, 100]));
    expect(selectStretches(perfect, pool, 0).length).toBe(0);
  });
  it('Re-Test alle 4 Wochen fällig', () => {
    expect(isDue([], T)).toBe(true);
    expect(isDue([{ day: addDays(T, -27), scores: full }], T)).toBe(false);
    expect(isDue([{ day: addDays(T, -28), scores: full }], T)).toBe(true);
  });
  it('Fluss mit Check: 3 Fokus vorn, insgesamt 8', () => {
    const d = defaultData();
    d.mobility = [{ day: T, scores: full }];
    const plan = buildPlan({ missionId: 'FLOW', profile: 'room', data: d, today: T });
    expect(plan.items.length).toBe(8);
    expect(plan.items.filter((i) => i.focus).length).toBe(3);
    expect(plan.items[0].focus).toBe(true);
    expect(new Set(plan.items.map((i) => i.exId)).size).toBe(8);
  });
  it('Check bringt 50 XP', () => {
    expect(sessionXp({ kind: 'check' })).toBe(50);
  });
});

describe('Footwork-Drill', () => {
  it('Kommandos nur aus dem Satz, nie dreimal gleich, Switch nie doppelt', () => {
    const plan = schedule(180, 'fast', rng(42));
    const cmds = plan.map((p) => p.cmd);
    expect(cmds.every((c) => COMMANDS.includes(c))).toBe(true);
    for (let i = 2; i < cmds.length; i++) expect(cmds[i] === cmds[i - 1] && cmds[i] === cmds[i - 2]).toBe(false);
    for (let i = 1; i < cmds.length; i++) expect(cmds[i] === 'switch' && cmds[i - 1] === 'switch').toBe(false);
  });
  it('Takt passt zur Dauer und ist unregelmäßig', () => {
    const plan = schedule(60, 'mid', rng(7));
    expect(plan.length >= 25 && plan.length <= 50).toBe(true);
    expect(plan[plan.length - 1].at < 60000).toBe(true);
    const gaps = plan.slice(1).map((p, i) => p.at - plan[i].at);
    expect(new Set(gaps).size > 5).toBe(true);
  });
  it('alle fünf Kommandos kommen vor', () => {
    expect(new Set(schedule(120, 'mid', rng(1)).map((p) => p.cmd)).size).toBe(5);
  });
  it('kein Davonwandern: nach 3× rechts wird rechts gesperrt', () => {
    const r = rng(3);
    for (let i = 0; i < 50; i++) expect(nextCommand(['right', 'forward', 'right', 'right'], r) === 'right').toBe(false);
  });
  it('gleicher Seed → gleiche Runde', () => {
    expect(JSON.stringify(schedule(60, 'mid', rng(9)))).toBe(JSON.stringify(schedule(60, 'mid', rng(9))));
  });
});

describe('Phase 3: Abdeckung und Quests', () => {
  const W = '2026-10-12';
  const missionA = { day: '2026-10-13', kind: 'mission', missionId: 'A',
    exercises: [{ exId: 'suitcase_carry', sets: [{ done: true }, { done: true }] }, { exId: 'neck_iso_manual', sets: [{ done: false }] }] };
  it('Abdeckung zählt nur erledigte Sätze', () => {
    const cov = weekCoverage([missionA], W);
    expect(!!cov.attrs.carry).toBe(true);
    expect(!!cov.attrs.neck).toBe(false);
  });
  it('Arena deckt Schlagen und Rotation ab', () => {
    const cov = weekCoverage([{ day: '2026-10-14', kind: 'arena', minutes: 60 }], W);
    expect(gapsFor(cov, 'muaythai').attrs.includes('strike')).toBe(false);
    expect(gapsFor(cov, 'muaythai').attrs.includes('neck')).toBe(false);
  });
  it('Zirkel und Fluss zählen über ihre Übungsliste', () => {
    const cov = weekCoverage([{ day: '2026-10-14', kind: 'flow', missionId: 'FLOW', items: ['ninety_ninety'] }], W);
    expect(cov.attrs.hip_rot.includes('mobil')).toBe(true);
  });
  it('Quest kommt aus einer Lücke der Vorwoche', () => {
    const lastWeek = [{ day: '2026-10-06', kind: 'arena', minutes: 60 }];
    const q = questForWeek(lastWeek, T);
    const cov = weekCoverage(lastWeek, '2026-10-05');
    const gap = (q.gap.attrs || []).some((a) => !cov.attrs[a]) || (q.gap.expressions || []).some((x) => !cov.expressions[x]);
    expect(gap).toBe(true);
    expect(q.id === 'arena2').toBe(false);
  });
  it('Quest bleibt die ganze Woche gleich', () => {
    const d = defaultData();
    expect(questForWeek(d.sessions, '2026-10-12').id).toBe(questForWeek(d.sessions, '2026-10-18').id);
  });
  it('erfüllte Quest wird genau einmal belohnt', () => {
    const d = defaultData();
    const quest = questForWeek(d.sessions, T);
    const flow = (day) => ({ day, kind: 'flow', missionId: 'FLOW', items: ['ninety_ninety'] });
    const make = { flow5: () => ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'].map(flow),
      arena2: () => [{ day: T, kind: 'arena', minutes: 60 }, { day: T, kind: 'arena', minutes: 60 }],
      legs: () => [{ day: T, kind: 'mission', missionId: 'B', exercises: [] }] }[quest.id];
    if (!make) return; // andere Quests sind über Übungen gedeckt
    d.sessions = make();
    const r1 = checkProgress(d, T, 1);
    expect(r1.events.some((e) => e.type === 'quest')).toBe(true);
    const r2 = checkProgress(r1.data, T, 2);
    expect(r2.events.some((e) => e.type === 'quest')).toBe(false);
    expect(questStatus(r2.data, T).rewarded).toBe(true);
  });
  it('alle Quests haben Ziel und Fortschrittsfunktion', () => {
    expect(QUESTS.every((q) => q.target > 0 && typeof q.progress === 'function')).toBe(true);
  });
});

describe('Phase 3: Ascensions und Attribut-Ränge', () => {
  it('Erwachen nach der ersten Mission, nur einmal', () => {
    const d = defaultData();
    d.sessions = [{ day: T, kind: 'mission', missionId: 'A', exercises: [] }];
    const r = checkProgress(d, T, 1);
    expect(r.events.some((e) => e.type === 'ascension' && e.ascension.id === 'erwacht')).toBe(true);
    expect(checkProgress(r.data, T, 2).events.some((e) => e.type === 'ascension')).toBe(false);
  });
  it('Eisengriff ab +16 kg Klimmzug-Rekord', () => {
    const d = defaultData();
    d.records = { pullup_tactical: { load: 16, value: 5, score: 1 } };
    expect(ascensionStatus(d, T).find((a) => a.id === 'eisengriff').reached).toBe(true);
    d.records.pullup_tactical.load = 12;
    expect(ascensionStatus(d, T).find((a) => a.id === 'eisengriff').reached).toBe(false);
  });
  it('Attributpunkte aus Sätzen und Arena', () => {
    const d = defaultData();
    d.sessions = [{ day: T, kind: 'mission', missionId: 'C', exercises: [{ exId: 'dip', sets: [{ done: true }, { done: true }] }] },
      { day: T, kind: 'arena', minutes: 60 }];
    const p = attributePoints(d);
    expect(p.kraft >= 4).toBe(true);
    expect(p.explosiv > 0).toBe(true);
    expect(p.nacken > 0).toBe(true);
  });
  it('Attribut-Rang-Stufen', () => {
    expect(attrRank(0).id).toBe('E');
    expect(attrRank(130).id).toBe('C');
    expect(attrRank(5000).id).toBe('S');
  });
});

describe('Übungstausch', () => {
  it('Alternativen mit vorhandenem Equipment, ohne die Übung selbst', () => {
    const opts = swapOptions('kb_row_ballistic', { data: defaultData(), profile: 'room', today: T, all: EXERCISES });
    expect(opts.length > 0).toBe(true);
    expect(opts.some((o) => o.id === 'kb_row_ballistic')).toBe(false);
    expect(opts[0].id).toBe('bw_row');
    expect(opts.every((o) => (getDef(o.id).equipment || []).every((e) => defaultData().settings.equipment.room.includes(e)))).toBe(true);
  });
  it('markiert Übungen, die eine Wochenlücke füllen', () => {
    const opts = swapOptions('dip', { data: defaultData(), profile: 'room', today: T, all: EXERCISES });
    expect(opts.some((o) => o.fills.length > 0)).toBe(true);
  });
});

// ——————————————————— Update v2 · Paket 1 ———————————————————
const MON = '2026-10-12'; // Montag der Test-Woche
const wk = (i) => addDays(MON, i * 7); // Montag i Wochen später
const full = (day, missionId = 'A', extra = {}) => ({ day, kind: 'mission', missionId, completion: 1, ...extra });
const NOHOL = { enabled: false, from: '12-21', to: '01-03' };

describe('Arcs: Wochen zählen nur mit 2 Missionen', () => {
  it('2 volle Missionen → nächste Arc-Woche', () => {
    const arc = initialArc(MON);
    const r = syncArc(arc, [full(MON), full(addDays(MON, 2), 'B')], wk(1), { holiday: NOHOL });
    expect(r.arc.week).toBe(2);
  });
  it('1 Mission → Woche wird wiederholt', () => {
    const r = syncArc(initialArc(MON), [full(MON)], wk(1), { holiday: NOHOL });
    expect(r.arc.week).toBe(1);
    expect(r.events[0].type).toBe('week_repeat');
  });
  it('Kompakt zählt, Express und D leicht nicht', () => {
    const k = syncArc(initialArc(MON), [full(MON, 'A', { compact: true }), full(addDays(MON, 1), 'C', { compact: true })], wk(1), { holiday: NOHOL });
    expect(k.arc.week).toBe(2);
    const e = syncArc(initialArc(MON), [full(MON), { day: addDays(MON, 1), kind: 'express', missionId: 'EXPRESS' },
      full(addDays(MON, 2), 'D_LIGHT')], wk(1), { holiday: NOHOL });
    expect(e.arc.week).toBe(1);
  });
  it('FORGE und 4x4 zählen als volle Missionen', () => {
    const r = syncArc(initialArc(MON), [full(MON, 'FORGE', { slot: 'A' }), full(addDays(MON, 3), 'NOR4X4', { slot: 'D' })], wk(1), { holiday: NOHOL });
    expect(r.arc.week).toBe(2);
  });
  it('RIR-Ziel pro Woche: 3 → 2 → 2 → 1 → 1 → Deload', () => {
    expect([1, 2, 3, 4, 5, 6].map((w) => WEEK_PLAN[w].rir)).toEqual([3, 2, 2, 1, 1, 3]);
    expect(WEEK_PLAN[4].failLast).toBe(true);
    expect(WEEK_PLAN[6].deload).toBe(true);
  });
  it('Woche 6 ist Deload, danach beginnt der nächste Arc', () => {
    let arc = { ...initialArc(MON), week: 6 };
    expect(modifierFor({ ...initialEngine(MON), arc }, 2).type).toBe('deload');
    arc = syncArc(arc, [full(MON), full(addDays(MON, 1))], wk(1), { holiday: NOHOL }).arc;
    expect(arc.n).toBe(1);
    expect(arc.week).toBe(1);
    expect(weekInfo(arc).arc.name).toBe('IGNITION');
  });
  it('mehrere Wochen auf einmal nachholen', () => {
    const sessions = [full(MON), full(addDays(MON, 1)), full(wk(1)), full(addDays(wk(1), 1)), full(wk(2))];
    const r = syncArc(initialArc(MON), sessions, wk(3), { holiday: NOHOL });
    expect(r.arc.week).toBe(3);
    expect(r.events.map((e) => e.type)).toEqual(['week_done', 'week_done', 'week_repeat']);
  });
  it('Pause von 10+ Tagen in Woche 6 zählt als Deload', () => {
    const arc = { ...initialArc(MON), week: 6, through: addDays(MON, -7) };
    const r = syncArc(arc, [], MON, { holiday: NOHOL, gap: 12 });
    expect(r.arc.n).toBe(1);
    expect(r.events[0].byPause).toBe(true);
  });
  it('3x Platt → Sprung in die Deload-Woche', () => {
    expect(jumpToDeload(initialArc(MON)).week).toBe(6);
  });
});

describe('Varianten nur beim Arc-Wechsel', () => {
  it('Progression merkt die schwerere Variante nur vor', () => {
    const def = getDef('pike_pushup_box');
    const r = progress(def, { exId: def.id, load: 0, target: 12, miss: 0 }, sets([12, 12, 12]), ctx());
    expect(r.exId).toBe('pike_pushup_box');
    expect(r.pendingVariant).toBe('hspu_negative');
  });
  it('Arc-Wechsel setzt vorgemerkte Stufe bei Hauptübungen', () => {
    const { engine, exState } = applyArcChange(initialEngine(MON), { pike_pushup_box: { exId: 'pike_pushup_box', pendingVariant: 'hspu_negative' } });
    expect(engine.slotVariant['C:2']).toBe('hspu_negative');
    expect(exState.pike_pushup_box.pendingVariant).toBe(undefined);
  });
  it('Hauptübung ohne Vormerkung bleibt', () => {
    const { engine } = applyArcChange(initialEngine(MON), {});
    expect(engine.slotVariant['A:1']).toBe(undefined); // Klimmzüge
    expect(engine.slotVariant['C:1']).toBe(undefined); // Dips
  });
  it('Nebenplatz mit Variantenliste rotiert', () => {
    const { engine } = applyArcChange(initialEngine(MON), {});
    expect(engine.slotVariant['A:2']).toBe('bw_row_table');
    expect(engine.slotVariant['C:4']).toBe('pseudo_planche_pushup');
  });
  it('Plan nutzt die Variante des Platzes', () => {
    const d = defaultData();
    d.engine.slotVariant = { 'C:4': 'pseudo_planche_pushup' };
    const plan = buildPlan({ missionId: 'C', profile: 'room', data: d, today: T });
    expect(plan.items.some((i) => i.exId === 'pseudo_planche_pushup')).toBe(true);
    expect(plan.items.some((i) => i.exId === 'pushup_max')).toBe(false);
  });
  it('neuer Arc: Ziel startet unten, Last bleibt', () => {
    const d = defaultData();
    d.engine.arc = { ...initialArc(MON), n: 1 };
    d.engine.slotVariant = {};
    d.exState.pullup_tactical = { exId: 'pullup_tactical', load: 0, target: 8, miss: 0, arc: 0 };
    d.exState.kb_row_ballistic = { exId: 'kb_row_ballistic', load: 20, target: 12, miss: 0, arc: 0 };
    const plan = buildPlan({ missionId: 'A', profile: 'room', data: d, today: T });
    const row = plan.items.find((i) => i.exId === 'kb_row_ballistic' && !i.topSet);
    const top = plan.items.find((i) => i.exId === 'kb_row_ballistic');
    expect((row || top).load).toBe(20);
    expect(top.target).toBe(3); // Arc II: Top-Satz-Bereich 3–5
  });
});

describe('Belastungsklassen', () => {
  it('Einteilung High / Normal / Low', () => {
    expect(loadClass({ kind: 'mission', missionId: 'B' })).toBe('high');
    expect(loadClass({ kind: 'mission', missionId: 'FORGE' })).toBe('high');
    expect(loadClass({ kind: 'mission', missionId: 'NOR4X4' })).toBe('high');
    expect(loadClass({ kind: 'arena', rpe: 8 })).toBe('high');
    expect(loadClass({ kind: 'mission', missionId: 'A' })).toBe('normal');
    expect(loadClass({ kind: 'mission', missionId: 'D' })).toBe('normal');
    expect(loadClass({ kind: 'arena', rpe: 4 })).toBe('low');
    expect(loadClass({ kind: 'mission', missionId: 'B', compact: true })).toBe('low');
    expect(loadClass({ kind: 'mission', missionId: 'D_LIGHT' })).toBe('low');
    expect(loadClass({ kind: 'express', missionId: 'EXPRESS' })).toBe('low');
  });
  it('Klasse von gestern inkl. Check-in-Angabe', () => {
    expect(yesterdayClass([full(addDays(T, -1), 'B')], T)).toBe('high');
    expect(yesterdayClass([], T, 'hard')).toBe('high');
    expect(yesterdayClass([], T, 'none')).toBe(null);
  });
  it('nicht zwei High-Tage in Folge, High bleibt vorgemerkt', () => {
    const r = decide({ checkin: ci(), hardStreak: 1, queue: ['B', 'C', 'D', 'A'], yesterday: 'high' });
    expect(r.rule).toBe(8);
    expect(r.missionId).toBe('C');
    expect(completeMission(initialEngine(T), { missionId: 'C' }).queue[0]).toBe('A');
    const q = advanceQueue(['B', 'C', 'D', 'A'], 'C');
    expect(q[0]).toBe('B');
  });
  it('Kompakt ist Low und darf nach High-Tag laufen', () => {
    const r = decide({ checkin: ci({ where: 'kompakt' }), hardStreak: 1, queue: ['B', 'C', 'D', 'A'], yesterday: 'high' });
    expect(r.missionId).toBe('B');
    expect(r.compact).toBe(true);
  });
  it('Home Gym → FORGE auf dem nächsten Platz, nach High-Tag stattdessen Normal', () => {
    const f = decide({ checkin: ci({ where: 'gym' }), hardStreak: 0, queue: ['A', 'B', 'C', 'D'] });
    expect(f.missionId).toBe('FORGE');
    expect(f.slot).toBe('A');
    const g = decide({ checkin: ci({ where: 'gym' }), hardStreak: 0, queue: ['A', 'B', 'C', 'D'], yesterday: 'high' });
    expect(loadClass({ kind: 'mission', missionId: g.missionId })).toBe('normal');
  });
  it('FORGE belegt den Rotationsplatz', () => {
    expect(completeMission(initialEngine(T), { missionId: 'FORGE', slot: 'A' }).queue).toEqual(['B', 'C', 'D', 'A']);
  });
  it('Arc III: 4x4 ersetzt D einmal pro Woche', () => {
    const r = decide({ checkin: ci(), hardStreak: 0, queue: ['D', 'A', 'B', 'C'], fourByFourDue: true });
    expect(r.missionId).toBe('NOR4X4');
    expect(r.slot).toBe('D');
    expect(decide({ checkin: ci(), hardStreak: 0, queue: ['D', 'A', 'B', 'C'] }).missionId).toBe('D');
  });
});

describe('Pausen (Update v2)', () => {
  const last = { A: '2026-10-01', B: '2026-09-20', C: '2026-10-05', D: '2026-10-08' };
  it('1–4 Tage: normal weiter', () => {
    expect(decide({ checkin: ci(), hardStreak: 0, queue: Q, gap: 4, lastDone: last }).missionId).toBe('A');
  });
  it('5–7 Tage: am längsten liegendes Muster, Rotation startet dort neu', () => {
    const r = decide({ checkin: ci(), hardStreak: 0, queue: Q, gap: 6, lastDone: last });
    expect(r.missionId).toBe('B');
    expect(r.rotate).toBe('restart');
    expect(modifierFor(initialEngine(T), 6).type).toBe('none');
    expect(completeMission(initialEngine(T), { missionId: 'B', rotate: 'restart' }).queue).toEqual(['C', 'D', 'A', 'B']);
    expect(rotateFrom('C')).toEqual(['D', 'A', 'B', 'C']);
  });
  it('8–14 Tage: überfälliges Muster plus −10 % und ein Satz weniger', () => {
    const r = decide({ checkin: ci({ tonightMT: 'no' }), hardStreak: 0, queue: Q, gap: 10, lastDone: last });
    expect(r.missionId).toBe('B');
    const m = modifierFor(initialEngine(T), 10);
    expect(m.pct).toBe(0.1);
    expect(m.dropSets).toBe(1);
  });
  it('15+ Tage: zwei Einheiten −20 % und die Arc-Woche wird wiederholt', () => {
    expect(modifierFor(initialEngine(T), 16).pct).toBe(0.2);
    const r = syncArc({ ...initialArc(MON), week: 3 }, [], wk(3), { holiday: NOHOL, gap: 16 });
    expect(r.arc.week).toBe(3);
    expect(r.events.every((e) => e.type === 'week_repeat')).toBe(true);
  });
  it('Feiertage zählen nicht als Pausentage', () => {
    const s = [full('2026-12-19')];
    expect(gapDays(s, '2027-01-05', { enabled: true, from: '12-21', to: '01-03' })).toBe(3);
    expect(gapDays(s, '2027-01-05')).toBe(17);
  });
});

describe('Feiertagsmodus', () => {
  const H = { enabled: true, from: '12-21', to: '01-03' };
  it('Zeitraum über den Jahreswechsel', () => {
    expect(isHoliday('2026-12-24', H)).toBe(true);
    expect(isHoliday('2027-01-02', H)).toBe(true);
    expect(isHoliday('2027-01-04', H)).toBe(false);
    expect(isHoliday('2026-12-24', NOHOL)).toBe(false);
  });
  it('Arc pausiert in Feiertagswochen und läuft danach in derselben Woche weiter', () => {
    const start = '2026-12-14';
    const arc = { ...initialArc(start), week: 4 };
    const r = syncArc(arc, [], '2027-01-04', { holiday: H });
    expect(isHolidayWeek('2026-12-21', H)).toBe(true);
    expect(r.arc.week).toBe(4);
    expect(r.events.filter((e) => e.type === 'paused').length).toBe(2);
  });
  it('Wochenziel 2, Fluss zählt', () => {
    const s = [{ day: '2026-12-22', kind: 'flow' }, { day: '2026-12-23', kind: 'express' }];
    const w = weekStreak(s, '2026-12-23', H);
    expect(w.goal).toBe(2);
    expect(w.thisWeek).toBe(2);
    expect(w.streak).toBe(1);
  });
  it('keine Pausenlogik im Feiertagsmodus', () => {
    const r = decide({ checkin: ci(), hardStreak: 0, queue: Q, gap: 9, lastDone: { B: '2026-01-01' }, holiday: true });
    expect(r.missionId).toBe('A');
  });
});

describe('Kompakt, Plyo, Kontrast, Top-Satz, Arc IV', () => {
  it('Kompakt: nur Hauptübungen, je 2 Sätze, Name QUICK STRIKE', () => {
    const plan = buildPlan({ missionId: 'B', profile: 'room', data: defaultData(), today: T, compact: true });
    expect(plan.name.startsWith('QUICK STRIKE')).toBe(true);
    expect(plan.items.length >= 3 && plan.items.length <= 4).toBe(true);
    expect(plan.items.every((i) => i.sets === 2 && i.main)).toBe(true);
  });
  it('Kompakt zählt für die Rotation', () => {
    const d = defaultData();
    const plan = buildPlan({ missionId: 'A', profile: 'room', data: d, today: T, compact: true });
    const r = finishSession(d, createActive(plan, T, 0), { now: 1 });
    expect(r.data.engine.queue[3]).toBe('A');
    expect(r.session.compact).toBe(true);
  });
  it('Plyo-Info nur bei Missionen mit Sprungplatz', () => {
    expect(buildPlan({ missionId: 'A', profile: 'room', data: defaultData(), today: T }).plyo).toBe(null);
    expect(buildPlan({ missionId: 'B', profile: 'room', data: defaultData(), today: T }).plyo.stage).toBe(1);
  });
  it('Plyo-Stufe aus dem Arc, vor Sparring höchstens 3', () => {
    const arcII = { n: 1, week: 2 };
    expect(plyoFor(weekInfo(arcII), arcII, false).stage).toBe(4);
    const capped = plyoFor(weekInfo(arcII), arcII, true);
    expect(capped.stage).toBe(3);
    expect(capped.wanted).toBe(4);
    const arcI = { n: 0, week: 1 };
    expect(plyoFor(weekInfo(arcI), arcI, false).exId).toBe('landing_drill');
  });
  it('Arc II: Top-Satz + Backdown und Kontrastpartner', () => {
    const d = defaultData();
    d.engine.arc = { ...initialArc(MON), n: 1, week: 2 };
    d.settings.equipment.room = [...d.settings.equipment.room, 'belt'];
    const plan = buildPlan({ missionId: 'C', profile: 'room', data: d, today: T });
    const dip = plan.items.find((i) => i.exId === 'dip');
    expect(dip.topSet).toBe(true);
    expect(dip.setPlan.map((x) => x.label)).toEqual(['Top-Satz', 'Backdown']);
    const idx = plan.items.indexOf(dip);
    expect(plan.items[idx + 1].exId).toBe('plyo_pushup');
    expect(plan.items[idx + 1].explosive).toBe(true);
  });
  it('Top-Satz: Progression nur über den Top-Satz', () => {
    const d = defaultData();
    d.engine.arc = { ...initialArc(MON), n: 1, week: 2 };
    d.settings.equipment.room = [...d.settings.equipment.room, 'belt'];
    d.exState.dip = { exId: 'dip', load: 8, target: 5, miss: 0, arc: 1 };
    const plan = buildPlan({ missionId: 'C', profile: 'room', data: d, today: T });
    const a = createActive(plan, T, 0);
    const i = plan.items.findIndex((x) => x.exId === 'dip');
    a.log[i].sets[0] = { ...a.log[i].sets[0], value: 5, done: true };
    a.log[i].sets[1] = { ...a.log[i].sets[1], value: 3, done: true };
    const r = finishSession(d, a, { now: 1 });
    expect(r.data.exState.dip.load).toBe(12);
    expect(r.data.exState.dip.target).toBe(3);
  });
  it('FORGE nutzt Kontrastpaare immer', () => {
    const plan = buildPlan({ missionId: 'FORGE', profile: 'gym', data: defaultData(), today: T, slot: 'A' });
    const dl = plan.items.findIndex((i) => i.exId === 'deadlift');
    expect(plan.items[dl + 1].exId).toBe('vertical_jump');
    expect(plan.items.filter((i) => i.exId === 'vertical_jump').length).toBe(1);
    const pp = plan.items.findIndex((i) => i.exId === 'push_press');
    expect(plan.items[pp + 1].explosive).toBe(undefined);
    expect(plan.plyo).toBe(null);
  });
  it('Arc IV: ein Satz weniger, belastete Mobility kommt dazu', () => {
    const d = defaultData();
    d.engine.arc = { ...initialArc(MON), n: 3, week: 2 };
    const plan = buildPlan({ missionId: 'B', profile: 'room', data: d, today: T });
    expect(plan.items.find((i) => i.exId === 'nordic_curl').sets).toBe(2);
    expect(plan.items.some((i) => i.exId === 'copenhagen_plank')).toBe(true);
  });
  it('RIR-Ziel aus der Arc-Woche im Plan', () => {
    const d = defaultData();
    d.engine.arc = { ...initialArc(MON), week: 4 };
    const plan = buildPlan({ missionId: 'C', profile: 'room', data: d, today: T });
    expect(plan.rir).toBe(1);
    expect(plan.items.find((i) => i.exId === 'dip').failLast).toBe(true);
  });
});

describe('Stagnation', () => {
  it('Stufe-1-Muster: flach oder zweimal unter Bestwert', () => {
    expect(isStalled([10, 12, 12, 11, 12])).toBe('flat');
    expect(isStalled([12, 12, 12, 12])).toBe('flat');
    expect(isStalled([10, 13, 12, 11])).toBe('below');
    expect(isStalled([10, 11, 12, 13])).toBe(null);
    expect(isStalled([12, 10, 11])).toBe('below');
  });
  it('Epley bei Last, Summe ohne Last', () => {
    expect(performance(getDef('kb_row_ballistic'), [{ value: 10, load: 16, done: true }])).toBe(21.3);
    expect(performance(getDef('nordic_curl'), [{ value: 4, done: true }, { value: 3, done: true }])).toBe(7);
    // Carry: Last × Zeit, mehr Gewicht bei kürzerer Zeit ist kein Rückschritt
    const carry = getDef('suitcase_carry');
    expect(performance(carry, [{ value: 40, load: 24, done: true }]) > performance(carry, [{ value: 60, load: 12, done: true }])).toBe(true);
  });
  const session = (week, exId, value, extra = {}) => ({ id: `${exId}${week}${value}${Math.random()}`, day: T, kind: 'mission', missionId: 'C',
    modifier: 'none', arc: { n: 0, week }, exercises: [{ exId, key: exId, sets: [{ value, load: 0, done: true }] }], ...extra });
  const withArc = (week) => { const d = defaultData(); d.engine.arc = { ...initialArc(MON), week }; return d; };
  it('Stufe 1 schlägt eine Variante vor', () => {
    const d = withArc(3);
    d.sessions = [10, 12, 12, 11, 12].map((v) => session(2, 'nordic_curl', v));
    const st = stagnationStatus(d);
    expect(st.stage1.length).toBe(1);
    expect(st.stage1[0].slotKey).toBe('B:5');
    expect(st.stage2).toBe(false);
  });
  it('kein Signal in Arc-Woche 1', () => {
    const d = withArc(1);
    d.sessions = [10, 12, 12, 11, 12].map((v) => session(1, 'nordic_curl', v));
    expect(stagnationStatus(d).stage1.length).toBe(0);
  });
  it('die ersten 2 Einheiten nach einer Pause zählen nicht', () => {
    const d = withArc(3);
    d.sessions = [session(2, 'nordic_curl', 12), session(2, 'nordic_curl', 10, { afterPause: true }), session(2, 'nordic_curl', 10), session(2, 'nordic_curl', 13)];
    expect(stagnationStatus(d).stage1.length).toBe(0);
  });
  it('Stufe 2 bei 3 Mustern', () => {
    const d = withArc(3);
    d.sessions = ['nordic_curl', 'pike_pushup_box', 'hanging_leg_raise'].flatMap((id) => [10, 12, 12, 11, 12].map((v) => session(2, id, v)));
    const st = stagnationStatus(d);
    expect(st.stage1.length).toBe(3);
    expect(st.stage2).toBe(true);
  });
  it('abgelehnter Vorschlag ruht bis zur nächsten Einheit', () => {
    const d = withArc(3);
    d.sessions = [10, 12, 12, 11, 12].map((v) => session(2, 'nordic_curl', v));
    d.engine.stagnationDismissed = { 'B:5': 5 };
    expect(stagnationStatus(d).stage1.length).toBe(0);
  });
});

describe('Überstimmbar und protokolliert', () => {
  it('keine Regel liefert eine Sperre: Ruhetag ist überstimmbar', () => {
    const r = decide({ checkin: ci(), hardStreak: 4, queue: Q });
    expect(r.canOverride).toBe(true);
    expect(decide({ checkin: ci(), hardStreak: 4, queue: Q, overrideRest: true }).kind).toBe('mission');
  });
  it('jede Empfehlung hat eine Begründung, keine hat eine Sperre', () => {
    const variants = [ci(), ci({ where: 'gym' }), ci({ where: 'kompakt' }), ci({ feeling: 'platt' }), ci({ where: 'mobility' }), ci({ tonightMT: 'yes' })];
    for (const c of variants) {
      const r = decide({ checkin: c, hardStreak: 0, queue: Q, yesterday: 'high', gap: 6, lastDone: {} });
      expect(r.reason.length > 5).toBe(true);
      expect(r.blocked).toBe(undefined);
    }
  });
  it('Regel-Protokoll speichert Entscheidung', () => {
    const d = logDecision(defaultData(), { rule: 'stagnation:1', day: T, suggestion: 'x', decision: 'declined' });
    expect(d.ruleLog.length).toBe(1);
    expect(d.ruleLog[0].decision).toBe('declined');
  });
});

describe('Migration v1 → v2', () => {
  const v1 = {
    schemaVersion: 1, settings: { onboarded: true, bodyweight: 84, kbWeights: [12, 16, 24], equipment: { room: ['bar', 'kb'] } },
    engine: { queue: ['C', 'D', 'A', 'B'], fullSinceDeload: 11, deloadRemaining: 0, comeback: null, deloadSuggestDismissed: null },
    exState: { dip: { exId: 'dip', load: 8, target: 9, miss: 0 } }, records: { dip: { score: 120, value: 9, load: 8 } },
    sessions: [full('2026-10-10', 'B'), { day: '2026-10-11', kind: 'arena', rpe: 8, minutes: 90 }],
    checkins: { '2026-10-11': { feeling: 'normal' } }, mobility: [{ day: '2026-10-01', scores: { nacken: 50 } }],
  };
  it('Daten bleiben erhalten, Deload-Zähler fällt weg', () => {
    const m = normalize(JSON.parse(JSON.stringify(v1)));
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.sessions.length).toBe(2);
    expect(m.exState.dip.load).toBe(8);
    expect(m.records.dip.value).toBe(9);
    expect(m.settings.bodyweight).toBe(84);
    expect(m.engine.queue).toEqual(['C', 'D', 'A', 'B']);
    expect(m.engine.fullSinceDeload).toBe(undefined);
    expect(m.settings.holiday.enabled).toBe(true);
    expect(m.ruleLog).toEqual([]);
    expect(m.mobility.length).toBe(1);
  });
  it('nach der Migration startet Arc I in der laufenden Woche', () => {
    const m = normalize(JSON.parse(JSON.stringify(v1)));
    const r = syncData(m, T);
    expect(r.data.engine.arc.n).toBe(0);
    expect(r.data.engine.arc.week).toBe(1);
    expect(r.data.engine.arc.startedWeek).toBe(weekStart(T));
  });
  it('Migration ist wiederholbar (v2 bleibt v2)', () => {
    const once = migrate(JSON.parse(JSON.stringify(v1)));
    expect(JSON.stringify(migrate(once))).toBe(JSON.stringify(once));
  });
  it('neuere Sicherung wird abgelehnt statt kaputt importiert', () => {
    let threw = false;
    try { normalize({ ...v1, schemaVersion: 99 }); } catch { threw = true; }
    expect(threw).toBe(true);
  });
});

// ——————————————————— Lore-Bilder ———————————————————
import { GUARDIANS as LG, BOSSES as LB, allLoreFiles, guardianTier, sceneFile } from '../js/data/lore.js';
import { loreImage, guardianImage, bossImage, comicPanels } from '../js/ui/lore.js';

describe('Lore-Bilder', () => {
  it('Dateinamen wie in der Bildliste', () => {
    const files = allLoreFiles();
    ['guardian-0-shade.webp', 'guardian-2-warden.webp', 'guardian-5-unbreakable.webp', 'boss-torpor.webp', 'nemesis-plateau.webp',
      'arc1-establishing.webp', 'arc4-retreat.webp', 'nemesis-appears.webp', 'nemesis-fades.webp', 'splash.webp', 'mission-forge.webp']
      .forEach((f) => expect(files).toContain(f));
    expect(LG.length).toBe(6);
    expect(sceneFile(1, 'victory')).toBe('arc2-victory.webp');
  });
  it('Gesamtrang → Wächter-Stufe 0–5', () => {
    expect(['SHADE', 'BLADE', 'WARDEN', 'PHANTOM', 'UMBRA', 'UNBREAKABLE'].map(guardianTier)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it('jedes Bild hat einen Platzhalter und verschwindet bei Fehler', () => {
    const html = guardianImage(2);
    expect(html.includes('<svg')).toBe(true);
    expect(html.includes('onerror="this.remove()"')).toBe(true);
    expect(html.includes('guardian-2-warden.webp')).toBe(true);
  });
  it('Ascension-Aura als eigene Ebene', () => {
    expect(guardianImage(3, { aura: '#ff4d5e' }).includes('lore-aura')).toBe(true);
    expect(guardianImage(3).includes('lore-aura')).toBe(false);
    expect(guardianImage(5).includes('lore-aura')).toBe(true); // Endstufe: Gold
  });
  it('Boss-Zustände nach Lebensbalken', () => {
    expect(bossImage('torpor', { hp: 15, max: 15 }).includes('is-damaged')).toBe(false);
    const half = bossImage('torpor', { hp: 7.5, max: 15 });
    expect(half.includes('is-damaged')).toBe(true);
    expect(half.includes('--damage:0.50')).toBe(true);
    expect(bossImage('torpor', { state: 'defeated' }).includes('is-defeated')).toBe(true);
    expect(bossImage('torpor', { state: 'defeated' }).includes('lore-ash')).toBe(true);
    expect(bossImage('fracture', { state: 'retreat' }).includes('is-retreat')).toBe(true);
    expect(Object.keys(LB).length).toBe(5);
  });
  it('Comic-Panels: Bild-Panel mit Text, Statistik-Panel ohne Bild', () => {
    const html = comicPanels([{ file: 'arc1-confront.webp', lines: ['Text'] }, { stats: [['Missionen', '12']] }]);
    expect(html.includes('panel-text')).toBe(true);
    const stats = html.split('panel-stats')[1];
    expect(stats.includes('<img')).toBe(false);
  });
});

// ——————————————————— Update v2 · Paket 2 ———————————————————
import { showsElbowTap, elbowStatus, reportElbow, reportPain, activeRegions, adjustment, painPatterns, physioNoteDue, stressedRegions } from '../js/engine/signals.js';
import { bossStatus, BOSS_HP } from '../js/engine/boss.js';
import { reviewDue, reviewSnapshot, debriefDue, debriefStats, debriefExport } from '../js/engine/debrief.js';
import { ensureSideQuest } from '../js/engine/progress.js';

const ROOM = ['bag', 'bar', 'dipbars', 'box', 'kb'];
describe('Ellbogen', () => {
  it('Tap nur bei Übungen mit elbowLoad > 0', () => {
    expect(showsElbowTap(getDef('dip'))).toBe(true);
    expect(showsElbowTap(getDef('pullup_neutral'))).toBe(true);
    expect(showsElbowTap(getDef('nordic_curl'))).toBe(false);
    expect(showsElbowTap(getDef('hollow_body'))).toBe(false);
    expect(getDef('goblet_curl').elbowLoad).toBe(2);
  });
  it('Zähler zählt nur die letzten 7 Tage', () => {
    let d = defaultData();
    d = reportElbow(d, { day: addDays(T, -8), source: 'checkin' });
    d = reportElbow(d, { day: addDays(T, -6), source: 'training', exId: 'dip' });
    d = reportElbow(d, { day: T, source: 'checkin' });
    expect(elbowStatus(d, T).count).toBe(2);
    expect(elbowStatus(d, T).full).toBe(false);
    d = reportElbow(d, { day: T, source: 'training', exId: 'goblet_curl' });
    expect(elbowStatus(d, T).full).toBe(true);
    expect(elbowStatus(d, addDays(T, 7)).count).toBe(0);
  });
  it('Schwelle in den Einstellungen änderbar', () => {
    let d = defaultData();
    d.settings.elbowThreshold = 1;
    d = reportElbow(d, { day: T, source: 'checkin' });
    expect(elbowStatus(d, T).full).toBe(true);
  });
  it('voller Zähler → ellbogenfreundliche Variante für elbowLoad 2', () => {
    const ctx2 = { elbowFull: true, regions: [], equipment: ROOM, all: EXERCISES };
    expect(adjustment(getDef('goblet_curl'), ctx2).id).toBe('hammer_curl_kb');
    expect(adjustment(getDef('dip'), ctx2).lessLoad).toBe(true);
    expect(adjustment(getDef('pullup_tactical'), ctx2)).toBe(null); // elbowLoad 1: kein Vorschlag
    expect(adjustment(getDef('goblet_curl'), { ...ctx2, elbowFull: false })).toBe(null);
  });
  it('im Plan: automatisch ersetzt, für heute ablehnbar', () => {
    const d = defaultData();
    for (let i = 0; i < 3; i++) Object.assign(d, reportElbow(d, { day: T, source: 'checkin' }));
    const plan = buildPlan({ missionId: 'A', profile: 'room', data: d, today: T });
    const curl = plan.items.find((i) => i.originalKey === 'goblet_curl');
    expect(curl.exId).toBe('hammer_curl_kb');
    expect(curl.adjust.length > 5).toBe(true);
    d.engine.signalsDeclined = T;
    const plan2 = buildPlan({ missionId: 'A', profile: 'room', data: d, today: T });
    expect(plan2.items.some((i) => i.exId === 'goblet_curl')).toBe(true);
  });
  it('Prehab fest in A und C, nicht im Kompakt-Modus', () => {
    const a = buildPlan({ missionId: 'A', profile: 'room', data: defaultData(), today: T });
    expect(a.items.filter((i) => i.prehab).map((i) => i.exId)).toEqual(['forearm_rotation', 'wrist_ext_eccentric', 'dead_hang']);
    expect(buildPlan({ missionId: 'C', profile: 'room', data: defaultData(), today: T }).items.some((i) => i.prehab)).toBe(true);
    expect(buildPlan({ missionId: 'B', profile: 'room', data: defaultData(), today: T }).items.some((i) => i.prehab)).toBe(false);
    expect(buildPlan({ missionId: 'A', profile: 'room', data: defaultData(), today: T, compact: true }).items.some((i) => i.prehab)).toBe(false);
  });
  it('Physio-Hinweis nach 3 Wochen mit vollem Zähler, nur einmal', () => {
    let d = defaultData();
    for (const w of [0, 1, 2]) for (let i = 0; i < 3; i++) d = reportElbow(d, { day: addDays(wk(w), 1), source: 'checkin' });
    expect(physioNoteDue(d, addDays(wk(2), 2))).toBe(true);
    expect(physioNoteDue(d, addDays(wk(1), 2))).toBe(false);
    d.engine.physioNoteShown = T;
    expect(physioNoteDue(d, addDays(wk(2), 2))).toBe(false);
  });
});

describe('Zwick-Melder', () => {
  it('Region aktiv für 7 Tage, dann läuft die Anpassung aus', () => {
    const d = reportPain(defaultData(), { day: T, regions: ['knie'] });
    expect(activeRegions(d.signals, T)).toEqual(['knie']);
    expect(activeRegions(d.signals, addDays(T, 6))).toEqual(['knie']);
    expect(activeRegions(d.signals, addDays(T, 7))).toEqual([]);
  });
  it('Variante mit gleichem Muster ohne Last auf der Region', () => {
    expect(stressedRegions(getDef('box_jump'))).toContain('knie');
    const adj = adjustment(getDef('bulgarian_split_squat'), { elbowFull: false, regions: ['knie'], equipment: ROOM, all: EXERCISES });
    expect(adj !== null).toBe(true);
    if (!adj.caution) expect(stressedRegions(getDef(adj.id)).includes('knie')).toBe(false);
    expect(adjustment(getDef('dip'), { elbowFull: false, regions: ['knie'], equipment: ROOM, all: EXERCISES })).toBe(null);
  });
  it('Plan passt Übungen an, nach 7 Tagen nicht mehr', () => {
    const d = reportPain(defaultData(), { day: T, regions: ['knie'] });
    const plan = buildPlan({ missionId: 'B', profile: 'room', data: d, today: T });
    expect(plan.items.some((i) => i.adjust)).toBe(true);
    const later = buildPlan({ missionId: 'B', profile: 'room', data: d, today: addDays(T, 8) });
    expect(later.items.some((i) => i.adjust)).toBe(false);
  });
  it('Muster: Region meldet sich mehrfach nach derselben Übung', () => {
    let d = defaultData();
    const bj = (day) => ({ day, kind: 'mission', missionId: 'B', exercises: [{ exId: 'box_jump', sets: [{ done: true, value: 5 }] }] });
    d.sessions = [bj('2026-10-01'), bj('2026-10-08')];
    d = reportPain(d, { day: '2026-10-03', regions: ['knie'] });
    d = reportPain(d, { day: '2026-10-10', regions: ['knie'] });
    const p = painPatterns(d);
    expect(p.length >= 1).toBe(true);
    expect(p[0].exId).toBe('box_jump');
    expect(p[0].lag).toBe(2);
    expect(p[0].text.includes('2 Tage nach Box Jumps')).toBe(true);
  });
});

describe('Side Quest', () => {
  it('nie zweimal hintereinander dieselbe', () => {
    let d = defaultData();
    let prev = null;
    for (let w = 0; w < 10; w++) {
      d = ensureSideQuest(d, wk(w));
      const id = d.sideQuests[wk(w)];
      expect(id !== prev).toBe(true);
      prev = id;
    }
  });
  it('bleibt in der Woche stabil', () => {
    const d = ensureSideQuest(defaultData(), MON);
    expect(ensureSideQuest(d, addDays(MON, 5))).toBe(d);
  });
});

describe('Boss-Lebensbalken', () => {
  const arcData = () => { const d = defaultData(); d.engine.arc = { ...initialArc(MON), n: 0, week: 2 }; return d; };
  const at = (s, week = 2) => ({ ...s, arc: { n: 0, week } });
  it('Schaden: Mission 1 · Kompakt 0,6 · Express 0,3 · Arena 0,5 · Rekord +0,5', () => {
    const d = arcData();
    d.sessions = [at(full(MON)), at(full(MON, 'A', { compact: true })), at({ day: MON, kind: 'express', missionId: 'EXPRESS' }),
      at({ day: MON, kind: 'arena', rpe: 5, minutes: 60 }), at(full(MON, 'C', { records: [{ exId: 'dip' }] }))];
    const b = bossStatus(d);
    expect(b.damage).toBe(3.9);
    expect(b.hp).toBe(BOSS_HP - 3.9);
    expect(b.id).toBe('torpor');
  });
  it('heilt nie, verpasste Tage kosten nichts', () => {
    const d = arcData();
    d.sessions = [at(full(MON))];
    const h1 = bossStatus(d).hp;
    d.engine.arc.week = 5;
    expect(bossStatus(d).hp).toBe(h1);
  });
  it('Deload-Woche zählt nicht, Boss zieht sich zurück', () => {
    const d = arcData();
    d.sessions = [at(full(MON), 6)];
    d.engine.arc.week = 6;
    const b = bossStatus(d);
    expect(b.hp).toBe(BOSS_HP);
    expect(b.retreating).toBe(true);
  });
  it('fällt bei 15 Treffern', () => {
    const d = arcData();
    d.sessions = Array.from({ length: 15 }, () => at(full(MON)));
    expect(bossStatus(d).defeated).toBe(true);
  });
  it('Arena-Log trägt den Arc', () => {
    const d = arcData();
    expect(logArena(d, { day: T, rpe: 6 }).session.arc.n).toBe(0);
  });
});

describe('Wochenrückblick und Debrief', () => {
  it('Rückblick sonntags fällig, montags für die Vorwoche', () => {
    const d = defaultData();
    expect(reviewDue(d, '2026-10-18')).toBe('2026-10-12');
    d.sessions = [full('2026-10-14')];
    expect(reviewDue(d, '2026-10-19')).toBe('2026-10-12');
    expect(reviewDue(d, '2026-10-16')).toBe(null);
    d.reviews = { '2026-10-12': { fun: 4, strain: 3 } };
    expect(reviewDue(d, '2026-10-18')).toBe(null);
  });
  it('Rückblick zeigt Verteilung, Ellbogen, Regionen, Boss', () => {
    let d = defaultData();
    d.engine.arc = { ...initialArc(MON), week: 2 };
    d.sessions = [full('2026-10-13', 'B'), full('2026-10-14', 'A'), { day: '2026-10-15', kind: 'arena', rpe: 4, minutes: 60 }];
    d = reportPain(d, { day: '2026-10-15', regions: ['knie'] });
    const s = reviewSnapshot(d, '2026-10-12', '2026-10-18');
    expect(s.einsaetze).toBe(3);
    expect(s.classes).toEqual({ high: 1, normal: 1, low: 1 });
    expect(s.regions).toEqual(['knie']);
    expect(s.boss.id).toBe('torpor');
  });
  it('Debrief in Woche 6 fällig, Export enthält Logs, Antworten, Rückblicke, Regel-Protokoll', () => {
    let d = defaultData();
    d.engine.arc = { ...initialArc(MON), week: 6 };
    d.sessions = [{ ...full('2026-10-13'), arc: { n: 0, week: 2 } }];
    d.reviews = { '2026-10-12': { fun: 4, strain: 3 } };
    d = logDecision(d, { rule: 'stagnation:1', day: '2026-10-14', suggestion: 'x', decision: 'declined' });
    d.debriefs = { 0: { answers: { annoyed: 'Nordics', fun: 'Arena', pinched: 'Knie' } } };
    expect(debriefDue(d, '2026-10-16')).toBe(0);
    const x = debriefExport(d, 0, '2026-10-17');
    expect(x.type).toBe('umbra-debrief');
    expect(x.answers.pinched).toBe('Knie');
    expect(x.sessions.length).toBe(1);
    expect(Object.keys(x.weeklyReviews)).toEqual(['2026-10-12']);
    expect(x.ruleLog.length).toBe(1);
    expect(x.summary.signals.stagnations).toBe(1);
    d.debriefs[0].done = true;
    expect(debriefDue(d, '2026-10-16')).toBe(null);
  });
  it('alte Daten bekommen die neuen Felder', () => {
    const n = normalize({ schemaVersion: 2, sessions: [], settings: {}, engine: {} });
    expect(n.signals).toEqual({ elbow: [], pain: [] });
    expect(n.reviews).toEqual({});
    expect(n.settings.elbowThreshold).toBe(3);
  });
});

// ——————————————————— Update v2 · Paket 3 ———————————————————
import { storyEvents, unlockCodex, codexEntry, titleStatus, equippedTitle, pickQuote, quotePool, quoteAfterMission, introPanels, debriefPanels, introDue } from '../js/engine/story.js';
import { QUOTES, TITLES, BOSS_LORE } from '../js/data/story.js';
import { RANKS } from '../js/engine/game.js';
import { rankEmblem } from '../js/ui/emblem.js';

describe('Namen und Ränge', () => {
  it('Missionen heißen wie in der Tabelle', () => {
    expect(['A', 'B', 'C', 'D', 'EXPRESS', 'FLOW', 'FORGE'].map((id) => MISSIONS[id].name)).toEqual(['ASCENT', 'BEDROCK', 'IMPACT', 'INFILTRATION', 'SHADOWSTEP', 'FLOW', 'FORGE']);
    const qs = buildPlan({ missionId: 'A', profile: 'room', data: defaultData(), today: T, compact: true });
    expect(qs.name.startsWith('QUICK STRIKE')).toBe(true);
    expect(weekInfo({ n: 0, week: 1 }).arc.name).toBe('IRONROOT');
  });
  it('Gesamtränge SHADE → UMBRA → Unzerbrechlich, Emblem je Stufe', () => {
    expect(RANKS.map((r) => r.id)).toEqual(['SHADE', 'BLADE', 'WARDEN', 'PHANTOM', 'UMBRA', 'UNBREAKABLE']);
    expect(rankEmblem(0).includes('tier-0')).toBe(true);
    expect(rankEmblem(5).includes('#ffcf5a')).toBe(true);
  });
});

describe('Nemesis und Boss-Ausgang', () => {
  const stagnant = () => {
    const d = defaultData();
    d.engine.arc = { ...initialArc(MON), week: 3 };
    const sess = (id, v) => ({ id: `${id}${v}${Math.random()}`, day: T, kind: 'mission', missionId: 'C', modifier: 'none', arc: { n: 0, week: 2 },
      exercises: [{ exId: id, key: id, sets: [{ value: v, load: 0, done: true }] }] });
    d.sessions = ['nordic_curl', 'pike_pushup_box', 'hanging_leg_raise'].flatMap((id) => [10, 12, 12, 11, 12].map((v) => sess(id, v)));
    return d;
  };
  it('Nemesis erscheint bei Stagnation Stufe 2, nur einmal', () => {
    const r = storyEvents(stagnant(), T);
    expect(r.events.some((e) => e.type === 'nemesis_appears')).toBe(true);
    expect(r.data.engine.nemesis.active).toBe(true);
    expect(storyEvents(r.data, T).events.some((e) => e.type === 'nemesis_appears')).toBe(false);
  });
  it('Nemesis verschwindet, wenn die Deload-Woche abgeschlossen ist', () => {
    const r = storyEvents(stagnant(), T);
    const gone = storyEvents(r.data, T, [{ type: 'arc_complete', n: 0 }]);
    expect(gone.events.some((e) => e.type === 'nemesis_fades')).toBe(true);
    expect(gone.data.engine.nemesis.active).toBe(false);
    // Pause zählt nicht als abgeschlossene Deload-Woche
    expect(storyEvents(r.data, T, [{ type: 'arc_complete', n: 0, byPause: true }]).events.some((e) => e.type === 'nemesis_fades')).toBe(false);
  });
  it('Boss fällt vor Woche 6 → Sieg, einmalig', () => {
    const d = defaultData();
    d.engine.arc = { ...initialArc(MON), week: 4 };
    d.sessions = Array.from({ length: 15 }, (_, i) => ({ ...full(MON), id: `b${i}`, arc: { n: 0, week: 3 } }));
    const r = storyEvents(d, T);
    expect(r.events.some((e) => e.type === 'boss_defeated')).toBe(true);
    expect(storyEvents(r.data, T).events.some((e) => e.type === 'boss_defeated')).toBe(false);
  });
  it('Boss steht in Woche 6 → Rückzug, keine Strafe', () => {
    const d = defaultData();
    d.engine.arc = { ...initialArc(MON), week: 6 };
    const r = storyEvents(d, T);
    expect(r.events.some((e) => e.type === 'boss_retreat')).toBe(true);
    expect(r.data.engine.bossEvents[0].retreat).toBe(T);
  });
  it('Arc-Intro wartet, bis es gesehen wurde', () => {
    const d = defaultData();
    expect(introDue(d)).toBe(true);
    d.engine.introSeen = { 0: T };
    expect(introDue(d)).toBe(false);
  });
});

describe('Codex, Titel, Zitate', () => {
  it('neue Übung, Rekord und Boss schalten Einträge frei', () => {
    const d = defaultData();
    d.sessions = [{ day: T, kind: 'mission', missionId: 'C', exercises: [{ exId: 'dip', sets: [{ done: true, value: 8 }] }], records: [{ exId: 'dip', value: 9, load: 8 }] }];
    const u = unlockCodex(d, T);
    expect(!!u.codex['ex:dip']).toBe(true);
    expect(!!u.codex['boss:torpor']).toBe(true);
    const rec = Object.keys(u.codex).find((k) => k.startsWith('rec:dip'));
    expect(!!rec).toBe(true);
    const e = codexEntry(rec, u.codex[rec]);
    expect(e.text.includes('9 Wdh. mit 8 kg')).toBe(true);
    expect(unlockCodex(u, T)).toBe(u);
  });
  it('Codex-Texte: 2–4 Sätze, ohne Ausrufezeichen', () => {
    const e = codexEntry('ex:nordic_curl', { day: T });
    const n = e.text.split(/[.]\s/).length;
    expect(n >= 2 && n <= 4).toBe(true);
    Object.values(BOSS_LORE).forEach((b) => expect(b.codex.includes('!')).toBe(false));
  });
  it('Titel: Bedingungen und Ausrüsten', () => {
    const d = defaultData();
    d.sessions = Array.from({ length: 25 }, (_, i) => ({ day: addDays(T, -i), kind: 'arena', minutes: 60 }));
    const st = titleStatus(d);
    expect(st.find((t) => t.id === 'arenagaenger').unlocked).toBe(true);
    expect(st.find((t) => t.id === 'geduldig').unlocked).toBe(false);
    d.settings.title = 'arenagaenger';
    expect(equippedTitle(d)).toBe('Der Arenagänger');
    d.settings.title = 'eisern';
    expect(equippedTitle(d)).toBe(null);
    expect(TITLES.length >= 3).toBe(true);
  });
  it('jedes Zitat hat Person und Quelle', () => {
    QUOTES.forEach((q) => { expect(q.person.length > 2).toBe(true); expect(q.source.length > 5).toBe(true); expect(q.text.length > 5).toBe(true); });
  });
  it('Zitate ausblenden und eigene hinzufügen', () => {
    const s = { quotesHidden: [QUOTES[0].id], ownQuotes: [{ id: 'own-1', text: 'Mein Satz', person: 'Ich', source: 'eigene Sammlung' }] };
    const pool = quotePool(s);
    expect(pool.some((q) => q.id === QUOTES[0].id)).toBe(false);
    expect(pool.some((q) => q.id === 'own-1')).toBe(true);
    expect(!!pickQuote(s, 'x')).toBe(true);
  });
  it('nach einer Mission nur gelegentlich ein Zitat', () => {
    const d = defaultData();
    const shown = [1, 2, 3, 4, 5, 6].map((i) => {
      d.sessions = Array.from({ length: i }, (_, k) => full(T, 'A', { id: `m${k}` }));
      return !!quoteAfterMission(d, d.sessions[i - 1]);
    });
    expect(shown).toEqual([false, false, true, false, false, true]);
  });
});

describe('Comic-Panels mit echten Zahlen', () => {
  it('Intro: Welt, Boss, Konfrontation, Arc-Inhalt (3–5 Panels)', () => {
    const p = introPanels(defaultData(), 0);
    expect(p.length >= 3 && p.length <= 5).toBe(true);
    expect(p[1].boss).toBe('torpor');
    expect(p.some((x) => x.stats)).toBe(true);
  });
  it('Debrief: Zahlen aus dem Arc stehen in den Panels', () => {
    const d = defaultData();
    d.engine.arc = { ...initialArc(MON), week: 6 };
    d.sessions = Array.from({ length: 7 }, (_, i) => ({ ...full(addDays(MON, i % 5)), id: `d${i}`, arc: { n: 0, week: 2 } }));
    const st = debriefStats(d, 0, '2026-10-17');
    const p = debriefPanels(d, st);
    expect(p.length >= 4 && p.length <= 7).toBe(true);
    const konstanz = p.find((x) => x.title === 'Konstanz');
    expect(konstanz.stats[0]).toEqual(['Missionen', 7]);
    expect(p[0].lines.join(' ').includes('Er wird wiederkommen')).toBe(true);
    d.mobility = [{ day: '2026-10-14', scores: { hueftbeuger: 50 } }];
    const mob = debriefPanels(d, debriefStats(d, 0, '2026-10-17')).find((x) => x.title === 'Mobility');
    expect(mob.stats[0][0]).toBe('Hüftbeuger');
  });
});

// ——————————————————— Bang Muay Thai ———————————————————
import { parseWeekText, saveWeek, toggleDone, currentWeek, weekProgress, deleteWeek, nextWeekNumber, emptyBmt } from '../js/engine/bmt.js';

const WEEK7 = `Week 7
Warm Up
Dehnen
1x 3 min footwork

Single Sounich Series 10x
Jab, Cross, Hook

Roundkick
Each Leg Catch and Correct 25x

2 Punch Series 10x each:
Combo 2 - Lead Kick
Cross Jab - Rear Kick
Hook Cross - Lead Kick
Cross Hook - Rear Kick
(Closing the Gap üben - Zwischenschritt/Switch Kick - bei Rear)

Combo Nummern 1-4 in Order - 2 Runden 3 min

Combo Nummern mixed 1-4 (inkl Hook Cross etc) - 2x 3 min`;

describe('Bang Muay Thai', () => {
  it('Plan aus Woche 7 wird in Blöcke zerlegt', () => {
    const p = parseWeekText(WEEK7);
    expect(p.number).toBe(7);
    expect(p.blocks.map((b) => b.title)).toEqual(['Warm Up', 'Single Sounich Series 10x', 'Roundkick', '2 Punch Series 10x each:',
      'Combo Nummern 1-4 in Order - 2 Runden 3 min', 'Combo Nummern mixed 1-4 (inkl Hook Cross etc) - 2x 3 min']);
    expect(p.blocks[0].footwork).toBe(true);
    expect(p.blocks[0].timer).toEqual({ rounds: 1, work: 180 });
    expect(p.blocks[3].lines.length).toBe(5);
    expect(p.blocks[4].timer).toEqual({ rounds: 2, work: 180 });
    expect(p.blocks[5].timer).toEqual({ rounds: 2, work: 180 });
    expect(p.blocks[1].timer).toBe(null);
  });
  it('Wochen in beliebiger Reihenfolge eintragen, sortiert nach Nummer', () => {
    let b = saveWeek(emptyBmt(), { text: WEEK7, now: 1 });
    b = saveWeek(b, { number: 5, text: 'Warm Up\nDehnen', now: 2 });
    b = saveWeek(b, { number: 8, text: 'Clinch\n3x 2 min', now: 3 });
    expect(b.weeks.map((w) => w.number)).toEqual([5, 7, 8]);
    expect(nextWeekNumber(b)).toBe(9);
    expect(currentWeek(b).number).toBe(7); // erste eingetragene bleibt aktuell
  });
  it('doppelte Wochennummer wird abgelehnt, Bearbeiten erlaubt', () => {
    const b = saveWeek(emptyBmt(), { text: WEEK7, now: 1 });
    let threw = false;
    try { saveWeek(b, { number: 7, text: 'x', now: 2 }); } catch { threw = true; }
    expect(threw).toBe(true);
    const id = b.weeks[0].id;
    const edited = saveWeek(b, { id, number: 7, title: 'Kombos', text: WEEK7, now: 3 });
    expect(edited.weeks.length).toBe(1);
    expect(edited.weeks[0].title).toBe('Kombos');
  });
  it('Woche abschließen setzt die nächste offene als aktuell', () => {
    let b = saveWeek(emptyBmt(), { number: 7, text: 'a', now: 1 });
    b = saveWeek(b, { number: 8, text: 'b', now: 2 });
    const w7 = b.weeks[0].id;
    b = toggleDone(b, w7);
    expect(currentWeek(b).number).toBe(8);
    expect(b.weeks[0].done).toBe(true);
  });
  it('Fortschritt aus verknüpften ARENA-Einträgen', () => {
    const b = saveWeek(emptyBmt(), { number: 7, text: 'a', now: 1 });
    const id = b.weeks[0].id;
    let d = defaultData();
    d = logArena(d, { day: '2026-10-15', rpe: 6, minutes: 90, bmt: { weekId: id, week: 7 } }).data;
    d = logArena(d, { day: '2026-10-17', rpe: 5, minutes: 60, bmt: { weekId: id, week: 7 } }).data;
    d = logArena(d, { day: '2026-10-16', rpe: 7, minutes: 60 }).data;
    const p = weekProgress(b, d.sessions)[0];
    expect(p.sessions).toBe(2);
    expect(p.minutes).toBe(150);
    expect(p.lastDay).toBe('2026-10-17');
  });
  it('Woche löschen lässt die ARENA-Einträge stehen', () => {
    const b = saveWeek(emptyBmt(), { number: 7, text: 'a', now: 1 });
    expect(deleteWeek(b, b.weeks[0].id).weeks.length).toBe(0);
  });
  it('alte Daten bekommen ein leeres Programm', () => {
    expect(normalize({ schemaVersion: 2, sessions: [], settings: {}, engine: {} }).bmt.weeks).toEqual([]);
  });
});
