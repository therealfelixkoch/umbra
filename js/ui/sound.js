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

// Tiefer, lang ausklingender Gong aus unharmonischen Teiltönen. Ertönt auch bei „Ton aus“.
export function gong() {
  navigator.vibrate?.([500, 120, 500]);
  if (!audio) return;
  const t = audio.currentTime;
  const dest = out();
  const partials = [[98, 1, 5], [196.5, 0.7, 4], [277, 0.5, 3.2], [394, 0.4, 2.6], [523, 0.3, 2], [741, 0.2, 1.4], [1010, 0.12, 0.9]];
  for (const [f, amp, dur] of partials) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.015, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  // Anschlag: kurzes Rauschen
  const len = Math.floor(audio.sampleRate * 0.08);
  const buf = audio.createBuffer(1, len, audio.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const n = audio.createBufferSource();
  const ng = audio.createGain();
  ng.gain.value = 0.5;
  n.buffer = buf;
  n.connect(ng).connect(dest);
  n.start(t);
}

// Heller Doppelschlag als Signal „Runde beginnt“.
export function bell() {
  navigator.vibrate?.(200);
  if (!audio) return;
  const dest = out();
  [0, 0.22].forEach((d) => {
    const t = audio.currentTime + d;
    [[1320, 0.6], [2640, 0.25]].forEach(([f, a]) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(dest);
      o.start(t);
      o.stop(t + 0.55);
    });
  });
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
