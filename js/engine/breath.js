// Atem-Bausteine für TEMPER: geführte Atemmuster, Wim-Hof-Ablauf, NSDR-Hinweise.
// Reine Funktionen; alle Uhren laufen über Zeitstempel.
import { daysBetween } from './dates.js';

// ——— Atemmuster ———
// Physiologischer Seufzer: lang ein, kurz nachfüllen, lang aus.
export const SIGH = [{ phase: 'in', sec: 2, label: 'Einatmen' }, { phase: 'in2', sec: 1, label: 'Nachfüllen' }, { phase: 'out', sec: 6, label: 'Langsam ausatmen' }];
export const SIGH_CYCLE = SIGH.reduce((n, p) => n + p.sec, 0);
/** Abends senken: 4 s ein, `out` s aus (6–8). */
export const slowPattern = (out = 6) => [{ phase: 'in', sec: 4, label: 'Ein' }, { phase: 'out', sec: out, label: 'Aus' }];

/** Stand im Atemrhythmus. `scale` 0–1 für den Kreis (ein = wächst, aus = schrumpft). */
export function breathAt(startAt, now, pattern = SIGH) {
  const cyc = pattern.reduce((n, p) => n + p.sec, 0);
  const t = Math.max(0, (now - startAt) / 1000);
  const cycle = Math.floor(t / cyc);
  let r = t - cycle * cyc;
  const twoStep = pattern.some((p) => p.phase === 'in2');
  for (const p of pattern) {
    if (r < p.sec) {
      const f = r / p.sec;
      const scale = p.phase === 'in' ? (twoStep ? 0.85 : 1) * f : p.phase === 'in2' ? 0.85 + 0.15 * f : 1 - f;
      return { ...p, cycle, f, scale, left: p.sec - r };
    }
    r -= p.sec;
  }
  return { ...pattern[0], cycle: cycle + 1, f: 0, scale: 0, left: pattern[0].sec };
}

// ——— NSDR ———
export const NSDR_CUES = [
  'Leg dich hin. Augen zu. Lass das Gewicht in den Boden sinken.',
  'Atme ein paar Mal langsam aus, länger aus als ein.',
  'Spür deine Füße. Fersen, Sohlen, Zehen. Nur wahrnehmen.',
  'Die Unterschenkel und Knie. Lass sie schwer werden.',
  'Oberschenkel und Hüfte. Nichts halten.',
  'Bauch und unterer Rücken. Der Atem bewegt dich, du machst nichts.',
  'Brust, Schultern, Oberarme. Die Schultern sinken weg von den Ohren.',
  'Unterarme, Hände, jeder Finger. Schwer und warm.',
  'Nacken, Kiefer, Zunge. Lass den Kiefer locker.',
  'Augen, Stirn, Kopfhaut. Alles weich.',
  'Spür den ganzen Körper auf einmal, wie einen Umriss.',
  'Bleib einfach hier. Wenn Gedanken kommen: zurück zum Ausatmen.',
  'Langsam wieder ankommen. Finger und Zehen bewegen.',
];

/** Welcher Hinweis gerade (gleichmäßig über die Dauer verteilt). */
export const cueAt = (cues, sec, elapsed) => cues[Math.min(cues.length - 1, Math.floor((elapsed / sec) * cues.length))];

// ——— Wim Hof (eine Runde morgens) ———
export const WH_RECOVER = 15;
export const WH_SAFETY_DAYS = 30;

/** Sicherheitsbestätigung fällig? Beim ersten Mal und dann alle 30 Tage. */
export const whSafetyDue = (confirmedDay, today) => !confirmedDay || daysBetween(confirmedDay, today) >= WH_SAFETY_DAYS;

export const whStart = (rounds, now) => ({ rounds, round: 1, phase: 'breathe', since: now, holds: [] });

/** Tipp irgendwo: Atmen → Halten (Stoppuhr), Halten → Erholungsatem (15 s). */
export function whTap(st, now) {
  if (st.phase === 'breathe') return { ...st, phase: 'hold', since: now };
  if (st.phase === 'hold') return { ...st, phase: 'recover', holds: [...st.holds, Math.round((now - st.since) / 1000)], since: now };
  return st;
}

/** Erholungsatem endet automatisch nach 15 s: nächste Runde oder fertig. */
export function whTick(st, now) {
  if (st.phase !== 'recover' || now - st.since < WH_RECOVER * 1000) return st;
  if (st.round >= st.rounds) return { ...st, phase: 'done', since: now };
  return { ...st, phase: 'breathe', round: st.round + 1, since: now };
}

