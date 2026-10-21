// TEMPER-Klänge: eine feste Ton-Sprache für geschlossene Augen, ein Atem-Ton und ein leiser Klangteppich.
// Alles mit Web Audio erzeugt (offline, keine Dateien). Ohne Ton-Freigabe (kein Tap) bleibt es still.
import { audioCtx } from './sound.js';

// Gemeinsamer Ausgang mit sanftem Kompressor
let master = null;
function out(ac) {
  if (master && master.context === ac) return master;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 4;
  comp.connect(ac.destination);
  master = comp;
  return comp;
}

function tone(ac, { freq, at = 0, dur = 2, vol = 0.25, attack = 0.02, partials = [[1, 1]] }) {
  const t = ac.currentTime + at;
  for (const [ratio, amp] of partials) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = freq * ratio;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * amp, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (ratio > 1 ? 0.7 : 1));
    o.connect(g).connect(out(ac));
    o.start(t);
    o.stop(t + dur + 0.1);
  }
}

/** Die Ton-Sprache. Jeder Ton hat eine feste Bedeutung (steht im Briefing). */
export const TONES = {
  bell: { name: 'Tiefe Glocke', meaning: 'Anfang und Ende der Übung' },
  checkin: { name: 'Leiser Check-in', meaning: 'Wo bist du gerade? Zurück zum Atem bzw. zur Zahl.' },
  next: { name: 'Doppelton', meaning: 'Nächster Schritt: neue Region, neuer Abschnitt' },
  breath: { name: 'Atem-Ton', meaning: 'Steigt beim Einatmen, sinkt beim Ausatmen' },
  hold: { name: 'Klick', meaning: 'Dein Tipp wurde registriert (Halten, Abschweifen)' },
};

export function playTone(kind) {
  const ac = audioCtx();
  if (!ac) return;
  if (kind === 'bell') tone(ac, { freq: 146.8, dur: 5, vol: 0.35, attack: 0.01, partials: [[1, 1], [2.76, 0.35], [5.4, 0.12], [0.5, 0.3]] });
  if (kind === 'checkin') tone(ac, { freq: 293.7, dur: 1.6, vol: 0.12, attack: 0.15 });
  if (kind === 'next') { tone(ac, { freq: 392, dur: 1.2, vol: 0.14, attack: 0.03 }); tone(ac, { freq: 523.3, at: 0.25, dur: 1.4, vol: 0.14, attack: 0.03 }); }
  if (kind === 'hold') tone(ac, { freq: 880, dur: 0.12, vol: 0.08, attack: 0.005 });
  if (kind === 'breath') { tone(ac, { freq: 196, dur: 2, vol: 0.12, attack: 1.6 }); tone(ac, { freq: 196, at: 2, dur: 3, vol: 0.12, attack: 0.05 }); }
}

// ——— Atem-Ton: ein weicher Ton, der mit dem Kreis an- und abschwillt ———
let pacer = null;
export function pacerStart() {
  const ac = audioCtx();
  if (!ac || pacer) return;
  const o = ac.createOscillator();
  const o2 = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o2.type = 'sine';
  o.frequency.value = 174.6;
  o2.frequency.value = 261.6;
  const g2 = ac.createGain();
  g2.gain.value = 0.35;
  g.gain.value = 0.0001;
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(out(ac));
  o.start();
  o2.start();
  pacer = { ac, o, o2, g };
}
/** scale 0–1 aus breathAt: lauter und etwas höher beim Einatmen. */
export function pacerSet(scale) {
  if (!pacer) return;
  const t = pacer.ac.currentTime;
  pacer.g.gain.setTargetAtTime(0.02 + 0.13 * scale, t, 0.15);
  pacer.o.frequency.setTargetAtTime(174.6 * (1 + 0.12 * scale), t, 0.2);
  pacer.o2.frequency.setTargetAtTime(261.6 * (1 + 0.12 * scale), t, 0.2);
}
export function pacerStop() {
  if (!pacer) return;
  const { ac, o, o2, g } = pacer;
  g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.2);
  o.stop(ac.currentTime + 1);
  o2.stop(ac.currentTime + 1);
  pacer = null;
}

// ——— Klangteppich: tiefer Drone und gefiltertes Rauschen, langsam atmend ———
let bed = null;
export function ambienceStart() {
  const ac = audioCtx();
  if (!ac || bed) return;
  const g = ac.createGain();
  g.gain.value = 0.0001;
  g.connect(out(ac));
  // Braunes Rauschen (weich, ohne Zischen)
  const len = ac.sampleRate * 4;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  const ng = ac.createGain();
  ng.gain.value = 0.5;
  noise.connect(lp).connect(ng).connect(g);
  // Drone: Grundton und Quinte, leicht verstimmt
  const oscs = [[55, 0.5], [55.4, 0.4], [82.4, 0.25]].map(([f, a]) => {
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    og.gain.value = a;
    o.connect(og).connect(g);
    o.start();
    return o;
  });
  // Langsames „Atmen“ des Teppichs (ca. 10 s)
  const lfo = ac.createOscillator();
  const lg = ac.createGain();
  lfo.frequency.value = 0.1;
  lg.gain.value = 0.25;
  lfo.connect(lg).connect(ng.gain);
  lfo.start();
  noise.start();
  g.gain.setTargetAtTime(0.18, ac.currentTime, 2);
  bed = { ac, g, nodes: [noise, lfo, ...oscs] };
}
export function ambienceStop() {
  if (!bed) return;
  const { ac, g, nodes } = bed;
  g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.8);
  nodes.forEach((n) => n.stop(ac.currentTime + 4));
  bed = null;
}

export function stopAll() {
  pacerStop();
  ambienceStop();
}
