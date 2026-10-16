// Kodex: Übungsdatenbank, durchsuchbar und filterbar.
import { EXERCISES, CATEGORIES, EQUIPMENT, getDef } from '../data/exercises.js';
import { EXPRESSIONS, ATTRIBUTES } from '../data/glyphs.js';
import { esc, glyphChips, unitOf } from './kit.js';

export function exerciseDetail(def, { linkable = true } = {}) {
  const link = (id) => {
    const d = getDef(id);
    if (!d) return '';
    return linkable ? `<button class="chip" data-act="go" data-to="kodex" data-param="${id}">${esc(d.name)}</button>` : `<span class="chip">${esc(d.name)}</span>`;
  };
  const range = def.range && def.mode !== 'amrap' ? `${def.range[0]}${def.range[1] !== def.range[0] ? `–${def.range[1]}` : ''} ${unitOf(def)}${def.perSide ? ' je Seite' : ''}` : 'max';
  return `<article class="detail">
    <div class="label">${esc(CATEGORIES[def.cat])}</div>
    <h1 class="h">${esc(def.name)}</h1>
    ${glyphChips(def)}
    <div class="glyph-legend">${(def.tags || []).map(([a, x]) => `<span style="--g:${EXPRESSIONS[x].color}">${esc(ATTRIBUTES[a].name)} · ${esc(EXPRESSIONS[x].name)}</span>`).join('')}</div>
    <dl class="facts">
      <div><dt>Spanne</dt><dd>${range}</dd></div>
      <div><dt>Equipment</dt><dd>${def.equipment.length ? def.equipment.map((e) => esc(EQUIPMENT[e])).join(', ') : 'keins'}</dd></div>
      ${def.load ? `<div><dt>Last</dt><dd>${{ kb: 'Kettlebell', belt: 'Zusatzgewicht am Dip-Gürtel', barbell: 'Langhantel', dumbbell: 'Kurzhanteln', cable: 'Kabelzug' }[def.load]}</dd></div>` : ''}
    </dl>
    <h2 class="h2">Ausführung</h2><ul class="cues">${def.cues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    ${def.mistakes?.length ? `<h2 class="h2">Typische Fehler</h2><ul class="cues warn">${def.mistakes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${def.mt ? `<p class="note">Für Muay Thai: ${esc(def.mt)}</p>` : ''}
    ${def.easier || def.harder ? `<h2 class="h2">Stufen</h2><div class="chips">${def.easier ? `<span class="muted">leichter</span>${link(def.easier)}` : ''}${def.harder ? `<span class="muted">schwerer</span>${link(def.harder)}` : ''}</div>` : ''}
    ${def.alternatives?.length ? `<h2 class="h2">Alternativen</h2><div class="chips">${def.alternatives.map(link).join('')}</div>` : ''}
  </article>`;
}

function matches(def, q, cat, expr) {
  if (cat && def.cat !== cat) return false;
  if (expr && !def.tags.some(([, x]) => x === expr)) return false;
  if (!q) return true;
  const hay = `${def.name} ${def.cues.join(' ')} ${def.tags.map(([a]) => ATTRIBUTES[a].name).join(' ')}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

function list(c) {
  const { kq = '', kcat = '', kexpr = '' } = c.ui;
  const items = Object.values(EXERCISES).filter((d) => matches(d, kq, kcat, kexpr));
  if (!items.length) return '<p class="muted center">Nichts gefunden.</p>';
  return items.map((d) => `<button class="kodex-item" data-act="go" data-to="kodex" data-param="${d.id}">
    <div><b>${esc(d.name)}</b><small>${esc(CATEGORIES[d.cat])}</small></div>${glyphChips(d, { small: true })}</button>`).join('');
}

export default {
  render(c) {
    if (c.param && getDef(c.param)) {
      return `<button class="btn ghost back" data-act="go" data-to="kodex">← Kodex</button>${exerciseDetail(getDef(c.param))}`;
    }
    const { kq = '', kcat = '', kexpr = '' } = c.ui;
    return `<h1 class="h">Kodex</h1>
      <input class="search" type="search" placeholder="Übung, Muskel, Bewegung …" value="${esc(kq)}" data-input="kq" autocomplete="off">
      <div class="chips scroll">${[['', 'Alle'], ...Object.entries(CATEGORIES)].map(([k, v]) =>
        `<button class="chip${kcat === k ? ' on' : ''}" data-act="kcat" data-v="${k}">${v}</button>`).join('')}</div>
      <div class="chips scroll">${Object.entries(EXPRESSIONS).map(([k, v]) =>
        `<button class="chip dot${kexpr === k ? ' on' : ''}" style="--g:${v.color}" data-act="kexpr" data-v="${k}">${v.name}</button>`).join('')}</div>
      <div id="kodex-list">${list(c)}</div>`;
  },
  onInput(c, name, value) {
    c.ui[name] = value;
    document.getElementById('kodex-list').innerHTML = list(c);
  },
  actions: {
    kcat: (c, d) => c.setUi({ kcat: c.ui.kcat === d.v ? '' : d.v }),
    kexpr: (c, d) => c.setUi({ kexpr: c.ui.kexpr === d.v ? '' : d.v }),
  },
};
