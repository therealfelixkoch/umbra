// Bang Muay Thai: eigenes Programm mit Wochenplänen, die du selbst einträgst.
// Ein Plan ist freier Text: Leerzeile = neuer Block, erste Zeile = Blocktitel.
// Zeitangaben wie „2 Runden 3 min“, „2x 3 min“ oder „1x 3 min footwork“ werden erkannt (Timer / Footwork-Drill).

export const BMT_NAME = 'Bang Muay Thai';
export const BMT_PROGRAM = 'Jahr 1';

export const emptyBmt = () => ({ name: BMT_NAME, program: BMT_PROGRAM, weeks: [], current: null });

const TIMER = /(\d+)\s*(?:x|×|runden?|rounds?)\s*(?:à|a|je|zu)?\s*(\d+(?:[.,]\d+)?)\s*(?:min|minuten)\b/i;
const WEEK_HEADER = /^\s*(?:week|woche|wk)\s*(\d+)\s*$/i;

/** Zerlegt den Text eines Wochenplans in Blöcke. */
export function parseWeekText(text) {
  const raw = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean)).filter((b) => b.length);
  let number = null;
  const blocks = [];
  raw.forEach((lines, i) => {
    let ls = lines;
    // „Week 7“ als erste Zeile: Wochennummer, nicht Blocktitel
    if (i === 0 && WEEK_HEADER.test(ls[0])) {
      number = Number(ls[0].match(WEEK_HEADER)[1]);
      ls = ls.slice(1);
      if (!ls.length) return;
    }
    const [title, ...rest] = ls;
    const all = ls.join(' ');
    const m = all.match(TIMER);
    const timer = m ? { rounds: Number(m[1]), work: Math.round(parseFloat(m[2].replace(',', '.')) * 60) } : null;
    const reps = (title.match(/(\d+)\s*x\b/i) || [])[1];
    blocks.push({ title, lines: rest, timer, footwork: /footwork/i.test(all), reps: reps && !timer ? Number(reps) : null });
  });
  return { number, blocks };
}

const sortWeeks = (weeks) => [...weeks].sort((a, b) => a.number - b.number);

/** Woche hinzufügen oder ersetzen (gleiche Nummer = Plan wird aktualisiert). */
export function saveWeek(bmt, { id, number, title = '', text, now = Date.now() }) {
  const b = bmt || emptyBmt();
  const parsed = parseWeekText(text);
  const n = Number(number || parsed.number);
  if (!n || n < 1) throw new Error('Bitte eine Wochennummer angeben.');
  const clash = b.weeks.find((w) => w.number === n && w.id !== id);
  if (clash) throw new Error(`Woche ${n} gibt es schon. Bearbeite sie dort.`);
  const existing = b.weeks.find((w) => w.id === id);
  const week = { ...(existing || { id: `bmt${now}`, created: now, done: false }), number: n, title: title.trim(), text, updated: now };
  const weeks = sortWeeks([...b.weeks.filter((w) => w.id !== week.id), week]);
  return { ...b, weeks, current: b.current || week.id };
}

export function deleteWeek(bmt, id) {
  const weeks = bmt.weeks.filter((w) => w.id !== id);
  return { ...bmt, weeks, current: bmt.current === id ? (weeks[0]?.id || null) : bmt.current };
}

export const setCurrent = (bmt, id) => ({ ...bmt, current: id });

export function toggleDone(bmt, id) {
  const weeks = bmt.weeks.map((w) => (w.id === id ? { ...w, done: !w.done } : w));
  // Abgeschlossen → automatisch die nächste offene Woche als aktuelle
  const cur = weeks.find((w) => w.id === id);
  const next = cur?.done ? sortWeeks(weeks).find((w) => !w.done && w.number > cur.number) : null;
  return { ...bmt, weeks, current: next ? next.id : bmt.current };
}

/** Aktuelle Woche: gewählt, sonst die erste offene, sonst die letzte. */
export function currentWeek(bmt) {
  if (!bmt?.weeks?.length) return null;
  return bmt.weeks.find((w) => w.id === bmt.current) || sortWeeks(bmt.weeks).find((w) => !w.done) || sortWeeks(bmt.weeks).at(-1);
}

/** Fortschritt pro Woche aus den ARENA-Einträgen mit BMT-Woche. */
export function weekProgress(bmt, sessions) {
  return sortWeeks(bmt?.weeks || []).map((w) => {
    const s = sessions.filter((x) => x.kind === 'arena' && x.bmt?.weekId === w.id);
    return { ...w, sessions: s.length, minutes: s.reduce((m, x) => m + (x.minutes || 0), 0), lastDay: s.at(-1)?.day || null };
  });
}

export function nextWeekNumber(bmt) {
  return (bmt?.weeks || []).reduce((m, w) => Math.max(m, w.number), 0) + 1;
}
