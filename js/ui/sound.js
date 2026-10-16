// Ton, Vibration und Bildschirm-wach-halten. iOS-Safari kann nicht vibrieren, darum immer auch ein Ton.
let audio = null;
let soundOn = true;

export function setSound(on) {
  soundOn = on;
}

// Muss in einem Tap-Handler laufen, sonst bleibt der Ton auf iOS stumm.
export function unlockAudio() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch { /* kein Ton verfügbar */ }
}

export function beep(times = 1, freq = 880) {
  navigator.vibrate?.(times > 1 ? [200, 100, 200, 100, 200] : 150);
  if (!soundOn || !audio) return;
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
  if (!audio) return;
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
