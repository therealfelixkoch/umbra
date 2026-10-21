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

// Fotos (Fußabdruck) nur lokal, getrennt vom Datendokument: nicht im JSON-Export
export const putPhoto = (id, dataUrl) => tx('readwrite', (s) => s.put(dataUrl, `photo:${id}`));
export const getPhoto = (id) => tx('readonly', (s) => s.get(`photo:${id}`));

/** Bild verkleinern (längste Kante 720 px, JPEG), damit der Speicher klein bleibt. */
export function shrinkImage(file, max = 720) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k);
      cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden.')); };
    img.src = url;
  });
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
export async function exportFile(data, day, name = `umbra-backup-${day}.json`) {
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
