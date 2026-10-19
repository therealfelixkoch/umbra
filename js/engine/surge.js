// SURGE: Protokolle gegen den Nebel, geführte Atmung, Wim-Hof-Ablauf, Kälte-Log und DAS WARUM.
// Reine Funktionen; alle Uhren laufen über Zeitstempel.
import { addDays, daysBetween, weekStart } from './dates.js';
import { sessionXp } from './game.js';

// ——— Atemmuster ———
// Cyclic Sighing / physiologischer Seufzer: lang ein, kurz nachfüllen, lang aus.
export const SIGH = [{ phase: 'in', sec: 2, label: 'Einatmen' }, { phase: 'in2', sec: 1, label: 'Nachfüllen' }, { phase: 'out', sec: 6, label: 'Langsam ausatmen' }];
export const SIGH_CYCLE = SIGH.reduce((n, p) => n + p.sec, 0);

/** Stand im Atemrhythmus. `scale` 0–1 für Kreis/Welle (ein = wächst, aus = schrumpft). */
export function breathAt(startAt, now, pattern = SIGH) {
  const cyc = pattern.reduce((n, p) => n + p.sec, 0);
  const t = Math.max(0, (now - startAt) / 1000);
  const cycle = Math.floor(t / cyc);
  let r = t - cycle * cyc;
  for (const p of pattern) {
    if (r < p.sec) {
      const f = r / p.sec;
      const scale = p.phase === 'in' ? 0.85 * f : p.phase === 'in2' ? 0.85 + 0.15 * f : 1 - f;
      return { ...p, cycle, f, scale, left: p.sec - r };
    }
    r -= p.sec;
  }
  return { ...pattern[0], cycle: cycle + 1, f: 0, scale: 0, left: pattern[0].sec };
}

// ——— Protokolle ———
const NSDR_CUES = [
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

export const PULLS = [
  ['verlangen', 'Verlangen', 'Handy, Essen, Drink'],
  ['leer', 'Leer, ausgelaugt', 'nichts geht mehr'],
  ['ueberdreht', 'Leer und überdreht', 'müde, aber unruhig'],
  ['antrieb', 'Wenig Antrieb, Kraft da', 'Körper könnte, Kopf will nicht'],
];

export const PROTOCOLS = {
  welle: { id: 'welle', name: 'Die Welle', pull: 'verlangen', minutes: 3, desc: '90 s Welle, dann 5 physiologische Seufzer' },
  glut: { id: 'glut', name: 'Glut', pull: 'leer', minutes: 10, desc: '5 min Cyclic Sighing · kalte Dusche · 2 min Tageslicht' },
  nsdr: { id: 'nsdr', name: 'NSDR', pull: 'ueberdreht', minutes: 10, desc: 'Body-Scan im Liegen, 10 oder 20 min' },
  flamme: { id: 'flamme', name: 'Flamme', pull: 'antrieb', minutes: 25, desc: 'Sack-Runden oder Spaziergang · kalte Dusche' },
};

/**
 * Schritte eines Protokolls. Jeder Schritt hat eine Dauer in Sekunden (oder `manual` = mit Knopf weiter).
 * @param {string} id welle|glut|nsdr|flamme
 * @param {{nsdrMin?:10|20, flame?:'bag'|'walk', rounds?:number, coldSec?:number}} o
 */
export function protocolSteps(id, o = {}) {
  const cold = { type: 'cold', sec: o.coldSec || 120, label: 'Kalte Dusche', text: 'Erst warm, dann kalt. Ruhig ausatmen, nicht hecheln. Stopp, wann du willst.' };
  if (id === 'welle') {
    return [
      { type: 'wave', sec: 90, label: 'Die Welle', text: 'Das Verlangen ist eine Welle. Sie bricht.' },
      { type: 'breath', sec: 5 * SIGH_CYCLE, cycles: 5, label: '5 physiologische Seufzer' },
    ];
  }
  if (id === 'glut') {
    return [
      { type: 'breath', sec: 300, label: 'Cyclic Sighing' },
      cold,
      { type: 'timer', sec: 120, label: 'Tageslicht', text: 'Raus oder ans offene Fenster. Blick in die Weite, nicht aufs Handy.' },
    ];
  }
  if (id === 'nsdr') {
    const sec = (o.nsdrMin === 20 ? 20 : 10) * 60;
    return [{ type: 'guide', sec, label: `NSDR · ${sec / 60} min`, cues: NSDR_CUES, soft: true }];
  }
  // Flamme
  const first = o.flame === 'walk'
    ? { type: 'timer', sec: 20 * 60, label: 'Spaziergang', text: 'Zügig gehen, Handy in der Tasche. Draußen, wenn es geht.' }
    : { type: 'rounds', rounds: o.rounds || 3, work: 180, rest: 60, sec: (o.rounds || 3) * 240 - 60, label: `Sack · ${o.rounds || 3} Runden`, text: 'Locker beginnen, Runde für Runde schneller. Kein Sparring-Tempo nötig.' };
  return [first, cold];
}

/** Gesamt-Sekunden je Runden-Schritt: welche Phase gerade (Arbeit/Pause) und welche Runde. */
export function roundsAt(step, elapsed) {
  const cyc = step.work + step.rest;
  const round = Math.min(step.rounds, Math.floor(elapsed / cyc) + 1);
  const r = elapsed - (round - 1) * cyc;
  const work = r < step.work || round === step.rounds;
  return { round, phase: work ? 'work' : 'rest', left: work ? Math.max(0, step.work - r) : cyc - r };
}

/** Welcher NSDR-Hinweis gerade (gleichmäßig über die Dauer verteilt). */
export const cueAt = (cues, sec, elapsed) => cues[Math.min(cues.length - 1, Math.floor((elapsed / sec) * cues.length))];

// ——— Wirksamkeit ———
/** Stimmungsdifferenz pro Protokoll; ab 3 Durchgängen gilt die Zahl als belastbar. */
export function surgeEffect(sessions) {
  const by = {};
  for (const s of sessions) {
    if (s.kind !== 'surge' || s.moodBefore == null || s.moodAfter == null) continue;
    (by[s.protocol] ||= []).push(s.moodAfter - s.moodBefore);
  }
  return Object.fromEntries(Object.entries(by).map(([k, d]) => [k, { n: d.length, avg: Math.round((d.reduce((a, b) => a + b, 0) / d.length) * 10) / 10 }]));
}

/** Persönliche Empfehlung: das Protokoll mit dem höchsten Schnitt (ab 3 Durchgängen, Schnitt > 0). */
export function recommendProtocol(sessions) {
  const eff = surgeEffect(sessions);
  const cands = Object.entries(eff).filter(([k, e]) => PROTOCOLS[k] && e.n >= 3 && e.avg > 0);
  if (!cands.length) return null;
  const [id, e] = cands.sort((a, b) => b[1].avg - a[1].avg)[0];
  return { id, avg: e.avg, n: e.n, text: `${PROTOCOLS[id].name} hebt deine Stimmung im Schnitt um ${e.avg.toFixed(1).replace('.', ',')}.` };
}

export function logSurge(data, { day, protocol, pull, moodBefore, moodAfter, minutes, now = Date.now() }) {
  const s = { id: `g${now}`, day, kind: 'surge', missionId: 'SURGE', protocol, pull, moodBefore, moodAfter, minutes };
  s.xp = sessionXp(s);
  return { data: { ...data, sessions: [...data.sessions, s] }, session: s };
}

// ——— Wim Hof ———
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

export function logWimhof(data, { day, holds, now = Date.now() }) {
  const s = { id: `w${now}`, day, kind: 'wimhof', missionId: 'WIMHOF', rounds: holds.length, retention: holds };
  s.xp = sessionXp(s); // pauschal, unabhängig von der Retentionszeit
  return { data: { ...data, sessions: [...data.sessions, s] }, session: s };
}

/** Verlauf: Schnitt pro Session, pro Tag, Wochenschnitt. Keine Rekorde. */
export function wimhofStats(sessions, today) {
  const wh = sessions.filter((s) => s.kind === 'wimhof' && s.retention?.length);
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const ws = weekStart(today);
  const week = wh.filter((s) => s.day >= ws).flatMap((s) => s.retention);
  const byDay = {};
  for (const s of wh) (byDay[s.day] ||= []).push(...s.retention);
  return {
    sessions: wh.map((s) => ({ day: s.day, avg: avg(s.retention), retention: s.retention })),
    days: Object.entries(byDay).sort().map(([day, r]) => ({ day, avg: avg(r) })),
    weekAvg: avg(week),
    count: wh.length,
  };
}

// ——— Kälte ———
export const COLD_TYPES = [['dusche', 'Kalte Dusche'], ['bad', 'Kaltbad / Eistonne'], ['draussen', 'See / Meer']];

export function logCold(data, { day, seconds, type = 'dusche', now = Date.now() }) {
  const s = { id: `k${now}`, day, kind: 'cold', missionId: 'COLD', seconds: Math.max(0, Math.round(seconds)), type };
  s.xp = sessionXp(s);
  return { data: { ...data, sessions: [...data.sessions, s] }, session: s };
}

/** Minuten Kälte pro Kalenderwoche, die letzten n Wochen (älteste zuerst). Kein Zielwert. */
export function coldWeeks(sessions, today, n = 8) {
  const cur = weekStart(today);
  return Array.from({ length: n }, (_, i) => {
    const ws = addDays(cur, -7 * (n - 1 - i));
    const we = addDays(ws, 6);
    const sec = sessions.filter((s) => s.kind === 'cold' && s.day >= ws && s.day <= we).reduce((a, s) => a + (s.seconds || 0), 0);
    return { ws, minutes: Math.round((sec / 60) * 10) / 10 };
  });
}

// ——— DAS WARUM ———
/** Aktuelles Warum: das neueste. Alte bleiben im Archiv. */
export const currentWhy = (whys) => (whys?.length ? whys[whys.length - 1] : null);

/** Zu Beginn jedes Arcs fragen (einmal pro Arc, „später“ merkt sich den Arc). */
export function whyDue(data) {
  const n = data.engine?.arc?.n;
  if (n == null) return false;
  if (data.engine.whyAsked === n) return false;
  return !(data.whys || []).some((w) => w.arc === n);
}

export function addWhy(data, { day, forWhom, oneYear, now = Date.now() }) {
  const w = { id: `y${now}`, day, arc: data.engine?.arc?.n ?? null, forWhom: forWhom.trim(), oneYear: oneYear.trim() };
  return { ...data, whys: [...(data.whys || []), w], engine: { ...data.engine, whyAsked: w.arc } };
}

/** Rückeroberungen (SURGE-Durchgänge) in einem Zeitraum. */
export const reclaims = (sessions, from, to) => sessions.filter((s) => s.kind === 'surge' && s.day >= from && s.day <= to).length;
