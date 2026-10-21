// TEMPER: Fortschritt, Freischaltung, Einsätze, Skript-Auflösung und Messwerte. Reine Funktionen.
// Freischaltung pro gemachter Episode, nicht pro Kalendertag. Keine Serien, keine Strafen für Lücken.
import { BOOKS, MISSIONS_T, BODY, ECHO_DEFAULT } from '../data/temper.js';
import { addDays, daysBetween, weekStart } from './dates.js';
import { sessionXp } from './game.js';

export const CO2_EVERY = 7; // nach Buch I: einmal pro Woche als kurzer Einschub

const temperSessions = (data) => (data.sessions || []).filter((s) => s.kind === 'temper');

/** Erledigte Episoden je Buch: { [book]: Set(ep) } */
export function doneEpisodes(data) {
  const out = {};
  for (const s of temperSessions(data)) if (s.book && s.ep) (out[s.book] ||= new Set()).add(s.ep);
  return out;
}

export const bookComplete = (data, n) => (doneEpisodes(data)[n]?.size || 0) >= (BOOKS.find((b) => b.n === n)?.episodes.length || Infinity);

/** Nächste Episode: erstes nicht gemachtes Kapitel im ersten nicht abgeschlossenen Buch. */
export function nextEpisode(data) {
  const done = doneEpisodes(data);
  for (const b of BOOKS) {
    const ep = b.episodes.find((e) => !done[b.n]?.has(e.n));
    if (ep) return { book: b, ep };
  }
  return null; // alle verfügbaren Bücher durch
}

/** Höchste erledigte Episode in Buch I (für die Einsätze). */
export function book1Reached(data) {
  const d = doneEpisodes(data)[1];
  return d ? Math.max(...d) : 0;
}

export const missionsAvailable = (data) => MISSIONS_T.filter((m) => book1Reached(data) >= m.from);

/** Klingen-Emblem: eine Stufe pro abgeschlossenem Buch (0–5). */
export const bladeTier = (data) => BOOKS.filter((b) => bookComplete(data, b.n)).length;

/** Was TEMPER heute vorschlägt. Schlaf 1–2 im Check-in → NSDR (sobald frei). */
export function suggestion(data, today) {
  const sleep = data.checkins?.[today]?.sleep;
  const nsdr = missionsAvailable(data).find((m) => m.id === 'nsdr');
  if (sleep != null && sleep <= 2 && nsdr) return { kind: 'mission', mission: nsdr, reason: 'Kurze Nacht. Heute NSDR statt der Episode.' };
  const next = nextEpisode(data);
  return next ? { kind: 'episode', ...next, co2: co2Due(data, today) } : { kind: 'done' };
}

/** CO2-Test als Wocheneinschub, sobald Buch I abgeschlossen ist. */
export function co2Due(data, today) {
  if (!bookComplete(data, 1)) return false;
  const last = temperSessions(data).filter((s) => s.co2 != null).map((s) => s.day).sort().at(-1);
  return !last || daysBetween(last, today) >= CO2_EVERY;
}

// ——— Skript-Auflösung ———
/** Platzhalter auflösen: Reset in Atem-Abschnitte, Regler-Wahl, freie Sitzung, Innenkarte. */
export function expandScript(script, { choice = null, free = null, map = [] } = {}) {
  const out = [];
  for (const seg of script) {
    if (seg.t === 'reset') {
      for (let r = 0; r < seg.reps; r++) {
        out.push({ t: 'breath', sec: 36, out: 8, label: '3-Atemzüge-Reset', reset: true });
        if (r < seg.reps - 1) out.push({ t: 'guide', sec: 30, cues: ['Normal atmen.'] });
      }
    } else if (seg.t === 'choice' && choice) {
      out.push(choice === 'up' ? { t: 'wimhof' } : { t: 'breath', sec: 180, out: 8 });
    } else if (seg.t === 'free' && free) {
      if (free.regler === 'up') out.push({ t: 'wimhof' });
      if (free.regler === 'down') out.push({ t: 'breath', sec: 120, out: 8 });
      const rest = 480 - (free.regler === 'down' ? 120 : free.regler === 'up' ? 90 : 0);
      const parts = [free.count && 'count', free.scan && 'scan'].filter(Boolean);
      const each = parts.length ? Math.round(rest / parts.length) : 0;
      if (free.count) out.push({ t: 'count', sec: each, tap: true });
      if (free.scan) out.push({ t: 'scan', sec: each, regions: BODY.full, mode: 'name' });
      if (!parts.length) out.push({ t: 'count', sec: rest, tap: true });
    } else if (seg.t === 'scan' && seg.regions === 'map') {
      out.push({ ...seg, regions: map.length ? map : BODY.stress });
    } else out.push(seg);
  }
  return out;
}

/** Ungetaktete Abschnitte warten auf Eingabe (Tipp, Wahl, Formular). */
export const isTimed = (seg) => Number.isFinite(seg.sec);

/** Gesamtdauer der getakteten Abschnitte in Minuten (für die Wochenminuten). */
export const scriptMinutes = (segs) => Math.round(segs.filter(isTimed).reduce((n, s) => n + s.sec, 0) / 60);

/** Stand in einem getakteten Abschnitt (Zeitstempel). */
export function segAt(seg, startAt, now) {
  const elapsed = Math.max(0, (now - startAt) / 1000);
  return { elapsed, left: seg.sec - elapsed, done: elapsed >= seg.sec };
}

/** ECHO-Scan: aktuelle Region und Anweisung. ECHO spricht mit „du“ und deinem Namen. */
export function scanCue(seg, elapsed, { name = '', echo = '' } = {}) {
  const regions = seg.regions;
  const per = seg.sec / regions.length;
  const i = Math.min(regions.length - 1, Math.floor(elapsed / per));
  const region = regions[i];
  const into = (elapsed - i * per) / per; // 0–1 innerhalb der Region
  const you = name ? `${name}, ` : '';
  const step = into < 0.35 ? 'see' : into < 0.7 ? (seg.mode === 'release' ? 'out' : 'word') : 'out';
  const text = {
    see: i === 0 && echo ? `ECHO ${echo}. Er geht zu: ${region}. ${you}nur wahrnehmen.` : `ECHO geht zu: ${region}. ${i === 0 ? `${you}nur wahrnehmen.` : 'Wahrnehmen.'}`,
    word: seg.mode === 'name' ? 'Ein Wort dafür. Eng, heiß, schwer, leer …'
      : seg.mode === 'ask' ? 'ECHO fragt: „Was hält das fest?“ Keine Antwort nötig.'
        : seg.mode === 'warm' ? 'Wärme. Gewicht. Nichts verändern wollen.' : 'Wahrnehmen.',
    out: seg.soft ? 'Ausatmen. Schwer werden.' : 'Beim Ausatmen lösen.',
  }[step];
  return { index: i, region, step, text, total: regions.length };
}

/** ECHO-Beschreibung für Texte: eigene Fassung oder Standard. */
export const echoDesc = (settings) => settings?.echo?.desc?.trim() || ECHO_DEFAULT;

// ——— Verbuchen ———
/**
 * TEMPER-Einheit verbuchen. Am Ende eines Buchs zusätzlich der Buchabschluss (150 XP, nicht im Tagesdeckel).
 * Retention wird nur gespeichert, nie bewertet: XP pauschal.
 */
export function logTemper(data, { day, book = null, ep = null, mission = null, clarity = null, taps = null, countSec = 0,
  minutes = 0, co2 = null, retention = null, hour = null, now = Date.now() }) {
  const s = { id: `t${now}`, day, kind: 'temper', missionId: 'TEMPER', book: book ?? undefined, ep: ep ?? undefined,
    mission: mission ?? undefined, clarity: clarity ?? undefined, minutes,
    taps: taps ?? undefined, tapsPerMin: taps != null && countSec >= 60 ? Math.round((taps / (countSec / 60)) * 10) / 10 : undefined,
    co2: co2 ?? undefined, retention: retention ?? undefined, evening: hour != null ? hour >= 18 : undefined };
  s.xp = sessionXp(s);
  let next = { ...data, sessions: [...data.sessions, s] };
  let finished = null;
  if (book && ep && !bookComplete(data, book) && bookComplete(next, book)) {
    const b = { id: `tb${now}`, day, kind: 'temperBook', missionId: 'TEMPER', book };
    b.xp = sessionXp(b);
    next = { ...next, sessions: [...next.sessions, b] };
    finished = BOOKS.find((x) => x.n === book);
  }
  return { data: next, session: s, finished };
}

// ——— Messwerte (nur diese) ———
export function temperMetrics(data, today) {
  const ss = temperSessions(data);
  const series = (key) => ss.filter((s) => s[key] != null).map((s) => ({ day: s.day, ep: s.ep, value: s[key] }));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const ws = addDays(weekStart(today), -7 * (7 - i));
    return { ws, minutes: ss.filter((s) => s.day >= ws && s.day <= addDays(ws, 6)).reduce((n, s) => n + (s.minutes || 0), 0) };
  });
  return { clarity: series('clarity'), co2: series('co2'), taps: series('tapsPerMin'), retention: series('retention'), weeks, episodes: ss.filter((s) => s.ep).length };
}

/** Wert einer bestimmten Episode (für Vergleiche wie „Episode 5 → 25“). */
export const episodeValue = (data, book, ep, key) => temperSessions(data).filter((s) => s.book === book && s.ep === ep && s[key] != null).map((s) => s[key]).at(-1) ?? null;

/** TEMPER-Zeile im Debrief: „Ausatmung: 31 → 48 s · Episoden: 22“. */
export function debriefLine(data, from, to) {
  const all = temperSessions(data);
  const inRange = all.filter((s) => s.day >= from && s.day <= to);
  const co2 = all.filter((s) => s.co2 != null && s.day <= to).map((s) => s.co2);
  const parts = [];
  if (co2.length >= 2) parts.push(`Ausatmung: ${co2[0]} → ${co2.at(-1)} s`);
  else if (co2.length === 1) parts.push(`Ausatmung: ${co2[0]} s`);
  parts.push(`Episoden: ${inRange.filter((s) => s.ep).length}`);
  const mins = inRange.reduce((n, s) => n + (s.minutes || 0), 0);
  if (mins) parts.push(`${mins} min`);
  return parts.join(' · ');
}
