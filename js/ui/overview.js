// Datenansichten im Profil: Wochen-Ringe (Training, ARENA, FLOW), Attribut-Radar, Jahres-Heatmap.
import { esc } from './kit.js';
import { weekStart, addDays } from '../engine/dates.js';
import { countsForWeek } from '../engine/game.js';
import { attributePoints, attrRank, ATTR_GROUPS } from '../engine/progress.js';

const SHORT = { kraft: 'KRAFT', explosiv: 'EXPL', ausdauer: 'AUSD', mobil: 'MOB', stabil: 'STAB', nacken: 'NACKEN' };

const ring = (r, frac, color) => {
  const C = 2 * Math.PI * r;
  return `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-opacity=".16" stroke-width="10"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - Math.min(1, frac))).toFixed(1)}"/>`;
};

/** Wochen-Ringe: Training (Ziel 3), ARENA (Ziel 2), FLOW-Tage (Ziel 5). */
function weekRings(data, today) {
  const ws = weekStart(today);
  const wk = data.sessions.filter((s) => s.day >= ws && s.day <= today);
  const train = wk.filter((s) => countsForWeek(s) && s.kind !== 'arena').length;
  const arena = wk.filter((s) => s.kind === 'arena').length;
  const flow = new Set(wk.filter((s) => s.kind === 'flow').map((s) => s.day)).size;
  return `<section class="card"><div class="label">Diese Woche</div>
    <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Training ${train} von 3, ARENA ${arena} von 2, FLOW ${flow} von 5" style="transform:rotate(-90deg)">
      ${ring(50, train / 3, 'var(--sys)')}${ring(36, arena / 2, '#ff6b78')}${ring(22, flow / 5, '#5fd696')}</svg>
    <div class="ring-legend"><span style="color:var(--sys)">● Training ${train}/3</span><span style="color:#ff6b78">● ARENA ${arena}/2</span><span style="color:#5fd696">● FLOW ${flow}/5</span></div></section>`;
}

/** Attribut-Radar aus den Attribut-Punkten (Ränge E–S als Skala). */
function radar(data) {
  const pts = attributePoints(data);
  const n = ATTR_GROUPS.length;
  const cx = 75;
  const cy = 72;
  const R = 52;
  const at = (i, f) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(ang) * R * f, cy + Math.sin(ang) * R * f];
  };
  const level = (g) => { const r = attrRank(pts[g.id] || 0); return (['E', 'D', 'C', 'B', 'A', 'S'].indexOf(r.id) + r.progress) / 6; };
  const poly = (f) => ATTR_GROUPS.map((_, i) => at(i, f).map((v) => v.toFixed(1)).join(',')).join(' ');
  const shape = ATTR_GROUPS.map((g, i) => at(i, Math.max(0.08, level(g))).map((v) => v.toFixed(1)).join(',')).join(' ');
  const labels = ATTR_GROUPS.map((g, i) => {
    const [x, y] = at(i, 1.22);
    return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="${g.color}" font-size="8" text-anchor="middle" font-family="Oxanium">${esc(SHORT[g.id] || g.name.slice(0, 5).toUpperCase())} ${attrRank(pts[g.id] || 0).id}</text>`;
  }).join('');
  return `<section class="card"><div class="label">Attribute</div>
    <svg viewBox="0 0 150 150" width="150" height="150" role="img" aria-label="Attribut-Radar">
      <polygon points="${poly(1)}" fill="none" stroke="rgba(255,255,255,.10)"/><polygon points="${poly(0.5)}" fill="none" stroke="rgba(255,255,255,.07)"/>
      <polygon points="${shape}" fill="var(--sys-glow)" stroke="var(--sys)" stroke-width="1.6"/>${labels}</svg></section>`;
}

/** Jahres-Heatmap: 26 Wochen, jeder Tag ein Feld, Stufe nach Einsatz. */
function heatmap(data, today) {
  const start = addDays(weekStart(today), -25 * 7);
  const score = {};
  for (const s of data.sessions) {
    if (s.day < start || s.day > today) continue;
    const v = countsForWeek(s) ? 2 : ['flow', 'temper', 'hands', 'feet', 'zone2'].includes(s.kind) ? 1 : 0;
    score[s.day] = (score[s.day] || 0) + v;
  }
  const cells = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 26; col++) {
      const day = addDays(start, col * 7 + row);
      const v = day > today ? -1 : score[day] || 0;
      cells.push(`<i class="${v >= 3 ? 'l3' : v === 2 ? 'l2' : v === 1 ? 'l1' : ''}"${day > today ? ' style="opacity:.3"' : ''} title="${day}"></i>`);
    }
  }
  const active = Object.values(score).filter((v) => v > 0).length;
  return `<section class="card"><div class="label">Das halbe Jahr · ${active} aktive Tage</div><div class="heat">${cells.join('')}</div>
    <p class="muted small">Jede Spalte eine Woche, jede Zeile ein Wochentag. Hell = Mission oder ARENA, dazu FLOW, TEMPER, HANDS, FEET.</p></section>`;
}

export function overviewView(data, today) {
  return `<div class="overview">${weekRings(data, today)}${radar(data)}</div>${heatmap(data, today)}`;
}
