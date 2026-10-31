// TEMPER-Sprecherclips (Buch I): Intro vor der Übung, Begleit-Clips zur Sekunde, Check-ins, Outro.
// Abgespielt über Web Audio (zuverlässig auf iOS, auch nach dem ersten Tap). Fehlt eine Datei, bleibt es still
// und die Episode läuft wie bisher mit Tönen und Text. Clips laufen nacheinander, nie übereinander.
import { audioCtx } from './sound.js';

const DIR = 'assets/temper/b1/';
const CHECKINS = ['ci-1', 'ci-2', 'ci-3', 'ci-4', 'ci-5', 'ci-6'];

// ECHO-Scan: je Region ein Clip (r-stirn …) zu Beginn der Station, dann ein Clip zum Loslassen je Modus
const SCAN_STEP = { release: 'scan-out' };
const slug = (s) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const regionClip = (region) => `r-${slug(region)}`;
export const scanStepClip = (mode) => SCAN_STEP[mode] || null;

// Begleit-Clips je Episode: Abschnitt (Index im Episodenskript), Sekunde im Abschnitt, Clip (ohne Präfix b1-)
const PLAN = {
  1: [[0, 0, 'e01-c1'], [0, 50, 'e01-c2'], [0, 100, 'e01-c3'], [0, 150, 'e01-c4'], [0, 200, 'e01-c5'], [0, 250, 'e01-c6']],
  2: [[0, 0, 'count-start']],
  3: [[0, 0, 'count-start'], [0, 15, 'count-tap']],
  4: [[0, 0, 'breath-start'], [1, 0, 'e04-c1']],
  5: [[1, 0, 'count-start']],
  6: [[0, 0, 'count-start'], [0, 10, 'thought-1']],
  7: [[0, 0, 'count-start'], [0, 10, 'thought-2']],
  8: [[1, 0, 'e08-c1'], [1, 85, 'e08-c2'], [1, 170, 'e08-c3'], [1, 255, 'e08-c4']],
  9: [[0, 0, 'wave-start'], [0, 40, 'wave-peak'], [0, 75, 'wave-end'], [1, 0, 'count-start']],
  10: [[0, 0, 'silent'], [0, 410, 'end-tone']],
};

const pad = (n) => String(n).padStart(2, '0');
const raw = new Map(); // Name → ArrayBuffer | null (null = Datei fehlt)
const buffers = new Map(); // Name → AudioBuffer
let busyUntil = 0;
let playing = [];
let voice = null;

/** Clips einer Episode: Intro, Outro, Begleit-Clips, Scan-Clips und Check-ins. */
export function episodeClips(ep) {
  if (!ep) return { intro: null, outro: null, cues: [], all: [] };
  const e = `e${pad(ep.n)}`;
  const cues = (PLAN[ep.n] || []).map(([seg, at, clip]) => ({ seg, at, clip }));
  const scan = (ep.script || []).filter((s) => s.t === 'scan').flatMap((s) =>
    [...(Array.isArray(s.regions) ? s.regions.map(regionClip) : []), scanStepClip(s.mode)]).filter(Boolean);
  const all = [`${e}-intro`, `${e}-outro`, ...cues.map((c) => c.clip), ...scan, ...CHECKINS];
  return { intro: `${e}-intro`, outro: `${e}-outro`, cues, all: [...new Set(all)] };
}

/** Dateien laden (ohne Audio-Kontext möglich, also schon beim Öffnen der Episode). */
export function prefetch(names) {
  return Promise.all(names.filter((n) => !raw.has(n)).map(async (n) => {
    raw.set(n, null);
    try {
      const r = await fetch(`${DIR}b1-${n}.mp3`);
      if (r.ok) raw.set(n, await r.arrayBuffer());
    } catch { /* offline ohne Cache oder Datei fehlt */ }
  }));
}

async function decode(name) {
  if (buffers.has(name)) return buffers.get(name);
  const ac = audioCtx();
  const data = raw.get(name);
  if (!ac || !data) return null;
  try {
    const buf = await ac.decodeAudioData(data.slice(0));
    buffers.set(name, buf);
    return buf;
  } catch { return null; }
}

/** Alle geladenen Clips dekodieren (nach dem Tap, wenn der Kontext läuft). */
export const prepare = (names) => Promise.all(names.map(decode));
export const hasClip = (name) => !!raw.get(name);

function out(ac) {
  if (voice && voice.context === ac) return voice;
  voice = ac.createGain();
  voice.gain.value = 1.15; // Stimme etwas über Teppich und Tönen
  voice.connect(ac.destination);
  return voice;
}

/** Clip abspielen, hinter dem laufenden Clip eingereiht. Löst nach dem Ende auf (false, wenn kein Clip da ist). */
export async function playClip(name) {
  const ac = audioCtx();
  const buf = await decode(name);
  if (!ac || !buf) return false;
  const at = Math.max(ac.currentTime + 0.05, busyUntil);
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(out(ac));
  src.start(at);
  busyUntil = at + buf.duration + 0.4;
  playing.push(src);
  return new Promise((resolve) => {
    src.onended = () => { playing = playing.filter((x) => x !== src); resolve(true); };
  });
}

/** Zufälliger Check-in-Clip (nicht zweimal derselbe hintereinander). */
let lastCi = null;
export function checkinClip() {
  const pool = CHECKINS.filter((n) => hasClip(n) && n !== lastCi);
  if (!pool.length) return null;
  lastCi = pool[Math.floor(Math.random() * pool.length)];
  return lastCi;
}

/** Läuft gerade eine Stimme? (Check-ins warten dann, statt hineinzureden.) */
export const speaking = () => { const ac = audioCtx(); return !!ac && ac.currentTime < busyUntil - 0.3; };

export function stopClips() {
  playing.forEach((s) => { try { s.stop(); } catch { /* schon beendet */ } });
  playing = [];
  busyUntil = 0;
}
