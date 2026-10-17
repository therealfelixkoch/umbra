// Lore-Bilder: Bild mit weichem Kantenverlauf auf #0B0A10, SVG-Platzhalter solange das Bild fehlt,
// Aura-Ebene (Ascensions), Boss-Zustände per Effekt und Comic-Panels.
import { esc } from './kit.js';
import { LORE_DIR, GUARDIANS, BOSSES } from '../data/lore.js';

// Bereits geladene Bilddateien (für sofortiges Anzeigen ohne Einblenden)
const LOADED = (window.__umbraLore ||= new Set());
const V = '#8b7dff'; // kaltes Violett
const G = '#ffcf5a'; // Gold

// ——— Platzhalter in der Bildsprache: dunkle Silhouette, violetter Rand ———
const FIGURE = 'M100 34c-11 0-19 9-19 20s8 21 19 21 19-10 19-21-8-20-19-20zM70 82c-14 4-22 14-25 30l-9 58c-1 7 9 9 11 2l12-50 4 45-6 100c0 7 11 8 12 1l14-92h14l14 92c1 7 12 6 12-1l-6-100 4-45 12 50c2 7 12 5 11-2l-9-58c-3-16-11-26-25-30z';
const SHAPES = {
  colossus: 'M30 266c4-60 10-120 30-150 12-18 22-24 40-26 18 2 28 8 40 26 20 30 26 90 30 150zM80 70c0-14 9-22 20-22s20 8 20 22-9 22-20 22-20-8-20-22z',
  shards: 'M100 20l26 60 34 10-18 56 14 120H44l14-120-18-56 34-10z',
  wraith: 'M100 26c-34 0-50 34-52 78-2 40-6 110-20 162 16-10 26-4 34 4 10-10 22-12 38-4 16-8 28-6 38 4 8-8 18-14 34-4-14-52-18-122-20-162-2-44-18-78-52-78z',
  serpent: 'M60 250c-30 0-30-40 0-40h80c30 0 30-40 0-40H70c-30 0-30-40 0-40h60c26 0 26-34 0-34-12 0-18 8-18 16',
  monolith: 'M70 30h60v236H70z',
};

function svgFrame(ratio, inner, defs = '') {
  const w = 200;
  const h = Math.round(w / ratio);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>${defs}<radialGradient id="phGlow" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${V}" stop-opacity=".22"/><stop offset="1" stop-color="${V}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="#0B0A10"/><rect width="${w}" height="${h}" fill="url(#phGlow)"/>${inner}</svg>`;
}

export function guardianPlaceholder(tier) {
  const blur = [5, 3, 1.6, 0.9, 0.4, 0][tier] ?? 0;
  const edge = tier >= 5 ? G : V;
  const id = `gb${tier}`;
  const eyes = tier >= 2 ? `<circle cx="93" cy="55" r="1.6" fill="${edge}"/><circle cx="107" cy="55" r="1.6" fill="${edge}"/>` : '';
  const fx = blur ? `<filter id="${id}"><feGaussianBlur stdDeviation="${blur}"/></filter>` : '';
  return svgFrame(3 / 4, `<g transform="translate(0 0)" ${blur ? `filter="url(#${id})"` : ''}>
      <path d="${FIGURE}" fill="#030206" stroke="${edge}" stroke-opacity="${0.3 + tier * 0.12}" stroke-width="${1 + tier * 0.3}"/></g>${eyes}`, fx);
}

export function bossPlaceholder(shape) {
  return svgFrame(3 / 4, `<path d="${SHAPES[shape] || SHAPES.monolith}" fill="#030206" stroke="${V}" stroke-opacity=".55" stroke-width="2" ${shape === 'serpent' ? 'fill-opacity="0" stroke-width="10" stroke-linecap="round"' : ''}/>`);
}

export function scenePlaceholder(ratio = 4 / 5) {
  const h = Math.round(200 / ratio);
  const y = Math.round(h * 0.68);
  return svgFrame(ratio, `<rect y="${y}" width="200" height="${h - y}" fill="#07060b"/><line x1="0" y1="${y}" x2="200" y2="${y}" stroke="${V}" stroke-opacity=".35"/>
    <g transform="translate(92 ${y - 34}) scale(.08)"><path d="${FIGURE}" fill="#030206" stroke="${V}" stroke-width="14" stroke-opacity=".6"/></g>`);
}

// ——— Risse für angeschlagene Bosse (werden mit dem Schaden sichtbarer) ———
const CRACKS = [
  'M100 40l-8 30 10 18-6 26', 'M60 120l18 8 6 20 14 6', 'M140 100l-14 14 4 22-12 18', 'M80 200l12-16 18 4 8-18',
  'M120 170l10 20-6 22 12 14', 'M40 80l20 10 4 18', 'M150 220l-16-6-10 14-14 2', 'M95 140l-6 22 12 16-4 20',
];
function cracks(damage, gold) {
  const n = Math.round(CRACKS.length * Math.min(1, damage));
  if (!n) return '';
  const col = gold ? G : V;
  return `<svg class="lore-cracks" viewBox="0 0 200 267" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    ${CRACKS.slice(0, n).map((d) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>`).join('')}</svg>`;
}

/**
 * Lore-Bild.
 * @param {object} o { file, ratio, placeholder (SVG), state ('damaged'|'defeated'|'retreat'), damage 0–1, aura (Farbe), caption, cls }
 */
export function loreImage(o) {
  const state = o.state || '';
  const dmg = Math.max(0, Math.min(1, o.damage || 0));
  // Schon einmal geladene Bilder sofort zeigen (kein erneutes Einblenden bei jedem Neuzeichnen).
  const seen = o.file && LOADED.has(o.file) ? ' loaded' : '';
  return `<figure class="lore${seen} ${o.cls || ''} ${state ? `is-${state}` : ''}" style="--ratio:${o.ratio || 0.75};--damage:${dmg.toFixed(2)};${o.aura ? `--aura:${o.aura};` : ''}">
    ${o.aura ? '<div class="lore-aura" aria-hidden="true"></div>' : ''}
    <div class="lore-frame">
      <div class="lore-ph">${o.placeholder || scenePlaceholder(o.ratio)}</div>
      ${o.file ? `<img src="${LORE_DIR}${o.file}" alt="${esc(o.alt || '')}" decoding="async" onload="window.__umbraLore.add('${o.file}');this.closest('.lore').classList.add('loaded')" onerror="this.remove()">` : ''}
      ${o.cracks ? cracks(state === 'defeated' ? 1 : dmg, state === 'defeated') : ''}
      ${state === 'defeated' ? '<div class="lore-ash" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>' : ''}
    </div>
    ${o.caption ? `<figcaption>${o.caption}</figcaption>` : ''}
  </figure>`;
}

// ——— Bausteine ———
export function guardianImage(tier, { aura, caption, cls } = {}) {
  const g = GUARDIANS[Math.max(0, Math.min(5, tier))];
  return loreImage({ file: g.file, ratio: g.ratio, placeholder: guardianPlaceholder(tier), aura: aura || (g.gold ? G : null),
    caption, cls: `lore-guardian tier-${tier} ${cls || ''}`, alt: `Der Wächter, Stufe ${g.name}` });
}

/**
 * Boss-Porträt mit Zustand.
 * @param {string} id torpor|fracture|hollow|rigor|plateau
 * @param {{hp?:number, max?:number, state?:'defeated'|'retreat'}} s
 */
export function bossImage(id, { hp, max, state, caption, cls } = {}) {
  const b = BOSSES[id];
  const damage = max ? 1 - Math.max(0, hp) / max : 0;
  const st = state || (damage > 0.02 ? 'damaged' : '');
  return loreImage({ file: b.file, ratio: b.ratio, placeholder: bossPlaceholder(b.shape), state: st, damage, cracks: true,
    caption, cls: `lore-boss ${cls || ''}`, alt: b.name });
}

/**
 * Comic-Panels zum Durchwischen. Bild-Panels: Bild als Hintergrund, Text in Systemstimme darüber.
 * Statistik-Panels: ohne Bild, große Zahlen.
 * @param {object[]} panels [{ file?, ratio?, placeholder?, title?, lines?: string[], stats?: [label, value][] }]
 */
export function comicPanels(panels, id = 'panels') {
  const body = panels.map((p, i) => {
    if (p.stats || p.quote) {
      return `<section class="panel panel-stats${p.quote ? ' quote' : ''}" aria-label="Panel ${i + 1}">
        ${p.title ? `<div class="panel-title">${esc(p.title)}</div>` : ''}
        ${p.stats ? `<dl class="panel-numbers">${p.stats.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="num">${esc(v)}</dd></div>`).join('')}</dl>` : ''}
        ${(p.lines || []).map((l) => `<p class="panel-line">${esc(l)}</p>`).join('')}</section>`;
    }
    return `<section class="panel" aria-label="Panel ${i + 1}">
      ${loreImage({ file: p.file, ratio: p.ratio || 4 / 5, placeholder: p.placeholder || (p.boss ? bossPlaceholder(BOSSES[p.boss].shape) : scenePlaceholder(p.ratio || 4 / 5)), cls: `panel-bg${p.gold ? ' gold' : ''}` })}
      <div class="panel-text">${p.title ? `<div class="panel-title">${esc(p.title)}</div>` : ''}${(p.lines || []).map((l) => `<p class="panel-line">${esc(l)}</p>`).join('')}</div>
    </section>`;
  }).join('');
  return `<div class="panels" id="${id}">${body}</div>
    <div class="panel-dots">${panels.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>`;
}

// Punkte unter den Panels beim Wischen mitführen
export function bindPanels(root) {
  root.querySelectorAll('.panels').forEach((el) => {
    const dots = el.nextElementSibling?.querySelectorAll('i');
    if (!dots) return;
    el.addEventListener('scroll', () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
    }, { passive: true });
  });
}
