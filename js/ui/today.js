// Heute: „Was geht heute?“ → kurzer Check-in → nächste Einheit (BANG COMBAT) → Start.
import { sys, esc, chips, glyphChips, targetText, loadText, trendBadge, nameOf, helpDot } from './kit.js';
import { decide, advice, adviceText, nextSlot } from '../engine/decide.js';
import { todayPick, DEFAULT_WEEK_PLAN, DEFAULT_MT_DAYS, todaySuggestion, weekTally } from '../engine/schedule.js';
import { hardStreak, arenaOn, plattCount, gapDays, lastDoneBySlot } from '../engine/history.js';
import { shouldSuggestDeload, startDeload, dismissComeback } from '../engine/cycle.js';
import { nextUnit, activeRun, chooseChapter, calendarSeasonN, UNITS_PER_CHAPTER, PHASE_LABEL } from '../engine/run.js';
import { SEASON_STORY } from '../data/story.js';
import { CHAPTER_SETUP, PROGRAM_MISSIONS, UNIT_LETTER } from '../data/program.js';
import { weekInfo, holidayActive, DEFAULT_HOLIDAY, inDeload } from '../engine/arc.js';
import { yesterdayClass } from '../engine/load.js';
import { stagnationStatus } from '../engine/stagnation.js';
import { logDecision } from '../engine/rulelog.js';
import { PLYO_NAMES, arcOf, ARCS } from '../data/arcs.js';
import { lookSeason, realSeason } from './atmosphere.js';
import { introDue, quoteOfDay } from '../engine/story.js';
import { rankEmblem } from './emblem.js';
import { bossImage } from './lore.js';
import { REGIONS, elbowStatus, reportElbow, reportPain, physioNoteDue, activeRegions } from '../engine/signals.js';
import { reviewDue, debriefDue } from '../engine/debrief.js';
import { buildPlan, createActive, logArena } from '../engine/plan.js';
import { TRAVEL_EQUIPMENT } from './onboarding.js';
import { ladderCard, ladderActions } from './ladder.js';
import { temperCard, bladeEmblem } from './temper.js';
import { wristCards, afterCheckin } from './wrist.js';
import { handsCard } from './hands.js';
import { feetCard } from './feet.js';
import { benchmarkCard } from './benchmark.js';
import { eventToday, weightLoggedThisWeek } from '../engine/events.js';
import { W } from '../engine/wrist.js';
import { bladeTier } from '../engine/temper.js';
import { playerStats, WEEK_GOAL, rankName } from '../engine/game.js';
import { addDays, daysBetween, weekStart, formatDay } from '../engine/dates.js';
import { MISSIONS } from '../data/missions.js';
import { BLOCKS } from '../data/program.js';
import { journalActions } from './journal.js';
import { getDef, EQUIPMENT } from '../data/exercises.js';
import { exportFile } from '../store.js';
import { XP_CONFIG } from '../data/xp-config.js';
import { isDue, latestTest } from '../engine/mobility.js';
import { questStatus, highestAscension, ASCENSIONS } from '../engine/progress.js';

const Q = {
  yesterdayMT: ['Gestern Muay Thai?', [['none', 'Nein'], ['light', 'Locker-Technik'], ['hard', 'Hartes Sparring']]],
  sleep: ['Wie hast du geschlafen?', [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']]],
  feeling: ['Wie fühlst du dich?', [['frisch', 'Frisch'], ['normal', 'Normal'], ['platt', 'Platt']]],
  tonightMT: ['Heute Abend Muay Thai?', [['yes', 'Ja'], ['no', 'Nein'], ['maybe', 'Vielleicht']]],
  where: ['Wo?', [['room', 'Fighting Cave'], ['gym', 'Home Gym'], ['travel', 'Unterwegs / Hotel']]],
  time: ['Wie viel Zeit?', [['full', 'Volle Einheit · 45–60 min'], ['kompakt', '30 min'], ['express', '15 min'], ['five', '5 min'], ['mobility', 'Nur Mobility']]],
};

// Saisonnamen auf Deutsch (für Texte wie „BANG COMBAT · Winter“)
export const SEASON_DE = { WINTER: 'Winter', SPRING: 'Frühling', SUMMER: 'Sommer', AUTUMN: 'Herbst' };

/** 15 Einheiten eines Kapitels als Leiste: erledigt, aktuell, Einstieg (1–3) und leicht (13–15) gedimmt. */
export function unitTrack(run) {
  const done = Math.min(run?.done || 0, UNITS_PER_CHAPTER);
  const cell = (k) => `<i class="${k <= done ? 'on' : k === done + 1 ? 'cur' : ''}${k <= 3 ? ' in' : k >= 13 ? ' dl' : ''}"></i>`;
  return `<div class="unit-track" aria-label="${done} von ${UNITS_PER_CHAPTER} Einheiten geschafft">${Array.from({ length: UNITS_PER_CHAPTER }, (_, i) => cell(i + 1)).join('')}</div>`;
}

/** Kurzlabel der aktuellen Einheit, überall gleich: „Einheit 6/15“ = die 6. kommt als Nächstes. Kapitel durch: „15/15 geschafft“. */
export const unitNow = (run) => (run.done >= UNITS_PER_CHAPTER ? `${UNITS_PER_CHAPTER}/${UNITS_PER_CHAPTER} geschafft` : `Einheit ${run.done + 1}/${UNITS_PER_CHAPTER}`);

/** Wochenstand nach „Gute Woche = 2× Gym + 1× Muay Thai“. Darunter kein Problem, darüber Bonus. */
export function weekText(data, today) {
  const t = weekTally(data.sessions, today);
  return `Gym ${t.gym}/${t.goal.gym} · Muay Thai ${t.arena}/${t.goal.arena}${t.bonus ? ` · +${t.bonus} Bonus` : ''}${t.good ? ' · gute Woche' : ''}`;
}

// Kleiner Status: Rang, Kampfkraft, Kapitel als 15 Einheiten, Wochenstand.
export function statusStrip(c) {
  const s = playerStats(c.data, c.today());
  const run = activeRun(c.data.engine);
  const u = nextUnit(c.data.engine, c.today());
  const asc = highestAscension(c.data);
  const t = weekTally(c.data.sessions, c.today());
  const dots = [...Array.from({ length: t.goal.gym }, (_, i) => `<i class="${i < t.gym ? 'on' : ''}" title="Gym"></i>`),
    ...Array.from({ length: t.goal.arena }, (_, i) => `<i class="mt${i < t.arena ? ' on' : ''}" title="Muay Thai"></i>`)].join('');
  const sub = run ? arcOf(run.n).sub : '';
  return `<section class="strip" data-act="go" data-to="profil">
    <div class="strip-rank${asc ? ' aura' : ''}" style="${asc ? `--aura:${asc.aura}` : ''}">${rankEmblem(s.rank.index, { size: 40 })}<span class="strip-blade" title="Klinge">${bladeEmblem(bladeTier(c.data), 22)}</span></div>
    <div class="strip-main">
      <div class="strip-top"><b>${esc(rankName(s.rank))}</b><span class="num" data-kk="${s.kk}">${s.kk.toLocaleString('de-DE')}</span><small>Kampfkraft</small></div>
      ${run ? `<div class="strip-boss"><span>${esc(sub)} · Kap. ${run.chapter + 1}</span>${unitTrack(run)}<span class="num">${unitNow(run)}</span></div>` : ''}
      <div class="strip-bottom"><span>${u ? `${esc(u.programName)} · ${esc(u.chapterName)}` : ''}</span><span class="wdots" title="Gute Woche: 2× Gym, 1× Muay Thai">${dots}</span></div>
    </div></section>`;
}

// Saison-Headline unter der Statusleiste: Saison-Unterame groß (IRON …), darunter Kapitel und Einheit.
function seasonHero(c) {
  const run = activeRun(c.data.engine);
  if (!run) return '';
  const look = lookSeason(c.data);
  const a = ARCS.find((x) => x.id.toLowerCase() === look);
  const real = look === realSeason(c.data);
  const u = nextUnit(c.data.engine, c.today());
  const done = Math.min(run.done, UNITS_PER_CHAPTER);
  const sub = !real ? `${SEASON_DE[a.id]} · nur Look`
    : u?.choice ? `Kap. ${run.chapter + 1} ${esc(CHAPTER_SETUP[arcOf(run.n).id][run.chapter].name)} · geschafft`
      : `Kap. ${run.chapter + 1} ${esc(u.chapterName)} · Einheit ${done + 1}/${UNITS_PER_CHAPTER}`;
  return `<section class="season-hero s-${look}"><small class="sh-kick">BANG COMBAT · ${esc(SEASON_DE[a.id])}</small><h1 class="sh-name">${esc(a.sub)}</h1>
    <p class="sh-sub"><span class="sh-live">${real ? 'aktiv' : 'Vorschau'}</span>${sub}</p></section>`;
}

// Saisonwechsel: Vollbild-Sequenz beim ersten Öffnen einer neuen Saison (oder als Vorschau aus dem Setup)
function seasonGate(c) {
  const data = c.data;
  const preview = c.ui.gatePreview;
  const n = data.engine.arc?.n ?? 0;
  if (!preview && (!introDue(data) || data.settings.gateSeen === n)) return '';
  const look = preview ? lookSeason(data) : realSeason(data);
  const a = ARCS.find((x) => x.id.toLowerCase() === look);
  const letters = [...a.sub].map((ch, i) => `<i style="animation-delay:${(0.5 + i * 0.07).toFixed(2)}s">${ch === ' ' ? '&nbsp;' : esc(ch)}</i>`).join('');
  const flakes = Array.from({ length: 30 }, (_, i) => `<b style="left:${((i * 37) % 100)}%;animation-duration:${(7 + (i % 5) * 1.6).toFixed(1)}s;animation-delay:${(-(i % 7) * 1.1).toFixed(1)}s;width:${1 + (i % 3)}px;height:${1 + (i % 3)}px"></b>`).join('');
  return `<div class="season-gate s-${look}" role="dialog" aria-label="BANG COMBAT · ${esc(a.sub)} beginnt">
    <div class="sg-snow" aria-hidden="true">${look === 'winter' ? flakes : ''}</div>
    <div class="sg-core">
      <small class="sg-kick">BANG COMBAT · ${esc(SEASON_DE[a.id])}</small>
      <h1 class="sg-name">${letters}</h1>
      <div class="sg-line"></div>
      <p class="sg-sub">${esc(SEASON_STORY[a.id]?.theme || a.focus)}</p>
      <p class="sg-guard">Kapitel 1 · ${esc(CHAPTER_SETUP[a.id][0].name)} · ${UNITS_PER_CHAPTER} Einheiten</p>
      <div class="sg-actions"><button class="btn primary wide" data-act="gate-enter">Eintreten</button><button class="btn ghost" data-act="gate-later">Später</button></div>
    </div></div>`;
}

// Saison-Extras auf Heute: ZONE 2 (Sommer Kapitel 2), Event pro Kapitel, montags Körpergewicht
function seasonExtras(c) {
  const data = c.data;
  const today = c.today();
  let out = '';
  const arc = data.engine.arc;
  if (arc && weekInfo(arc).rules.zone2 && !data.sessions.some((s) => s.missionId === 'ZONE2' && s.day >= weekStart(today))) {
    out += `<section class="card flow-card"><div><b>ZONE 2</b><small>Diese Woche einmal 30 min locker, zusätzlich zu den Missionen</small></div><button class="btn" data-act="start" data-id="ZONE2">Start</button></section>`;
  }
  if (arc && weekInfo(arc).rules.optional4x4 && !data.sessions.some((s) => s.missionId === 'NOR4X4' && s.day >= weekStart(today))) {
    out += `<section class="card flow-card"><div><b>NORWEGIAN 4x4 · optional</b><small>An einem freien Tag, ca. 35 min. Pratzen-Runden zählen schon als Intervalle.</small></div><button class="btn" data-act="start" data-id="NOR4X4" data-profile="gym">Start</button></section>`;
  }
  const ev = eventToday(data, today);
  if (ev) {
    out += `<section class="card event-card"><div class="label">Event · freiwillig</div><b>${esc(ev.event.name)}</b>
      <p class="small">${esc(ev.event.desc)} ${ev.state === 'announce' ? `Ab Einheit ${ev.from} des Kapitels, wann es passt.` : 'Jetzt offen, wann es passt.'}</p>
      <ul class="cues">${ev.event.parts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${ev.state === 'live' ? '<button class="btn primary wide" data-act="event-done">Event geschafft</button>' : '<p class="muted small">Zählt nicht als Einheit und nicht für die gute Woche. Bringt ein Event-Abzeichen.</p>'}</section>`;
  }
  if (new Date(`${today}T12:00:00`).getDay() === 1 && data.settings.weightTrack !== false && !weightLoggedThisWeek(data, today)) {
    out += `<section class="card flow-card"><div><b>Körpergewicht</b><small>Optional, einmal pro Woche. ${String(data.settings.bodyweight || 80).replace('.', ',')} kg zuletzt</small></div><button class="btn" data-act="go" data-to="profil">Eintragen</button></section>`;
  }
  return out;
}

export function hud(c) {
  const s = playerStats(c.data, c.today());
  const dots = Array.from({ length: s.week.goal || WEEK_GOAL }, (_, i) => `<i class="${i < s.week.thisWeek ? 'on' : ''}"></i>`).join('');
  const asc = highestAscension(c.data);
  return `<header class="hud">
    <div class="rank-wrap${asc ? ' aura' : ''}" style="${asc ? `--aura:${asc.aura}` : ''}" title="${asc ? esc(asc.name) : 'Rang'}">${rankEmblem(s.rank.index, { size: 56 })}</div>
    <div class="hud-kk"><small>Kampfkraft</small><b class="num" data-kk="${s.kk}">${s.kk.toLocaleString('de-DE')}</b>
      <div class="xpbar"><i style="width:${Math.round(s.rank.progress * 100)}%"></i></div></div>
    <div class="hud-week"><small>Woche</small><div class="wdots">${dots}</div><b class="num">${s.week.streak}<span>W</span></b></div>
  </header>`;
}

function recommendation(c) {
  const data = c.data;
  const today = c.today();
  const ci = data.checkins[today];
  if (!ci) return null;
  const holiday = data.settings.holiday ?? DEFAULT_HOLIDAY;
  const arc = data.engine.arc;
  const ws = weekStart(today);
  const fourByFourDue = !!arc && !!weekInfo(arc).rules.fourByFour
    && !data.sessions.some((s) => s.missionId === 'NOR4X4' && s.day >= ws);
  const pick = pickFor(data, today, ci);
  const rec = decide({ checkin: ci, hardStreak: hardStreak(data.sessions, today), queue: data.engine.queue,
    overrideRest: ci.overrideRest, yesterday: yesterdayClass(data.sessions, today, ci.yesterdayMT),
    gap: gapDays(data.sessions, today, holiday), lastDone: lastDoneBySlot(data.sessions),
    holiday: holidayActive(today, holiday), fourByFourDue, pick });
  if (ci.choice) {
    const id = ci.choice;
    return { ...rec, kind: MISSIONS[id].format === 'flow' ? 'flow' : 'mission', missionId: id,
      slot: id === 'HOTEL' ? pick.missionId || pick.sched.todayPlanned || 'D' : id === 'NOR4X4' ? 'D' : null, rotate: null,
      profile: id === 'FORGE' ? 'gym' : id === 'HOTEL' ? 'travel' : rec.profile, compact: !!rec.compact && [...PROGRAM_MISSIONS, 'FORGE'].includes(id),
      reason: 'Von dir gewählt.', manual: true };
  }
  return rec;
}

// Wochenplan und Muay-Thai-Tage aus den Einstellungen (Altlast, BANG COMBAT plant keine Tage)
export const weekPlanOf = (data) => data.settings.weekPlan || DEFAULT_WEEK_PLAN;
export const mtDaysOf = (data) => data.settings.mtDays || DEFAULT_MT_DAYS;
export function pickFor(data, today, checkin = null) {
  const next = nextUnit(data.engine, today)?.missionId || null;
  return todayPick({ weekPlan: weekPlanOf(data), mtDays: mtDaysOf(data), sessions: data.sessions, today, checkin, next });
}

// Woche: Stand nach „Gute Woche“ und die Reihenfolge der nächsten Einheiten (antippbar). Keine Wochentage, nichts verpasst.
function weekLine(c) {
  const today = c.today();
  const t = weekTally(c.data.sessions, today);
  const u = nextUnit(c.data.engine, today);
  const order = u ? [0, 1, 2].map((k) => PROGRAM_MISSIONS[(PROGRAM_MISSIONS.indexOf(u.missionId) + k) % PROGRAM_MISSIONS.length]) : [];
  const chip = (id, k) => `<button class="chip rot-chip${k === 0 ? ' next' : ''}" data-act="rot-peek" data-id="${id}"><small>${k === 0 ? 'als Nächstes' : 'danach'}</small><b>${esc(UNIT_LETTER[id] || id)}</b></button>`;
  const units = t.units.map((x) => UNIT_LETTER[x.id] || x.id).join(', ');
  return `<section class="rot-line"><div class="label">Diese Woche ${helpDot('rotation')}</div>
    <p class="wk-tally"><b class="${t.gym >= t.goal.gym ? 'ok' : ''}">Gym ${t.gym}/${t.goal.gym}</b><b class="${t.arena >= t.goal.arena ? 'ok' : ''}">Muay Thai ${t.arena}/${t.goal.arena}</b>${t.bonus ? `<b class="bonus">+${t.bonus} Bonus</b>` : ''}</p>
    <p class="muted small">${t.good ? 'Gute Woche. Alles Weitere ist Bonus.' : 'Gute Woche: 2× Gym und 1× Muay Thai. Weniger ist kein Problem.'}${units ? ` Erledigt: ${esc(units)}.` : ''}</p>
    ${order.length ? `<div class="rot-chips">${order.map((id, k) => `${k ? '<i class="rot-arrow">→</i>' : ''}${chip(id, k)}`).join('')}</div>` : ''}</section>`;
}

function planPreview(plan) {
  if (plan.format === 'sets' && plan.program) {
    let lastBlock = null;
    return `<ol class="ex-list blocks">${plan.items.map((it) => {
      const def = getDef(it.exId);
      const head = it.block && it.block !== lastBlock ? `<li class="blk-head blk-${it.block}"><span>${esc(BLOCKS[it.block].name)}</span></li>` : '';
      lastBlock = it.block || lastBlock;
      const sets = it.setPlan ? it.setPlan.map((x) => (x.label === 'Top-Satz' ? `Top ${it.range ? `${it.range[0]}–${it.range[1]}` : x.value}` : null)).filter(Boolean).concat(it.setPlan.filter((x) => x.label === 'Backdown').length ? [`${it.setPlan.filter((x) => x.label === 'Backdown').length} × ${it.bdRange ? `${it.bdRange[0]}–${it.bdRange[1]}` : 'BD'}`] : []).join(' + ')
        : def.mode === 'fixed' ? `${it.sets > 1 ? `${it.sets} × ` : ''}${targetText(def)}` : `${it.sets} × ${targetText(def, it.target)}`;
      return `${head}<li class="blk-${it.block || 'none'}"><span>${esc(def.name)}${it.anchor ? ' <em class="anchor-tag">Anker</em>' : ''}${it.optional ? ' <em>optional</em>' : ''}${it.wrist ? ' <em class="wrist-tag">Handgelenk</em>' : ''}${it.adjust ? ' <em class="warn-tag">angepasst</em>' : ''}</span><span class="muted">${sets}${loadText(def, it.load) && def.load ? ` · ${loadText(def, it.load)}` : ''} ${trendBadge(it.trend)}</span></li>`;
    }).join('')}</ol>`;
  }
  if (plan.format === 'sets') {
    return `<ol class="ex-list">${plan.items.map((it) => {
      const def = getDef(it.exId);
      return `<li><span>${esc(def.name)}${it.optional ? ' <em>optional</em>' : ''}${it.wrist ? ' <em class="wrist-tag">Handgelenk</em>' : ''}${it.adjust ? ' <em class="warn-tag">angepasst</em>' : ''}</span><span class="muted">${def.mode === 'fixed' ? `${it.sets > 1 ? `${it.sets} × ` : ''}${targetText(def)}` : `${it.sets} × ${targetText(def, it.target)}`}${loadText(def, it.load) && def.load ? ` · ${loadText(def, it.load)}` : ''} ${trendBadge(it.trend)}</span></li>`;
    }).join('')}</ol>`;
  }
  if (plan.format === 'intervals') return `<p class="muted">${plan.rounds} × ${plan.work / 60} min ${esc(nameOf(plan.exId))}, ${plan.rest / 60} min Pause.</p>`;
  const head = plan.format === 'circuit' ? `<p class="muted">${plan.rounds} Runden, ${plan.restBetween / 60} min Pause zwischen den Runden${plan.light ? ', ruhiges Tempo' : ''}.</p>`
    : plan.format === 'amrap' ? '<p class="muted">So viele Runden wie möglich in 15 Minuten.</p>'
      : `<p class="muted">${plan.items.length} Positionen × ${plan.work} s, ${plan.rounds} Runden. Weich bewegen, nicht erzwingen.${plan.personalized ? ' Die ersten drei sind deine Fokus-Stretches aus dem Mobility-Check.' : ''}</p>`;
  return `${head}<ol class="ex-list">${plan.items.map((it) => {
    const def = getDef(it.exId);
    const v = plan.format === 'flow' ? '' : `${it.value} ${def.unit || (def.mode === 'time' ? 's' : '')}${def.perSide ? ' je Seite' : ''}`;
    return `<li><span>${esc(def.name)}${it.focus ? ' <em class="focus">Fokus</em>' : ''}</span><span class="muted">${v}</span></li>`;
  }).join('')}</ol>`;
}

function modifierNote(plan) {
  const m = plan.modifier;
  if (!m || m.type === 'none') return '';
  if (m.type === 'deload') {
    return '<p class="note">Leichte Einheit: halbe Sätze, gleiches Gewicht, 3 Wdh. im Tank. Ein guter Moment, den Mobility-Check zu wiederholen.</p>';
  }
  if (m.type === 'comeback') {
    const n = m.remaining || 1;
    return `<div class="signal-note comeback-note"><b>Wiedereinstieg</b><span>${m.gap ? `${m.gap} Tage Pause. ` : ''}Vorschlag: ${n === 1 ? 'diese Einheit' : `die nächsten ${n} Einheiten`} mit +${m.rirPlus || 1} RIR, kein Satz bis ans Limit. Sätze und Gewichte bleiben, das Kapitel läuft normal weiter.</span>
      <button class="btn small ghost" data-act="comeback-dismiss">Brauche ich nicht</button></div>`;
  }
  return '';
}

// Körperkarte: Punkte auf einer Silhouette und dieselben Regionen als Chips (beides antippbar).
const SPOTS = { nacken: [[60, 34]], schulter: [[41, 47], [79, 47]], handgelenk: [[25, 103], [95, 103]], ruecken: [[60, 88]],
  huefte: [[51, 107], [69, 107]], knie: [[51, 146], [69, 146]], sprunggelenk: [[52, 184], [68, 184]] };
export function bodyMap(selected) {
  const spots = Object.entries(SPOTS).flatMap(([r, pts]) => pts.map(([x, y]) =>
    `<circle class="spot${selected.includes(r) ? ' on' : ''}" cx="${x}" cy="${y}" r="7" data-act="pain-toggle" data-region="${r}"><title>${REGIONS[r]}</title></circle>`)).join('');
  return `<div class="bodymap"><svg viewBox="0 0 120 200" aria-hidden="true">
    <path class="body" d="M60 10c-7 0-12 6-12 13s5 13 12 13 12-6 12-13-5-13-12-13zM44 40c-9 2-14 8-15 18l-5 44c-1 4 5 6 6 1l6-36 3 30-4 86c0 5 7 5 8 1l9-74h4l9 74c1 4 8 4 8-1l-4-86 3-30 6 36c1 5 7 3 6-1l-5-44c-1-10-6-16-15-18z"/>
    ${spots}</svg>
    <div class="chips">${Object.entries(REGIONS).map(([r, name]) => `<button class="chip${selected.includes(r) ? ' on' : ''}" data-act="pain-toggle" data-region="${r}">${name}</button>`).join('')}</div>
    <p class="muted small">Markierte Regionen: 7 Tage lang schlägt die App Varianten ohne Last auf dieser Stelle vor.</p></div>`;
}

function dailyQuote(c) {
  if (c.data.settings.dailyQuote === false) return '';
  const q = quoteOfDay(c.data.settings, c.today());
  return q ? `<blockquote class="quote daily-quote">„${esc(q.text)}“<cite>${esc(q.person)} · ${esc(q.source)}</cite></blockquote>` : '';
}

// Hinweis über dem Weiter-Knopf: was als Nächstes dran ist und was die App dazu meint. Du entscheidest.
function timeHint(c, f) {
  const today = c.today();
  const pick = pickFor(c.data, today, f);
  const next = pick.missionId;
  const a = next ? advice({ checkin: { ...f, tonightMT: 'no' }, hardStreak: hardStreak(c.data.sessions, today), yesterday: yesterdayClass(c.data.sessions, today, f.yesterdayMT), next }) : { lines: [] };
  return `<p class="muted small time-hint">${helpDot('hints')} ${esc(pick.reason)}${a.lines.length ? ` ${esc(adviceText(a))}` : ''}</p>`;
}

// „Was geht heute?“: Gym (nächste Einheit) · Muay Thai · Beides · Nichts. Kein „verpasst“, keine Nachhol-Liste.
const ASK = [
  ['gym', 'Gym', (u) => (u ? `Nächste Einheit: ${u.letter}` : 'Nächste Einheit')],
  ['mt', 'Muay Thai', () => 'Partner oder Sack'],
  ['both', 'Beides', () => 'Reihenfolge egal'],
  ['none', 'Nichts', () => 'Es verfällt nichts'],
];

function checkinForm(c) {
  const today = c.today();
  const f = c.ui.ci || (c.ui.ci = { yesterdayMT: arenaOn(c.data.sessions, addDays(today, -1)) });
  const u = nextUnit(c.data.engine, today);
  const grid = `<div class="ask-grid">${ASK.map(([k, label, sub]) => `<button class="ask-opt ask-${k}${f.today === k ? ' on' : ''}" data-act="ask" data-v="${k}" aria-pressed="${f.today === k}"><b>${label}</b><small>${esc(sub(u))}</small></button>`).join('')}</div>
    <p class="muted small ask-week">${esc(weekText(c.data, today))}. Gute Woche: 2× Gym und 1× Muay Thai, alles darüber ist Bonus.</p>`;
  if (!f.today || f.today === 'none') return sys('Was geht heute?', grid);
  if (f.today === 'mt') {
    return sys('Was geht heute?', `${grid}<div class="q"><div class="q-label">Mit Partner?</div>
      <div class="row gap"><button class="btn primary grow" data-act="ask-mt" data-partner="yes">Mit Partner</button><button class="btn grow" data-act="ask-mt" data-partner="no">Partner sagt ab</button></div></div>`);
  }
  const needPlace = true;
  const ready = f.sleep && f.feeling && f.where && (!W(c.data).on || f.wristToday != null);
  const q = (k) => `<div class="q"><div class="q-label">${Q[k][0]}</div>${chips(k, Q[k][1], f[k])}</div>`;
  const elbow = c.data.settings.jointPause ? '' : `<div class="q"><div class="q-label">Ellbogen zwickt?</div>${chips('elbow', [['no', 'Nein'], ['yes', 'Ja']], f.elbow || 'no')}</div>`;
  const painOpen = f.painOpen || (f.pain || []).length > 0;
  const pain = `<div class="q"><div class="q-label">Zwickt sonst etwas?</div>${chips('painOpen', [['no', 'Alles okay'], ['yes', 'Ja']], painOpen ? 'yes' : 'no')}
    ${painOpen ? bodyMap(f.pain || []) : ''}</div>`;
  const gear = f.travelGear ?? c.data.settings.travelGear ?? [];
  const travel = needPlace && f.where === 'travel' ? `<div class="q"><div class="q-label">Was ist da? (optional)</div>
    <div class="chips">${TRAVEL_EQUIPMENT.map((id) => `<button class="chip${gear.includes(id) ? ' on' : ''}" data-act="travel-gear" data-id="${id}">${esc(EQUIPMENT[id])}</button>`).join('')}</div>
    <p class="muted small">Nichts angehakt = nur Körpergewicht. Jede Übung wird durch eine mit gleichem Muster ersetzt, Fortschritt zählt getrennt.</p></div>` : '';
  const wristQ = W(c.data).on ? `<div class="q"><div class="q-label">Handgelenk heute (0–10)</div>${chips('wristToday', Array.from({ length: 11 }, (_, v) => [String(v), String(v)]), f.wristToday)}</div>` : '';
  return sys('Was geht heute?', `${grid}<div class="ask-more">${q('where')}${travel}${q('feeling')}${q('sleep')}${q('yesterdayMT')}${elbow}${wristQ}${pain}
    ${timeHint(c, f)}
    <button class="btn primary wide" data-act="submit-ci" ${ready ? '' : 'disabled'}>Weiter</button></div>`);
}

export function questCard(c) {
  const q = questStatus(c.data, c.today());
  const pips = Array.from({ length: q.target }, (_, i) => `<i class="${i < q.progress ? 'on' : ''}"></i>`).join('');
  return `<section class="card quest${q.done ? ' done' : ''}"><div class="quest-head"><div><div class="label">Side Quest</div><b>${esc(q.quest.title)}</b><small>${esc(q.quest.desc)}${q.done ? ' · erfüllt' : ` · +${XP_CONFIG.sources.quest} XP`}</small></div>
    <span class="num">${q.progress}/${q.target}</span></div><div class="wdots quest-pips">${pips}</div></section>`;
}

// Kapitelzeile der Einheit: „BANG COMBAT · IRON · Kapitel 1 · Fundament“, darunter Einheit, Phase und RIR.
export function arcLine(data, today, plan) {
  const u = nextUnit(data.engine, today);
  if (!u) return '';
  const pu = plan?.unit || {};
  const unitNo = pu.unitNo || u.unitNo;
  const phase = pu.phase ? PHASE_LABEL[pu.phase] : u.phaseLabel;
  const plyo = plan?.plyo ? ` · Plyo ${plan.plyo.stage} (${PLYO_NAMES[plan.plyo.stage]})` : '';
  const rir = plan?.rir != null ? ` · RIR ${plan.rir}` : '';
  return `<div class="arc-line"><b>${esc(u.programName)} · ${esc(u.sub)} · Kapitel ${u.chapter + 1} · ${esc(u.chapterName)} ${helpDot('season')}</b>
    <span>Einheit ${unitNo} von ${u.unitsPerChapter} · ${esc(phase)}${rir}${plyo}</span>
    ${u.choice ? '<span class="muted">Neues Kapitel: Diese Einheit ist die erste.</span>' : ''}</div>`;
}

function adjustNote(c, plan) {
  const today = c.today();
  const items = (plan.items || []).filter((i) => i.adjust);
  c.ui.lastAdjust = items.map((i) => i.adjust);
  const el = elbowStatus(c.data, today);
  const regions = activeRegions(c.data.signals, today);
  const status = `${el.count ? `Ellbogen-Zähler ${el.count}/${el.threshold}` : ''}${el.count && regions.length ? ' · ' : ''}${regions.length ? `gemeldet: ${regions.map((r) => REGIONS[r]).join(', ')}` : ''}`;
  if (c.data.engine.signalsDeclined === today && (el.full || regions.length)) {
    return `<div class="signal-note"><span>Körpersignale heute nicht berücksichtigt. ${esc(status)}</span><button class="btn small ghost" data-act="signals-restore">Wieder anpassen</button></div>`;
  }
  if (!items.length) return status ? `<p class="muted small">${esc(status)}</p>` : '';
  return `<div class="signal-note"><b>Angepasst wegen Körpersignalen</b><ul>${items.map((i) => `<li>${esc(i.adjust)}</li>`).join('')}</ul>
    <span class="muted small">${esc(status)}</span><button class="btn small ghost" data-act="signals-decline">Heute ohne Anpassung</button></div>`;
}

function stagnationPanel(c) {
  const data = c.data;
  const st = stagnationStatus(data);
  let out = '';
  const recent = data.engine.plateauDismissed && daysBetween(data.engine.plateauDismissed, c.today()) < 7;
  if (st.stage2 && !inDeload(data.engine.arc) && !recent) {
    out += sys('Stagnation in mehreren Mustern', `<p>${st.stage1.length} Hauptübungen aus verschiedenen Mustern kommen nicht mehr voran. Vorschlag: Deload-Woche jetzt, danach geht es frisch weiter.</p>
      <div class="row gap"><button class="btn primary grow" data-act="deload-yes" data-rule="plateau">Deload-Woche jetzt</button><button class="btn" data-act="deload-no" data-rule="plateau">Ablehnen</button></div>`, { tone: 'warn' });
    return out;
  }
  for (const x of st.stage1.slice(0, 2)) {
    if (!x.suggestion) continue;
    out += sys('Stagnation', `<p>${esc(x.reason)} Vorschlag: Variante wechseln zu <b>${esc(getDef(x.suggestion).name)}</b>.</p>
      <div class="row gap"><button class="btn primary grow" data-act="stag-accept" data-slot="${x.slotKey}" data-from="${x.exId}" data-to="${x.suggestion}">Wechseln</button>
      <button class="btn" data-act="stag-decline" data-slot="${x.slotKey}" data-from="${x.exId}" data-to="${x.suggestion}" data-n="${x.sessions}">Ablehnen</button></div>`);
  }
  return out;
}

// Kapitelende: Empfehlung fürs nächste Kapitel („Es ist Frühling. Empfohlen: BANG COMBAT · STRIKE …“).
// Starten = einfach weiter trainieren (die nächste Einheit übernimmt die Empfehlung). Anderes wählen = Kapitel-Liste.
const choiceKey = (u) => `${u.programId}:${u.choice.n}:${u.choice.chapter}`;
function chapterChoiceCard(c) {
  const u = nextUnit(c.data.engine, c.today());
  if (!u?.choice || c.data.settings.choiceOk === choiceKey(u)) return '';
  return sys('Kapitel geschafft', `<p class="reason">${esc(u.choice.text)}</p>
    <p class="muted small">Du entscheidest, womit es weitergeht. Die Empfehlung gilt erst ab der nächsten Einheit.</p>
    <div class="row gap"><button class="btn primary grow" data-act="choice-ok">Starten</button><button class="btn grow" data-act="choice-other">Anderes wählen</button></div>`, { tone: 'gold' });
}

/** Modal: Kapitel selbst wählen. Saisons ab der Kalendersaison, je zwei Kapitel, Empfehlung und Saison markiert. */
export function chapterPicker(c) {
  const today = c.today();
  const run = activeRun(c.data.engine);
  if (!run) return;
  const u = nextUnit(c.data.engine, today);
  const cal = calendarSeasonN(today);
  const rec = u?.choice;
  const opts = [];
  for (let i = 0; i < 4; i += 1) for (const ch of [0, 1]) opts.push({ n: cal + i, chapter: ch });
  if (!opts.some((o) => o.n === run.n && o.chapter === run.chapter)) opts.unshift({ n: run.n, chapter: run.chapter, again: true });
  const row = (o) => {
    const a = arcOf(o.n);
    const tags = [o.n === run.n && o.chapter === run.chapter ? (u?.choice ? 'gerade geschafft' : 'läuft gerade') : '',
      rec && rec.n === o.n && rec.chapter === o.chapter ? 'empfohlen' : '', o.n === cal ? 'passt zur Saison' : ''].filter(Boolean);
    return `<button class="swap${rec && rec.n === o.n && rec.chapter === o.chapter ? ' rec' : ''}" data-act="choose-chapter" data-n="${o.n}" data-ch="${o.chapter}">
      <b>${esc(a.sub)} · Kapitel ${o.chapter + 1} · ${esc(CHAPTER_SETUP[a.id][o.chapter].name)}</b>
      <small>${esc(SEASON_DE[a.id])} · ${esc(SEASON_STORY[a.id]?.theme || a.focus)}${tags.length ? ` · ${tags.join(' · ')}` : ''}</small></button>`;
  };
  c.modal(sys('Kapitel wählen', `<p class="muted small">${u?.choice ? 'Das neue Kapitel beginnt mit Einheit 1.' : 'Ein laufendes Kapitel wird sonst nie unterbrochen. Wählst du hier, beginnt das gewählte Kapitel neu bei Einheit 1.'}</p>
    <div class="swap-list">${opts.map(row).join('')}</div>
    <button class="btn ghost wide" data-act="close-modal">Abbrechen</button>`, { cls: 'pop swap-pop' }));
}

export const chapterActions = {
  'choice-ok': (c) => {
    const u = nextUnit(c.data.engine, c.today());
    if (!u?.choice) return;
    c.update((data) => ({ ...data, settings: { ...data.settings, choiceOk: choiceKey(u) } }));
  },
  'choice-other': (c) => chapterPicker(c),
  'choose-chapter': (c, d) => {
    const today = c.today();
    c.modal(null);
    c.update((data) => logDecision({ ...data, engine: chooseChapter(data.engine, { n: Number(d.n), chapter: Number(d.ch) }, today) },
      { rule: 'chapter:choose', day: today, suggestion: nextUnit(data.engine, today)?.choice || null, decision: 'chosen', input: { n: Number(d.n), chapter: Number(d.ch) } }));
  },
};

// Antwort auf „Was geht heute?“ und den kurzen Check-in speichern.
// today: gym | mt | both | none · partner: false = Partner sagt ab · tonightMT folgt der Antwort (für Hinweise und Belastung)
function submitCheckin(c) {
  let wristEvents = [];
  const today = c.today();
  const f = c.ui.ci || {};
  c.update((data) => {
    let next = data;
    const y = addDays(today, -1);
    const train = f.today === 'gym' || f.today === 'both';
    if (train && f.yesterdayMT && f.yesterdayMT !== 'none' && arenaOn(data.sessions, y) === 'none') {
      next = logArena(data, { day: y, intensity: f.yesterdayMT, minutes: 60 }).data;
    }
    if (train && f.elbow === 'yes') next = reportElbow(next, { day: today, source: 'checkin' });
    if (train && (f.pain || []).length) next = reportPain(next, { day: today, regions: f.pain });
    const { painOpen, ...answers } = f;
    if (answers.sleep) answers.sleep = Number(answers.sleep);
    if (answers.wristToday != null) answers.wristToday = Number(answers.wristToday);
    answers.tonightMT = f.today === 'mt' || f.today === 'both' ? 'yes' : 'no';
    answers.time = 'full';
    if (!answers.where) answers.where = 'room';
    if (f.where === 'travel') {
      answers.travelGear = f.travelGear ?? data.settings.travelGear ?? [];
      next = { ...next, settings: { ...next.settings, travelGear: answers.travelGear } };
    }
    next = { ...next, checkins: { ...next.checkins, [today]: { day: today, ...answers } } };
    if (!train) return next;
    // Handgelenk: Folgetag-Werte einarbeiten, Zwick-Meldung Handgelenk setzt Gelb
    const wr = afterCheckin(next, today, f.pain || []);
    wristEvents = wr.events;
    return wr.data;
  });
  c.ui.ci = null;
  const ups = wristEvents.filter((e) => e.type === 'level_up');
  if (ups.length) c.system('Handgelenk', `<p>Drei grüne Einheiten in Folge. Gesteigert:</p><ul class="cues">${ups.map((e) => `<li>${esc(getDef(e.key)?.name || e.key)}: ${esc(getDef(e.key)?.levels?.[e.level] || `Stufe ${e.level + 1}`)}</li>`).join('')}</ul>`);
}

function backupDue(data, today) {
  if (!data.sessions.length) return false;
  const s = data.settings;
  const since = (d) => (d ? daysBetween(d.slice(0, 10), today) : Infinity);
  return since(s.lastBackupAt) >= 7 && since(s.backupNudgeAt) >= 7;
}

export default {
  render(c) {
    const data = c.data;
    const today = c.today();
    // Ganz oben: Status, Saison und Kapitel. Dann „Was geht heute?“ bzw. die Antwort darauf, danach Hinweise.
    let out = seasonGate(c) + statusStrip(c) + seasonHero(c) + dailyQuote(c) + chapterChoiceCard(c);
    let notes = '';
    if (introDue(data)) {
      const a = arcOf(data.engine.arc.n);
      notes += `<section class="card intro-card"><div><b>BANG COMBAT · ${esc(a.sub)}</b><small>Das Saison-Intro wartet: wo du stehst und wohin diese Saison geht.</small></div><button class="btn primary" data-act="go" data-to="intro">Öffnen</button></section>`;
    }
    if (data.engine.nemesis?.active) {
      notes += sys('Stillstand', `<div class="boss-row">${bossImage('plateau', { cls: 'lore-small' })}<div><p class="reason">THE PLATEAU · Der Stillstand.</p>
        <p class="muted small">Mehrere Muster kommen gerade nicht voran. Das ist normal. Er verblasst nach den leichten Einheiten des Kapitels.</p></div></div>`, { tone: 'calm' });
    }
    if (shouldSuggestDeload(data.engine, plattCount(data.checkins, today), today)) {
      notes += sys('Leichte Einheiten vorziehen?', `<p>Dreimal „platt“ in sieben Tagen. Vorschlag: direkt zu den leichten Einheiten 13–15 springen. Danach beginnt das nächste Kapitel ausgeruht.</p>
        <div class="row gap"><button class="btn primary grow" data-act="deload-yes" data-rule="platt">Leichte Einheiten</button><button class="btn" data-act="deload-no" data-rule="platt">Nicht jetzt</button></div>`);
    }
    notes += stagnationPanel(c);
    notes += ladderCard(c);
    if (physioNoteDue(data, today)) {
      notes += sys('Hinweis', `<p class="reason">Wenn das anhält, lass es von einem Physio anschauen.</p>
        <p class="muted small">Der Ellbogen-Zähler war drei Wochen in Folge voll.</p>
        <div class="row gap"><button class="btn" data-act="physio-ok">Verstanden</button></div>`, { tone: 'calm' });
    }
    const rv = reviewDue(data, today);
    if (rv) notes += `<section class="card flow-card"><div><b>Wochenrückblick</b><small>Unter 2 Minuten · 2 Taps</small></div><button class="btn primary" data-act="go" data-to="review">Öffnen</button></section>`;
    const db = debriefDue(data, today);
    if (db != null) notes += `<section class="card flow-card"><div><b>Saison-Debrief</b><small>3 Fragen und Export für deinen Coach</small></div><button class="btn primary" data-act="go" data-to="debrief">Öffnen</button></section>`;

    if (backupDue(data, today)) {
      notes += sys('Sicherung empfohlen', `<p>iOS räumt den Speicher von Web-Apps manchmal auf. Eine Sicherung dauert zehn Sekunden.</p>
        <div class="row gap"><button class="btn primary grow" data-act="backup-now">Jetzt sichern</button><button class="btn" data-act="backup-later">Später</button></div>`);
    }

    const ci = data.checkins[today];
    if (!ci) return out + checkinForm(c) + benchmarkCard(c) + seasonExtras(c) + temperCard(c) + wristCards(c, null) + handsCard(c) + feetCard(c) + notes;

    const doneToday = data.sessions.filter((s) => s.day === today);
    const trained = doneToday.filter((s) => s.kind === 'mission' || s.kind === 'express').length;
    const arenaToday = doneToday.some((s) => s.kind === 'arena');
    const answer = ci.today || 'gym'; // Check-ins von vor BANG COMBAT: wie „Gym“
    const u = nextUnit(data.engine, today);
    let rec = null;
    if (answer === 'none' && !ci.choice && !trained) {
      out += sys('Heute nichts', `<p class="reason">${esc(todaySuggestion('none').text)}</p>
        <p class="muted">${u ? `Als Nächstes: ${esc(u.programName)} · ${esc(u.letter)}, wann es passt. ` : ''}Ein FLOW geht immer, wenn du magst.</p>
        <div class="row gap"><button class="btn" data-act="redo-ci">Doch etwas machen</button></div>`, { tone: 'calm' });
    } else if (answer === 'mt' && !ci.choice && !trained) {
      if (arenaToday) {
        out += sys('Tagesziel erreicht', '<p class="reason">Muay Thai ist eingetragen.</p><p class="muted">Der Rest des Tages gehört der Erholung.</p>', { tone: 'calm' });
      } else if (ci.partner !== false) {
        out += sys('Muay Thai', `<p class="reason">${esc(todaySuggestion('mt').text)}</p><p class="muted">Danach in der ARENA eintragen. Die nächste Einheit wartet, es verfällt nichts.</p>
          <button class="btn primary wide" data-act="go" data-to="arena">ARENA eintragen</button>`, { tone: 'calm' });
      } else {
        rec = recommendation(c);
        c.ui.lastRec = { ...rec, plyoCap: false };
        const unit = rec.kind === 'mission' && PROGRAM_MISSIONS.includes(rec.missionId);
        out += sys('Partner sagt ab', `<p class="reason">Ca. 30 min am Sack. Nach Lust dazu die nächste Einheit als Kurzversion.</p>
          <button class="btn primary wide" data-act="bag-timer">Rundentimer für den Sack</button>
          ${unit ? `<button class="btn wide kurz-btn" data-act="start-rec" data-compact="1"><b>Kurzversion · ${esc(u.letter)}</b><small>ca. 30 min · zählt voll</small></button>
          <p class="muted small center">Aufwärmen, Hauptübung (Top-Satz + 1 Backdown), CMPND Block 2 Runden. Ganz freiwillig.</p>` : ''}`, { tone: 'calm' });
      }
    } else {
      rec = recommendation(c);
      // Empfehlung war nur FLOW (Check-in „nur Mobility“, ARENA-Tag, Ruhetag) bzw. nur HANDS: erledigt, sobald sie gemacht ist
      const lightKind = { flow: 'flow', arenaday: 'flow', rest: 'flow', free: 'flow', five: 'hands' }[rec.kind];
      const lightDone = !trained && !ci.extra && lightKind && doneToday.find((s) => s.kind === lightKind);
      const mtLeft = answer === 'both' && !arenaToday;
      if (lightDone) {
        const what = lightKind === 'flow' ? 'FLOW' : 'HANDS';
        out += sys('Tagesziel erreicht', `<p class="reason">${what} erledigt. Genau das war für heute vorgesehen.</p>
          <p class="muted">Der Rest des Tages gehört der Erholung.${rec.walk ? ' Ein Spaziergang rundet ihn ab.' : ''}</p>`, { tone: 'calm' });
      } else if (trained > (ci.extra || 0)) {
        const logged = doneToday.filter((s) => s.kind === 'mission' || s.kind === 'express');
        out += sys('Tagesziel erreicht', `<p class="reason">Einheit erledigt.${mtLeft ? ' Heute steht noch Muay Thai an.' : ' Der Rest des Tages gehört der Erholung.'}</p>
          <p class="muted">Stärke entsteht in der Pause. Ein FLOW am Abend hält dich geschmeidig.</p>
          ${logged.map((s) => `<div class="done-row"><span>${esc(MISSIONS[s.missionId]?.name || s.missionId)}${s.completion < 0.999 ? ` · ${Math.round(s.completion * 100)} %` : ''}</span><button class="btn small ghost danger" data-act="j-del" data-id="${esc(s.id)}">Löschen</button></div>`).join('')}
          <div class="row gap">${mtLeft ? '<button class="btn primary grow" data-act="go" data-to="arena">Muay Thai eintragen</button>' : ''}<button class="btn ghost" data-act="swap">Weitere Einheit</button></div>`, { tone: 'calm' });
      } else if (rec.kind === 'arenaday') {
        out += sys('ARENA-Tag', `<p class="reason">${esc(rec.reason)}</p><p class="muted">Ein kurzer FLOW am Morgen macht die Hüfte frei für die Kicks am Abend.</p>
          <div class="row gap"><button class="btn primary grow" data-act="start" data-id="FLOW">FLOW starten</button><button class="btn" data-act="morning-yes">Doch Morgeneinheit</button></div>`, { tone: 'calm' });
      } else if (rec.kind === 'free') {
        out += sys('Kein Kraft-Tag', `<p class="reason">${esc(rec.reason)}</p><p class="muted">FLOW reicht heute. Erholung ist Teil des Plans.</p>
          <div class="row gap"><button class="btn primary grow" data-act="start" data-id="FLOW">FLOW starten</button><button class="btn" data-act="swap">Trotzdem trainieren</button></div>`, { tone: 'calm' });
      } else if (rec.kind === 'five') {
        out += sys('Nur 5 Minuten', `<p class="reason">${esc(rec.reason)}</p>
          <div class="row gap"><button class="btn primary grow" data-act="start" data-id="HANDS">HANDS starten</button></div>`, { tone: 'calm' });
      } else if (rec.kind === 'rest') {
        out += sys('Ruhetag', `<p class="reason">${esc(rec.reason)}</p><p class="muted">Erholung ist Teil des Trainings. Ein lockerer FLOW hält dich beweglich.</p>
          <div class="row gap"><button class="btn primary grow" data-act="start" data-id="FLOW">FLOW starten</button><button class="btn" data-act="override-rest">Trotzdem trainieren</button></div>`, { tone: 'calm' });
      } else {
        const plan = buildPlan({ missionId: rec.missionId, profile: rec.profile, data, today, compact: rec.compact,
          slot: rec.slot, rotate: rec.rotate, plyoCap: ci.sparTomorrow === true });
        c.ui.lastRec = { ...rec, plyoCap: ci.sparTomorrow === true };
        const unit = PROGRAM_MISSIONS.includes(rec.missionId);
        const sparQ = plan.plyo && plan.plyo.wanted >= 4 && ci.sparTomorrow == null
          ? `<div class="q"><div class="q-label">Morgen hartes Sparring geplant?</div>${chips('sparTomorrow', [['no', 'Nein'], ['yes', 'Ja']], null).replace(/data-act="pick"/g, 'data-act="spar"')}<p class="muted small">Heute steht Plyo-Stufe ${plan.plyo.wanted} an. Vor hartem Sparring bleibt es bei Stufe 3.</p></div>` : '';
        const mid = UNIT_LETTER[rec.missionId] || (rec.missionId.length === 1 ? rec.missionId : '◆');
        const place = plan.kind === 'mission' && rec.missionId !== 'HOTEL' ? (rec.profile === 'gym' ? ' · Home Gym' : rec.profile === 'room' ? ' · Fighting Cave' : '') : rec.profile === 'travel' ? ' · Unterwegs' : '';
        out += sys(unit && !rec.manual ? 'Nächste Einheit' : rec.manual ? 'Von dir gewählt' : 'Einheit', `<div class="mission-title hero"><span class="mid">${esc(mid)}</span><div><h2>${esc(plan.name)}</h2><small>${esc(plan.focus)} · ca. ${plan.minutes} min${place}</small></div></div>
          ${plan.kind === 'mission' && unit ? arcLine(data, today, plan) : ''}
          <p class="reason">${esc(rec.reason)}</p>${mtLeft ? '<p class="note">Dazu heute Muay Thai. Die Reihenfolge ist egal.</p>' : ''}${rec.hint?.lines.length && !rec.manual ? `<p class="note">${esc(adviceText(rec.hint))}</p>` : ''}${rec.walk ? '<p class="note">Danach 20–30 Minuten spazieren.</p>' : ''}${modifierNote(plan)}
          ${sparQ}${adjustNote(c, plan)}${plan.wrist && rec.missionId !== 'WRIST' ? `<div class="signal-note"><span>${esc(plan.wrist.reason)}</span><button class="btn small ghost" data-act="wrist-decline">Heute ohne Handgelenk-Block</button></div>` : ''}${planPreview(plan)}
          <button class="btn primary wide pulse" data-act="start-rec">${unit ? 'Einheit starten' : 'Starten'}</button>
          ${unit && !rec.compact ? `<button class="btn wide kurz-btn" data-act="start-rec" data-compact="1"><b>Kurzversion</b><small>ca. 30 min · zählt voll</small></button>
          <p class="muted small center">Aufwärmen, Hauptübung (Top-Satz + 1 Backdown), CMPND Block 2 Runden.</p>` : ''}`);
      }
    }
    if (trained <= (ci.extra || 0)) {
      out += `<div class="row gap center"><button class="btn ghost" data-act="swap">Andere Einheit</button><button class="btn ghost" data-act="redo-ci">Antwort ändern</button></div>`;
    }
    out += benchmarkCard(c);
    out += seasonExtras(c);
    out += wristCards(c, rec);
    out += temperCard(c);
    out += handsCard(c, rec);
    out += feetCard(c, rec);
    out += notes;

    out += questCard(c);
    if (isDue(data.mobility, today) && !doneToday.some((s) => s.kind === 'check')) {
      const first = !latestTest(data.mobility);
      out += `<section class="card flow-card"><div><b>Mobility-Check${first ? '' : ' fällig'}</b><small>${first ? '10 min · macht deinen FLOW persönlich' : '4 Wochen um · Fortschritt messen'}</small></div><button class="btn" data-act="go" data-to="check">Starten</button></section>`;
    }
    if (rec?.missionId !== 'FLOW' && !doneToday.some((s) => s.kind === 'flow')) {
      out += `<section class="card flow-card"><div><b>FLOW</b><small>Täglich 10 min Mobility</small></div><button class="btn" data-act="start" data-id="FLOW">Starten</button></section>`;
    }
    if (doneToday.length) {
      out += `<section class="card"><div class="label">Heute erledigt</div>${doneToday.map((s) =>
        `<div class="done-row">✓ ${esc(s.kind === 'arena' ? `ARENA${s.bmt ? ` · BMT W${s.bmt.week}` : ''} · ${s.rpe ? `Intensität ${s.rpe}` : s.intensity === 'hard' ? 'Sparring' : 'Technik'}` : s.kind === 'check' ? 'Mobility-Check' : s.kind === 'quest' ? 'Wochen-Quest erfüllt' : s.kind === 'ascension' ? `Ascension: ${ASCENSIONS.find((a) => a.id === s.ascension)?.name}` : MISSIONS[s.missionId]?.name || s.missionId)} <span class="muted">+${s.xp} XP</span></div>`).join('')}</section>`;
    }
    // Rotation: jede Einheit antippbar, zeigt Übungen und Sätze nach heutigem Stand
    out += weekLine(c);
    return out;
  },

  actions: {
    'rot-peek': (c, d) => {
      const ci = c.data.checkins[c.today()];
      const where = ci?.where === 'gym' || d.id === 'FORGE' ? 'gym' : ci?.where === 'room' ? 'room' : 'gym';
      const plan = buildPlan({ missionId: d.id, profile: where, data: c.data, today: c.today() });
      c.system(plan.name, `<p class="muted small">${esc(plan.focus)} · ca. ${plan.minutes} min${where === 'gym' ? ' · Home Gym' : where === 'travel' ? ' · Unterwegs' : ''}</p>
        ${planPreview(plan)}<p class="muted small">Stand heute. Gewichte und Wiederholungen passen sich bis dahin noch an deine nächsten Einheiten an.</p>`);
    },
    // Einmal pro Saison: gesehen merken, danach bleibt nur die Intro-Karte auf Heute
    'gate-enter': (c) => {
      const prev = c.ui.gatePreview;
      c.ui.gatePreview = false;
      if (prev) { if (introDue(c.data)) c.go('intro'); else c.render(); return; }
      c.update((data) => ({ ...data, settings: { ...data.settings, gateSeen: data.engine.arc?.n ?? 0 } }));
      c.go('intro');
    },
    'gate-later': (c) => {
      if (c.ui.gatePreview) { c.ui.gatePreview = false; c.render(); return; }
      c.update((data) => ({ ...data, settings: { ...data.settings, gateSeen: data.engine.arc?.n ?? 0 } }));
    },
    // „Was geht heute?“: Nichts → gleich verbuchen, Muay Thai → Partner-Frage, Gym/Beides → kurzer Check-in
    ask: (c, d) => {
      c.ui.ci = { ...c.ui.ci, today: d.v };
      if (d.v === 'none') { submitCheckin(c); return; }
      c.render();
    },
    'ask-mt': (c, d) => {
      c.ui.ci = { ...c.ui.ci, today: 'mt', partner: d.partner !== 'no' };
      submitCheckin(c);
    },
    'bag-timer': (c) => { c.ui.atab = 'timer'; c.go('arena'); },
    'comeback-dismiss': (c) => {
      const today = c.today();
      c.update((data) => logDecision({ ...data, engine: dismissComeback(data.engine, today) },
        { rule: 'comeback', day: today, suggestion: 'rir_plus', decision: 'declined' }));
    },
    ...chapterActions,
    pick: (c, d) => {
      const v = d.name === 'morning' ? d.value === 'yes' : d.name === 'painOpen' ? d.value === 'yes' : d.value;
      c.ui.ci = { ...c.ui.ci, [d.name]: v, ...(d.name === 'painOpen' && !v ? { pain: [] } : {}) };
      c.render();
    },
    'travel-gear': (c, d) => {
      const cur = c.ui.ci?.travelGear ?? c.data.settings.travelGear ?? [];
      c.ui.ci = { ...c.ui.ci, travelGear: cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id] };
      c.render();
    },
    'pain-toggle': (c, d) => {
      const cur = c.ui.ci?.pain || [];
      const pain = cur.includes(d.region) ? cur.filter((r) => r !== d.region) : [...cur, d.region];
      c.ui.ci = { ...c.ui.ci, pain, painOpen: true };
      c.render();
    },
    'signals-decline': (c) => {
      const today = c.today();
      c.update((data) => logDecision({ ...data, engine: { ...data.engine, signalsDeclined: today } },
        { rule: 'signals:adjust', day: today, suggestion: c.ui.lastAdjust || [], decision: 'declined' }));
    },
    'signals-restore': (c) => c.update((data) => ({ ...data, engine: { ...data.engine, signalsDeclined: null } })),
    'physio-ok': (c) => {
      const today = c.today();
      c.update((data) => logDecision({ ...data, engine: { ...data.engine, physioNoteShown: today } },
        { rule: 'signals:physio', day: today, suggestion: 'physio_note', decision: 'shown' }));
    },
    'submit-ci': (c) => submitCheckin(c),
    spar: (c, d) => {
      const today = c.today();
      c.update((data) => ({ ...data, checkins: { ...data.checkins, [today]: { ...data.checkins[today], sparTomorrow: d.value === 'yes' } } }));
    },
    'start-rec': (c, d) => {
      if (c.data.active) {
        c.go('training');
        return;
      }
      const r = c.ui.lastRec;
      const today = c.today();
      const compact = d?.compact === '1' || !!r.compact; // Kurzversion (ca. 30 min, zählt voll)
      const plan = buildPlan({ missionId: r.missionId, profile: r.profile, data: c.data, today, compact,
        slot: r.slot, rotate: r.rotate, plyoCap: r.plyoCap });
      const adjusted = plan.items?.filter((i) => i.adjust).map((i) => i.adjust) || [];
      c.update((data) => {
        let d = logDecision(data, { rule: `decide:${r.rule ?? 'manual'}`, day: today,
          input: c.data.checkins[today], suggestion: r.missionId, decision: r.manual ? 'override' : 'accepted' });
        if (adjusted.length) d = logDecision(d, { rule: 'signals:adjust', day: today, suggestion: adjusted, decision: 'accepted' });
        return { ...d, active: createActive(plan, today) };
      });
      c.go('training');
    },
    'stag-accept': (c, d) => {
      const today = c.today();
      c.update((data) => logDecision({ ...data, engine: { ...data.engine,
        slotVariant: { ...data.engine.slotVariant, [d.slot]: d.to } } },
      { rule: 'stagnation:1', day: today, input: { slot: d.slot, exId: d.from }, suggestion: d.to, decision: 'accepted' }));
      c.system('Variante gewechselt', `<p>${esc(getDef(d.to).name)} übernimmt ab der nächsten Einheit. Die Gewichte startet das System konservativ.</p>`);
    },
    'stag-decline': (c, d) => {
      const today = c.today();
      c.update((data) => logDecision({ ...data, engine: { ...data.engine,
        stagnationDismissed: { ...data.engine.stagnationDismissed, [d.slot]: Number(d.n) } } },
      { rule: 'stagnation:1', day: today, input: { slot: d.slot, exId: d.from }, suggestion: d.to, decision: 'declined' }));
    },
    'morning-yes': (c) => {
      const today = c.today();
      const { day, choice, overrideRest, extra, ...answers } = c.data.checkins[today] || {};
      c.ui.ci = { ...answers, morning: true };
      c.update((data) => {
        const checkins = { ...data.checkins };
        delete checkins[today];
        return { ...data, checkins };
      });
    },
    'j-del': journalActions['j-del'],
    'j-del-yes': journalActions['j-del-yes'],
    'redo-ci': (c) => {
      const today = c.today();
      const { day, choice, overrideRest, extra, ...answers } = c.data.checkins[today] || {};
      c.ui.ci = { ...answers, sleep: answers.sleep != null ? String(answers.sleep) : undefined,
        wristToday: answers.wristToday != null ? String(answers.wristToday) : undefined };
      c.update((data) => {
        const checkins = { ...data.checkins };
        delete checkins[today];
        return { ...data, checkins };
      });
    },
    'event-done': (c) => {
      const ev = eventToday(c.data, c.today());
      if (!ev) return;
      c.update((data) => ({ ...data, sessions: [...data.sessions, { id: `ev${Date.now()}`, day: c.today(), kind: 'event', eventId: ev.event.id, name: ev.event.name, n: ev.n, chapter: ev.chapter, xp: XP_CONFIG.sources.event }] }));
      c.system('Event geschafft', `<p class="reason">${esc(ev.event.name)}. Das System notiert es ohne Kommentar.</p><div class="xp-gain num">+${XP_CONFIG.sources.event} XP</div>`, [['close-modal', 'Weiter', 'primary']], 'gold');
    },
    swap: (c) => {
      const q = [pickFor(c.data, c.today(), c.data.checkins[c.today()]).missionId];
      // BANG COMBAT A/B/C zuerst, dann die kleinen Formate. Alte Missionen (legacy) nicht mehr anbieten.
      const ids = [...PROGRAM_MISSIONS, 'HOTEL', 'EXPRESS', 'EXPRESS_BAG', 'FLOW', 'ZONE2', 'NOR4X4', 'HANDS', 'FEET'].filter((id) => MISSIONS[id] && !MISSIONS[id].legacy);
      c.modal(sys('Andere Einheit', `<div class="swap-list">${ids.map((id) =>
        `<button class="swap" data-act="choose" data-id="${id}"><b>${esc(MISSIONS[id].name)}</b><small>${esc(MISSIONS[id].focus)}${id === q[0] ? ' · als Nächstes' : ''}</small></button>`).join('')}</div>
        <p class="muted small">Eine andere Einheit von A/B/C zählt genauso. Die Reihenfolge läuft danach ab ihr weiter.</p>
        <button class="btn ghost wide" data-act="close-modal">Abbrechen</button>`, { cls: 'pop' }));
    },
    choose: (c, d) => {
      const today = c.today();
      c.modal(null);
      const extra = c.data.sessions.filter((s) => s.day === today && (s.kind === 'mission' || s.kind === 'express')).length;
      c.update((data) => logDecision({ ...data, checkins: { ...data.checkins, [today]: { ...data.checkins[today], choice: d.id, overrideRest: true, extra } } },
        { rule: 'swap', day: today, suggestion: c.ui.lastRec?.missionId, decision: 'override', input: { chosen: d.id } }));
    },
    'override-rest': (c) => {
      c.system('Warnung', '<p>Drei harte Tage am Stück. Die Anpassung passiert in der Pause, nicht im Training. Trotzdem trainieren?</p>',
        [['override-yes', 'Trotzdem trainieren'], ['close-modal', 'Ruhetag nehmen', 'primary']], 'warn');
    },
    'override-yes': (c) => {
      const today = c.today();
      c.modal(null);
      c.update((data) => logDecision({ ...data, checkins: { ...data.checkins, [today]: { ...data.checkins[today], overrideRest: true } } },
        { rule: 'decide:2', day: today, suggestion: 'rest', decision: 'override' }));
    },
    start: (c, d) => {
      if (c.data.active) {
        c.go('training');
        return;
      }
      const today = c.today();
      const profile = d.profile || 'room';
      const plan = buildPlan({ missionId: d.id, profile, data: c.data, today });
      c.ui.training = { index: 0 };
      c.update((data) => ({ ...data, active: createActive(plan, today) }));
      c.go('training');
    },
    ...ladderActions,
    'wrist-decline': (c) => c.update((data) => ({ ...data, engine: { ...data.engine, wristDeclined: c.today() } })),
    'discard-active': (c) => {
      c.system('Mission verwerfen?', '<p>Die bisher geloggten Sätze dieser Einheit gehen verloren.</p>',
        [['discard-yes', 'Verwerfen'], ['close-modal', 'Behalten', 'primary']], 'warn');
    },
    'discard-yes': (c) => {
      c.modal(null);
      c.update((data) => ({ ...data, active: null }));
    },
    'deload-yes': (c, d) => {
      c.update((data) => logDecision({ ...data, engine: startDeload(data.engine) },
        { rule: `deload:${d.rule || 'manual'}`, day: c.today(), suggestion: 'deload_week', decision: 'accepted' }));
      c.system('Leichte Einheiten', '<p>Ab jetzt die leichten Einheiten 13–15 des Kapitels: halbe Sätze, gleiches Gewicht, 3 Wdh. im Tank. Ein guter Moment für den Mobility-Check.</p>');
    },
    'deload-no': (c, d) => c.update((data) => logDecision({ ...data, engine: { ...data.engine,
      deloadSuggestDismissed: c.today(), ...(d.rule === 'plateau' ? { plateauDismissed: c.today() } : {}) } },
    { rule: `deload:${d.rule || 'manual'}`, day: c.today(), suggestion: 'deload_week', decision: 'declined' })),
    'backup-now': async (c) => {
      if (await exportFile(c.data, c.today())) {
        c.update((data) => ({ ...data, settings: { ...data.settings, lastBackupAt: new Date().toISOString() } }));
      }
    },
    'bench-skip': (c, d) => c.update((data) => ({ ...data, settings: { ...data.settings, benchSkip: d.key } })),
    'backup-later': (c) => c.update((data) => ({ ...data, settings: { ...data.settings, backupNudgeAt: c.today() } })),
  },
};
