// Verlauf: alle Einheiten mit Details, Filtern und Kurve pro Übung. Dazu „XP pro Quelle“.
import { sys, esc, kg, loadText } from './kit.js';
import { getDef } from '../data/exercises.js';
import { MISSIONS } from '../data/missions.js';
import { ARCS } from '../data/arcs.js';
import { formatDay, weekStart } from '../engine/dates.js';
import { filterSessions, filterOptions, exerciseCurve, doneSets } from '../engine/journal.js';
import { xpLedger, xpBySource } from '../engine/game.js';
import { SOURCE_LABELS } from '../data/xp-config.js';

const RIR_TXT = (r) => (r == null ? '' : ` · RIR ${r === 4 ? '4+' : r}`);
const missionName = (id) => (id === 'ARENA' ? 'ARENA' : MISSIONS[id]?.name || id);
const arcName = (n) => `Arc ${n + 1}${ARCS[n % ARCS.length] ? ` · ${ARCS[n % ARCS.length].name}` : ''}`;

function setLine(def, x) {
  const v = def.mode === 'time' ? `${x.value} s` : def.mode === 'fixed' ? (x.sec ? `${Math.round(x.sec / 60 * 10) / 10} min` : '✓') : `${x.value}`;
  return `${def.load && x.load ? `${kg(x.load)} kg × ` : ''}${v}${RIR_TXT(x.rir)}`;
}

function meta(s) {
  return [s.minutes ? `${s.minutes} min` : null,
    typeof s.intensity === 'number' ? `RPE ${String(s.intensity).replace('.', ',')}` : s.rpe ? `Gefühl ${s.rpe}/10` : null,
    s.arc ? `Arc-Woche ${s.arc.week}` : null].filter(Boolean).join(' · ');
}

function detail(s) {
  const parts = [];
  for (const e of s.exercises || []) {
    const def = getDef(e.exId);
    if (!def) continue;
    const sets = doneSets(e);
    parts.push(`<div class="j-ex"><div class="j-ex-head"><b>${esc(def.name)}</b>${e.rpe ? `<span class="pill">RPE ${e.rpe}</span>` : ''}</div>
      ${sets.length ? `<ol class="j-sets">${sets.map((x) => `<li>${esc(setLine(def, x))}${x.label ? ` <small class="muted">${esc(x.label)}</small>` : ''}</li>`).join('')}</ol>` : '<p class="muted small">nicht gemacht</p>'}
      ${e.swappedFrom ? `<p class="muted small">Getauscht statt ${esc(getDef(e.swappedFrom)?.name || e.swappedFrom)} · ${e.swapScope === 'arc' ? 'für den Arc' : 'nur heute'}</p>` : ''}
      ${e.adjust ? `<p class="muted small">Angepasst: ${esc(e.adjust)}</p>` : ''}
      ${e.elbow ? '<p class="warn-tag small">Ellbogen gemeldet</p>' : ''}
      ${e.note ? `<p class="small">${esc(e.note)}</p>` : ''}</div>`);
  }
  if (s.intervals) {
    parts.push(`<div class="j-ex"><b>Intervalle</b><p>RPE ${s.intervals.rpe.map((r, i) => `${i + 1}: ${r ?? '–'}`).join(' · ')}</p>
      ${s.intervals.meters ? `<p class="muted small">${s.intervals.meters} m</p>` : ''}${s.intervals.note ? `<p class="small">${esc(s.intervals.note)}</p>` : ''}</div>`);
  }
  if (!s.exercises?.length && s.items?.length) {
    parts.push(`<p class="muted small">${s.items.map((id) => esc(getDef(id)?.name || id)).join(', ')}${s.roundsDone ? ` · ${s.roundsDone} Runden` : ''}</p>`);
  }
  if (s.kind === 'arena') {
    parts.push(`<p class="small">${[s.content?.length ? s.content.join(', ') : null, s.sparRounds ? `${s.sparRounds} Sparringsrunden` : null,
      s.focus ? esc(s.focus) : null].filter(Boolean).join(' · ') || 'Keine Details eingetragen.'}</p>`);
  }
  if (s.load) parts.push(`<p class="muted small">Trainingslast ${s.load}</p>`);
  if (s.records?.length) parts.push(`<p class="small gold-text">Bestleistung: ${s.records.map((r) => esc(getDef(r.exId)?.name || 'SHADOWSTEP')).join(', ')}</p>`);
  return `<div class="j-detail">${parts.join('') || '<p class="muted small">Keine Details.</p>'}</div>`;
}

// Kleine Kurve: bestes Satzergebnis pro Einheit
function curve(points, def) {
  if (points.length < 2) return '<p class="muted small">Für eine Kurve braucht es mindestens zwei Einheiten.</p>';
  const w = 300;
  const h = 90;
  const ys = points.map((p) => p.score);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const x = (i) => 8 + (i / (points.length - 1)) * (w - 16);
  const y = (v) => (hi === lo ? h / 2 : h - 10 - ((v - lo) / (hi - lo)) * (h - 20));
  const path = points.map((p, i) => `${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const last = points.at(-1);
  const first = points[0];
  return `<svg class="j-curve" viewBox="0 0 ${w} ${h}" role="img" aria-label="Verlauf ${esc(def.name)}">
      <polyline points="${path}" fill="none" stroke="var(--sys)" stroke-width="2" stroke-linejoin="round"/>
      ${points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.score).toFixed(1)}" r="3" fill="${i === points.length - 1 ? 'var(--gold)' : 'var(--sys)'}"/>`).join('')}</svg>
    <div class="row muted small" style="justify-content:space-between"><span>${formatDay(first.day)}: ${esc(bestText(def, first))}</span><span>${formatDay(last.day)}: ${esc(bestText(def, last))}</span></div>`;
}
const bestText = (def, p) => `${def.load && p.load ? `${kg(p.load)} kg × ` : ''}${p.value}${def.mode === 'time' ? ' s' : ''}`;

export function journalView(c, labelOf) {
  const data = c.data;
  const f = c.ui.jf || {};
  const opts = filterOptions(data.sessions);
  const list = filterSessions(data.sessions, f);
  const sel = (name, cur, items) => `<select data-change="${name}"><option value="">${name === 'jf-mission' ? 'Alle Missionen' : name === 'jf-arc' ? 'Alle Arcs' : 'Alle Übungen'}</option>
    ${items.map(([v, l]) => `<option value="${esc(String(v))}" ${String(cur ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const filters = `<div class="j-filters">
    ${sel('jf-mission', f.mission, opts.missions.map((m) => [m, missionName(m)]))}
    ${sel('jf-arc', f.arc, opts.arcs.map((n) => [n, arcName(n)]))}
    ${sel('jf-ex', f.exId, opts.exercises.map((id) => [id, getDef(id)?.name || id]).sort((a, b) => a[1].localeCompare(b[1])))}</div>`;
  const exDef = f.exId && getDef(f.exId);
  const chart = exDef ? sys(`Verlauf · ${esc(exDef.name)}`, curve(exerciseCurve(data.sessions, f.exId, getDef, data.settings.bodyweight), exDef)) : '';
  const rows = list.slice(0, 80).map((s) => {
    const open = c.ui.jOpen === s.id;
    return `<div class="j-row${open ? ' open' : ''}"><button class="j-head" data-act="j-open" data-id="${esc(s.id)}">
      <span><small class="muted">${formatDay(s.day)}</small> ${esc(labelOf(s))}<br><small class="muted">${esc(meta(s))}</small></span>
      <b class="muted">+${s.xp} XP</b></button>${open ? detail(s) : ''}</div>`;
  }).join('');
  return filters + chart + `<section class="card">${rows || '<p class="muted">Keine Einheit für diesen Filter.</p>'}
    ${list.length > 80 ? `<p class="muted small">${list.length - 80} ältere ausgeblendet. Filter nutzen.</p>` : ''}</section>`;
}

export function xpSourceView(c) {
  const by = c.ui.xpBy || 'week';
  const ledger = xpLedger(c.data, c.today());
  const groups = xpBySource(ledger, by);
  const keys = Object.keys(groups).sort((a, b) => (by === 'arc' ? Number(b) - Number(a) : b.localeCompare(a))).slice(0, 6);
  const body = keys.map((k) => {
    const g = groups[k];
    const sum = Object.values(g).reduce((a, b) => a + b, 0);
    const label = by === 'arc' ? (k === 'ohne Arc' ? 'Ohne Arc' : arcName(Number(k))) : `Woche ab ${formatDay(k)}${k === weekStart(c.today()) ? ' · laufend' : ''}`;
    return `<div class="xp-group"><div class="xp-group-head"><b>${esc(label)}</b><b class="num">${sum.toLocaleString('de-DE')} XP</b></div>
      ${Object.entries(g).sort((a, b) => b[1] - a[1]).map(([src, xp]) => `<div class="done-row"><span>${esc(SOURCE_LABELS[src] || src)}</span><span class="num">${xp}</span></div>`).join('')}</div>`;
  }).join('');
  return sys('XP pro Quelle', `<div class="seg small"><button class="${by === 'week' ? 'on' : ''}" data-act="xp-by" data-v="week">Woche</button><button class="${by === 'arc' ? 'on' : ''}" data-act="xp-by" data-v="arc">Arc</button></div>
    ${body || '<p class="muted">Noch keine XP.</p>'}
    <p class="muted small">Neben-XP (TEMPER und FLOW) zusammen höchstens 40 pro Tag.</p>`);
}

export const journalActions = {
  'j-open': (c, d) => c.setUi({ jOpen: c.ui.jOpen === d.id ? null : d.id }),
  'xp-by': (c, d) => c.setUi({ xpBy: d.v }),
};

export function journalChange(c, name, el) {
  const v = el.value || null;
  const f = { ...(c.ui.jf || {}) };
  if (name === 'jf-mission') f.mission = v;
  else if (name === 'jf-arc') f.arc = v == null ? null : Number(v);
  else if (name === 'jf-ex') f.exId = v;
  else return false;
  c.setUi({ jf: f, jOpen: null });
  return true;
}
