// Equipment: Katalog nach Gruppen, Bestand pro Ort (Gewichte, Anzahl, Höhen, Stärken) und was ein Teil freischalten würde.
// Orte: room = Fighting Cave, gym = Home Gym. Reine Funktionen.
import { MISSIONS } from '../data/missions.js';

export const PLACE_NAMES = { room: 'Fighting Cave', gym: 'Home Gym', travel: 'Unterwegs' };

// Katalog: nur Teile, die mindestens eine Übung in UMBRA nutzt (sonst wäre es Deko).
export const EQUIPMENT_GROUPS = [
  { id: 'weights', name: 'Gewichte', items: ['kb', 'dumbbells', 'barbell', 'rack', 'bench', 'belt', 'vest'] },
  { id: 'pull', name: 'Ziehen, Stützen, Klettern', items: ['bar', 'dipbars', 'climb_rope', 'harness', 'cable'] },
  { id: 'floor', name: 'Sprung und Boden', items: ['box', 'abwheel', 'band', 'chair'] },
  { id: 'fight', name: 'Kampf und Kondition', items: ['bag', 'rope', 'rower', 'bike', 'treadmill'] },
  { id: 'joints', name: 'Füße, Hände, Gelenke', items: ['hammer', 'ball', 'balance_board', 'slant', 'pipes'] },
];

// Teile mit Bestand (Mengen, Gewichte, Höhen, Stärken)
export const INVENTORY = {
  kb: { label: 'Kettlebells', unit: 'kg', options: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48], counted: true },
  dumbbells: { label: 'Kurzhanteln (Paare)', unit: 'kg', options: [2, 4, 5, 6, 8, 10, 12, 12.5, 14, 15, 16, 17.5, 18, 20, 22, 22.5, 24, 25, 26, 27.5, 28, 30, 32, 35, 40, 45, 50], counted: true },
  box: { label: 'Plyo-Boxen', unit: 'cm', options: [20, 30, 40, 50, 60, 75, 90] },
  band: { label: 'Widerstandsbänder', unit: '', options: ['leicht', 'mittel', 'schwer', 'sehr schwer'] },
};

/** Bestand eines Ortes: { kb: {12: 1}, dumbbells: {...}, box: [50], band: ['mittel'] } */
export const inventoryOf = (settings, place) => settings.inventory?.[place] || {};

/** Gewichte (aufsteigend) eines gezählten Bestands, nur mit Anzahl > 0. */
export const weightsOf = (inv, key) => Object.entries(inv?.[key] || {}).filter(([, n]) => n > 0).map(([w]) => Number(w)).sort((a, b) => a - b);

/** Ist eine Übung mit diesem Equipment direkt machbar (ohne Ausweichübung)? Gewichtsweste zählt wie Dip-Gürtel. */
export function canDo(def, equipment) {
  const have = new Set(equipment);
  if (have.has('vest')) have.add('belt');
  return (def.equipment || []).every((e) => have.has(e));
}

/**
 * Was würde ein Teil freischalten? Übungen, die damit direkt machbar wären und es heute nicht sind.
 * @returns {{count:number, names:string[], ids:string[]}}
 */
export function unlocks(item, equipment, all) {
  const exercises = Array.isArray(all) ? all : Object.values(all);
  const with_ = [...equipment, item];
  const ids = exercises.filter((d) => (d.equipment || []).includes(item) && !canDo(d, equipment) && canDo(d, with_)).map((d) => d.id);
  if ((item === 'vest' || item === 'belt') && !equipment.includes('belt') && !equipment.includes('vest')) {
    ids.push(...exercises.filter((d) => d.load === 'belt').map((d) => d.id)); // Gürtel oder Weste = Zusatzgewicht für Klimmzüge und Dips
  }
  const uniq = [...new Set(ids)];
  return { count: uniq.length, ids: uniq, names: uniq.map((id) => exercises.find((d) => d.id === id)?.name).filter(Boolean) };
}

/**
 * Lücken in deinen Missionen an diesem Ort: Plätze, die gerade mit einer Ausweichübung laufen
 * oder ohne Zusatzgewicht bleiben, gruppiert nach dem fehlenden Teil.
 * @returns {{item:string, slots:string[]}[]} absteigend nach Anzahl
 */
export function missionGaps(place, equipment, getDef) {
  const ids = place === 'gym' ? ['A', 'B', 'C', 'D', 'FORGE'] : ['A', 'B', 'C', 'D'];
  const have = new Set(equipment);
  const missing = new Map();
  const add = (item, name) => { if (!missing.has(item)) missing.set(item, new Set()); missing.get(item).add(name); };
  for (const id of ids) {
    const m = MISSIONS[id];
    const wanted = m.slots
      ? m.slots.filter((s) => !s.prehab && !s.arcOnly && (!s.only || s.only === place)).map((s) => (place === 'gym' && s.gym ? [].concat(s.gym) : [s.ex])).flat()
      : (m.items || []).map((it) => (place === 'gym' && it.gym ? it.gym : it.ex));
    if (m.gymEx && place === 'gym') wanted.push(m.gymEx);
    for (const ex of wanted) {
      const def = getDef(ex);
      if (!def) continue;
      for (const e of def.equipment || []) if (!have.has(e) && !(e === 'belt' && have.has('vest'))) add(e, def.name);
      if (def.load === 'belt' && !have.has('belt') && !have.has('vest')) add('belt', `${def.name} (Zusatzgewicht)`);
    }
  }
  return [...missing.entries()].map(([item, s]) => ({ item, slots: [...s] })).sort((a, b) => b.slots.length - a.slots.length);
}
