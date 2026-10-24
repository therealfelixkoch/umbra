// Heute: Check-in → Empfehlung → Start.
import { sys, esc, chips, glyphChips, targetText, loadText, trendBadge, nameOf } from './kit.js';
import { decide, advice, adviceText, nextSlot } from '../engine/decide.js';
import { hardStreak, arenaOn, plattCount, gapDays, lastDoneBySlot } from '../engine/history.js';
import { shouldSuggestDeload, startDeload } from '../engine/cycle.js';
import { weekInfo, holidayActive, DEFAULT_HOLIDAY } from '../engine/arc.js';
import { yesterdayClass } from '../engine/load.js';
import { stagnationStatus } from '../engine/stagnation.js';
import { logDecision } from '../engine/rulelog.js';
import { PLYO_NAMES, ARC_WEEKS, arcOf } from '../data/arcs.js';
import { bossStatus } from '../engine/boss.js';
import { introDue, quoteOfDay } from '../engine/story.js';
import { rankEmblem } from './emblem.js';
import { bossImage } from './lore.js';
import { BOSSES } from '../data/lore.js';
import { REGIONS, elbowStatus, reportElbow, reportPain, physioNoteDue, activeRegions } from '../engine/signals.js';
import { reviewDue, debriefDue } from '../engine/debrief.js';
import { buildPlan, createActive, logArena } from '../engine/plan.js';
import { TRAVEL_EQUIPMENT } from './onboarding.js';
import { ladderCard, ladderActions } from './ladder.js';
import { temperCard, bladeEmblem } from './temper.js';
import { wristCards, afterCheckin } from './wrist.js';
import { handsCard } from './hands.js';
import { feetCard } from './feet.js';
import { W } from '../engine/wrist.js';
import { bladeTier } from '../engine/temper.js';
import { playerStats, WEEK_GOAL, rankName } from '../engine/game.js';
import { addDays, daysBetween, weekStart } from '../engine/dates.js';
import { MISSIONS } from '../data/missions.js';
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
  where: ['Wo?', [['room', 'Eigener Raum'], ['gym', 'Home Gym'], ['travel', 'Unterwegs / Hotel']]],
  time: ['Wie viel Zeit?', [['full', 'Volle Einheit · 45–60 min'], ['kompakt', '30 min'], ['express', '15 min'], ['five', '5 min'], ['mobility', 'Nur Mobility']]],
};

// Kleiner Status unter der Mission: Rang, Kampfkraft, Boss-Lebensbalken, Arc-Woche (x/6), Wochenziel.
export function statusStrip(c) {
  const s = playerStats(c.data, c.today());
  const arc = c.data.engine.arc;
  const b = bossStatus(c.data);
  const dots = Array.from({ length: s.week.goal || WEEK_GOAL }, (_, i) => `<i class="${i < s.week.thisWeek ? 'on' : ''}"></i>`).join('');
  const asc = highestAscension(c.data);
  return `<section class="strip" data-act="go" data-to="profil">
    <div class="strip-rank${asc ? ' aura' : ''}" style="${asc ? `--aura:${asc.aura}` : ''}">${rankEmblem(s.rank.index, { size: 40 })}<span class="strip-blade" title="Klinge">${bladeEmblem(bladeTier(c.data), 22)}</span></div>
    <div class="strip-main">
      <div class="strip-top"><b>${esc(rankName(s.rank))}</b><span class="num" data-kk="${s.kk}">${s.kk.toLocaleString('de-DE')}</span><small>Kampfkraft</small></div>
      ${b ? `<div class="strip-boss"><span>${BOSSES[b.id].name}</span><div class="hpbar"><i style="width:${(b.hp / b.max) * 100}%"></i></div><span class="num">${b.hp.toLocaleString('de-DE')}</span></div>` : ''}
      <div class="strip-bottom">${arc ? `<span>ARC ${arcOf(arc.n).id} · Woche ${arc.week}/6</span>` : ''}<span class="wdots">${dots}</span></div>
    </div></section>`;
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
  const fourByFourDue = !!arc && weekInfo(arc).arc.id === 'III'
    && !data.sessions.some((s) => s.missionId === 'NOR4X4' && s.day >= ws);
  const rec = decide({ checkin: ci, hardStreak: hardStreak(data.sessions, today), queue: data.engine.queue,
    overrideRest: ci.overrideRest, yesterday: yesterdayClass(data.sessions, today, ci.yesterdayMT),
    gap: gapDays(data.sessions, today, holiday), lastDone: lastDoneBySlot(data.sessions),
    holiday: holidayActive(today, holiday), fourByFourDue });
  if (ci.choice) {
    const id = ci.choice;
    return { ...rec, kind: MISSIONS[id].format === 'flow' ? 'flow' : 'mission', missionId: id,
      slot: id === 'NOR4X4' || id === 'HOTEL' ? 'D' : null, rotate: null,
      profile: id === 'FORGE' ? 'gym' : id === 'HOTEL' ? 'travel' : rec.profile, compact: !!rec.compact && ['A', 'B', 'C', 'FORGE'].includes(id),
      reason: 'Von dir gewählt.', manual: true };
  }
  return rec;
}

function planPreview(plan) {
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
    return '<p class="note">Deload-Woche: halbe Sätze, gleiches Gewicht, 3 Wdh. im Tank. Mobility-Check diese Woche wiederholen.</p>';
  }
  return `<p class="note">Willkommen zurück. Wir steigen sauber wieder ein: ca. ${Math.round(m.pct * 100)} % weniger${m.dropSets ? ', ein Satz weniger' : ''}${m.noFailure ? ', kein Versagen' : ''}.</p>`;
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

// Hinweis unter „Wie viel Zeit?“: was dran ist und was die App empfiehlt. Du entscheidest.
function timeHint(c, f) {
  const today = c.today();
  const next = nextSlot(c.data.engine.queue, f.where || 'room');
  const a = advice({ checkin: f, hardStreak: hardStreak(c.data.sessions, today), yesterday: yesterdayClass(c.data.sessions, today, f.yesterdayMT), next });
  const name = MISSIONS[next]?.name || next;
  return `<p class="muted small time-hint">Als Nächstes dran: <b>${esc(name)}</b>${f.where !== 'gym' && c.data.engine.queue[0] === 'FORGE' ? ' (FORGE wartet aufs Home Gym)' : ''}.${a.lines.length ? ` ${esc(adviceText(a))}` : ''}</p>`;
}

function checkinForm(c) {
  const today = c.today();
  const f = c.ui.ci || (c.ui.ci = { yesterdayMT: arenaOn(c.data.sessions, addDays(today, -1)) });
  const askWhere = f.tonightMT !== 'yes' || f.morning;
  const needPlace = askWhere && !['five', 'mobility'].includes(f.time);
  const ready = f.sleep && f.feeling && f.tonightMT && (!askWhere || f.time) && (!needPlace || f.where) && (!W(c.data).on || f.wristToday != null);
  const q = (k) => `<div class="q"><div class="q-label">${Q[k][0]}</div>${chips(k, Q[k][1], f[k])}</div>`;
  const morning = f.tonightMT === 'yes'
    ? `<div class="q"><div class="q-label">Zusätzlich Morgeneinheit?</div>${chips('morning', [['no', 'Nein, ARENA reicht'], ['yes', 'Ja, zusätzlich']], f.morning ? 'yes' : 'no')}</div>`
    : '';
  const elbow = c.data.settings.jointPause ? '' : `<div class="q"><div class="q-label">Ellbogen zwickt?</div>${chips('elbow', [['no', 'Nein'], ['yes', 'Ja']], f.elbow || 'no')}</div>`;
  const painOpen = f.painOpen || (f.pain || []).length > 0;
  const pain = `<div class="q"><div class="q-label">Zwickt sonst etwas?</div>${chips('painOpen', [['no', 'Alles okay'], ['yes', 'Ja']], painOpen ? 'yes' : 'no')}
    ${painOpen ? bodyMap(f.pain || []) : ''}</div>`;
  const gear = f.travelGear ?? c.data.settings.travelGear ?? [];
  const travel = needPlace && f.where === 'travel' ? `<div class="q"><div class="q-label">Was ist da? (optional)</div>
    <div class="chips">${TRAVEL_EQUIPMENT.map((id) => `<button class="chip${gear.includes(id) ? ' on' : ''}" data-act="travel-gear" data-id="${id}">${esc(EQUIPMENT[id])}</button>`).join('')}</div>
    <p class="muted small">Nichts angehakt = nur Körpergewicht. Jede Übung wird durch eine mit gleichem Muster ersetzt, Fortschritt zählt getrennt.</p></div>` : '';
  const wristQ = W(c.data).on ? `<div class="q"><div class="q-label">Handgelenk heute (0–10)</div>${chips('wristToday', Array.from({ length: 11 }, (_, v) => [String(v), String(v)]), f.wristToday)}</div>` : '';
  return sys('Tages-Check-in', `${q('yesterdayMT')}${q('sleep')}${q('feeling')}${elbow}${wristQ}${pain}${q('tonightMT')}${morning}${askWhere ? `${q('time')}${timeHint(c, f)}` : ''}${needPlace ? q('where') : ''}${travel}
    <button class="btn primary wide" data-act="submit-ci" ${ready ? '' : 'disabled'}>Mission anfordern</button>`);
}

export function questCard(c) {
  const q = questStatus(c.data, c.today());
  const pips = Array.from({ length: q.target }, (_, i) => `<i class="${i < q.progress ? 'on' : ''}"></i>`).join('');
  return `<section class="card quest${q.done ? ' done' : ''}"><div class="quest-head"><div><div class="label">Side Quest</div><b>${esc(q.quest.title)}</b><small>${esc(q.quest.desc)}${q.done ? ' · erfüllt' : ` · +${XP_CONFIG.sources.quest} XP`}</small></div>
    <span class="num">${q.progress}/${q.target}</span></div><div class="wdots quest-pips">${pips}</div></section>`;
}

export function arcLine(data, today, plan) {
  const arc = data.engine.arc;
  if (!arc) return '';
  const info = weekInfo(arc);
  const holiday = holidayActive(today, data.settings.holiday ?? DEFAULT_HOLIDAY);
  const plyo = plan?.plyo ? ` · Plyo ${plan.plyo.stage} (${PLYO_NAMES[plan.plyo.stage]})` : '';
  return `<div class="arc-line"><b>ARC ${info.arc.id} · ${esc(info.arc.name)}</b><span>Woche ${arc.week}/${ARC_WEEKS} · ${esc(info.label)} · RIR ${plan?.rir ?? info.rir}${plyo}</span>
    ${holiday ? '<span class="muted">Feiertagsmodus: Arc pausiert, Wochenziel 2 Einsätze.</span>' : ''}</div>`;
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
  if (st.stage2 && data.engine.arc?.week !== ARC_WEEKS && !recent) {
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
    // Ganz oben: Status (Rang, Kampfkraft, Boss, Arc-Woche). Darunter Check-in bzw. Mission, dann Hinweise.
    let out = statusStrip(c) + dailyQuote(c);
    let notes = '';
    if (introDue(data)) {
      const a = arcOf(data.engine.arc.n);
      notes += `<section class="card intro-card"><div><b>ARC ${a.id} · ${esc(a.name)}</b><small>Das Intro wartet. Wer der Gegner ist und was dieser Arc trainiert.</small></div><button class="btn primary" data-act="go" data-to="intro">Öffnen</button></section>`;
    }
    if (data.engine.nemesis?.active) {
      notes += sys('Nemesis', `<div class="boss-row">${bossImage('plateau', { cls: 'lore-small' })}<div><p class="reason">THE PLATEAU steht im Weg.</p>
        <p class="muted small">Mehrere Muster stagnieren. Er verschwindet, sobald eine Deload-Woche abgeschlossen ist.</p></div></div>`, { tone: 'warn' });
    }
    if (shouldSuggestDeload(data.engine, plattCount(data.checkins, today), today)) {
      notes += sys('Deload empfohlen', `<p>Dreimal „platt“ in sieben Tagen. Vorschlag: direkt in die Deload-Woche des Arcs springen. Danach beginnt der nächste Arc ausgeruht.</p>
        <div class="row gap"><button class="btn primary grow" data-act="deload-yes" data-rule="platt">In die Deload-Woche</button><button class="btn" data-act="deload-no" data-rule="platt">Nicht jetzt</button></div>`);
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
    if (db != null) notes += `<section class="card flow-card"><div><b>Arc-Debrief</b><small>3 Fragen und Export für deinen Coach</small></div><button class="btn primary" data-act="go" data-to="debrief">Öffnen</button></section>`;

    if (backupDue(data, today)) {
      notes += sys('Sicherung empfohlen', `<p>iOS räumt den Speicher von Web-Apps manchmal auf. Eine Sicherung dauert zehn Sekunden.</p>
        <div class="row gap"><button class="btn primary grow" data-act="backup-now">Jetzt sichern</button><button class="btn" data-act="backup-later">Später</button></div>`);
    }

    const rec = recommendation(c);
    if (!rec) return out + checkinForm(c) + temperCard(c) + wristCards(c, null) + handsCard(c) + feetCard(c) + notes;

    const doneToday = data.sessions.filter((s) => s.day === today);
    const trained = doneToday.filter((s) => s.kind === 'mission' || s.kind === 'express').length;
    const ci = data.checkins[today];
    if (trained > (ci.extra || 0)) {
      const logged = doneToday.filter((s) => s.kind === 'mission' || s.kind === 'express');
      out += sys('Tagesziel erreicht', `<p class="reason">Mission erfüllt.${ci.tonightMT === 'yes' ? ' Heute Abend wartet die ARENA.' : ' Der Rest des Tages gehört der Erholung.'}</p>
        <p class="muted">Stärke entsteht in der Pause. Ein FLOW am Abend hält dich geschmeidig.</p>
        ${logged.map((s) => `<div class="done-row"><span>${esc(MISSIONS[s.missionId]?.name || s.missionId)}${s.completion < 0.999 ? ` · ${Math.round(s.completion * 100)} %` : ''}</span><button class="btn small ghost danger" data-act="j-del" data-id="${esc(s.id)}">Löschen</button></div>`).join('')}
        <div class="row gap"><button class="btn ghost" data-act="swap">Weitere Einheit</button></div>`, { tone: 'calm' });
    } else if (rec.kind === 'arenaday') {
      out += sys('ARENA-Tag', `<p class="reason">${esc(rec.reason)}</p><p class="muted">Ein kurzer FLOW am Morgen macht die Hüfte frei für die Kicks am Abend.</p>
        <div class="row gap"><button class="btn primary grow" data-act="start" data-id="FLOW">FLOW starten</button><button class="btn" data-act="morning-yes">Doch Morgeneinheit</button></div>`, { tone: 'calm' });
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
      const sparQ = plan.plyo && plan.plyo.wanted >= 4 && ci.sparTomorrow == null
        ? `<div class="q"><div class="q-label">Morgen hartes Sparring geplant?</div>${chips('sparTomorrow', [['no', 'Nein'], ['yes', 'Ja']], null).replace(/data-act="pick"/g, 'data-act="spar"')}<p class="muted small">Heute steht Plyo-Stufe ${plan.plyo.wanted} an. Vor hartem Sparring bleibt es bei Stufe 3.</p></div>` : '';
      out += sys('Mission verfügbar', `<div class="mission-title"><span class="mid">${rec.missionId.length === 1 ? rec.missionId : '◆'}</span><div><h2>${esc(plan.name)}</h2><small>${esc(plan.focus)} · ca. ${plan.minutes} min${rec.profile === 'gym' && plan.kind === 'mission' && rec.missionId !== 'FORGE' ? ' · Home Gym' : rec.profile === 'travel' ? ' · Unterwegs' : ''}</small></div></div>
        ${plan.kind === 'mission' ? arcLine(data, today, plan) : ''}
        <p class="reason">${esc(rec.reason)}</p>${rec.hint?.lines.length && !rec.manual ? `<p class="note">${esc(adviceText(rec.hint))}</p>` : ''}${rec.walk ? '<p class="note">Danach 20–30 Minuten spazieren.</p>' : ''}${modifierNote(plan)}
        ${sparQ}${adjustNote(c, plan)}${plan.wrist && rec.missionId !== 'WRIST' ? `<div class="signal-note"><span>${esc(plan.wrist.reason)}</span><button class="btn small ghost" data-act="wrist-decline">Heute ohne Handgelenk-Block</button></div>` : ''}${planPreview(plan)}
        <button class="btn primary wide" data-act="start-rec">Mission starten</button>`);
    }
    if (trained <= (ci.extra || 0)) {
      out += `<div class="row gap center"><button class="btn ghost" data-act="swap">Andere Einheit</button><button class="btn ghost" data-act="redo-ci">Check-in ändern</button></div>`;
    }
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
    if (rec.missionId !== 'FLOW' && !doneToday.some((s) => s.kind === 'flow')) {
      out += `<section class="card flow-card"><div><b>FLOW</b><small>Täglich 10 min Mobility</small></div><button class="btn" data-act="start" data-id="FLOW">Starten</button></section>`;
    }
    if (doneToday.length) {
      out += `<section class="card"><div class="label">Heute erledigt</div>${doneToday.map((s) =>
        `<div class="done-row">✓ ${esc(s.kind === 'arena' ? `ARENA${s.bmt ? ` · BMT W${s.bmt.week}` : ''} · ${s.rpe ? `Intensität ${s.rpe}` : s.intensity === 'hard' ? 'Sparring' : 'Technik'}` : s.kind === 'check' ? 'Mobility-Check' : s.kind === 'quest' ? 'Wochen-Quest erfüllt' : s.kind === 'ascension' ? `Ascension: ${ASCENSIONS.find((a) => a.id === s.ascension)?.name}` : MISSIONS[s.missionId]?.name || s.missionId)} <span class="muted">+${s.xp} XP</span></div>`).join('')}</section>`;
    }
    out += `<p class="foot muted">Rotation: ${data.engine.queue.map((id) => MISSIONS[id].name).join(' → ')}</p>`;
    return out;
  },

  actions: {
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
    'submit-ci': (c) => {
      let wristEvents = [];
      const today = c.today();
      const f = c.ui.ci;
      c.update((data) => {
        let next = data;
        const y = addDays(today, -1);
        if (f.yesterdayMT !== 'none' && arenaOn(data.sessions, y) === 'none') {
          next = logArena(data, { day: y, intensity: f.yesterdayMT, minutes: 60 }).data;
        }
        if (f.elbow === 'yes') next = reportElbow(next, { day: today, source: 'checkin' });
        if ((f.pain || []).length) next = reportPain(next, { day: today, regions: f.pain });
        const { painOpen, ...answers } = f;
        if (answers.sleep) answers.sleep = Number(answers.sleep);
        if (answers.wristToday != null) answers.wristToday = Number(answers.wristToday);
        if (answers.time && !answers.where) answers.where = 'room';
        if (f.where === 'travel') {
          answers.travelGear = f.travelGear ?? data.settings.travelGear ?? [];
          next = { ...next, settings: { ...next.settings, travelGear: answers.travelGear } };
        }
        next = { ...next, checkins: { ...next.checkins, [today]: { day: today, ...answers } } };
        // Handgelenk: Folgetag-Werte einarbeiten, Zwick-Meldung Handgelenk setzt Gelb
        const wr = afterCheckin(next, today, f.pain || []);
        wristEvents = wr.events;
        return wr.data;
      });
      c.ui.ci = null;
      const ups = wristEvents.filter((e) => e.type === 'level_up');
      if (ups.length) c.system('Handgelenk', `<p>Drei grüne Einheiten in Folge. Gesteigert:</p><ul class="cues">${ups.map((e) => `<li>${esc(getDef(e.key)?.name || e.key)}: ${esc(getDef(e.key)?.levels?.[e.level] || `Stufe ${e.level + 1}`)}</li>`).join('')}</ul>`);
    },
    spar: (c, d) => {
      const today = c.today();
      c.update((data) => ({ ...data, checkins: { ...data.checkins, [today]: { ...data.checkins[today], sparTomorrow: d.value === 'yes' } } }));
    },
    'start-rec': (c) => {
      if (c.data.active) {
        c.go('training');
        return;
      }
      const r = c.ui.lastRec;
      const today = c.today();
      const plan = buildPlan({ missionId: r.missionId, profile: r.profile, data: c.data, today, compact: r.compact,
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
    swap: (c) => {
      const q = c.data.engine.queue;
      const ids = [...new Set([...q, 'HOTEL', 'NOR4X4', 'D_LIGHT', 'EXPRESS', 'EXPRESS_BAG', 'FLOW', 'HANDS', 'FEET'])];
      c.modal(sys('Andere Einheit', `<div class="swap-list">${ids.map((id) =>
        `<button class="swap" data-act="choose" data-id="${id}"><b>${esc(MISSIONS[id].name)}</b><small>${esc(MISSIONS[id].focus)}${id === q[0] ? ' · als Nächstes dran' : ''}</small></button>`).join('')}</div>
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
      c.system('Deload-Woche', '<p>Diese Arc-Woche wird zur Deload-Woche: halbe Sätze, gleiches Gewicht, 3 Wdh. im Tank. Wiederhole den Mobility-Check.</p>');
    },
    'deload-no': (c, d) => c.update((data) => logDecision({ ...data, engine: { ...data.engine,
      deloadSuggestDismissed: c.today(), ...(d.rule === 'plateau' ? { plateauDismissed: c.today() } : {}) } },
    { rule: `deload:${d.rule || 'manual'}`, day: c.today(), suggestion: 'deload_week', decision: 'declined' })),
    'backup-now': async (c) => {
      if (await exportFile(c.data, c.today())) {
        c.update((data) => ({ ...data, settings: { ...data.settings, lastBackupAt: new Date().toISOString() } }));
      }
    },
    'backup-later': (c) => c.update((data) => ({ ...data, settings: { ...data.settings, backupNudgeAt: c.today() } })),
  },
};
