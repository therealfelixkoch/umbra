// Aus Mission + Profil + Log wird ein konkreter Plan; nach dem Training wird der Log verbucht.
import { MISSIONS, MISSION_KIND, FULL_MISSIONS, TRAVEL_SWAP } from '../data/missions.js';
import { getDef as defaultGetDef, EXERCISES } from '../data/exercises.js';
import { elbowStatus, activeRegions, adjustment } from './signals.js';
import { PLYO, CONTRAST } from '../data/arcs.js';
import { gapDays, lastSetsFor, ROTATION } from './history.js';
import { initialArc, weekInfo, holidayActive, DEFAULT_HOLIDAY } from './arc.js';
import { modifierFor, completeMission } from './cycle.js';
import { initialState, progress, ladderFor, snap, canLoad, setScore, stepLoad } from './progression.js';
import { sessionXp } from './game.js';
import { daysBetween } from './dates.js';
import { latestTest, selectStretches } from './mobility.js';
import { weekCoverage, gapsFor } from './progress.js';
import { weekStart } from './dates.js';
import { activeMinutes, sessionIntensity, intensityFromRpe, trainingLoad } from './session.js';
import { W as wristOf, blockForMission, blockEntries, wristAdjust, strengthVariant, flatHandOk } from './wrist.js';
import { HANDS_SEQUENCE } from '../data/wrist.js';
import { FT, feetSequence, sparTomorrow as feetSpar } from './feet.js';

// Equipment und Einstellungen für ein Profil. Im Home Gym ersetzen Kurzhanteln die Kettlebells.
export function profileContext(settings, profile) {
  // Unterwegs: nur, was im Check-in angehakt wurde (Kurzhanteln, Laufband, Band, Bank/Stuhl)
  const equipment = [...(profile === 'travel' ? settings.travelGear || [] : settings.equipment?.[profile] || [])];
  let s = settings;
  if ((profile === 'gym' || profile === 'travel') && !equipment.includes('kb') && equipment.includes('dumbbells')) {
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

// Unterwegs-Prefix: eigene Progression, die Ankerübungen bleiben unberührt.
export const stateKey = (profile, key) => (profile === 'travel' ? `travel:${key}` : key);

/**
 * Ersatz für unterwegs: bevorzugter Ersatz, dann die Alternativen-Kette, dann eine Übung mit
 * gleichem Bewegungsmuster (geteilte Attribute, gleiche Kategorie) aus dem Vorhandenen.
 */
export function travelExercise(id, equipment, getDef = defaultGetDef, all = EXERCISES) {
  const has = (d) => d && (d.equipment || []).every((e) => equipment.includes(e));
  for (const alt of TRAVEL_SWAP[id] || []) if (has(getDef(alt))) return alt;
  const r = resolveExercise(id, equipment, getDef);
  if (r) return r;
  const def = getDef(id);
  if (!def) return null;
  const attrs = new Set(def.tags.map(([a]) => a));
  const best = Object.values(all)
    .filter((d) => d.id !== id && d.cat !== 'mobility' && d.mode === def.mode && has(d))
    .map((d) => ({ id: d.id, score: d.tags.filter(([a]) => attrs.has(a)).length * 3 + (d.cat === def.cat ? 2 : 0) }))
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)[0];
  return best?.id || null;
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
  plyoCap = false, wristKind = null, getDef = defaultGetDef }) {
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

  // Handgelenk-Modul: welcher Block gehört heute in diese Mission (oder die eigene Session)
  const wrist = wristOf(data);
  const wblock = missionId === 'WRIST' ? { kind: wristKind || 'strength', reason: '' }
    : !data.engine.wristDeclined || data.engine.wristDeclined !== today ? blockForMission(data, missionId, today) : null;
  const wBlock = wblock && isCompact && wblock.kind === 'strength' ? { kind: 'activation', reason: 'QUICK STRIKE: nur Handgelenk-Aktivierung.' } : wblock;
  const wItems = wBlock ? wristItems({ data, profile, equipment, today, getDef, kind: wBlock.kind }) : [];
  const wInfo = wBlock ? { kind: wBlock.kind, reason: wBlock.reason, variant: wBlock.kind === 'strength' ? strengthVariant(wrist) : null } : null;

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
      if (s.prehab && (wrist.on || data.settings.jointPause)) return; // Handgelenk-Modul ersetzt das Prehab, Gelenk-Pause lässt es weg
      if (s.plyo && contrastOn) return; // In Arc II übernehmen die Kontrastpaare die Sprünge.
      const slotKey = `${missionId}:${i}`;
      // Tausch „für den Rest des Arcs“ gilt nur im Arc, in dem er gewählt wurde.
      const arcSwap = data.engine.arcSwaps?.[slotKey];
      let id = (arcSwap && arcSwap.arc === arc.n && arcSwap.id) || data.engine.slotVariant?.[slotKey] || s.ex;
      let sets = s.sets;
      if (s.plyo) id = plyo.exId;
      else if (profile === 'gym' && s.gym && !data.engine.slotVariant?.[slotKey] && !(arcSwap && arcSwap.arc === arc.n)) {
        if (Array.isArray(s.gym)) {
          const n = data.sessions.filter((x) => x.missionId === missionId && x.profile === 'gym').length;
          id = s.gym[n % s.gym.length];
        } else id = s.gym;
        sets = s.gymSets ?? s.sets;
      }
      const key = profile === 'travel' ? travelExercise(id, equipment, getDef) : resolveExercise(id, equipment, getDef);
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
      // Handgelenk-Protokoll: Fäuste/Griffe statt flacher Hand, neutraler Griff (Hinweis, für heute ablehnbar)
      const wa = !declined && wristAdjust(wrist, item.exId);
      if (wa?.swap && resolveExercise(wa.swap, equipment, getDef) === wa.swap) {
        const swapped = itemFor(wa.swap, { data, profile, sets: item.sets, getDef, arcN: arc.n });
        item = { ...swapped, optional: item.optional, main: item.main, slotKey, originalKey: key, adjust: wa.note };
      } else if (wa) item.wristNote = wa.note;
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
    // Vor jeder Mission: nach dem Aufwärmen der freie Mobility-Block (3–5 min, abhaken, zählt nicht für den Fortschritt)
    if (full && !isCompact && items.length && getDef(items[0].exId)?.cat === 'aufwaermen') {
      items.splice(1, 0, { key: 'mobility_block', exId: 'mobility_block', sets: 1, target: 3, load: 0, ladder: [0],
        optional: true, prep: true, rir: null, trend: null, lastTime: null });
    }
    // Handgelenk: Kraftblock ans Ende, Aktivierung nach dem Aufwärmen
    if (wInfo?.kind === 'strength' || missionId === 'WRIST') items.push(...wItems);
    else if (wInfo) items.splice(items.length ? 1 : 0, 0, ...wItems);
    // Plyo-Info nur, wenn die Mission heute wirklich einen Sprungplatz hat
    return { ...base, items, plyo: items.some((it) => it.plyoStage) ? plyo : null, wrist: wInfo,
      ...(missionId === 'WRIST' ? { name: WRIST_NAMES[wInfo.kind], focus: WRIST_FOCUS[wInfo.kind], minutes: WRIST_MIN[wInfo.kind] } : {}) };
  }

  if (mission.format === 'circuit') {
    const src = mission.base ? MISSIONS[mission.base] : mission;
    const rounds = mission.light ? mission.rounds[0] : (data.exState[stateKey(profile, `circuit:${src.id}`)]?.target ?? src.rounds[0]);
    const items = src.items.map((it) => {
      const wanted = profile === 'gym' && it.gym ? it.gym : it.ex;
      const id = profile === 'travel' ? travelExercise(wanted, equipment, getDef) : resolveExercise(wanted, equipment, getDef);
      if (!id) return null;
      const def = getDef(id);
      const { load } = loadFor(def, data.exState[stateKey(profile, id)]);
      return { exId: id, value: def.id === it.ex || def.mode === getDef(it.ex).mode ? it.value : def.range[0], load };
    }).filter(Boolean);
    return { ...base, items, rounds, restBetween: src.restBetween, light: !!mission.light,
      wrist: wInfo, wristPrelude: wItems.length ? wItems : undefined };
  }

  if (mission.format === 'amrap') {
    const items = mission.items.map((it) => {
      const id = profile === 'travel' ? travelExercise(it.ex, equipment, getDef) : resolveExercise(it.ex, equipment, getDef);
      if (!id) return null;
      const def = getDef(id);
      return { exId: id, value: def.mode === getDef(it.ex).mode ? it.value : def.range[0],
        load: loadFor(def, data.exState[stateKey(profile, id)]).load };
    }).filter(Boolean);
    return { ...base, items };
  }

  if (mission.format === 'intervals') {
    const exId = profile === 'gym' && mission.gymEx ? mission.gymEx : mission.ex;
    return { ...base, rounds: mission.rounds, work: mission.work, rest: mission.rest, exId,
      warmup: mission.warmup || 0, cooldown: mission.cooldown || 0, rpeLog: !!mission.rpeLog };
  }

  // HANDS: feste Reihenfolge, Timer (s) oder Wiederholungszähler je Schritt
  if (mission.hands) {
    const knuckles = wrist.on && !flatHandOk(wrist);
    const seq = [];
    for (const e of HANDS_SEQUENCE) {
      for (let r = 1; r <= e.rounds; r++) {
        seq.push({ exId: e.ex, sec: e.sec || null, reps: e.reps || null, round: r, of: e.rounds,
          label: e.ex === 'h_quadruped' && knuckles ? 'auf den Knöcheln (Handgelenk-Protokoll)' : e.label || null });
      }
    }
    const items = [...new Set(HANDS_SEQUENCE.map((e) => e.ex))].map((id) => ({ exId: id, value: HANDS_SEQUENCE.find((e) => e.ex === id).sec || HANDS_SEQUENCE.find((e) => e.ex === id).reps }));
    return { ...base, items, seq, rounds: 1, work: 25, hands: true };
  }

  // FEET: Stufe aus dem Fuß-Check, einbeinige Übungen je Seite (schwächere Seite +1 Satz), Equipment-Ersatz
  if (mission.feet) {
    const f = FT(data);
    const resolve = (id) => (profile === 'travel' ? travelExercise(id, equipment, getDef) : resolveExercise(id, equipment, getDef));
    const r = feetSequence(f, { resolve, noJumps: f.stage >= 4 && feetSpar(data, today), getDef });
    const items = [...new Set(r.seq.map((x) => x.exId))].map((id) => ({ exId: id, value: r.seq.find((x) => x.exId === id).sec || r.seq.find((x) => x.exId === id).reps }));
    return { ...base, name: `FEET · Stufe ${f.stage}`, focus: `${r.name} · barfuß`, minutes: r.minutes, items, seq: r.seq, rounds: 1, work: 30,
      feet: true, weak: r.weak, noJumps: r.swapped, stage: f.stage };
  }

  // flow
  const scores = latestTest(data.mobility)?.scores;
  return { ...base, items: flowItems(mission, today, scores, getDef), rounds: mission.rounds, work: mission.work,
    personalized: !!scores };
}

export const WRIST_NAMES = { strength: 'HANDGELENK · Kraftblock', activation: 'HANDGELENK · Aktivierung', minimal: 'HANDGELENK · Minimal-Dosis', maintenance: 'HANDGELENK · Erhaltung' };
const WRIST_FOCUS = { strength: 'Übungen der aktuellen Stufe', activation: 'Isometrie in 6 Richtungen, Pronator quadratus, ECU', minimal: 'Isometrie in 6 Richtungen und Gelenkgefühl', maintenance: 'Isometrie, Hammer-Drehung, Bottom-up Hold' };
const WRIST_MIN = { strength: 12, activation: 4, minimal: 5, maintenance: 10 };

/**
 * Handgelenk-Block als Satz-Einträge. Übungen nach Equipment aufgelöst (ohne Hammer: Flasche usw.).
 * Isometrie: ein Satz je Richtung, Holds über holdReps. Keine Double Progression: Steigerung über die Ampel (Stufen der Übung).
 */
export function wristItems({ data, profile, equipment, today, getDef = defaultGetDef, kind }) {
  const w = wristOf(data);
  const both = w.side === 'beide';
  return blockEntries(w, kind, today).map((e) => {
    const id = profile === 'travel' ? travelExercise(e.key, equipment, getDef) : resolveExercise(e.key, equipment, getDef);
    if (!id) return null;
    const def = getDef(id);
    const base = itemFor(id, { data, profile, sets: e.sets, getDef });
    const target = e.target ?? def.range[0];
    const level = w.levels[e.key] || 0;
    const item = { ...base, key: id, target, sets: e.sets, wrist: true, wristKey: e.key, rir: null, noFailure: true, trend: null,
      levelLabel: def.levels ? def.levels[Math.min(level, def.levels.length - 1)] : null,
      holdReps: e.holdReps || null, bothSides: both && def.mode === 'time' };
    if (e.dirs) item.setPlan = e.dirs.map((d) => ({ value: target, load: 0, label: d }));
    if (e.flat) item.wristNote = 'Flache Hand, Ampel beachten.';
    return item;
  }).filter(Boolean);
}

// Ein Satz-Eintrag für eine Übung (Zustand, Variante, Last, Ziel). Auch für den Übungstausch.
export function itemFor(key, { data, profile, sets, getDef = defaultGetDef, arcN = null, range }) {
  const { equipment, settings } = profileContext(data.settings, profile);
  const baseDef = getDef(key);
  let st = data.exState[stateKey(profile, key)] || initialState(baseDef, { settings, startValues: data.settings.startValues, getDef, equipment });
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
  // Fixes Gewicht: Zusatzsatz und langsameres Tempo statt mehr Last
  const fixed = !!data.settings.fixedLoad?.[stateKey(profile, key)];
  const same = def.id === st.exId;
  return { key, exId: def.id, sets: sets + (fixed && same && st.extraSet ? 1 : 0), target, load, ladder, optional: false, range: range || def.range,
    trend: st.lastChange, lastTime: lastSetsFor(data.sessions, def.id), noFailure: false,
    fixed: fixed || undefined, tempo: (fixed && same && st.tempo) || undefined };
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
    .filter((d) => d.id !== exId && d.cat !== 'mobility' && (d.mode !== 'fixed') === (def.mode !== 'fixed'))
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

// Kondition und Aufwärmen gelten beim Tauschen als eine Kategorie (Seil ↔ Rudern ↔ Sack ↔ Lauf).
const swapCat = (cat) => (cat === 'aufwaermen' ? 'kondition' : cat);

/**
 * Tausch-Liste in drei Gruppen: empfohlen (gleiches Muster, passendes Equipment),
 * gleiche Kategorie, alle übrigen. Jede Übung ist wählbar; fehlendes Equipment wird nur markiert.
 */
export function swapGroups(exId, { data, profile, today, getDef = defaultGetDef, all }) {
  const { equipment } = profileContext(data.settings, profile);
  const def = getDef(exId);
  const has = (d) => (d.equipment || []).every((e) => equipment.includes(e));
  const recommended = swapOptions(exId, { data, profile, today, getDef, all });
  const seen = new Set([exId, ...recommended.map((o) => o.id)]);
  const rest = Object.values(all).filter((d) => !seen.has(d.id));
  const byName = (a, b) => (a.has === b.has ? a.name.localeCompare(b.name) : a.has ? -1 : 1);
  const item = (d) => ({ id: d.id, name: d.name, cat: d.cat, has: has(d) });
  const category = rest.filter((d) => swapCat(d.cat) === swapCat(def.cat) && d.cat !== 'mobility').map(item).sort(byName);
  const catIds = new Set(category.map((o) => o.id));
  const others = rest.filter((d) => !catIds.has(d.id)).map(item).sort(byName);
  return { recommended: recommended.map((o) => ({ ...o, name: getDef(o.id).name, has: true })), category, all: others };
}

// Laufendes Training aus einem Plan. Sätze sind mit dem Ziel vorausgefüllt.
export function createActive(plan, today, now = Date.now()) {
  const active = { plan, day: today, startedAt: now, index: 0, roundsDone: 0, marks: [now] };
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
    stage: p.feet ? p.stage : undefined, noJumps: p.feet && p.noJumps ? true : undefined,
    afterPause: p.gap != null && p.gap >= 8 ? true : undefined, gap: p.gap ?? undefined,
    modifier: p.modifier?.type || 'none', completion,
    minutes: activeMinutes([active.startedAt, ...(active.marks || []), now], { countGaps: !!active.countGaps }).minutes,
    exercises: [], roundsDone: active.roundsDone,
    items: p.format === 'sets' ? undefined : p.items ? p.items.map((i) => i.exId) : p.exId ? [p.exId] : [] };

  if (p.format === 'sets') {
    active.log.forEach((entry, i) => {
      const done = entry.sets.filter((s) => s.done);
      const it = p.items[i];
      session.exercises.push({ exId: entry.exId, key: entry.key, sets: entry.sets, rpe: entry.rpe ?? undefined,
        swappedFrom: it.swappedFrom || undefined, swapScope: it.swapScope || undefined,
        elbow: entry.elbowReported || undefined, adjust: it.adjust || undefined, note: entry.note || undefined,
        intervals: entry.intervals || undefined });
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
      if (item.explosive || item.wrist) return; // Handgelenk-Übungen steigern über die Ampel, nicht per Double Progression
      if (p.modifier?.type && p.modifier.type !== 'none') return;
      const base = getDef(entry.key);
      const sk = stateKey(p.profile, entry.key);
      const st = exState[sk] ||
        initialState(base, { settings, startValues: data.settings.startValues, getDef, equipment });
      const cur = st.exId === entry.exId ? { ...st, target: item.target } : { ...st, exId: entry.exId, target: item.target };
      // Arc II: Progression nur über den Top-Satz
      const counted = item.topSet ? done.filter((s) => s.label === 'Top-Satz') : done;
      if (!counted.length) return;
      const ranged = item.range ? { ...def, range: item.range } : def;
      const nx = { ...progress(ranged, cur, counted.map((s) => ({ value: s.value, load: s.load, rir: s.rir })),
        { settings, equipment, getDef, rir: item.rir ?? null, fixed: !!data.settings.fixedLoad?.[sk] }), arc: p.arc?.n };
      // Stufen-Vorschlag gehört zu einem Platz der Rotation (unterwegs nicht)
      if (nx.suggest && (!item.slotKey || p.profile === 'travel')) delete nx.suggest;
      else if (nx.suggest) nx.suggest = { ...nx.suggest, slotKey: item.slotKey };
      exState[sk] = nx;
    });
  }

  if ((p.missionId === 'D' || p.missionId === 'HOTEL') && p.modifier?.type === 'none') {
    const ck = stateKey(p.profile, `circuit:${p.missionId}`);
    const c = exState[ck] || { target: 3, streak: 0 };
    const streak = active.roundsDone >= c.target ? c.streak + 1 : 0;
    exState[ck] = streak >= 2 && c.target < 4 ? { target: c.target + 1, streak: 0 } : { ...c, streak };
  }
  if (p.format === 'amrap' && active.roundsDone > 0) {
    const prev = records.EXPRESS;
    if (!prev || active.roundsDone > prev.value) {
      records.EXPRESS = { score: 0, value: active.roundsDone, day };
      if (prev) newRecords.push({ exId: 'EXPRESS', value: active.roundsDone });
    }
  }

  if (p.format === 'intervals' && active.ivLog) {
    session.intervals = { rpe: active.ivLog.rpe || [], meters: active.ivLog.meters || undefined, note: active.ivLog.note || undefined };
  }
  // Intensität 1–5 und Trainingslast (nur Anzeige)
  session.intensity = p.format === 'sets' ? sessionIntensity(session.exercises)
    : session.intervals ? intensityFromRpe(session.intervals.rpe) : (active.rpe ?? null);
  if (session.intensity == null) delete session.intensity;
  const load = trainingLoad(session.intensity, session.minutes);
  if (load) session.load = load;
  // Handgelenk: welcher Block lief, welche Modul-Übungen wurden gemacht (für Ampel und Dosis-Regeln)
  if (p.wrist) {
    session.wristBlock = p.wrist.kind;
    session.wristKeys = p.format === 'sets'
      ? p.items.map((it, i) => (it.wrist && active.log[i].sets.some((x) => x.done) ? it.wristKey : null)).filter(Boolean)
      : (p.wristPrelude || []).map((it) => it.wristKey);
  }
  if (p.hands && active.feel) session.feel = active.feel; // Handgelenk-Gefühl 1–5 (optional)
  session.records = newRecords;
  session.xp = sessionXp(session);

  const holiday = data.settings.holiday ?? DEFAULT_HOLIDAY;
  const gap = holidayActive(day, holiday) ? null : gapDays(data.sessions, day, holiday);
  const engine = p.compact || FULL_MISSIONS.includes(p.missionId)
    ? completeMission(data.engine, { missionId: p.missionId, slot: p.slot, rotate: p.rotate, gap, modifier: p.modifier })
    : data.engine;

  // Für „Einheit löschen“: vorheriger Stand von Rotation, Progression und Bestleistungen (nur was sich geändert hat)
  const diff = (before, after) => Object.fromEntries(Object.keys(after).filter((k) => after[k] !== before[k]).map((k) => [k, before[k] ?? null]));
  session.undo = { queue: data.engine.queue, comeback: data.engine.comeback ?? null, exState: diff(data.exState, exState), records: diff(data.records, records) };

  return {
    data: { ...data, exState, records, engine, sessions: [...data.sessions, session], active: null,
      ...(p.wrist?.variant ? { wrist: { ...(data.wrist || {}), lastVariant: p.wrist.variant } } : {}) },
    session,
  };
}

/**
 * Verbuchte Einheit löschen. War es die letzte Trainingseinheit, wird der Stand davor wiederhergestellt
 * (Rotation, Wiedereinstieg, Progression, Bestleistungen). Bei älteren Einheiten rückt nur ihr Rotationsplatz wieder nach vorn.
 * XP, Wochenziel und Tagesziel rechnen sich aus dem Log und stimmen danach von selbst.
 */
export function deleteSession(data, id) {
  const idx = data.sessions.findIndex((x) => x.id === id);
  if (idx < 0) return data;
  const s = data.sessions[idx];
  const sessions = data.sessions.filter((x) => x.id !== id);
  const training = (x) => x.kind === 'mission' || x.kind === 'express';
  if (!training(s)) return { ...data, sessions };
  const last = !data.sessions.slice(idx + 1).some(training);
  if (last && s.undo) {
    const restore = (cur, prev) => {
      const out = { ...cur };
      for (const [k, v] of Object.entries(prev || {})) { if (v == null) delete out[k]; else out[k] = v; }
      return out;
    };
    return { ...data, sessions, exState: restore(data.exState, s.undo.exState), records: restore(data.records, s.undo.records),
      engine: { ...data.engine, queue: s.undo.queue, comeback: s.undo.comeback } };
  }
  const pos = ROTATION.includes(s.missionId) ? s.missionId : s.slot;
  if (!pos || !FULL_MISSIONS.includes(s.missionId) || !data.engine.queue.includes(pos)) return { ...data, sessions };
  return { ...data, sessions, engine: { ...data.engine, queue: [pos, ...data.engine.queue.filter((m) => m !== pos)] } };
}

// Ab diesem Gefühlswert zählt eine Arena-Einheit als hart (wie Sparring).
export const HARD_RPE = 7;

export function logArena(data, { day, intensity, rpe, minutes = 60, bmt = null, content = null, sparRounds = null,
  focus = null, now = Date.now() }) {
  const r = rpe ?? (intensity === 'hard' ? 8 : 4);
  const arc = data.engine?.arc;
  const session = { id: `a${now}`, day, kind: 'arena', missionId: 'ARENA', rpe: r,
    intensity: r >= HARD_RPE ? 'hard' : 'light', minutes, arc: arc ? { n: arc.n, week: arc.week } : undefined,
    bmt: bmt || undefined, content: content?.length ? content : undefined, sparRounds: sparRounds || undefined,
    focus: focus?.trim() || undefined, load: Math.round(r * minutes) };
  session.xp = sessionXp(session);
  return { data: { ...data, sessions: [...data.sessions, session] }, session };
}
