// Kleine UI-Bausteine als Template-Strings.
import { EXPRESSIONS, ATTRIBUTES } from '../data/glyphs.js';
import { getDef } from '../data/exercises.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const kg = (n) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','));

// Last-Text: bei Gürtel-Übungen „+8 kg“, sonst „16 kg“.
export function loadText(def, load) {
  if (!def.load || (!load && def.load === 'belt')) return def.bodyweight ? 'Körpergewicht' : '';
  return def.load === 'belt' ? `+${kg(load)} kg` : `${kg(load)} kg`;
}

export function unitOf(def) {
  if (def.unit) return def.unit;
  return def.mode === 'time' ? 's' : 'Wdh.';
}

export function targetText(def, value) {
  if (def.mode === 'fixed') return `${def.range[0]}${def.range[1] !== def.range[0] ? `–${def.range[1]}` : ''} ${unitOf(def)}`;
  if (def.mode === 'amrap') return value ? `max · Ziel ${value}+` : 'max';
  return `${value} ${unitOf(def)}${def.perSide ? ' je Seite' : ''}`;
}

export function setsText(def, sets) {
  if (!sets?.length) return '–';
  const loads = [...new Set(sets.map((s) => s.load || 0))];
  const vals = sets.map((s) => s.value).join(' / ');
  const l = loadText(def, loads.length === 1 ? loads[0] : Math.max(...loads));
  return `${vals}${def.mode === 'time' ? ' s' : ''}${l && l !== 'Körpergewicht' ? ` · ${l}` : ''}`;
}

export function glyphChips(def, { small = false } = {}) {
  return `<div class="glyphs${small ? ' sm' : ''}">${(def.tags || []).map(([a, x]) => {
    const e = EXPRESSIONS[x];
    const at = ATTRIBUTES[a];
    return `<span class="glyph" style="--g:${e.color}" title="${esc(at.name)} · ${esc(e.name)}">${esc(at.short)}</span>`;
  }).join('')}</div>`;
}

/** Kleiner „?“-Punkt: öffnet die Erklärung aus js/data/help.js. */
export const helpDot = (key) => `<button class="help-dot" data-act="help" data-k="${key}" aria-label="Erklärung">?</button>`;

export function sys(title, body = '', { tone = 'sys', cls = '' } = {}) {
  return `<section class="sys ${tone} ${cls}"><div class="sys-head"><span class="sys-mark">◆</span>${esc(title)}</div>${body}</section>`;
}

export function chips(name, options, value) {
  return `<div class="chips">${options.map(([v, label]) =>
    `<button class="chip${v === value ? ' on' : ''}" data-act="pick" data-name="${name}" data-value="${v}">${label}</button>`).join('')}</div>`;
}

export function stepper(act, value, label, { idx = '', big = false } = {}) {
  return `<div class="stepper${big ? ' big' : ''}">
    <button class="step" data-act="${act}" data-dir="-1" data-idx="${idx}" aria-label="weniger">−</button>
    <div class="step-val"><b>${value}</b>${label ? `<small>${label}</small>` : ''}</div>
    <button class="step" data-act="${act}" data-dir="1" data-idx="${idx}" aria-label="mehr">+</button>
  </div>`;
}

export const TREND = {
  load_up: ['▲', 'Mehr Gewicht'],
  reps_up: ['▲', '+1 Wdh.'],
  time_up: ['▲', '+5 s'],
  variant_up: ['◆', 'Neue Stufe'],
  variant_ready: ['◆', 'Nächste Stufe bereit'],
  variant_down_ready: ['◆', 'Leichtere Stufe vorgeschlagen'],
  load_down: ['▼', 'Etwas leichter'],
  variant_down: ['▼', 'Leichtere Variante'],
  reps_down: ['▼', 'Ziel angepasst'],
  top: ['■', 'Obergrenze erreicht'],
  held_rir: ['=', 'gehalten · RIR 0'],
  set_up: ['▲', '+1 Satz'],
  tempo_up: ['▲', 'langsameres Tempo'],
  set_down: ['▼', 'Zusatzsatz weg'],
  tempo_down: ['▼', 'normales Tempo'],
};

export function trendBadge(trend) {
  if (!trend || !TREND[trend]) return '';
  const [sym, label] = TREND[trend];
  const cls = trend.endsWith('_up') || trend === 'variant_ready' ? 'up' : trend === 'top' ? 'top' : 'down';
  return `<span class="trend ${cls}">${sym} ${label}</span>`;
}

export const nameOf = (id) => getDef(id)?.name || id;

export const ICONS = {
  heute: '<svg viewBox="0 0 24 24"><path d="M12 3l8 5v8l-8 5-8-5V8z"/><circle cx="12" cy="12" r="3"/></svg>',
  arena: '<svg viewBox="0 0 24 24"><path d="M5 19l6-6M4 14l6 6M14 4l6 6M13 11l7-7M9 9l2 2"/></svg>',
  kodex: '<svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>',
  profil: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
};
