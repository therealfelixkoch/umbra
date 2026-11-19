// Story (BANG COMBAT, 19.11.2026): Saison-Erzählung aus SEASON_STORY (was mit dem Fighter passiert, keine Gegner),
// THE PLATEAU als sanfter Hinweis, Codex-Einträge, Titel ohne Serien, Zitate und die Comic-Panels.
// Keine Säulen, keine Medaillen, kein Sieg und kein Rückzug.
import { BOSS_LORE, CODEX_EXERCISE, CODEX_RECORD, TITLES, QUOTES, SEASON_STORY } from '../data/story.js';
import { BOSSES, NEMESIS_SCENES, seasonImage } from '../data/lore.js';
import { arcOf } from '../data/arcs.js';
import { CHAPTER_SETUP, PROGRAM_MISSIONS } from '../data/program.js';
import { UNITS_PER_CHAPTER } from './run.js';
import { ATTRIBUTES } from '../data/glyphs.js';
import { REGION } from '../data/mobility.js';
import { getDef as defaultGetDef } from '../data/exercises.js';
import { FULL_MISSIONS } from '../data/missions.js';
import { weekStart } from './dates.js';
import { stagnationStatus } from './stagnation.js';

const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString());

// ——— Nemesis (THE PLATEAU) ———
/**
 * Stagnation Stufe 2 → THE PLATEAU erscheint (Hinweis, kein Kampf).
 * Leichte Einheiten 13–15 eines Kapitels erledigt (Kapitelende oder Saisonwechsel) → er verblasst. Jedes Ereignis nur einmal.
 * Saison-Gegner, Säulen und Medaillen gibt es nicht mehr; engine.bossEvents bleibt als Altbestand unangetastet.
 * @param {object[]} arcEvents Ereignisse aus syncData (chapter_complete, arc_complete)
 */
export function storyEvents(data, today, arcEvents = []) {
  const engine = { ...data.engine };
  const events = [];
  if (!engine.arc) return { data, events };
  const lightDone = arcEvents.some((e) => e.type === 'chapter_complete' || (e.type === 'arc_complete' && !e.byPause));
  if (engine.nemesis?.active && lightDone) {
    engine.nemesis = { active: false, since: engine.nemesis.since, faded: today };
    events.push({ type: 'nemesis_fades' });
  } else if (!engine.nemesis?.active && stagnationStatus({ ...data, engine }).stage2) {
    engine.nemesis = { active: true, since: today };
    events.push({ type: 'nemesis_appears' });
  }
  const changed = events.length || JSON.stringify(engine.nemesis) !== JSON.stringify(data.engine.nemesis);
  return { data: changed ? { ...data, engine } : data, events };
}

// Saison-Intro wartet als Karte auf „Heute“, bis es einmal angesehen wurde.
export const introDue = (data) => !!data.engine.arc && !data.engine.introSeen?.[data.engine.arc.n];

/** Veraltet: Gegner gibt es nicht mehr. Bleibt 0, bis die Screens umgestellt sind. */
export const bossesDefeated = () => 0;

// ——— Codex ———
/** Schaltet Einträge frei: neue Übungen, Rekorde, begegnete und besiegte Bosse, Nemesis. */
export function unlockCodex(data, today, getDef = defaultGetDef) {
  const codex = { ...(data.codex || {}) };
  const add = (key, meta) => { if (!codex[key]) codex[key] = { day: today, ...meta }; };
  for (const s of data.sessions) {
    for (const e of s.exercises || []) if (e.sets?.some((x) => x.done) && getDef(e.exId)) add(`ex:${e.exId}`, { day: s.day });
    for (const id of s.items || []) if (getDef(id) && (s.roundsDone || s.kind === 'flow' || s.kind === 'express')) add(`ex:${id}`, { day: s.day });
    for (const r of s.records || []) if (getDef(r.exId)) add(`rec:${r.exId}:${r.value}:${r.load || 0}`, { day: s.day, exId: r.exId, value: r.value, load: r.load });
  }
  const arc = data.engine.arc;
  if (arc) add(`season:${arcOf(arc.n).id}`, {});
  if (data.engine.nemesis?.since) add('boss:plateau', {});
  if (Object.keys(codex).length === Object.keys(data.codex || {}).length) return data;
  return { ...data, codex };
}

export function codexEntry(key, meta, getDef = defaultGetDef) {
  const [kind, id] = key.split(':');
  if (kind === 'season') {
    const st = SEASON_STORY[id];
    return st ? { title: `BANG COMBAT · ${st.sub}`, text: st.codex, kind: 'season', id } : null;
  }
  if (kind === 'boss') {
    if (id !== 'plateau') return null; // alte Saison-Gegner: ohne Eintrag
    return { title: BOSSES.plateau.name, text: BOSS_LORE.plateau.codex, kind: 'boss', id };
  }
  const def = getDef(kind === 'rec' ? meta.exId : id);
  if (!def) return null;
  if (kind === 'ex') {
    const tpl = CODEX_EXERCISE[hash(key) % CODEX_EXERCISE.length];
    const pattern = ATTRIBUTES[def.tags[0]?.[0]]?.name || 'Bewegung';
    return { title: def.name, kind: 'ex', id: def.id,
      text: fill(tpl, { name: def.name, pattern, mt: def.mt || 'Eingetragen im Kodex.' }).trim() };
  }
  const value = `${meta.value}${def.mode === 'time' ? ' s' : ' Wdh.'}${meta.load ? ` mit ${meta.load} kg` : ''}`;
  return { title: `Rekord · ${def.name}`, kind: 'rec', id: def.id, text: fill(CODEX_RECORD[hash(key) % CODEX_RECORD.length], { name: def.name, value }) };
}

// ——— Titel (ohne Serien und Kalender) ———
const UNIT_IDS = [...PROGRAM_MISSIONS, 'A', 'B', 'C', 'D', 'FORGE'];
const isUnit = (x) => x.kind === 'mission' && UNIT_IDS.includes(x.missionId);

/** Gute Wochen (2× Gym + 1× Muay Thai), egal wann und ob am Stück. */
export function goodWeeks(sessions) {
  const by = new Map();
  for (const x of sessions) {
    if (!(x.kind === 'arena' || x.kind === 'mission')) continue;
    const w = weekStart(x.day);
    const c = by.get(w) || { gym: 0, arena: 0 };
    if (x.kind === 'arena') c.arena += 1; else c.gym += 1;
    by.set(w, c);
  }
  return [...by.values()].filter((c) => c.gym >= 2 && c.arena >= 1).length;
}

/** Hat ein Kapitel seine leichten Einheiten 13–15 vollständig gesehen? (Altbestand: abgeschlossene Saison ohne Pause) */
function lightUnitsDone(data) {
  const by = new Map();
  for (const x of data.sessions) {
    if (x.unit?.phase !== 'deload') continue;
    const k = `${x.unit.programId}:${x.unit.n}:${x.unit.chapter}`;
    by.set(k, (by.get(k) || 0) + 1);
  }
  return [...by.values()].some((k) => k >= UNITS_PER_CHAPTER - 12) || (data.engine.arcHistory || []).some((h) => !h.byPause && !h.byUnits);
}

export function titleStatus(data) {
  const s = data.sessions;
  const last = data.mobility?.[data.mobility.length - 1];
  const mob = last ? Object.values(last.scores).reduce((a, b) => a + b, 0) / Object.values(last.scores).length : 0;
  const reached = {
    unermuedlich: goodWeeks(s) >= 12,
    geduldig: lightUnitsDone(data),
    zurueckgekehrt: s.some((x) => x.modifier === 'comeback' && (x.gap ?? 0) >= 15),
    arenagaenger: s.filter((x) => x.kind === 'arena').length >= 25,
    geschmeidig: mob > 70,
    eisern: s.filter(isUnit).length >= 50, // Kurzversion zählt mit
  };
  return TITLES.map((t) => ({ ...t, unlocked: !!reached[t.id] }));
}

export function equippedTitle(data) {
  const t = titleStatus(data).find((x) => x.id === data.settings.title && x.unlocked);
  return t ? t.name : null;
}

// ——— Zitate ———
export function quotePool(settings) {
  const hidden = new Set(settings.quotesHidden || []);
  const catsOff = new Set(settings.quoteCatsOff || []);
  return [...QUOTES, ...(settings.ownQuotes || [])].filter((q) => !hidden.has(q.id) && !catsOff.has(q.cat));
}

/** Tageszitat: feste, gemischte Reihenfolge, jeden Tag das nächste. Keine Wiederholung, bis alle einmal dran waren. */
export function quoteOfDay(settings, day) {
  const pool = quotePool(settings).slice().sort((a, b) => hash(a.id) - hash(b.id));
  if (!pool.length) return null;
  const n = Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400000);
  return pool[n % pool.length];
}

export function pickQuote(settings, seed) {
  const pool = quotePool(settings);
  return pool.length ? pool[hash(String(seed)) % pool.length] : null;
}

// Nach einer Mission nur gelegentlich: jede dritte volle Mission.
export function quoteAfterMission(data, session) {
  if (session.kind !== 'mission' || !FULL_MISSIONS.includes(session.missionId)) return null;
  const n = data.sessions.filter((s) => s.kind === 'mission' && FULL_MISSIONS.includes(s.missionId)).length;
  return n % 3 === 0 ? pickQuote(data.settings, session.id) : null;
}

const quotePanel = (q) => (q ? { title: q.person, lines: [`„${q.text}“`, q.original ? `${q.original}` : '', q.source].filter(Boolean), quote: true } : null);

// ——— Panels ———
const fillAll = (lines, vars) => (lines || []).map((l) => fill(l, vars));
const idxOf = (n) => ((n % 4) + 4) % 4;

/** Saison-Intro: wo der Fighter steht, was ihn erwartet, wohin er will. Dann die Fakten. */
export function introPanels(data, n) {
  const arc = arcOf(n);
  const st = SEASON_STORY[arc.id];
  const setup = CHAPTER_SETUP[arc.id];
  return [
    { file: seasonImage(idxOf(n), 'start'), title: `BANG COMBAT · ${st.sub}`, lines: st.now },
    { title: 'Was dich erwartet', lines: st.ahead },
    { title: 'Wohin', lines: st.goal },
    { title: 'Was diese Saison trainiert', stats: [['Fokus', st.theme], ['Kapitel 1', setup[0].name], ['Kapitel 2', setup[1].name], ['Kapitel', `${UNITS_PER_CHAPTER} Einheiten`]],
      lines: ['Drei Einheiten A, B, C in fester Reihenfolge. Nichts verfällt.', 'Einheit 1–3: Gewichte finden, eine Wiederholung mehr im Tank.'] },
    quotePanel(pickQuote(data.settings, `intro-${n}`)),
  ].filter(Boolean);
}

/** Nach Einheit 15 eines Kapitels. stats: { einheiten, muaythai } */
export function chapterDonePanels(data, n, chapter, stats = {}) {
  const st = SEASON_STORY[arcOf(n).id];
  const ch = st.chapters[chapter] || st.chapters[0];
  return [{ title: `BANG COMBAT · ${st.sub} · ${CHAPTER_SETUP[arcOf(n).id][chapter]?.name || ''}`.trim(), lines: fillAll(ch.done, { einheiten: stats.einheiten ?? UNITS_PER_CHAPTER, muaythai: stats.muaythai ?? 0 }) }];
}

/** Saison geschafft (nach Kapitel 2 oder beim Saisonwechsel). Kein Sieg, kein Rückzug. stats: { einheiten, muaythai } */
export function seasonDonePanels(data, n, stats = {}) {
  const st = SEASON_STORY[arcOf(n).id];
  return [{ file: seasonImage(idxOf(n), 'end'), title: `${st.sub} ist durch`, lines: fillAll(st.done, { einheiten: stats.einheiten ?? 0, muaythai: stats.muaythai ?? 0 }), gold: true }];
}

/** Zahlen für die Panels aus dem Log: Einheiten und Muay Thai einer Saison (optional nur ein Kapitel). */
export function storyStats(data, n, chapter = null) {
  const inSeason = data.sessions.filter((x) => (x.unit ? x.unit.n === n && (chapter == null || x.unit.chapter === chapter) : chapter == null && x.arc?.n === n));
  return { einheiten: inSeason.filter(isUnit).length, muaythai: inSeason.filter((x) => x.kind === 'arena').length
    || (chapter == null ? data.sessions.filter((x) => x.kind === 'arena' && x.arc?.n === n).length : 0) };
}

/** Veraltet (bis app.js umgestellt ist): früher Sieg/Rückzug des Saison-Gegners, jetzt beides das Saison-Ende. */
export const victoryPanels = (data, n, stats = {}) => seasonDonePanels(data, n, { einheiten: stats.einheiten ?? stats.missions, muaythai: stats.muaythai ?? stats.arena });
export const retreatPanels = victoryPanels;

export function nemesisPanels(kind) {
  const lore = BOSS_LORE.plateau;
  return [{ file: kind === 'fades' ? NEMESIS_SCENES.fades : NEMESIS_SCENES.appears, title: 'THE PLATEAU', lines: kind === 'fades' ? lore.fades : lore.appears }];
}

const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : v);

/** Debrief-Panels mit echten Zahlen aus debriefStats (4–6 Panels). */
export function debriefPanels(data, st) {
  const n = st.arc.n;
  const panels = [...seasonDonePanels(data, n, { einheiten: st.missions, muaythai: st.arena })];
  const season = data.sessions.filter((x) => (x.unit ? x.unit.n === n : x.arc?.n === n));
  panels.push({ title: 'Konstanz', stats: [['Einheiten', st.missions], ['ARENA', `${st.arena} · ${fmt(st.arenaHours)} h`], ['FLOW-Tage', st.flowDays], ['Gute Wochen', goodWeeks(season)]],
    lines: [st.missions >= 10 ? 'Das System registriert Beständigkeit.' : 'Jeder Einsatz wurde gezählt. Keiner ging verloren.'] });
  const top = [...st.strength].sort((a, b) => b.gain / (b.first || 1) - a.gain / (a.first || 1)).slice(0, 4);
  if (top.length) panels.push({ title: 'Kraft', stats: top.map((x) => [x.name, `${fmt(x.first)} → ${fmt(x.best)}`]), lines: [`Bestleistungen in dieser Saison: ${st.records}.`] });
  if (st.mobility.length) {
    const moved = st.mobility.filter((m) => m.before != null).sort((a, b) => (b.after - b.before) - (a.after - a.before)).slice(0, 4);
    const rows = (moved.length ? moved : st.mobility.slice(0, 4)).map((m) => [REGION[m.region]?.name || m.region, m.before != null ? `${m.before} → ${m.after}` : `${m.after}`]);
    panels.push({ title: 'Mobility', stats: rows, lines: ['Score pro Region, vorher und nachher.'] });
  }
  const pain = Object.entries(st.signals.painByRegion).map(([r, k]) => `${r} ${k}×`).join(', ') || 'keine';
  panels.push({ title: 'Körpersignale', stats: [['Ellbogen', st.signals.elbowReports], ['Stagnationen', st.signals.stagnations], ['Deloads', st.signals.deloads], ['Gezwickt', pain]],
    lines: st.signals.patterns.length ? st.signals.patterns.slice(0, 2) : ['Keine wiederkehrenden Muster.'] });
  const q = quotePanel(pickQuote(data.settings, `debrief-${n}`));
  if (q) panels.push(q);
  return panels.slice(0, 7);
}

