// Story: Nemesis, Boss-Sieg/-Rückzug, Codex-Einträge, Titel, Zitate und die Comic-Panels für Intro und Debrief.
import { BOSS_LORE, CODEX_EXERCISE, CODEX_RECORD, TITLES, QUOTES } from '../data/story.js';
import { BOSSES, BOSS_BY_ARC, sceneFile, NEMESIS_SCENES, guardianName } from '../data/lore.js';
import { arcOf } from '../data/arcs.js';
import { ATTRIBUTES } from '../data/glyphs.js';
import { REGION } from '../data/mobility.js';
import { getDef as defaultGetDef } from '../data/exercises.js';
import { FULL_MISSIONS } from '../data/missions.js';
import { weekStart, addDays } from './dates.js';
import { pillars, MEDAL_NAMES } from './pillars.js';
import { stagnationStatus } from './stagnation.js';
import { countsForWeek } from './game.js';

const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString());

// ——— Nemesis und Boss-Ereignisse ———
/**
 * Prüft Nemesis (Stagnation Stufe 2 → erscheint; Deload-Woche abgeschlossen → verschwindet)
 * und Boss-Ausgang (fällt vor Woche 6 → Sieg; steht in Woche 6 noch → Rückzug). Jedes Ereignis nur einmal.
 * @param {object[]} arcEvents Ereignisse aus syncArc (für „Deload-Woche abgeschlossen“)
 */
export function storyEvents(data, today, arcEvents = []) {
  const engine = { ...data.engine };
  const events = [];
  const arc = engine.arc;
  if (!arc) return { data, events };

  // Nemesis
  const completedDeload = arcEvents.some((e) => e.type === 'arc_complete' && !e.byPause);
  if (engine.nemesis?.active && completedDeload) {
    engine.nemesis = { active: false, since: engine.nemesis.since, faded: today };
    events.push({ type: 'nemesis_fades' });
  } else if (!engine.nemesis?.active && stagnationStatus({ ...data, engine }).stage2) {
    engine.nemesis = { active: true, since: today };
    events.push({ type: 'nemesis_appears' });
  }

  // Saison-Wächter: Ergebnis über die drei Säulen, einmal beim Saisonende
  const be = { ...(engine.bossEvents || {}) };
  for (const e of arcEvents.filter((x) => x.type === 'arc_complete')) {
    if (be[e.n]?.result) continue;
    const p = pillars({ ...data, engine }, e.n, defaultGetDef);
    be[e.n] = { result: today, medal: p.medal, defeated: p.medal ? today : null,
      pillars: { benchmark: p.benchmark.passed, index: p.index.passed, chapters: p.chapters.passed }, better: p.index.better, areas: p.index.areas.length };
    events.push({ type: p.medal ? 'boss_defeated' : 'boss_retreat', n: e.n, medal: p.medal });
  }
  engine.bossEvents = be;

  const changed = events.length || JSON.stringify(be) !== JSON.stringify(data.engine.bossEvents || {})
    || JSON.stringify(engine.nemesis) !== JSON.stringify(data.engine.nemesis);
  return { data: changed ? { ...data, engine } : data, events };
}

// Arc-Intro wartet als Karte auf „Heute“, bis es einmal angesehen wurde.
export const introDue = (data) => !!data.engine.arc && !data.engine.introSeen?.[data.engine.arc.n];

export const bossesDefeated = (data) => Object.values(data.engine.bossEvents || {}).filter((e) => e.defeated).length;

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
  if (arc) add(`boss:${BOSS_BY_ARC[arc.n % 4]}`, {});
  if (data.engine.nemesis?.since) add('boss:plateau', {});
  if (Object.keys(codex).length === Object.keys(data.codex || {}).length) return data;
  return { ...data, codex };
}

export function codexEntry(key, meta, getDef = defaultGetDef) {
  const [kind, id] = key.split(':');
  if (kind === 'boss') {
    const b = BOSSES[id];
    return { title: b.name, text: BOSS_LORE[id].codex, kind: 'boss', id };
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

// ——— Titel ———
function weeksWithAtLeast(sessions, n) {
  const counts = new Map();
  sessions.filter(countsForWeek).forEach((s) => { const w = weekStart(s.day); counts.set(w, (counts.get(w) || 0) + 1); });
  if (!counts.size) return 0;
  const weeks = [...counts.keys()].sort();
  let best = 0;
  let run = 0;
  for (let w = weeks[0]; w <= weeks[weeks.length - 1]; w = addDays(w, 7)) {
    run = (counts.get(w) || 0) >= n ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function titleStatus(data) {
  const s = data.sessions;
  const last = data.mobility?.[data.mobility.length - 1];
  const mob = last ? Object.values(last.scores).reduce((a, b) => a + b, 0) / Object.values(last.scores).length : 0;
  const reached = {
    unermuedlich: weeksWithAtLeast(s, 2) >= 12,
    geduldig: (data.engine.arcHistory || []).some((h) => !h.byPause),
    zurueckgekehrt: s.some((x) => x.modifier === 'comeback' && (x.gap ?? 0) >= 15),
    arenagaenger: s.filter((x) => x.kind === 'arena').length >= 25,
    geschmeidig: mob > 70,
    eisern: s.filter((x) => x.kind === 'mission' && FULL_MISSIONS.includes(x.missionId)).length >= 50,
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
export function introPanels(data, n) {
  const arc = arcOf(n);
  const bossId = BOSS_BY_ARC[n % 4];
  const lore = BOSS_LORE[bossId];
  const idx = n % 4;
  const name = guardianName(n);
  return [
    { file: sceneFile(idx, 'establishing'), title: arc.name, lines: lore.world },
    { file: BOSSES[bossId].file, ratio: 3 / 4, boss: bossId, title: `${name} · ${lore.epithet}`, lines: [lore.weakness] },
    { file: sceneFile(idx, 'confront'), title: 'Konfrontation', lines: [...lore.confront, 'Er fällt nicht durch Menge. Drei Säulen entscheiden: Benchmark, Fortschritt, Durchziehen.'] },
    { title: 'Was diese Saison trainiert', stats: [['Fokus', arc.focus], ['Kapitel 1', arc.chapters[0].name], ['Kapitel 2', arc.chapters[1].name], ['Woche 13', 'Prüfwoche']],
      lines: [arc.desc, 'Woche 1: Gewichte finden, 3 Wiederholungen im Tank.'] },
    quotePanel(pickQuote(data.settings, `intro-${n}`)),
  ].filter(Boolean);
}

export function victoryPanels(data, n, stats = {}) {
  const bossId = BOSS_BY_ARC[n % 4];
  const medal = stats.medal || data.engine.bossEvents?.[n]?.medal;
  const lines = BOSS_LORE[bossId].victory.map((l) => fill(l, stats));
  return [{ file: sceneFile(n % 4, 'victory'), title: `${guardianName(n)} ist gefallen`, lines: medal ? [...lines, `Säulen: ${MEDAL_NAMES[medal]}.`] : lines, gold: true }];
}

export function retreatPanels(data, n, stats = {}) {
  const bossId = BOSS_BY_ARC[n % 4];
  return [{ file: sceneFile(n % 4, 'retreat'), title: `${guardianName(n)} zieht sich zurück`, lines: BOSS_LORE[bossId].retreat.map((l) => fill(l, stats)) }];
}

export function nemesisPanels(kind) {
  const lore = BOSS_LORE.plateau;
  return [{ file: kind === 'fades' ? NEMESIS_SCENES.fades : NEMESIS_SCENES.appears, title: 'THE PLATEAU', lines: kind === 'fades' ? lore.fades : lore.appears }];
}

const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : v);

/** Debrief-Panels mit echten Zahlen aus debriefStats (4–6 Panels). */
export function debriefPanels(data, st) {
  const n = st.arc.n;
  const boss = st.boss;
  const vars = { missions: st.missions, records: st.records, arena: st.arena, flow: st.flowDays };
  const outcome = boss?.defeated || data.engine.bossEvents?.[n]?.defeated ? victoryPanels(data, n, vars) : retreatPanels(data, n, vars);
  const panels = [...outcome];
  panels.push({ title: 'Konstanz', stats: [['Missionen', st.missions], ['ARENA', `${st.arena} · ${fmt(st.arenaHours)} h`], ['FLOW-Tage', st.flowDays], ['Längste Serie', `${st.longestStreak} W`]],
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

