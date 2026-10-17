// Aus Mission + Profil + Log wird ein konkreter Plan; nach dem Training wird der Log verbucht.
import { MISSIONS, MISSION_KIND, FULL_MISSIONS } from '../data/missions.js';
import { getDef as defaultGetDef, EXERCISES } from '../data/exercises.js';
import { elbowStatus, activeRegions, adjustment } from './signals.js';
import { PLYO, CONTRAST } from '../data/arcs.js';
import { gapDays, lastSetsFor } from './history.js';
import { initialArc, weekInfo, holidayActive, DEFAULT_HOLIDAY } from './arc.js';
import { modifierFor, completeMission } from './cycle.js';
import { initialState, progress, ladderFor, snap, canLoad, setScore, stepLoad } from './progression.js';
import { sessionXp } from './game.js';
import { daysBetween } from './dates.js';
import { latestTest, selectStretches } from './mobility.js';
import { weekCoverage, gapsFor } from './progress.js';
import { weekStart } from './dates.js';

// Equipment und Einstellungen für ein Profil. Im Home Gym ersetzen Kurzhanteln die Kettlebells.
export function profileContext(settings, profile) {
  const equipment = [...(settings.equipment?.[profile] || [])];
  let s = settings;
  if (profile === 'gym' && !equipment.includes('kb') && equipment.includes('dumbbells')) {
    equipment.push('kb');
    s = { ...settings, kbWeights: ladderFor('dumbbell', settings) };
  }
  return { equipment, settings: s };
}

// Übung oder die erste verfügbare Alternative.
export function resolveExercise(id, equipment, getDef = defaultGetDef, seen = new Set()) {
  const def = getDef(id);
  if (!def || seen.has(id)) return null;
  seen.add(id);
  if ((def.equipment || []).every((e) => equipment.includes(e))) return id;
  for (const alt of def.alternatives || []) {
    const r = resolveExercise(alt, equipment, getDef, seen);
    if (r) return r;
  }
  return null;
}

function applyModifier(item, mod, def) {
  if (!mod || mod.type === 'none' || def.mode === 'fixed') return item;
  const out = { ...item };
  if (mod.type === 'deload') out.sets = Math.max(1, Math.ceil(item.sets * mod.setFactor));
  if (mod.dropSets) out.sets = Math.max(1, item.sets - mod.dropSets);
  if (mod.pct) {
    if (def.mode === 'time') out.target = Math.max(10, Math.round((item.target * (1 - mod.pct)) / 5) * 5);
    else if (def.mode !== 'amrap') out.target = Math.max(1, Math.round(item.target * (1 - mod.pct)));
    if (['barbell', 'dumbbell', 'cable'].includes(def.load)) {
      out.load = snap(item.ladder, item.load * (1 - mod.pct));
    }
  }
  out.noFailure = !!mod.noFailure;
  return out;
}

function flowItems(mission, today, scores, getDef) {
  // Leichte Variation: täglich zwei Basis-Stretches gegen Alternativen tauschen.
  const n = Math.abs(daysBetween('2024-01-01', today));
  const items = [...mission.base];
  for (let k = 0; k < 2; k++) {
    const slot = (n * 3 + k * 4) % items.length;
    items[slot] = mission.pool[(n * 2 + k) % mission.pool.length];
  }
  if (!scores) return items.map((id) => ({ exId: id, value: mission.work }));
  // Mit Mobility-Check: 3 Fokus-Stretches vorn, der Rest bleibt Basis-Fluss.
  const pool = Object.values(MOBILITY_POOL(getDef));
  const focus = selectStretches(scores, pool, n);
  const base = items.filter((id) => !focus.includes(id)).slice(0, items.length - focus.length);
  return [...focus.map((id) => ({ exId: id, value: mission.work, focus: true })),
    ...base.map((id) => ({ exId: id, value: mission.work }))];
}

const MOBILITY_POOL = (getDef) => {
  const ids = [...MISSIONS.FLOW.base, ...MISSIONS.FLOW.pool, ...MISSIONS.FLOW.focusPool];
  return Object.fromEntries([...new Set(ids)].map((id) => [id, getDef(id)]).filter(([, d]) => d));
};

/**
 * Konkreter Plan für heute.
 * @param {{missionId:string, profile:'room'|'gym', data:object, today:string, getDef?:Function}} p
 */
export function buildPlan({ missionId, profile, data, today, compact = false, slot = null, rotate = null,
  plyoCap = false, getDef = defaultGetDef }) {
  const mission = MISSIONS[missionId];
  const { equipment, settings } = profileContext(data.settings, profile);
  const full = FULL_MISSIONS.includes(missionId);
  const holiday = data.settings.holiday ?? DEFAULT_HOLIDAY;
  const inHoliday = holidayActive(today, holiday);
  const gap = gapDays(data.sessions, today, holiday);
  // Im Feiertagsmodus greift die Pausenlogik nicht.
  const modifier = full ? modifierFor(data.engine, inHoliday ? null : gap) : { type: 'none' };
  const arc = data.engine.arc || initialArc(today);
  const info = weekInfo(arc);
  const isCompact = compact && mission.format === 'sets';
  const base = { missionId, name: isCompact ? `QUICK STRIKE · ${mission.name}` : mission.name,
    focus: isCompact ? 'Hauptübungen · je 2 Sätze' : mission.focus, minutes: isCompact ? 30 : mission.minutes,
    format: mission.format, kind: MISSION_KIND(missionId), profile, modifier, gap, compact: isCompact,
    slot, rotate, arc: { n: arc.n, week: arc.week }, rir: modifier.type === 'deload' ? 3 : info.rir };

  const loadFor = (def, st) => {
    if (!def.load || !canLoad(def, equipment)) return { load: 0, ladder: [0] };
    const ladder = ladderFor(def.load, settings);
    return { load: snap(ladder, st?.load ?? def.startKg ?? ladder[0]), ladder };
  };

  if (mission.format === 'sets') {
    const items = [];
    const focus = info.arc.id;
    // Körpersignale: Ellbogen-Zähler voll oder gemeldete Region → Übung anpassen (für heute ablehnbar)
    const declined = data.engine.signalsDeclined === today;
    const sig = declined ? { elbowFull: false, regions: [] }
      : { elbowFull: elbowStatus(data, today).full, regions: activeRegions(data.signals, today) };
    const contrastOn = focus === 'II' || mission.contrast;
    const plyo = plyoFor(info, arc, plyoCap);
    mission.slots.forEach((s, i) => {
      if (s.only && s.only !== profile) return;
      if (s.arcOnly && s.arcOnly !== focus) return;
      if (isCompact && !s.main) return;
      if (s.plyo && contrastOn) return; // In Arc II übernehmen die Kontrastpaare die Sprünge.
      const slotKey = `${missionId}:${i}`;
      let id = data.engine.slotVariant?.[slotKey] || s.ex;
      let sets = s.sets;
      if (s.plyo) id = plyo.exId;
      else if (profile === 'gym' && s.gym && !data.engine.slotVariant?.[slotKey]) {
        if (Array.isArray(s.gym)) {
          const n = data.sessions.filter((x) => x.missionId === missionId && x.profile === 'gym').length;
          id = s.gym[n % s.gym.length];
        } else id = s.gym;
        sets = s.gymSets ?? s.sets;
      }
      const key = resolveExercise(id, equipment, getDef);
      if (!key) return;
      const def0 = getDef(key);
      if (isCompact) sets = 2;
      else if (focus === 'IV' && !s.arcOnly && def0.mode !== 'fixed') sets = Math.max(1, sets - 1);
      // Arc II: Top-Satz + Backdown bei Hauptübungen mit Zusatzlast
      const topSet = focus === 'II' && s.main && !isCompact && def0.load && canLoad(def0, equipment);
      const range = topSet ? [3, 5] : undefined;
      let item = itemFor(key, { data, profile, sets: topSet ? 2 : sets, getDef, arcN: arc.n, range });
      item = { ...item, optional: !!s.optional, main: !!s.main, slotKey, plyoStage: s.plyo ? plyo.stage : undefined, prehab: !!s.prehab };
      const adj = (sig.elbowFull || sig.regions.length)
        ? adjustment(getDef(item.exId), { ...sig, equipment, all: EXERCISES, getDef }) : null;
      if (adj) {
        if (adj.id !== item.exId) {
          const swapped = itemFor(adj.id, { data, profile, sets: item.sets, getDef, arcN: arc.n });
          item = { ...swapped, optional: item.optional, main: item.main, slotKey, originalKey: key };
        } else if (adj.lessLoad && item.load > 0) {
          item = { ...item, load: stepLoad(item.ladder, item.load, -1), noFailure: true };
        }
        item.adjust = adj.reason;
        item.caution = !!adj.caution;
      }
      if (topSet) {
        const ladder = item.ladder;
        item.topSet = true;
        item.setPlan = [
          { value: item.target, load: item.load, label: 'Top-Satz' },
          { value: 8, load: snap(ladder, item.load * 0.82), label: 'Backdown' },
        ];
      }
      item = applyModifier(item, modifier, getDef(item.exId));
      if (item.setPlan) {
        // Modifikatoren (Deload, Wiedereinstieg) wirken auch auf Top-Satz und Backdown.
        item.setPlan = item.setPlan.slice(0, Math.max(1, item.sets)).map((x, j) => (j === 0
          ? { ...x, value: item.target, load: item.load } : { ...x, load: snap(item.ladder, item.load * 0.82) }));
        item.sets = item.setPlan.length;
      }
      item.rir = base.rir;
      item.failLast = !!info.failLast && !item.noFailure && modifier.type !== 'deload';
      if (modifier.type === 'deload') item.noFailure = true;
      items.push(item);
      // Kontrastpaar: explosiver Partner desselben Musters direkt danach
      const partnerId = contrastOn && s.main && !isCompact && CONTRAST[item.exId];
      const partner = partnerId && resolveExercise(partnerId, equipment, getDef);
      if (partner) {
        const pd = getDef(partner);
        items.push({ key: partner, exId: partner, sets: modifier.type === 'deload' ? 2 : 3,
          target: pd.mode === 'time' ? pd.range[0] : 5, load: 0, ladder: [0], optional: false,
          explosive: true, noFailure: true, rir: null, trend: null, lastTime: lastSetsFor(data.sessions, partner) });
      }
    });
    // Plyo-Info nur, wenn die Mission heute wirklich einen Sprungplatz hat
    return { ...base, items, plyo: items.some((it) => it.plyoStage) ? plyo : null };
  }

  if (mission.format === 'circuit') {
    const src = mission.base ? MISSIONS[mission.base] : mission;
    const rounds = mission.light ? mission.rounds[0] : (data.exState['circuit:D']?.target ?? src.rounds[0]);
    const items = src.items.map((it) => {
      const id = resolveExercise(profile === 'gym' && it.gym ? it.gym : it.ex, equipment, getDef);
      if (!id) return null;
      const def = getDef(id);
      const { load } = loadFor(def, data.exState[id]);
      return { exId: id, value: def.id === it.ex || def.mode === getDef(it.ex).mode ? it.value : def.range[0], load };
    }).filter(Boolean);
    return { ...base, items, rounds, restBetween: src.restBetween, light: !!mission.light };
  }

  if (mission.format === 'amrap') {
    const items = mission.items.map((it) => {
      const id = resolveExercise(it.ex, equipment, getDef);
      if (!id) return null;
      const def = getDef(id);
      return { exId: id, value: def.mode === getDef(it.ex).mode ? it.value : def.range[0],
        load: loadFor(def, data.exState[id]).load };
    }).filter(Boolean);
    return { ...base, items };
  }

  if (mission.format === 'intervals') {
    const exId = profile === 'gym' && mission.gymEx ? mission.gymEx : mission.ex;
    return { ...base, rounds: mission.rounds, work: mission.work, rest: mission.rest, exId };
  }

  // flow
  const scores = latestTest(data.mobility)?.scores;
  return { ...base, items: flowItems(mission, today, scores, getDef), rounds: mission.rounds, work: mission.work,
    personalized: !!scores };
}

// Ein Satz-Eintrag für eine Übung (Zustand, Variante, Last, Ziel). Auch für den Übungstausch.
export function itemFor(key, { data, profile, sets, getDef = defaultGetDef, arcN = null, range }) {
  const { equipment, settings } = profileContext(data.settings, profile);
  const baseDef = getDef(key);
  let st = data.exState[key] || initialState(baseDef, { settings, startValues: data.settings.startValues, getDef });
  // Neuer Arc (oder anderer Wiederholungsbereich): Ziel startet am unteren Ende, die Last bleibt.
  const r = range || (getDef(st.exId) || baseDef).range;
  if (arcN != null && st.arc != null && st.arc !== arcN) st = { ...st, target: r[0], lastChange: null };
  if (range && st.target > range[1]) st = { ...st, target: range[1] };
  let def = getDef(st.exId) || baseDef;
  if (!(def.equipment || []).every((e) => equipment.includes(e))) def = baseDef;
  let load = 0;
  let ladder = [0];
  if (def.load && canLoad(def, equipment)) {
    ladder = ladderFor(def.load, settings);
    load = snap(ladder, st?.load ?? def.startKg ?? ladder[0]);
  }
  const target = def.mode === 'fixed' ? def.range[0] : (def.id === st.exId ? st.target : def.range[0]);
  return { key, exId: def.id, sets, target, load, ladder, optional: false, range: range || def.range,
    trend: st.lastChange, lastTime: lastSetsFor(data.sessions, def.id), noFailure: false };
}

// Sprungübung für die Plyo-Stufe des Arcs. Vor hartem Sparring maximal Stufe 3.
export function plyoFor(info, arc, cap) {
  let stage = info.arc.plyo[arc.week - 1];
  if (stage === 4 && info.cycle >= 1 && (arc.week === 4 || arc.week === 5)) stage = 5;
  const wanted = stage;
  if (cap && stage > 3) stage = 3;
  const list = PLYO[stage];
  return { stage, wanted, capped: wanted !== stage, exId: list[arc.week % list.length] };
}

/**
 * Tausch-Kandidaten für eine Übung: Alternativen, Stufen und verwandte Übungen derselben Kategorie,
 * nur mit vorhandenem Equipment. Übungen, die eine Wochenlücke (Muay Thai / Vater-Alltag) füllen, zuerst.
 */
export function swapOptions(exId, { data, profile, today, getDef = defaultGetDef, all }) {
  const { equipment } = profileContext(data.settings, profile);
  const def = getDef(exId);
  const attrs = new Set(def.tags.map(([a]) => a));
  const cov = weekCoverage(data.sessions, weekStart(today), getDef);
  const gaps = new Set([...gapsFor(cov, 'muaythai').attrs, ...gapsFor(cov, 'vater').attrs]);
  const direct = new Set([...(def.alternatives || []), def.easier, def.harder].filter(Boolean));
  return Object.values(all)
    .filter((d) => d.id !== exId && d.cat !== 'mobility' && d.mode !== 'fixed')
    .filter((d) => (d.equipment || []).every((e) => equipment.includes(e)))
    .map((d) => {
      const shared = d.tags.filter(([a]) => attrs.has(a)).length;
      const fills = [...new Set(d.tags.map(([a]) => a).filter((a) => gaps.has(a)))];
      const score = (direct.has(d.id) ? 20 : 0) + shared * 3 + (d.cat === def.cat ? 3 : 0) + Math.min(2, fills.length) * 3;
      return { id: d.id, fills, direct: direct.has(d.id), score, related: shared > 0 || direct.has(d.id) };
    })
    .filter((o) => o.related || o.fills.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

// Laufendes Training aus einem Plan. Sätze sind mit dem Ziel vorausgefüllt.
export function createActive(plan, today, now = Date.now()) {
  const active = { plan, day: today, startedAt: now, index: 0, roundsDone: 0 };
  if (plan.format === 'sets') {
    active.log = plan.items.map((it) => ({
      key: it.key, exId: it.exId,
      sets: it.setPlan ? it.setPlan.map((x) => ({ value: x.value, load: x.load, label: x.label, done: false }))
        : Array.from({ length: it.sets }, () => ({ value: it.target, load: it.load, done: false })),
    }));
  }
  return active;
}

export function completionOf(active) {
  const p = active.plan;
  if (p.format === 'sets') {
    const required = active.log.filter((_, i) => !p.items[i].optional);
    const total = required.reduce((n, e) => n + e.sets.length, 0);
    const done = required.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    return total ? Math.min(1, done / total) : 1;
  }
  if (p.format === 'circuit' || p.format === 'intervals') return Math.min(1, active.roundsDone / p.rounds);
  if (p.format === 'amrap') return active.roundsDone > 0 ? 1 : 0;
  return 1;
}

/**
 * Training verbuchen: Session ins Log, Progression, Rotation/Deload, Rekorde, XP.
 * @returns {{data:object, session:object}}
 */
export function finishSession(data, active, { now = Date.now(), getDef = defaultGetDef, id } = {}) {
  const p = active.plan;
  const day = active.day;
  const { equipment, settings } = profileContext(data.settings, p.profile);
  const completion = completionOf(active);
  const exState = { ...data.exState };
  const records = { ...data.records };
  const newRecords = [];
  const bodyweight = data.settings.bodyweight || 80;

  const session = { id: id || `s${now}`, day, kind: p.kind, missionId: p.missionId, profile: p.profile,
    compact: p.compact || undefined, slot: p.slot || undefined, arc: p.arc,
    afterPause: p.gap != null && p.gap >= 8 ? true : undefined, gap: p.gap ?? undefined,
    modifier: p.modifier?.type || 'none', completion, minutes: Math.round((now - active.startedAt) / 60000),
    exercises: [], roundsDone: active.roundsDone,
    items: p.format === 'sets' ? undefined : p.items ? p.items.map((i) => i.exId) : p.exId ? [p.exId] : [] };

  if (p.format === 'sets') {
    active.log.forEach((entry, i) => {
      const done = entry.sets.filter((s) => s.done);
      session.exercises.push({ exId: entry.exId, key: entry.key, sets: entry.sets });
      if (!done.length) return;
      const def = getDef(entry.exId);
      // Rekorde
      const best = Math.max(...done.map((s) => setScore(def, s, bodyweight)));
      const prev = records[entry.exId];
      if (def.mode !== 'fixed' && (!prev || best > prev.score)) {
        const top = done.reduce((a, s) => (setScore(def, s, bodyweight) >= setScore(def, a, bodyweight) ? s : a));
        records[entry.exId] = { score: best, value: top.value, load: top.load, day };
        if (prev) newRecords.push({ exId: entry.exId, value: top.value, load: top.load });
      }
      // Progression nur bei normalen Einheiten, nie für explosive Kontrast-Partner
      const item = p.items[i];
      if (item.explosive) return;
      if (p.modifier?.type && p.modifier.type !== 'none') return;
      const base = getDef(entry.key);
      const st = exState[entry.key] ||
        initialState(base, { settings, startValues: data.settings.startValues, getDef });
      const cur = st.exId === entry.exId ? { ...st, target: item.target } : { ...st, exId: entry.exId, target: item.target };
      // Arc II: Progression nur über den Top-Satz
      const counted = item.topSet ? done.filter((s) => s.label === 'Top-Satz') : done;
      if (!counted.length) return;
      const ranged = item.range ? { ...def, range: item.range } : def;
      exState[entry.key] = { ...progress(ranged, cur, counted.map((s) => ({ value: s.value, load: s.load })),
        { settings, equipment, getDef }), arc: p.arc?.n };
    });
  }

  if (p.missionId === 'D' && p.modifier?.type === 'none') {
    const c = exState['circuit:D'] || { target: 3, streak: 0 };
    const streak = active.roundsDone >= c.target ? c.streak + 1 : 0;
    exState['circuit:D'] = streak >= 2 && c.target < 4 ? { target: c.target + 1, streak: 0 } : { ...c, streak };
  }
  if (p.format === 'amrap' && active.roundsDone > 0) {
    const prev = records.EXPRESS;
    if (!prev || active.roundsDone > prev.value) {
      records.EXPRESS = { score: 0, value: active.roundsDone, day };
      if (prev) newRecords.push({ exId: 'EXPRESS', value: active.roundsDone });
    }
  }

  session.records = newRecords;
  session.xp = sessionXp(session);

  const holiday = data.settings.holiday ?? DEFAULT_HOLIDAY;
  const gap = holidayActive(day, holiday) ? null : gapDays(data.sessions, day, holiday);
  const engine = p.compact || FULL_MISSIONS.includes(p.missionId)
    ? completeMission(data.engine, { missionId: p.missionId, slot: p.slot, rotate: p.rotate, gap, modifier: p.modifier })
    : data.engine;

  return {
    data: { ...data, exState, records, engine, sessions: [...data.sessions, session], active: null },
    session,
  };
}

// Ab diesem Gefühlswert zählt eine Arena-Einheit als hart (wie Sparring).
export const HARD_RPE = 7;

export function logArena(data, { day, intensity, rpe, minutes = 60, bmt = null, now = Date.now() }) {
  const r = rpe ?? (intensity === 'hard' ? 8 : 4);
  const arc = data.engine?.arc;
  const session = { id: `a${now}`, day, kind: 'arena', missionId: 'ARENA', rpe: r,
    intensity: r >= HARD_RPE ? 'hard' : 'light', minutes, arc: arc ? { n: arc.n, week: arc.week } : undefined,
    bmt: bmt || undefined };
  session.xp = sessionXp(session);
  return { data: { ...data, sessions: [...data.sessions, session] }, session };
}
