// Datenmodell: ein Dokument, das komplett in IndexedDB liegt und so auch exportiert wird.
import { initialEngine } from './engine/cycle.js';
import { DEFAULT_HOLIDAY, rebaseFirstArc, seasonStartFrom } from './engine/arc.js';
import { sessionXp } from './engine/game.js';
import { fixCaveMurph } from './engine/pillars.js';
import { toDay } from './engine/dates.js';
import { effortToRpe, sessionIntensity, intensityFromRpe, trainingLoad } from './engine/session.js';

export const SCHEMA_VERSION = 12;

export function defaultData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    settings: {
      onboarded: false,
      equipment: {
        room: ['bag', 'bar', 'dipbars', 'box', 'kb', 'hammer', 'medball'],
        gym: ['barbell', 'rack', 'dumbbells', 'cable', 'rower', 'bar', 'rings', 'medball'],
      },
      weekPlan: { 1: 'C', 2: 'B', 4: 'A', 5: 'D' }, // UMBRA 2.0: Mo Push, Di Legs, Do Pull, Fr Full Body
      mtDays: [1, 4], // Muay Thai abends
      kbWeights: [8, 12, 16, 20, 24],
      inventory: { room: {}, gym: {} }, // Bestand pro Ort; leer = allgemeine KB-Liste
      bodyweight: 80,
      restSec: 75,
      sound: true,
      startValues: {},
      lastBackupAt: null,
      backupNudgeAt: null,
      holiday: { ...DEFAULT_HOLIDAY },
      elbowThreshold: 3,
    },
    engine: initialEngine(toDay()),
    exState: {},
    records: {},
    sessions: [],
    checkins: {},
    mobility: [],
    ruleLog: [],
    signals: { elbow: [], pain: [] },
    reviews: {}, // Wochenrückblicke je Montag der Woche
    debriefs: {}, // Arc-Debriefs je Arc-Nummer
    sideQuests: {}, // gewählte Side Quest je Woche
    bmt: { name: 'Bang Muay Thai', program: 'Jahr 1', weeks: [], current: null }, // eigenes Muay-Thai-Programm
    techChecks: {}, // Technik-Check je Monat (YYYY-MM)
    wrist: { on: false, side: null, stage: null, startStage: null, onSince: null, stageLog: [], checks: [], pain: [], levels: {}, greens: {}, redFrom: null, lastVariant: null, flags: {}, ended: null }, // Handgelenk-Modul
    feet: { stage: 1, stageLog: [], checks: [], steps: {}, flags: {} }, // FEET (Fotos liegen separat in IndexedDB)
    active: null,
  };
}

/**
 * Migrationen, Schritt für Schritt. Jede nimmt das Dokument einer Version und gibt die nächste zurück.
 * Deine Daten (Log, Rekorde, Gewichte, Check-ins, Mobility) bleiben immer erhalten.
 */
const MIGRATIONS = {
  // v1 → v2: Arcs ersetzen den Deload-Zähler (18 Missionen). Der erste Arc startet in der Woche der Migration.
  1(raw) {
    const { fullSinceDeload, deloadRemaining, ...engine } = raw.engine || {};
    return {
      ...raw,
      schemaVersion: 2,
      engine: { ...engine, arc: null, slotVariant: {}, stagnationDismissed: {} },
      settings: { ...raw.settings, holiday: raw.settings?.holiday || { ...DEFAULT_HOLIDAY } },
      ruleLog: raw.ruleLog || [],
    };
  },
};

MIGRATIONS[2] = (raw) => {
  // v2 → v3: (1) Arc I startet am Tag der ersten Mission, angebrochene Wochen werden anteilig neu bewertet.
  //          (2) XP aller Einträge mit der zentralen XP-Konfiguration neu berechnet.
  const today = toDay();
  const holiday = raw.settings?.holiday || DEFAULT_HOLIDAY;
  let engine = { ...(raw.engine || {}) };
  let sessions = raw.sessions || [];
  if (!engine.arc || engine.arc.n === 0) {
    const r = rebaseFirstArc(sessions, today, holiday);
    engine = { ...engine, arc: r.arc };
    sessions = r.sessions;
  }
  sessions = sessions.map((s) => ({ ...s, xpV2: s.xp, xp: sessionXp(s) }));
  return { ...raw, schemaVersion: 3, engine, sessions,
    ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v3', day: today, suggestion: 'arc_rebase_xp_recalc', decision: 'applied' }] };
};

MIGRATIONS[3] = (raw) => {
  // v3 → v4: Belastung 1–5 pro Übung wird RPE 1–10 (1→2 … 5→10). Intensität und Trainingslast neu
  // (Session-RPE × Minuten). Die Vibrations-Einstellung entfällt (iPhone kann nicht vibrieren).
  const toRpe = (e) => {
    if (e.effort == null) return e;
    const { effort, ...rest } = e;
    return { ...rest, rpe: rest.rpe ?? effortToRpe(effort) };
  };
  const sessions = (raw.sessions || []).map((s) => {
    if (s.kind === 'arena') return s.rpe && s.minutes ? { ...s, load: Math.round(s.rpe * s.minutes) } : s;
    if (!s.exercises && !s.intervals) return s;
    const exercises = s.exercises ? s.exercises.map(toRpe) : s.exercises;
    const intensity = exercises ? sessionIntensity(exercises) : intensityFromRpe(s.intervals?.rpe);
    const next = { ...s, exercises };
    if (intensity != null) next.intensity = intensity; else delete next.intensity;
    const load = trainingLoad(intensity, s.minutes);
    if (load) next.load = load; else delete next.load;
    return next;
  });
  const active = raw.active?.log ? { ...raw.active, log: raw.active.log.map(toRpe) } : raw.active;
  const { vibration, ...settings } = raw.settings || {};
  return { ...raw, schemaVersion: 4, sessions, active, settings,
    ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v4', day: toDay(), suggestion: 'effort_to_rpe', decision: 'applied' }] };
};

MIGRATIONS[4] = (raw) => {
  // v4 → v5: Handgelenk-Modul (AUS) und HANDS. Hammer als Equipment im eigenen Raum (vorhanden).
  const eq = raw.settings?.equipment || {};
  const room = eq.room ? [...new Set([...eq.room, 'hammer'])] : eq.room;
  return { ...raw, schemaVersion: 5, settings: { ...raw.settings, equipment: { ...eq, ...(room ? { room } : {}) } },
    ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v5', day: toDay(), suggestion: 'wrist_module', decision: 'applied' }] };
};

MIGRATIONS[5] = (raw) => ({
  // v5 → v6: FEET-Modul (Stufe 1, kein Check). Nichts sonst ändert sich.
  ...raw, schemaVersion: 6, feet: raw.feet || { stage: 1, stageLog: [], checks: [], steps: {}, flags: {} },
  ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v6', day: toDay(), suggestion: 'feet_module', decision: 'applied' }],
});

MIGRATIONS[6] = (raw) => {
  // v6 → v7: FORGE wird 5. Platz der Rotation (direkt nach INFILTRATION). Home Gym macht sonst A–D mit Gym-Übungen.
  const q = (raw.engine?.queue || ['A', 'B', 'C', 'D']).filter((m) => m !== 'FORGE');
  const i = q.indexOf('D');
  const queue = i < 0 ? [...q, 'FORGE'] : [...q.slice(0, i + 1), 'FORGE', ...q.slice(i + 1)];
  return { ...raw, schemaVersion: 7, engine: { ...raw.engine, queue },
    ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v7', day: toDay(), suggestion: 'forge_slot', decision: 'applied' }] };
};

MIGRATIONS[7] = (raw) => ({
  // v7 → v8: Gelenk-Pause an (Handgelenk links, Golferellbogen rechts): Handgelenk-Modul und Ellbogen-Prehab ruhen.
  ...raw, schemaVersion: 8, settings: { ...raw.settings, jointPause: true },
  ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v8', day: toDay(), suggestion: 'joint_pause', decision: 'applied' }],
});

MIGRATIONS[8] = (raw) => {
  // v8 → v9: Bestand pro Ort (Fighting Cave, Home Gym). KB-Gewichte je 1 Stück an jedem Ort, an dem KBs abgehakt sind.
  // Kletterseil ist ein eigenes Teil (vorher „Ringe / Kletterseil“).
  const eq = raw.settings?.equipment || {};
  const kb = Object.fromEntries((raw.settings?.kbWeights || []).map((w) => [w, 1]));
  const inv = (place) => ((eq[place] || []).includes('kb') ? { kb: { ...kb } } : {});
  const withRope = (list) => (list && list.includes('rings') ? [...new Set([...list, 'climb_rope'])] : list);
  return { ...raw, schemaVersion: 9,
    settings: { ...raw.settings, inventory: raw.settings?.inventory || { room: inv('room'), gym: inv('gym') },
      equipment: { ...eq, ...(eq.room ? { room: withRope(eq.room) } : {}), ...(eq.gym ? { gym: withRope(eq.gym) } : {}) } },
    ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v9', day: toDay(), suggestion: 'inventory', decision: 'applied' }] };
};

MIGRATIONS[9] = (raw) => {
  // v9 → v10: Saisons statt Arc-Kreis (Konzept 27.10.2026). Die neue Saison startet am nächsten Montag mit Woche 1.
  // Bisherige Sessions bekommen n = −1 („Vorbereitung“), damit sie nicht als Saisonwochen zählen. Alte Bosse sind raus.
  const today = toDay();
  const arc = seasonStartFrom(today);
  const sessions = (raw.sessions || []).map((x) => (x.arc ? { ...x, arc: { n: -1, week: x.arc.week } } : x));
  const engine = { ...raw.engine, arc, bossEvents: {}, introSeen: {}, arcHistory: [], prevArc: raw.engine?.arc || null };
  return { ...raw, schemaVersion: 10, engine, sessions,
    ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v10', day: today, suggestion: `season:${arc.n}:${arc.startedDay}`, decision: 'applied' }] };
};

MIGRATIONS[10] = (raw) => {
  // v10 → v11: UMBRA 2.0. Feste Wochentage (Standard Mo Push, Di Legs, Do Pull, Fr Full Body, Muay Thai Mo und Do),
  // Medizinball an beiden Orten. Log, Rekorde und Progression bleiben unverändert.
  const eq = raw.settings?.equipment || {};
  const add = (list) => (list ? [...new Set([...list, 'medball'])] : list);
  return { ...raw, schemaVersion: 11,
    settings: { ...raw.settings, weekPlan: raw.settings?.weekPlan || { 1: 'C', 2: 'B', 4: 'A', 5: 'D' }, mtDays: raw.settings?.mtDays || [1, 4],
      equipment: { ...eq, ...(eq.room ? { room: add(eq.room) } : {}), ...(eq.gym ? { gym: add(eq.gym) } : {}) } },
    ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v11', day: toDay(), suggestion: 'umbra_2_week_plan', decision: 'applied' }] };
};

MIGRATIONS[11] = (raw) => {
  // v11 → v12 (V44): Turnringe im Home Gym (Ring Rows statt Rudern am Barren). Nacken vorne und seitlich getrennt:
  // Neck Curls übernehmen den Stand der alten Übung, seitlich startet eine Stufe leichter.
  // Korrektur auf Wunsch: Suitcase Carry der letzten Einheit mit 22 kg statt 12 kg.
  const eq = raw.settings?.equipment || {};
  const exState = { ...(raw.exState || {}) };
  const old = exState.neck_flex_side;
  if (old && !exState.neck_curl_plate) exState.neck_curl_plate = { ...old, exId: 'neck_curl_plate' };
  if (old && !exState.neck_lateral_plate) {
    const kg = old.load > 0 ? Math.max(0, Math.round((old.load * 0.6) / 1.25) * 1.25) : 0;
    exState.neck_lateral_plate = { ...old, exId: 'neck_lateral_plate', load: kg };
  }
  const sessions = (raw.sessions || []).slice();
  const at = sessions.map((x, i) => [x, i]).filter(([x]) => (x.exercises || []).some((e) => e.exId === 'suitcase_carry')).pop();
  let fixed = false;
  if (at) {
    const [sess, i] = at;
    sessions[i] = { ...sess, exercises: sess.exercises.map((e) => (e.exId !== 'suitcase_carry' ? e
      : { ...e, sets: e.sets.map((x) => (x.load === 12 ? (fixed = true, { ...x, load: 22 }) : x)) })) };
    if (fixed && exState.suitcase_carry?.load === 12) exState.suitcase_carry = { ...exState.suitcase_carry, load: 22 };
    const rec = raw.records?.suitcase_carry;
    if (fixed && rec && rec.load === 12 && rec.day === sess.day) raw = { ...raw, records: { ...raw.records, suitcase_carry: { ...rec, load: 22 } } };
  }
  // ASCENT: Tactical Pull-ups wieder als Anker im CMPND Block (ein Tausch „für den Rest des Arcs“ wird aufgehoben)
  const swaps = Object.fromEntries(Object.entries(raw.engine?.arcSwaps || {}).filter(([k, v]) => !(k.startsWith('A:') && v?.from === 'pullup_tactical')));
  const engine = raw.engine ? { ...raw.engine, arcSwaps: swaps } : raw.engine;
  return { ...raw, schemaVersion: 12, exState, sessions, engine,
    settings: { ...raw.settings, equipment: { ...eq, ...(eq.gym ? { gym: [...new Set([...eq.gym, 'rings'])] } : {}) } },
    ruleLog: [...(raw.ruleLog || []), { at: new Date().toISOString(), rule: 'migration:v12', day: toDay(),
      suggestion: `rings_gym, neck_split${fixed ? ', suitcase_carry_22kg' : ''}`, decision: 'applied' }] };
};

export function migrate(raw) {
  let doc = raw;
  let v = doc.schemaVersion || 1;
  while (v < SCHEMA_VERSION) {
    doc = MIGRATIONS[v](doc);
    v = doc.schemaVersion;
  }
  return doc;
}

// Import/Migration: fehlende Felder mit Standardwerten auffüllen.
export function normalize(input) {
  let raw = input;
  const d = defaultData();
  if (!raw || typeof raw !== 'object') throw new Error('Keine gültige UMBRA-Datei.');
  if (!Array.isArray(raw.sessions) || !raw.settings) throw new Error('Keine gültige UMBRA-Datei.');
  if ((raw.schemaVersion || 1) > SCHEMA_VERSION) throw new Error('Diese Sicherung stammt aus einer neueren App-Version.');
  raw = migrate(raw);
  return fixCaveMurph({
    ...d,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    settings: { ...d.settings, ...raw.settings,
      equipment: { ...d.settings.equipment, ...(raw.settings.equipment || {}) } },
    engine: { ...d.engine, ...(raw.engine || {}) },
    mobility: Array.isArray(raw.mobility) ? raw.mobility : [],
    ruleLog: Array.isArray(raw.ruleLog) ? raw.ruleLog : [],
    signals: { elbow: raw.signals?.elbow || [], pain: raw.signals?.pain || [] },
    reviews: raw.reviews || {},
    debriefs: raw.debriefs || {},
    sideQuests: raw.sideQuests || {},
    bmt: raw.bmt?.weeks ? raw.bmt : { name: 'Bang Muay Thai', program: 'Jahr 1', weeks: [], current: null },
    techChecks: raw.techChecks && typeof raw.techChecks === 'object' ? raw.techChecks : {},
    wrist: { ...d.wrist, ...(raw.wrist || {}) },
    feet: { ...d.feet, ...(raw.feet || {}) },
  });
}
