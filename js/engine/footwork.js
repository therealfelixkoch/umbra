// Footwork-Drill: zufällige Kommandos in unregelmäßigem Takt, damit du reagierst statt vorausplanst.

export const COMMANDS = ['right', 'left', 'forward', 'back', 'switch'];
export const LABELS = { right: 'Right', left: 'Left', forward: 'Forward', back: 'Back', switch: 'Switch' };
export const ARROWS = { right: '→', left: '←', forward: '↑', back: '↓', switch: '⇄' };

// Abstand zwischen Kommandos in ms: Grundtempo ± 35 % Zufall.
export const TEMPOS = { slow: 2600, mid: 1800, fast: 1200 };

// Kleiner seedbarer Zufallsgenerator (mulberry32), damit Tests reproduzierbar sind.
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Nächstes Kommando. Regeln: nie dreimal dasselbe hintereinander, Switch nie doppelt,
 * und kein Driften: nach drei Schritten in eine Richtung wird die Gegenrichtung wahrscheinlicher.
 */
export function nextCommand(history, rand) {
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  let options = COMMANDS.filter((c) => !(c === last && c === prev) && !(c === 'switch' && last === 'switch'));
  const drift = { right: 0, forward: 0 };
  for (const c of history.slice(-4)) {
    if (c === 'right') drift.right++;
    if (c === 'left') drift.right--;
    if (c === 'forward') drift.forward++;
    if (c === 'back') drift.forward--;
  }
  // Gegenrichtung doppelt in den Topf, wenn du schon weit gewandert bist (kleiner Raum!).
  if (drift.right >= 3) options = [...options.filter((c) => c !== 'right'), 'left', 'left'];
  if (drift.right <= -3) options = [...options.filter((c) => c !== 'left'), 'right', 'right'];
  if (drift.forward >= 3) options = [...options.filter((c) => c !== 'forward'), 'back', 'back'];
  if (drift.forward <= -3) options = [...options.filter((c) => c !== 'back'), 'forward', 'forward'];
  return options[Math.floor(rand() * options.length)];
}

export function nextDelay(tempo, rand) {
  const base = TEMPOS[tempo] || TEMPOS.mid;
  return Math.round(base * (0.65 + rand() * 0.7));
}

// Kompletter Plan für eine Runde: [{ at: ms ab Start, cmd }]
export function schedule(durationSec, tempo, rand) {
  const out = [];
  const history = [];
  let t = 1500;
  while (t < durationSec * 1000 - 600) {
    const cmd = nextCommand(history, rand);
    history.push(cmd);
    out.push({ at: t, cmd });
    t += nextDelay(tempo, rand);
  }
  return out;
}
