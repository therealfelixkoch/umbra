// Runden am Sack (ARENA): Die App sagt Felix' Kurs-Kombis an, nur die Nummer bzw. die Schlagfolge.
// Was 1–4 bedeuten, weiß Felix; die App kennt nur die Ansage. Takt und Zufall wie beim Footwork-Drill.
import { rng } from './footwork.js';

export const BAG_CATS = ['kick', 'knee', 'hands'];
export const BAG_EXTRA = ['Jab Jab Cross', 'Hook Cross', 'Cross Hook', 'Hook', 'Cross'];
export const BAG_NUMBERS = ['One', 'Two', 'Three', 'Four'];
export const BAG_SUFFIX = { kick: '', knee: ' Knee', hands: ' Hands' };
export const BAG_MODES = ['order', 'mixed'];

// order: 1, 2, 3, 4, Jab Jab Cross, dann wieder von vorn. mixed: aus allen neun Kombis.
export const BAG_ORDER = [...BAG_NUMBERS, 'Jab Jab Cross'];
export const BAG_POOL = [...BAG_NUMBERS, ...BAG_EXTRA];

// Grundabstand zwischen zwei Ansagen in Sekunden (Kombis brauchen länger als Footwork-Kommandos),
// ± 15 % Zufall, dazu Zeit für längere Kombis (0,4 s je weiteres Wort).
export const BAG_TEMPOS = { slow: 5, mid: 3.8, fast: 2.8 };
export const BAG_FIRST = 2; // erste Ansage nach 2 s
export const BAG_TAIL = 1.5; // letzte Ansage spätestens 1,5 s vor Rundenende

export const bagText = (cat, combo) => combo + (BAG_SUFFIX[cat] ?? '');

// Gültige Kategorien aus { knee: 'order', hands: 'mixed' }; unbekannte oder leere Einträge fallen weg.
export function bagCats(cats = {}) {
  return BAG_CATS.filter((c) => cats[c]).map((c) => ({ cat: c, mode: cats[c] === 'mixed' ? 'mixed' : 'order' }));
}

export function bagDelay(tempo, text, rand) {
  const base = BAG_TEMPOS[tempo] || BAG_TEMPOS.mid;
  const words = text.split(' ').length;
  return base * (0.85 + rand() * 0.3) + 0.4 * Math.max(0, words - 1);
}

/**
 * Plan für eine Runde: [{ t, text, cat, combo }] (t = Sekunden ab Rundenstart, text = englische Ansage).
 * Mehrere Kategorien: pro Ansage zufällig eine; jede führt ihre eigene Reihenfolge weiter.
 * mixed: nie dieselbe Kombi zweimal direkt hintereinander (innerhalb der Kategorie und insgesamt).
 * @param {{duration:number, tempo?:'slow'|'mid'|'fast', cats:Object, seed?:number}} opts
 */
export function bagSchedule({ duration, tempo = 'mid', cats, seed } = {}) {
  const list = bagCats(cats);
  if (!list.length || !(duration > 0)) return [];
  const rand = rng(seed ?? Date.now());
  const state = Object.fromEntries(list.map(({ cat }) => [cat, { i: 0, last: null }]));
  const out = [];
  let lastText = null;
  let t = BAG_FIRST;
  while (t <= duration - BAG_TAIL) {
    const { cat, mode } = list[Math.floor(rand() * list.length)];
    const st = state[cat];
    let combo;
    if (mode === 'order') {
      combo = BAG_ORDER[st.i % BAG_ORDER.length];
      st.i++;
    } else {
      const options = BAG_POOL.filter((c) => c !== st.last && bagText(cat, c) !== lastText);
      combo = options[Math.floor(rand() * options.length)];
    }
    st.last = combo;
    const text = bagText(cat, combo);
    lastText = text;
    out.push({ t: Math.round(t * 100) / 100, text, cat, combo });
    t += bagDelay(tempo, text, rand);
  }
  return out;
}
