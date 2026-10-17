// Datenmodell: ein Dokument, das komplett in IndexedDB liegt und so auch exportiert wird.
import { initialEngine } from './engine/cycle.js';
import { DEFAULT_HOLIDAY } from './engine/arc.js';
import { toDay } from './engine/dates.js';

export const SCHEMA_VERSION = 2;

export function defaultData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    settings: {
      onboarded: false,
      equipment: {
        room: ['bag', 'bar', 'dipbars', 'box', 'kb'],
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
  };
}
