// Atmosphäre: Saisonfarbe auf <body> (data-season) und Partikel hinter der Oberfläche.
// Im Winter Arc schneit es fein auf allen Seiten außer Training und Checks, sonst nur auf „Heute“.
// Wird bei jedem Render abgeglichen, baut die Partikel aber nur neu, wenn die Saison wechselt.
import { arcOf } from '../data/arcs.js';

const KIND = { winter: 'snow', spring: 'rain', summer: 'ember', autumn: 'leaf' };
const COLOR = { winter: 'rgba(225,242,255,.9)', spring: 'rgba(190,180,255,.55)', summer: 'rgba(255,170,90,.95)', autumn: 'rgba(210,150,90,.8)' };
// Seiten, auf denen nichts vom Training ablenken soll
const QUIET = ['training', 'check', 'review', 'debrief', 'temper', 'wristcheck', 'feetcheck', 'benchmark', 'onboarding'];
export const SEASON_LOOKS = [['auto', 'Automatisch'], ['winter', 'Winter'], ['spring', 'Frühjahr'], ['summer', 'Sommer'], ['autumn', 'Herbst']];
let built = null;

const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Echte Saison der Daten (winter, spring, summer, autumn). */
export const realSeason = (data) => { const arc = data?.engine?.arc; return arc && arc.n >= 0 ? arcOf(arc.n).id.toLowerCase() : 'spring'; };
/** Saison, deren Look gerade gezeigt wird (Vorschau im Setup oder echt). */
export const lookSeason = (data) => { const l = data?.settings?.seasonLook; return l && l !== 'auto' ? l : realSeason(data); };

function particle(i, kind, color) {
  if (kind === 'snow') {
    // Feiner Schnee: kleine, weiche Flocken in drei Tiefen, langsam und leicht seitlich treibend
    const depth = rnd(i, 7);
    const size = 1 + depth * 1.8;
    const dur = 26 - depth * 12 + rnd(i, 2) * 6;
    const dx = (rnd(i, 6) - 0.5) * 70;
    return `<i class="atmo-p snow" style="left:${(rnd(i, 1) * 100).toFixed(1)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;background:${color};opacity:${(0.35 + depth * 0.5).toFixed(2)};${depth < 0.3 ? 'filter:blur(0.6px);' : ''}--dx:${dx.toFixed(0)}px;--anim:atmoFall ${dur.toFixed(1)}s linear ${(-rnd(i, 3) * dur).toFixed(1)}s infinite;animation:var(--anim)"></i>`;
  }
  const dur = (kind === 'rain' ? 1.4 : kind === 'ember' ? 7 : 12) + rnd(i, 2) * 6;
  const size = kind === 'rain' ? 1.2 : kind === 'leaf' ? 5 + rnd(i, 4) * 3 : 2 + rnd(i, 4) * 3;
  const h = kind === 'rain' ? 16 + rnd(i, 5) * 10 : size;
  const dx = kind === 'rain' ? -60 : (rnd(i, 6) - 0.5) * 80;
  const radius = kind === 'leaf' ? '2px 8px' : kind === 'rain' ? '1px' : '50%';
  const glow = kind === 'ember' ? `box-shadow:0 0 8px ${color};` : '';
  return `<i class="atmo-p" style="left:${(rnd(i, 1) * 100).toFixed(1)}%;width:${size.toFixed(1)}px;height:${h.toFixed(1)}px;background:${color};border-radius:${radius};${glow}--dx:${dx.toFixed(0)}px;animation:${kind === 'ember' ? 'atmoRise' : 'atmoFall'} ${dur.toFixed(1)}s linear ${(-rnd(i, 3) * dur).toFixed(1)}s infinite"></i>`;
}

function build(el, season) {
  const kind = KIND[season];
  const n = kind === 'snow' ? 44 : 26;
  el.innerHTML = `<div class="atmo-fog"></div>${Array.from({ length: n }, (_, i) => particle(i, kind, COLOR[season])).join('')}`;
}

/** Body-Attribute und Partikel passend zu Saison und Route setzen. */
export function syncAtmosphere(data, route) {
  const season = lookSeason(data);
  document.body.dataset.season = season;
  document.body.dataset.route = route;
  document.body.dataset.atmo = route === 'heute' || (season === 'winter' && !QUIET.includes(route)) ? 'on' : 'off';
  const el = document.getElementById('atmo');
  if (!el) return;
  if (built !== season) { build(el, season); built = season; }
}
