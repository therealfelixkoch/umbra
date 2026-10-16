// Datenmodell: ein Dokument, das komplett in IndexedDB liegt und so auch exportiert wird.
import { initialEngine } from './engine/cycle.js';

export const SCHEMA_VERSION = 1;

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
    },
    engine: initialEngine(),
    exState: {},
    records: {},
    sessions: [],
    checkins: {},
    active: null,
  };
}

// Import/Migration: fehlende Felder mit Standardwerten auffüllen.
export function normalize(raw) {
  const d = defaultData();
  if (!raw || typeof raw !== 'object') throw new Error('Keine gültige UMBRA-Datei.');
  if (!Array.isArray(raw.sessions) || !raw.settings) throw new Error('Keine gültige UMBRA-Datei.');
  return {
    ...d,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    settings: { ...d.settings, ...raw.settings,
      equipment: { ...d.settings.equipment, ...(raw.settings.equipment || {}) } },
    engine: { ...d.engine, ...(raw.engine || {}) },
  };
}
