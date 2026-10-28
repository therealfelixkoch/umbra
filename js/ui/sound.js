// Ton und Bildschirm-wach-halten.
// Entscheidung: Deine Musik (Spotify) läuft immer weiter. Darum nur Web Audio mit audioSession = "ambient"
// (iOS 17+): Signaltöne mischen sich unter die Musik und pausieren sie nie. Kein HTML-Audio-Element, denn
// <audio> übernimmt auf iOS den Audio-Fokus und stoppt Spotify. Folge: Bei Lautlos-Schalter kein Ton,
// darum gibt es zu jedem Signal ein großes visuelles Signal. Vibration gibt es auf dem iPhone nicht.
// Ausnahme TEMPER: Dort läuft die Sitzung als „playback“ (Musik pausiert, Töne auch bei Lautlos-Schalter).
let audio = null;
let soundOn = true;
let session = 'ambient';

function applySession() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== session) navigator.audioSession.type = session;
  } catch { /* nicht unterstützt */ }
}

/** Audio-Modus: 'ambient' (mischt sich unter Musik, Standard) oder 'playback' (TEMPER). */
export function setAudioMode(mode) {
  session = mode === 'playback' ? 'playback' : 'ambient';
  applySession();
}

/** Web-Audio-Kontext für eigene Klänge (TEMPER). Null, solange noch kein Tap war. */
export const audioCtx = () => (audio && audio.state === 'running' ? audio : null);

export function setSound(on) {
  soundOn = on;
}

// Muss in einem Tap-Handler laufen, sonst bleibt der Ton auf iOS stumm.
export function unlockAudio() {
  applySession();
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    // Nach einer Unterbrechung (Anruf, Spotify-Wechsel) meldet iOS „interrupted“: beim nächsten Tap fortsetzen.
    if (audio.state !== 'running') audio.resume().catch(() => {});
  } catch { /* kein Web Audio */ }
}

// Visuelles Signal: Bildschirm pulsiert violett, laufende Timer-Zahlen blinken (auch ohne Ton sichtbar).
export function pulse(strong = false) {
  const b = document.body;
  b.classList.remove('signal-pulse', 'signal-strong');
  void b.offsetWidth;
  b.classList.add('signal-pulse');
  if (strong) b.classList.add('signal-strong');
  setTimeout(() => b.classList.remove('signal-pulse', 'signal-strong'), strong ? 2600 : 1600);
}

let hapticEl = null;
/** Kurzer Haptik-Impuls. iOS kennt kein vibrate(), gibt aber beim Umschalten eines Systemschalters (input switch) ein Klick-Feedback. */
export function haptic() {
  if (typeof navigator.vibrate === 'function') { navigator.vibrate(12); return; }
  if (!hapticEl) {
    hapticEl = document.createElement('label');
    hapticEl.setAttribute('aria-hidden', 'true');
    hapticEl.style.cssText = 'position:fixed;left:-200px;top:0;opacity:0;pointer-events:none';
    hapticEl.innerHTML = '<input type="checkbox" switch tabindex="-1">';
    document.body.append(hapticEl);
  }
  hapticEl.click();
}

/** Audio-Kontext wecken (nach Hintergrund, Anruf, Sperre) und danach abspielen, statt den Ton zu verwerfen. */
function whenRunning(fn) {
  if (!audio) return;
  if (audio.state === 'running') { fn(); return; }
  audio.resume().then(() => { if (audio.state === 'running') fn(); }).catch(() => {});
}

// Kontext wach halten: beim Zurückkommen in die App sofort wieder aufwecken
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && audio && audio.state !== 'running') audio.resume().catch(() => {});
});

export function beep(times = 1, freq = 880) {
  if (!soundOn) return;
  whenRunning(() => {
    const dest = out(1.8);
    for (let i = 0; i < times; i++) {
      const t = audio.currentTime + 0.02 + i * 0.3;
      const f = i === times - 1 && times > 1 ? freq * 1.5 : freq;
      // Grundton + Oktave (Dreieck) klingt durchsetzungsfähiger als ein reiner Sinus
      for (const [type, mult, amp] of [['triangle', 1, 0.9], ['sine', 2, 0.35]]) {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = type;
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(amp, t + 0.015);
        g.gain.setValueAtTime(amp, t + 0.14);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        o.connect(g).connect(dest);
        o.start(t);
        o.stop(t + 0.28);
      }
    }
  });
}

// Signal am Ende eines Timers: Ton + violettes Pulsieren
export function signal(times = 3) {
  beep(times);
  pulse(times >= 3);
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
    wakeLock: 'wakeLock' in navigator ? 'verfügbar' : 'nicht verfügbar',
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true,
  };
}

function out(boost = 2.2) {
  // Kompressor + Nachverstärkung: laut, ohne zu verzerren.
  const comp = audio.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.knee.value = 6;
  comp.ratio.value = 8;
  comp.attack.value = 0.002;
  comp.release.value = 0.12;
  const makeup = audio.createGain();
  makeup.gain.value = boost;
  comp.connect(makeup).connect(audio.destination);
  return comp;
}

// Boxring-Glocke: heller Metallschlag mit Glocken-Teiltönen.
// times = 3 → „Ding Ding Ding“ (Rundenende), times = 1 → Rundenstart. Ertönt auch bei „Ton aus“.
export function ringBell(times = 1) {
  pulse(times > 1);
  whenRunning(() => playBell(times));
}

function playBell(times) {
  const dest = out(2.6);
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
      g.gain.exponentialRampToValueAtTime(amp, t + 0.004);
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
    ng.gain.value = 0.9;
    n.buffer = buf;
    n.connect(hp).connect(ng).connect(dest);
    n.start(t);
  }
}

// Kurzes Klacken als 10-Sekunden-Warnung.
export function clack() {
  whenRunning(playClack);
}

function playClack() {
  const dest = out(2);
  [0, 0.14, 0.28].forEach((d) => {
    const t = audio.currentTime + d;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'square';
    o.frequency.value = 900;
    g.gain.setValueAtTime(0.5, t);
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
