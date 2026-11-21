// Conditioning in der Fighting Cave und Cave-Zirkel (Felix, 21.11.2026). Reine Funktionen.
// Conditioning (COND) zählt für die Woche, nicht als Einheit. Der Cave-Zirkel ist die Kurzversion der nächsten
// Einheit in der Fighting Cave und zählt als Einheit, aber erst, wenn die Cave Hauptübung und CMPND Block mit Last abdeckt.
import { COND_STATIONS, COND_FORMATS, COND_MINUTES } from '../data/conditioning.js';
import { programSlots } from '../data/program.js';
import { getDef as defaultGetDef } from '../data/exercises.js';
import { rng } from './footwork.js';
import { canDo, weightsOf } from './equipment.js';
import { weekInfo } from './arc.js';

export const CAVE_MIN_KB = 16; // ab diesem KB-Gewicht trägt eine KB-Übung als Hauptübung/CMPND
export const CAVE_KB = 'kb16'; // Platzhalter in missing: schwerere Kettlebell nötig

const maxKb = (kbWeights) => Math.max(0, ...(kbWeights || []));

/** Stationen, die mit dieser Ausstattung gehen. */
export function condStations(equipment = [], kbWeights = []) {
  const have = new Set(equipment);
  const kb = maxKb(kbWeights);
  return COND_STATIONS.filter((s) => s.needs.every((e) => have.has(e)) && (!s.minKg || kb >= s.minKg));
}

/** Machbare Formate an diesem Ort: [{ id, name, focus, minutes:[15,30] }]. Ohne Sack keins. */
export function condOptions(equipment = [], kbWeights = []) {
  const st = condStations(equipment, kbWeights);
  return Object.values(COND_FORMATS)
    .filter((f) => f.groups.every((g) => st.some((s) => g.includes(s.group))))
    .map((f) => ({ id: f.id, name: f.name, focus: f.focus, minutes: [...COND_MINUTES] }));
}

const shuffle = (arr, rand) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Runden passend zur Dauer: Aufwärmen + Runden × (Arbeit + Pause) − letzte Pause ≈ Minuten. */
export const condRounds = (f, minutes) => Math.max(1, Math.round((minutes * 60 - f.warmup + f.rest) / (f.work + f.rest)));

/**
 * Plan für den Intervall-Timer (wie EXPRESS_BAG/NOR4X4) plus Station je Arbeitsrunde.
 * @returns {null | {id:'COND', missionId:'COND', format:'intervals', kind:'express', cond:string, name:string, focus:string,
 *   minutes:number, warmup:number, cooldown:0, rounds:number, work:number, rest:number, exId:string,
 *   items:{exId:string}[], stations:{round:number, ex:string, text:string, group:string}[]}}
 */
export function condPlan({ format = 'power', minutes = 15, equipment = [], kbWeights = [], seed } = {}) {
  const f = COND_FORMATS[format];
  if (!f || !condOptions(equipment, kbWeights).some((o) => o.id === format)) return null;
  const min = COND_MINUTES.includes(minutes) ? minutes : 15;
  const rand = rng(seed ?? Date.now());
  const st = condStations(equipment, kbWeights);
  const pools = f.groups.map((g) => shuffle(st.filter((s) => g.includes(s.group)), rand));
  const rounds = condRounds(f, min);
  const idx = pools.map(() => 0);
  const stations = [];
  for (let r = 1; r <= rounds; r++) {
    const p = (r - 1) % pools.length; // MIX: Sack, Station, Sack, Station …
    const s = pools[p][idx[p]++ % pools[p].length];
    stations.push({ round: r, ex: s.ex, text: s.text, group: s.group });
  }
  return { id: 'COND', missionId: 'COND', format: 'intervals', kind: 'express', cond: f.id,
    name: `CONDITIONING · ${f.name}`, focus: `${f.focus} · ${min} min`, minutes: min,
    warmup: f.warmup, cooldown: 0, rounds, work: f.work, rest: f.rest, exId: stations[0].ex,
    items: [...new Set(stations.map((s) => s.ex))].map((exId) => ({ exId })), stations };
}

/**
 * Kann die Fighting Cave die Einheit tragen? Hauptübung und CMPND Block der Einheit müssen dort direkt
 * (ohne Ausweichübung) gehen, Kettlebell-Übungen erst ab CAVE_MIN_KB. Partner dürfen auf eine machbare Alternative ausweichen.
 * @returns {{ok:boolean, missing:string[], slots:{ex:string, ok:boolean, missing:string[]}[]}}
 */
export function caveStatus(data, missionId, { getDef = defaultGetDef } = {}) {
  const arc = data.engine.arc;
  const info = arc ? weekInfo(arc) : null;
  const prog = info ? programSlots(info.arc.id, info.chapterIndex, missionId) : null;
  if (!prog) return { ok: false, missing: [], slots: [] };
  const equipment = data.settings.equipment?.room || [];
  const kb = maxKb(weightsOf(data.settings.inventory?.room, 'kb').length ? weightsOf(data.settings.inventory.room, 'kb') : data.settings.kbWeights);
  const slots = prog.slots.filter((s) => s.b === 'main' || s.b === 'cmpnd').map((s) => {
    const ex = s.room || s.ex;
    const def = getDef(ex);
    const miss = (def?.equipment || []).filter((e) => !equipment.includes(e));
    if (def && canDo(def, equipment) && def.load === 'kb' && kb < CAVE_MIN_KB) miss.push(CAVE_KB);
    if (def?.load === 'belt' && !equipment.includes('belt') && !equipment.includes('vest')) miss.push('belt');
    // Partner im CMPND Block dürfen auf eine machbare Alternative ausweichen (z. B. Push-ups statt Ring Push-ups)
    const alt = s.role === 'partner' && miss.length ? (def?.alternatives || []).find((id) => getDef(id) && canDo(getDef(id), equipment)) : null;
    return { ex: alt || ex, ok: !!def && (miss.length === 0 || !!alt), missing: alt ? [] : miss };
  });
  // Dip-Gürtel ist nett, aber kein Muss: Anker mit Körpergewicht tragen die Einheit auch
  const hard = slots.map((s) => ({ ...s, missing: s.missing.filter((m) => m !== 'belt') }));
  const missing = [...new Set(hard.flatMap((s) => s.missing))];
  return { ok: hard.length > 0 && missing.length === 0, missing, slots: hard.map((s) => ({ ...s, ok: s.missing.length === 0 })) };
}
