import { describe, it, expect } from './runner.js';
import { decide, advanceQueue } from '../js/engine/decide.js';
import { hardStreak, gapDays, plattCount } from '../js/engine/history.js';
import { initialEngine, applyGap, modifierFor, completeMission, startDeload, shouldSuggestDeload, DELOAD_AFTER } from '../js/engine/cycle.js';
import { progress, initialState, ladderFor, stepLoad } from '../js/engine/progression.js';
import { buildPlan, createActive, finishSession, resolveExercise, logArena } from '../js/engine/plan.js';
import { weekStreak, rankFor, sessionXp } from '../js/engine/game.js';
import { addDays, weekStart, daysBetween } from '../js/engine/dates.js';
import { getDef } from '../js/data/exercises.js';
import { defaultData, normalize } from '../js/state.js';
import { startTimer, advanceTo, nextPhase, totalMinutes } from '../js/engine/roundtimer.js';
import { levelToScore, priorities, selectStretches, isDue } from '../js/engine/mobility.js';
import { MISSIONS } from '../js/data/missions.js';

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
  it('Regel 7: nächste Einheit, Profil aus Ort', () => {
    const r = decide({ checkin: ci({ where: 'gym' }), hardStreak: 0, queue: ['D', 'A', 'B', 'C'] });
    expect(r.rule).toBe(7);
    expect(r.missionId).toBe('D');
    expect(r.profile).toBe('gym');
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
  it('10+ Tage Pause zählt als Deload', () => {
    const e = { ...initialEngine(), fullSinceDeload: 15, deloadRemaining: 2 };
    const a = applyGap(e, 10);
    expect(a.fullSinceDeload).toBe(0);
    expect(a.deloadRemaining).toBe(0);
  });
});

describe('Deload', () => {
  it(`nach ${DELOAD_AFTER} vollen Einheiten folgen 4 Deload-Einheiten`, () => {
    let e = initialEngine();
    for (let i = 0; i < DELOAD_AFTER; i++) {
      e = completeMission(e, { missionId: e.queue[0], gap: 2, modifier: modifierFor(e, 2) });
    }
    expect(e.deloadRemaining).toBe(4);
    const m = modifierFor(e, 2);
    expect(m.type).toBe('deload');
    expect(m.setFactor).toBe(0.5);
    for (let i = 0; i < 4; i++) e = completeMission(e, { missionId: e.queue[0], gap: 2, modifier: modifierFor(e, 2) });
    expect(e.deloadRemaining).toBe(0);
    expect(e.fullSinceDeload).toBe(0);
  });
  it('Express zählt nicht für den Deload-Zähler', () => {
    const e = completeMission(initialEngine(), { missionId: 'EXPRESS', gap: 1, modifier: { type: 'none' } });
    expect(e.fullSinceDeload).toBe(0);
  });
  it('manueller Deload', () => {
    expect(startDeload(initialEngine()).deloadRemaining).toBe(4);
  });
  it('3x Platt in 7 Tagen → Vorschlag, nach Ablehnung 7 Tage Ruhe', () => {
    expect(shouldSuggestDeload(initialEngine(), 3, T)).toBe(true);
    expect(shouldSuggestDeload(initialEngine(), 2, T)).toBe(false);
    expect(shouldSuggestDeload({ ...initialEngine(), deloadSuggestDismissed: addDays(T, -3) }, 3, T)).toBe(false);
    expect(shouldSuggestDeload({ ...initialEngine(), deloadRemaining: 2 }, 3, T)).toBe(false);
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
    expect(noBelt.exId).toBe('pullup_lsit');
    expect(noBelt.lastChange).toBe('variant_up');
  });
  it('Bodyweight ohne Last → schwerere Variante', () => {
    const def = getDef('pike_pushup_box'); // 8–12
    const r = progress(def, { exId: def.id, load: 0, target: 12, miss: 0 }, sets([12, 12, 12]), ctx());
    expect(r.exId).toBe('hspu_negative');
  });
  it('Bodyweight zu schwer → leichtere Variante', () => {
    const def = getDef('hanging_leg_raise'); // 8–12
    let st = { exId: def.id, load: 0, target: 8, miss: 0 };
    st = progress(def, st, sets([5, 4, 4]), ctx());
    st = progress(def, st, sets([5, 5, 4]), ctx());
    expect(st.exId).toBe('hanging_knee_raise');
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
    expect(data.engine.fullSinceDeload).toBe(1);
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
    expect(rankFor(0).id).toBe('E');
    expect(rankFor(3500).id).toBe('C');
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
