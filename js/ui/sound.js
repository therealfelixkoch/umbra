// Ton und Bildschirm-wach-halten.
// iPhone-Web-Apps: Ton erst nach einem Tap. Darum wird beim ersten Tap freigeschaltet:
// (1) Web Audio, (2) audioSession = "playback" (iOS 17+, Ton auch bei Stummschalter),
// (3) ein HTML-Audio-Element als Fallback. Vibration gibt es auf dem iPhone nicht, dafür ein visuelles Signal.
let audio = null;
let soundOn = true;
let fallback = null;
let unlocked = false;

export function setSound(on) {
  soundOn = on;
}

// Kurzer Signalton als WAV (für das HTML-Audio-Fallback), einmal erzeugt
function beepWav(freq = 880, ms = 220) {
  const rate = 22050;
  const n = Math.floor((rate * ms) / 1000);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / 200) * Math.min(1, (n - i) / 400);
    v.setInt16(44 + i * 2, Math.sin((2 * Math.PI * freq * i) / rate) * 0.6 * env * 32767, true);
  }
  let bin = '';
  new Uint8Array(buf).forEach((b) => { bin += String.fromCharCode(b); });
  return `data:audio/wav;base64,${btoa(bin)}`;
}

// Muss in einem Tap-Handler laufen, sonst bleibt der Ton auf iOS stumm.
export function unlockAudio() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
  } catch { /* nicht unterstützt */ }
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch { /* kein Web Audio */ }
  if (!unlocked) {
    unlocked = true;
    try {
      fallback = new Audio(beepWav());
      fallback.preload = 'auto';
      fallback.muted = true;
      fallback.play().then(() => { fallback.pause(); fallback.currentTime = 0; fallback.muted = false; }).catch(() => { fallback.muted = false; });
    } catch { fallback = null; }
  }
}

// Visuelles Signal: Bildschirm pulsiert kurz violett (iPhone kann nicht vibrieren).
export function pulse() {
  const b = document.body;
  b.classList.remove('signal-pulse');
  void b.offsetWidth;
  b.classList.add('signal-pulse');
  setTimeout(() => b.classList.remove('signal-pulse'), 1600);
}

function htmlBeep(times) {
  if (!fallback) return false;
  for (let i = 0; i < times; i++) {
    setTimeout(() => {
      try {
        const el = fallback.cloneNode();
        el.play().catch(() => {});
      } catch { /* nichts */ }
    }, i * 280);
  }
  return true;
}

export function beep(times = 1, freq = 880) {
  navigator.vibrate?.(times > 1 ? [200, 100, 200, 100, 200] : 150);
  if (!soundOn) return;
  if (!audio || audio.state !== 'running') {
    if (audio?.state === 'suspended') audio.resume().catch(() => {});
    htmlBeep(times);
    return;
  }
  for (let i = 0; i < times; i++) {
    const t = audio.currentTime + i * 0.28;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.value = i === times - 1 && times > 1 ? freq * 1.5 : freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + 0.22);
  }
}

// Signal am Ende eines Timers: Ton + violettes Pulsieren
export function signal(times = 3) {
  beep(times);
  pulse();
}

// Für „Ton testen“: spielt den Signalton und meldet, was das Gerät kann.
export function testSound() {
  unlockAudio();
  const was = soundOn;
  soundOn = true;
  signal(3);
  soundOn = was;
  return {
    webAudio: audio ? audio.state : 'nicht verfügbar',
    audioSession: navigator.audioSession ? navigator.audioSession.type : 'nicht verfügbar (iOS unter 17)',
    fallback: fallback ? 'bereit' : 'nicht verfügbar',
    wakeLock: 'wakeLock' in navigator ? 'verfügbar' : 'nicht verfügbar',
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true,
  };
}

function out() {
  // Kompressor macht Gong und Glocke laut, ohne zu verzerren.
  const comp = audio.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 6;
  comp.connect(audio.destination);
  return comp;
}

// Boxring-Glocke: heller Metallschlag mit Glocken-Teiltönen.
// times = 3 → „Ding Ding Ding“ (Rundenende), times = 1 → Rundenstart. Ertönt auch bei „Ton aus“.
export function ringBell(times = 1) {
  navigator.vibrate?.(times > 1 ? [150, 120, 150, 120, 150] : 200);
  pulse();
  if (!audio || audio.state !== 'running') {
    if (audio?.state === 'suspended') audio.resume().catch(() => {});
    htmlBeep(times);
    return;
  }
  const dest = out();
  // Teiltöne einer kleinen Messingglocke (inharmonisch), jeweils mit eigener Abklingzeit.
  const partials = [[1, 1, 1.6], [2.76, 0.55, 1.1], [5.4, 0.3, 0.7], [8.93, 0.16, 0.45], [0.5, 0.25, 1.2]];
  const f0 = 830;
  for (let k = 0; k < times; k++) {
    const t = audio.currentTime + k * 0.38;
    for (const [ratio, amp, dur] of partials) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = f0 * ratio;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp * 0.9, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(dest);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    // Klöppel-Anschlag: sehr kurzes, helles Rauschen
    const len = Math.floor(audio.sampleRate * 0.015);
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = audio.createBufferSource();
    const hp = audio.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    const ng = audio.createGain();
    ng.gain.value = 0.6;
    n.buffer = buf;
    n.connect(hp).connect(ng).connect(dest);
    n.start(t);
  }
}

// Kurzes Klacken als 10-Sekunden-Warnung.
export function clack() {
  if (!audio) return;
  const dest = out();
  [0, 0.14, 0.28].forEach((d) => {
    const t = audio.currentTime + d;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'square';
    o.frequency.value = 900;
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.06);
  });
}

let lock = null;
let wantLock = false;
export async function keepAwake(on) {
  wantLock = on;
  try {
    if (on && !lock && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch { /* nicht unterstützt */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantLock) keepAwake(true);
});
