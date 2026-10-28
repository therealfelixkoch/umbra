// Equipment im Setup: pro Ort (Fighting Cave, Home Gym) abhaken, Bestand pflegen (KB- und Kurzhantel-Gewichte mit Anzahl,
// Box-Höhen, Bandstärken) und sehen, was ein Teil freischalten würde. Hilft beim Bauen und Kaufen.
import { esc, helpDot } from './kit.js';
import { EQUIPMENT, EXERCISES, getDef } from '../data/exercises.js';
import { EQUIPMENT_GROUPS, INVENTORY, PLACE_NAMES, BANDS, inventoryOf, unlocks, missionGaps } from '../engine/equipment.js';

const MAX_COUNT = 4;
const label = (id) => EQUIPMENT[id] || id;

function inventoryEditor(place, key, inv) {
  const meta = INVENTORY[key];
  const cur = inv[key] || (meta.counted ? {} : []);
  const chip = (v) => {
    if (meta.counted) {
      const n = cur[v] || 0;
      return `<button class="kb${n ? ' on' : ''}" data-act="inv-cycle" data-place="${place}" data-key="${key}" data-v="${v}">${String(v).replace('.', ',')}${n > 1 ? `<small>×${n}</small>` : ''}</button>`;
    }
    const band = key === 'band' ? BANDS.find((b) => b.id === v) : null;
    return `<button class="kb${band ? ' band' : ''}${cur.includes(v) ? ' on' : ''}" data-act="inv-toggle" data-place="${place}" data-key="${key}" data-v="${esc(String(v))}">${band ? `<i class="band-dot" style="background:${band.color}"></i>` : ''}${esc(meta.labels?.[v] || String(v))}</button>`;
  };
  return `<div class="inv"><div class="label">${meta.label}${meta.unit ? ` (${meta.unit})` : ''}</div>
    <div class="kbgrid">${meta.options.map(chip).join('')}</div>
    ${meta.counted ? '<p class="muted small">Tippen: 1 Stück, nochmal tippen: 2, 3, 4, dann wieder aus.</p>' : ''}</div>`;
}

function placeCard(c, place) {
  const s = c.data.settings;
  const owned = s.equipment[place] || [];
  const inv = inventoryOf(s, place);
  const groups = EQUIPMENT_GROUPS.map((g) => `<div class="label">${g.name}</div><div class="toggles">${g.items.map((id) => {
    const on = owned.includes(id);
    const u = on ? null : unlocks(id, owned, EXERCISES);
    return `<button class="toggle${on ? ' on' : ''}" data-act="toggle-eq" data-id="${id}" data-profile="${place}">${esc(label(id))}${u?.count ? `<small class="eq-plus">+${u.count}</small>` : ''}</button>`;
  }).join('')}</div>`).join('');
  const editors = Object.keys(INVENTORY).filter((k) => owned.includes(k)).map((k) => inventoryEditor(place, k, inv)).join('');
  const gaps = missionGaps(place, owned, getDef);
  const gapList = gaps.length ? `<div class="label">Fehlt für deine Missionen</div><ul class="eq-gaps">${gaps.slice(0, 6).map((g) =>
    `<li><b>${esc(label(g.item))}</b><small>${esc(g.slots.slice(0, 3).join(', '))}${g.slots.length > 3 ? ` und ${g.slots.length - 3} mehr` : ''}</small></li>`).join('')}</ul>
    <p class="muted small">Ohne das Teil läuft dort eine Ausweichübung oder die Übung ohne Zusatzgewicht.</p>` : '<p class="muted small">Alle Missionen laufen hier mit den Original-Übungen.</p>';
  return `<details class="card eq-place"${c.ui.eqOpen === place ? ' open' : ''}><summary data-act="eq-open" data-place="${place}"><b>${PLACE_NAMES[place]}</b><small>${owned.length} Teile</small></summary>
    ${groups}
    <p class="muted small">+N = so viele Übungen würde das Teil hier freischalten. ${helpDot('equipment')}</p>
    ${editors}${gapList}</details>`;
}

export function equipmentSetup(c) {
  return `${placeCard(c, 'room')}${placeCard(c, 'gym')}
    <p class="muted small">Ohne Kettlebells im Home Gym nimmt die App Kurzhanteln. Die Gewichte im Bestand sind die Stufen, mit denen die App dich steigert.</p>`;
}

const setInventory = (c, place, key, fn) => c.update((data) => {
  const all = data.settings.inventory || {};
  const inv = all[place] || {};
  return { ...data, settings: { ...data.settings, inventory: { ...all, [place]: { ...inv, [key]: fn(inv[key]) } } } };
});

export const equipmentActions = {
  'inv-cycle': (c, d) => setInventory(c, d.place, d.key, (cur = {}) => {
    const n = ((cur[d.v] || 0) + 1) % (MAX_COUNT + 1);
    const next = { ...cur, [d.v]: n };
    if (!n) delete next[d.v];
    return next;
  }),
  'inv-toggle': (c, d) => setInventory(c, d.place, d.key, (cur = []) => (cur.includes(d.v) ? cur.filter((x) => x !== d.v) : [...cur, d.v])),
  'eq-open': (c, d) => c.setUi({ eqOpen: c.ui.eqOpen === d.place ? null : d.place }),
};
