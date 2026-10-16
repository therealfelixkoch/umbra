// Persistenz: ein Dokument in IndexedDB. Dazu Export/Import als JSON-Datei.
import { defaultData, normalize } from './state.js';

const DB_NAME = 'umbra';
const STORE = 'kv';
const KEY = 'data';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  }));
}

export async function load() {
  const raw = await tx('readonly', (s) => s.get(KEY));
  return raw ? normalize(raw) : defaultData();
}

let pending = Promise.resolve();
export function save(data) {
  // Schreibvorgänge nacheinander, damit nichts überholt wird.
  pending = pending.then(() => tx('readwrite', (s) => s.put(data, KEY))).catch((e) => console.error(e));
  return pending;
}

export async function requestPersist() {
  try {
    if (navigator.storage?.persisted && await navigator.storage.persisted()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// true = gesichert, false = abgebrochen
export async function exportFile(data, day) {
  const name = `umbra-backup-${day}.json`;
  const json = JSON.stringify(data, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'UMBRA Backup' });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return true;
}

export async function readImportFile(file) {
  const text = await file.text();
  return normalize(JSON.parse(text));
}
