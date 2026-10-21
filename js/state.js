// Datenmodell: ein Dokument, das komplett in IndexedDB liegt und so auch exportiert wird.
import { initialEngine } from './engine/cycle.js';
import { DEFAULT_HOLIDAY, rebaseFirstArc } from './engine/arc.js';
import { sessionXp } from './engine/game.js';
import { toDay } from './engine/dates.js';
import { effortToRpe, sessionIntensity, intensityFromRpe, trainingLoad } from './engine/session.js';

export const SCHEMA_VERSION = 6;

export function defaultData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    settings: {
      onboarded: false,
      equipment: {
        room: ['bag', 'bar', 'dipbars', 'box', 'kb', 'hammer'],
        gym: ['barbell', 'rack', 'dumbbells', 'cable', 'rower', 'bar'],
      },
      kbWeights: [8, 12, 16, 20, 24],
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
  return {
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
  };
}
