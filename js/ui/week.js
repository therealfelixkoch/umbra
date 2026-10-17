// Phase 3: Wochenabdeckung, Statistik, Attribut-Ränge, Ascensions.
import { esc, sys } from './kit.js';
import { ATTRIBUTES, EXPRESSIONS, PROFILES } from '../data/glyphs.js';
import { weekCoverage, gapsFor, attributePoints, attrRank, ATTR_GROUPS, ascensionStatus } from '../engine/progress.js';
import { countsForWeek, WEEK_GOAL } from '../engine/game.js';
import { weekStart, addDays, formatDay } from '../engine/dates.js';
import { questCard } from './today.js';

export const RANK_LORE = {
  SHADE: 'Formlos. Jeder Wächter beginnt als Schatten.',
  BLADE: 'Der Schatten bekommt eine Kante.',
  WARDEN: 'Du hältst die Stellung. Die Nacht bemerkt dich.',
  PHANTOM: 'Man sieht dich nicht kommen.',
  UMBRA: 'Der Kern des Schattens. Wenige erreichen ihn.',
  UNBREAKABLE: 'Was dich trifft, bricht. Du nicht.',
};

export function attributeRanks(data) {
  const pts = attributePoints(data);
  return `<div class="attr-list">${ATTR_GROUPS.map((g) => {
    const r = attrRank(pts[g.id]);
    return `<div class="attr-row"><span class="attr-rank num">${r.id}</span>
      <div class="attr-main"><div class="attr-top"><span>${esc(g.name)}</span><small class="muted">${r.next ? `${r.toNext} bis ${r.next}` : 'Maximum'}</small></div>
      <div class="xpbar"><i style="width:${Math.round(r.progress * 100)}%"></i></div></div></div>`;
  }).join('')}</div>`;
}

export function ascensionGrid(data, today) {
  return `<div class="asc-grid">${ascensionStatus(data, today).map((a) => `
    <div class="asc${a.unlocked ? ' on' : ''}" style="--aura:${a.aura}">
      <span class="asc-mark">◆</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>
      ${a.unlocked ? '<em>freigeschaltet</em>' : `<div class="xpbar"><i style="width:${Math.round((a.current / a.target) * 100)}%"></i></div><em class="num">${a.current}/${a.target}${a.unit ? ` ${a.unit}` : ''}</em>`}
    </div>`).join('')}</div>`;
}

function coverageCard(cov, profileId) {
  const p = PROFILES[profileId];
  const gaps = gapsFor(cov, profileId);
  const chips = p.attributes.map((a) => {
    const xs = cov.attrs[a] || [];
    const dots = xs.map((x) => `<i style="background:${EXPRESSIONS[x].color}" title="${EXPRESSIONS[x].name}"></i>`).join('');
    return `<span class="cov${xs.length ? ' on' : ''}" title="${esc(ATTRIBUTES[a].name)}">${esc(ATTRIBUTES[a].name)}${dots ? `<span class="cov-dots">${dots}</span>` : ''}</span>`;
  }).join('');
  const missing = gaps.expressions.map((x) => EXPRESSIONS[x].name);
  return `<section class="card"><div class="label">${esc(p.name)} · ${p.attributes.length - gaps.attrs.length}/${p.attributes.length} abgedeckt</div>
    <div class="cov-list">${chips}</div>
    ${gaps.attrs.length || missing.length ? `<p class="muted small">Lücken: ${[...gaps.attrs.map((a) => ATTRIBUTES[a].name), ...missing].map(esc).join(', ')}. Beim Übungstausch im Training schlägt die App passende Alternativen vor.</p>` : '<p class="muted small">Alles abgedeckt diese Woche.</p>'}
  </section>`;
}

function expressionBars(cov) {
  const max = Math.max(1, ...Object.values(cov.expressions));
  return `<div class="bar-chart">${Object.entries(EXPRESSIONS).map(([k, e]) => {
    const n = cov.expressions[k] || 0;
    return `<div class="bar-row static"><span class="bar-label"><i class="dot" style="background:${e.color}"></i>${esc(e.name)}</span>
      <span class="bar-track"><i class="bar-fill" style="width:${n ? Math.max(4, (n / max) * 100) : 0}%"></i></span><span class="bar-val num">${n}</span></div>`;
  }).join('')}</div><p class="muted small">Anzahl Übungen bzw. Einheiten pro Ausprägung, ARENA eingerechnet.</p>`;
}

function weeksChart(sessions, today) {
  const ws = weekStart(today);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(ws, (i - 7) * 7));
  const counts = weeks.map((w) => sessions.filter((s) => countsForWeek(s) && s.day >= w && s.day < addDays(w, 7)).length);
  const max = Math.max(WEEK_GOAL + 1, ...counts);
  return `<div class="wk-chart" role="img" aria-label="Einsätze pro Woche, letzte 8 Wochen">
    <div class="wk-goal" style="bottom:${(WEEK_GOAL / max) * 100}%"><span>Ziel ${WEEK_GOAL}</span></div>
    ${counts.map((n, i) => `<button class="wk-col" data-act="wk-tip" title="Woche ab ${formatDay(weeks[i])}: ${n} Einsätze">
      <i class="wk-bar${i === 7 ? ' cur' : ''}" style="height:${(n / max) * 100}%"><span class="wk-val num">${n || ''}</span></i>
      <span class="wk-label">${formatDay(weeks[i]).slice(0, 5)}</span></button>`).join('')}
  </div><p class="muted small">Einsätze pro Woche (Mission, SHADOWSTEP, ARENA). Ganz rechts: diese Woche.</p>`;
}

function totals(data) {
  const s = data.sessions;
  const arenaH = s.filter((x) => x.kind === 'arena').reduce((m, x) => m + (x.minutes || 0), 0) / 60;
  const rows = [
    ['Missionen', s.filter((x) => x.kind === 'mission').length],
    ['SHADOWSTEPs', s.filter((x) => x.kind === 'express').length],
    ['ARENA', `${s.filter((x) => x.kind === 'arena').length} · ${arenaH.toLocaleString('de-DE', { maximumFractionDigits: 1 })} h`],
    ['FLOW-Tage', new Set(s.filter((x) => x.kind === 'flow').map((x) => x.day)).size],
    ['Bestleistungen', Object.keys(data.records || {}).length],
    ['Erfüllte Quests', s.filter((x) => x.kind === 'quest').length],
  ];
  return `<dl class="facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd class="num">${v}</dd></div>`).join('')}</dl>`;
}

export function weekView(c) {
  const today = c.today();
  const cov = weekCoverage(c.data.sessions, weekStart(today));
  return `${questCard(c)}
    ${coverageCard(cov, 'muaythai')}
    ${coverageCard(cov, 'vater')}
    ${sys('Ausprägungen diese Woche', expressionBars(cov))}
    ${sys('Konstanz', weeksChart(c.data.sessions, today))}
    <section class="card"><div class="label">Gesamt</div>${totals(c.data)}</section>`;
}
