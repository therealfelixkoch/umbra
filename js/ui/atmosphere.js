// Atmosphäre: Saisonfarbe auf <body> (data-season), Partikel und der Saison-Wächter im Nebel hinter „Heute“.
// Wird bei jedem Render abgeglichen, baut die Partikel aber nur neu, wenn die Saison wechselt.
import { arcOf } from '../data/arcs.js';

const KIND = { winter: 'snow', spring: 'rain', summer: 'ember', autumn: 'leaf' };
const COLOR = { winter: 'rgba(220,240,255,.85)', spring: 'rgba(190,180,255,.55)', summer: 'rgba(255,170,90,.95)', autumn: 'rgba(210,150,90,.8)' };
const GUARDIAN = 'M30 266c4-60 10-120 30-150 12-18 22-24 40-26 18 2 28 8 40 26 20 30 26 90 30 150zM80 70c0-14 9-22 20-22s20 8 20 22-9 22-20 22-20-8-20-22z';
let built = null;

const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

function build(el, season) {
  const kind = KIND[season];
  const color = COLOR[season];
  const parts = Array.from({ length: 26 }, (_, i) => {
    const dur = (kind === 'rain' ? 1.4 : kind === 'ember' ? 7 : 12) + rnd(i, 2) * 6;
    const size = kind === 'rain' ? 1.2 : kind === 'leaf' ? 5 + rnd(i, 4) * 3 : 2 + rnd(i, 4) * 3;
    const h = kind === 'rain' ? 16 + rnd(i, 5) * 10 : size;
    const dx = kind === 'rain' ? -60 : (rnd(i, 6) - 0.5) * 80;
    const radius = kind === 'leaf' ? '2px 8px' : kind === 'rain' ? '1px' : '50%';
    const glow = kind === 'ember' ? `box-shadow:0 0 8px ${color};` : '';
    return `<i class="atmo-p" style="left:${(rnd(i, 1) * 100).toFixed(1)}%;width:${size.toFixed(1)}px;height:${h.toFixed(1)}px;background:${color};border-radius:${radius};${glow}--dx:${dx.toFixed(0)}px;animation:${kind === 'ember' ? 'atmoRise' : 'atmoFall'} ${dur.toFixed(1)}s linear ${(-rnd(i, 3) * dur).toFixed(1)}s infinite"></i>`;
  }).join('');
  el.innerHTML = `<div class="atmo-fog"></div>
    <svg class="atmo-guardian" viewBox="0 0 200 280" aria-hidden="true"><path d="${GUARDIAN}" fill="#0b0e18" stroke="var(--sys)" stroke-opacity=".35" stroke-width="1.2"/>
      <path d="M86 130l10 22-6 18 14 26M118 150l-8 20 10 16" fill="none" stroke="var(--sys)" stroke-opacity=".6" stroke-width="1.4"/>
      <circle cx="92" cy="68" r="2.4" fill="var(--sys)"/><circle cx="108" cy="68" r="2.4" fill="var(--sys)"/></svg>${parts}`;
}

/** Body-Attribute und Partikel passend zu Saison und Route setzen. */
export function syncAtmosphere(data, route) {
  const arc = data?.engine?.arc;
  const season = arc && arc.n >= 0 ? arcOf(arc.n).id.toLowerCase() : 'spring';
  document.body.dataset.season = season;
  document.body.dataset.route = route;
  const el = document.getElementById('atmo');
  if (!el) return;
  if (built !== season) { build(el, season); built = season; }
  // Risse im Saison-Wächter wachsen mit der Saison (nur Deckkraft der Risslinie)
  const crack = el.querySelector('.atmo-guardian path:nth-child(2)');
  if (crack && arc) crack.setAttribute('stroke-opacity', String(Math.min(0.95, 0.15 + (arc.week / 13) * 0.8).toFixed(2)));
}
