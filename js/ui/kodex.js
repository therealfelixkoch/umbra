// Kodex: Übungsdatenbank, durchsuchbar und filterbar.
import { EXERCISES, CATEGORIES, EQUIPMENT, getDef } from '../data/exercises.js';
import { EXPRESSIONS, ATTRIBUTES } from '../data/glyphs.js';
import { esc, glyphChips, unitOf, sys } from './kit.js';
import { GUARDIANS, BOSSES, SCENE_KINDS, sceneFile, NEMESIS_SCENES, LORE_DIR, MAX_KB, allLoreFiles } from '../data/lore.js';
import { guardianImage, bossImage, loreImage, scenePlaceholder, comicPanels, bindPanels } from './lore.js';
import { codexEntry } from '../engine/story.js';
import { formatDay } from '../engine/dates.js';
import { HELP, HELP_GROUPS } from '../data/help.js';

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

const STATES = [['full', 'Unversehrt'], ['half', 'Angeschlagen 50 %'], ['heavy', 'Schwer getroffen 85 %'], ['defeated', 'Besiegt'], ['retreat', 'Rückzug']];

function archive(c) {
  const st = c.ui.bossDemo || 'half';
  const bossOpts = st === 'full' ? {} : st === 'half' ? { hp: 7.5, max: 15 } : st === 'heavy' ? { hp: 2.2, max: 15 } : { state: st };
  const cell = (html, file) => `<div class="lore-cell">${html}<small data-file="${file}">${file}</small></div>`;
  const scenes = [0, 1, 2, 3].map((a) => `<div class="label">${['Winter', 'Frühjahr', 'Sommer', 'Herbst'][a]}</div><div class="lore-grid">${SCENE_KINDS.map((k) =>
    cell(loreImage({ file: sceneFile(a, k), ratio: 4 / 5, placeholder: scenePlaceholder(4 / 5) }), sceneFile(a, k))).join('')}</div>`).join('');
  const demo = comicPanels([
    { file: sceneFile(0, 'establishing'), title: 'WINTER ARC', lines: ['Eine Schmiede, in der das Feuer erloschen ist.', 'Der Winter ist lang. Hier wird Kraft gesammelt.'] },
    { file: BOSSES.coldiron.file, ratio: 3 / 4, title: 'COLDIRON', lines: ['Er macht dich schwach und träge, wenn es dunkel wird.', 'Er weicht nur der Kraft.'] },
    { title: 'Bilanz', stats: [['Missionen', '14'], ['ARENA', '9'], ['FLOW-Tage', '21'], ['Längste Serie', '6 W']], lines: ['Beispielzahlen. Im Debrief stehen deine echten.'] },
  ], 'demo-panels');
  return `<button class="btn ghost back" data-act="go" data-to="kodex">← Kodex</button>
    <h1 class="h">Archiv</h1>
    <p class="muted small">Alle Lore-Bilder. Fehlende zeigen einen Platzhalter, bis du sie in assets/lore ablegst.</p>
    ${sys('Der Wächter', `<div class="lore-grid">${GUARDIANS.map((g, i) => cell(guardianImage(i, { caption: g.name }), g.file)).join('')}</div>`)}
    ${sys('Bosse', `<div class="chips scroll">${STATES.map(([k, v]) => `<button class="chip${st === k ? ' on' : ''}" data-act="boss-state" data-v="${k}">${v}</button>`).join('')}</div>
      <div class="lore-grid">${Object.entries(BOSSES).map(([id, b]) => cell(bossImage(id, { ...bossOpts, caption: b.name }), b.file)).join('')}</div>`)}
    ${sys('Szenen', `${scenes}<div class="label">Nemesis</div><div class="lore-grid">${Object.values(NEMESIS_SCENES).map((f) => cell(loreImage({ file: f, ratio: 4 / 5 }), f)).join('')}</div>`)}
    ${sys('Comic-Panels (Vorschau)', `${demo}<p class="muted small">Zum Durchwischen. Bild-Panels mit Systemtext, Statistik-Panels ohne Bild.</p>`)}
    <p class="foot muted">${allLoreFiles().length} Bilder in der Liste.</p>`;
}

function chronicle(c) {
  const entries = Object.entries(c.data.codex || {})
    .map(([key, meta]) => ({ key, meta, e: codexEntry(key, meta) }))
    .filter((x) => x.e)
    .sort((a, b) => (b.meta.day || '').localeCompare(a.meta.day || ''));
  const bosses = entries.filter((x) => x.e.kind === 'boss');
  const rest = entries.filter((x) => x.e.kind !== 'boss');
  return `<button class="btn ghost back" data-act="go" data-to="kodex">← Kodex</button>
    <h1 class="h">Chronik</h1>
    <p class="muted small">Jede neue Übung, jeder Rekord und jeder Gegner schaltet einen Eintrag frei.</p>
    ${bosses.length ? sys('Gegner', bosses.map((x) => `<div class="chron boss"><div class="chron-img">${bossImage(x.e.id, { cls: 'lore-small' })}</div><div><b>${esc(x.e.title)}</b><p>${esc(x.e.text)}</p></div></div>`).join('')) : ''}
    ${sys('Einträge', rest.length ? rest.map((x) => `<div class="chron"><small>${formatDay(x.meta.day || '2026-01-01')}</small><b>${esc(x.e.title)}</b><p>${esc(x.e.text)}</p></div>`).join('') : '<p class="muted">Noch leer. Die erste Mission schreibt den ersten Eintrag.</p>')}`;
}

// Handbuch: alle Erklärungen der „?“-Punkte nach Themen, dazu die Tour
function handbook(c) {
  const q = (c.ui.hq || '').toLowerCase();
  const items = Object.entries(HELP).filter(([, h]) => !q || `${h.title} ${h.text}`.toLowerCase().includes(q));
  return `<button class="btn ghost back" data-act="go" data-to="kodex">← Kodex</button><h1 class="h">Handbuch</h1>
    <button class="btn wide" data-act="tour-start">Geführte Tour starten</button>
    ${HELP_GROUPS.map((g) => {
      const list = items.filter(([, h]) => h.group === g);
      return list.length ? sys(g, list.map(([, h]) => `<details class="arc-why"><summary>${esc(h.title)}</summary><p>${esc(h.text)}</p></details>`).join('')) : '';
    }).join('')}`;
}

export default {
  render(c) {
    if (c.param === 'archiv') return archive(c);
    if (c.param === 'chronik') return chronicle(c);
    if (c.param === 'handbuch') return handbook(c);
    if (c.param && getDef(c.param)) {
      return `<button class="btn ghost back" data-act="go" data-to="kodex">← Kodex</button>${exerciseDetail(getDef(c.param))}`;
    }
    const { kq = '', kcat = '', kexpr = '' } = c.ui;
    return `<h1 class="h">Kodex</h1>
      <div class="row gap"><button class="card archive-link grow" data-act="go" data-to="kodex" data-param="chronik"><b>Chronik</b><small>${Object.keys(c.data.codex || {}).length} Einträge freigeschaltet</small></button>
      <button class="card archive-link grow" data-act="go" data-to="kodex" data-param="archiv"><b>Archiv</b><small>Bilder und Zustände</small></button></div>
      <button class="card archive-link wide" data-act="go" data-to="kodex" data-param="handbuch"><b>Handbuch</b><small>Wie UMBRA funktioniert: alle Erklärungen an einem Ort</small></button>
      <input class="search" type="search" placeholder="Übung, Muskel, Bewegung …" value="${esc(kq)}" data-input="kq" autocomplete="off">
      <div class="chips scroll">${[['', 'Alle'], ...Object.entries(CATEGORIES)].map(([k, v]) =>
        `<button class="chip${kcat === k ? ' on' : ''}" data-act="kcat" data-v="${k}">${v}</button>`).join('')}</div>
      <div class="chips scroll">${Object.entries(EXPRESSIONS).map(([k, v]) =>
        `<button class="chip dot${kexpr === k ? ' on' : ''}" style="--g:${v.color}" data-act="kexpr" data-v="${k}">${v.name}</button>`).join('')}</div>
      <div id="kodex-list">${list(c)}</div>`;
  },
  mount(c, root) {
    if (c.param !== 'archiv') return;
    bindPanels(root);
    // Bildstatus: vorhanden (mit Größe) oder Platzhalter
    root.querySelectorAll('[data-file]').forEach(async (el) => {
      try {
        const res = await fetch(LORE_DIR + el.dataset.file, { method: 'HEAD', cache: 'no-cache' });
        const kb = Math.round(Number(res.headers.get('content-length') || 0) / 1024);
        el.textContent = res.ok ? `${el.dataset.file} · ${kb ? `${kb} KB` : 'vorhanden'}` : `${el.dataset.file} · fehlt, Platzhalter`;
        el.className = res.ok ? (kb > MAX_KB ? 'big' : 'ok') : '';
      } catch { /* offline: Status bleibt offen */ }
    });
  },
  onInput(c, name, value) {
    c.ui[name] = value;
    document.getElementById('kodex-list').innerHTML = list(c);
  },
  actions: {
    'boss-state': (c, d) => c.setUi({ bossDemo: d.v }),
    kcat: (c, d) => c.setUi({ kcat: c.ui.kcat === d.v ? '' : d.v }),
    kexpr: (c, d) => c.setUi({ kexpr: c.ui.kexpr === d.v ? '' : d.v }),
  },
};
