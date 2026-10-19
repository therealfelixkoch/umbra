// ARENA-Status: Zahlen, Inhalte, Technik-Radar (aktueller vs. vorheriger Check) und der monatliche Technik-Check.
import { sys, esc } from './kit.js';
import { arenaStats, techCheckDue, techCompare, arenaLore, TECH_SKILLS, ARENA_CONTENT } from '../engine/arenastats.js';
import { monthKey } from '../engine/dates.js';
import { ARCS } from '../data/arcs.js';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const monthName = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const h = (x) => x.toLocaleString('de-DE');

// Netzdiagramm mit 9 Achsen, Werte 1–5
function radar(cur, prev) {
  const n = TECH_SKILLS.length;
  const cx = 150;
  const cy = 130;
  const R = 95;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * R * (v / 5), cy + Math.sin(a) * R * (v / 5)];
  };
  const poly = (scores) => TECH_SKILLS.map(([k], i) => pt(i, scores?.[k] || 0).map((x) => x.toFixed(1)).join(',')).join(' ');
  const rings = [1, 2, 3, 4, 5].map((v) => `<polygon points="${TECH_SKILLS.map((_, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--line)"/>`).join('');
  const labels = TECH_SKILLS.map(([, name], i) => {
    const [x, y] = pt(i, 6.1);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${x < cx - 10 ? 'end' : x > cx + 10 ? 'start' : 'middle'}" dominant-baseline="middle">${esc(name.split(' ')[0])}</text>`;
  }).join('');
  return `<svg class="radar" viewBox="-45 0 390 260" role="img" aria-label="Technik-Radar">${rings}
    ${prev ? `<polygon points="${poly(prev.scores)}" fill="rgba(138,147,168,.12)" stroke="var(--muted)" stroke-dasharray="4 3"/>` : ''}
    ${cur ? `<polygon points="${poly(cur.scores)}" fill="rgba(139,125,255,.22)" stroke="var(--sys)" stroke-width="2"/>` : ''}
    ${labels}</svg>`;
}

function checkForm(c) {
  const f = c.ui.tc || (c.ui.tc = { scores: {}, note: '' });
  const rows = TECH_SKILLS.map(([k, name]) => `<div class="tc-row"><span>${esc(name)}</span><div class="effort-chips">${[1, 2, 3, 4, 5].map((v) =>
    `<button class="${f.scores[k] === v ? 'on' : ''}" data-act="tc-pick" data-k="${k}" data-v="${v}">${v}</button>`).join('')}</div></div>`).join('');
  const ready = TECH_SKILLS.every(([k]) => f.scores[k]);
  return sys(`Technik-Check · ${monthName(monthKey(c.today()))}`, `<p class="muted small">Einmal im Monat, ehrlich: 1 = kaum sicher, 5 = sitzt auch unter Druck.</p>${rows}
    <input class="search" data-input="tc-note" placeholder="Was will ich verbessern? (optional)" value="${esc(f.note)}" autocomplete="off">
    <button class="btn primary wide" data-act="tc-save" ${ready ? '' : 'disabled'}>Check speichern</button>
    <button class="btn ghost wide" data-act="tc-close">Später</button>`, { tone: 'gold' });
}

export function arenaStatusView(c) {
  const st = arenaStats(c.data.sessions);
  const checks = c.data.techChecks || {};
  const due = techCheckDue(checks, c.today());
  const { current, previous } = techCompare(checks);
  const t = st.total;
  const maxC = Math.max(1, ...Object.values(t.content));
  let out = `<p class="lore center">${esc(arenaLore(t))}</p>`;
  if (c.ui.tcOpen) return out + checkForm(c);
  if (due) out += `<section class="card quest"><div class="quest-head"><div><div class="label">Technik-Check</div><b>${monthName(monthKey(c.today()))}</b><small>9 Taps, eine Minute</small></div>
    <button class="btn primary small" data-act="tc-open">Starten</button></div></section>`;
  out += sys('Gesamt', `<dl class="facts">
      <div><dt>Einheiten</dt><dd class="num">${t.sessions}</dd></div>
      <div><dt>Stunden</dt><dd class="num">${h(t.hours)}</dd></div>
      <div><dt>Sparringsrunden</dt><dd class="num">${t.sparRounds}</dd></div></dl>
    <div class="label">Inhalte</div>
    <div class="bar-chart">${ARENA_CONTENT.map((k) => `<div class="bar-row static"><span class="bar-label">${k}</span><span class="bar-track"><i class="bar-fill" style="width:${(t.content[k] / maxC) * 100}%"></i></span><span class="bar-val num">${t.content[k]}</span></div>`).join('')}</div>
    ${Object.values(t.content).every((v) => !v) ? '<p class="muted small">Inhalte beim Eintragen antippen, dann füllt sich das hier.</p>' : ''}`);
  if (current) {
    out += sys('Technik-Radar', `${radar(current, previous)}
      <p class="muted small center"><b class="sys-text">━</b> ${monthName(current.key)}${previous ? ` · <span class="muted">┄ ${monthName(previous.key)}</span>` : ''}</p>
      ${current.note ? `<p class="small">Verbessern: ${esc(current.note)}</p>` : ''}
      ${!due ? '<button class="btn ghost small" data-act="tc-open">Check dieses Monats ändern</button>' : ''}`);
  }
  if (st.months.length) {
    out += `<section class="card"><div class="label">Pro Monat</div>${st.months.slice(0, 6).map((m) =>
      `<div class="done-row"><span>${monthName(m.key)}</span><span class="num">${m.sessions} · ${h(m.hours)} h${m.sparRounds ? ` · ${m.sparRounds} Spar.` : ''}</span></div>`).join('')}</section>`;
  }
  if (st.arcs.length) {
    out += `<section class="card"><div class="label">Pro Arc</div>${st.arcs.map((a) =>
      `<div class="done-row"><span>Arc ${a.n + 1} · ${esc(ARCS[a.n % ARCS.length].name)}</span><span class="num">${a.sessions} · ${h(a.hours)} h${a.sparRounds ? ` · ${a.sparRounds} Spar.` : ''}</span></div>`).join('')}</section>`;
  }
  return out;
}

export const arenaStatusActions = {
  'tc-open': (c) => {
    const cur = c.data.techChecks?.[monthKey(c.today())];
    c.setUi({ tcOpen: true, tc: cur ? { scores: { ...cur.scores }, note: cur.note || '' } : { scores: {}, note: '' } });
  },
  'tc-close': (c) => c.setUi({ tcOpen: false }),
  'tc-pick': (c, d) => { c.ui.tc.scores[d.k] = Number(d.v); c.render(); },
  'tc-save': (c) => {
    const f = c.ui.tc;
    const key = monthKey(c.today());
    c.ui.tcOpen = false;
    c.update((data) => ({ ...data, techChecks: { ...(data.techChecks || {}), [key]: { day: c.today(), scores: f.scores, note: f.note.trim() || undefined } } }));
  },
};

export function arenaStatusInput(c, name, value) {
  if (name === 'tc-note' && c.ui.tc) c.ui.tc.note = value.slice(0, 160);
}
