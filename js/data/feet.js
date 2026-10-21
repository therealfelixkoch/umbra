// FEET: Fußtraining bei Knick-Senkfuß, 5–8 min barfuß, an nichts gekoppelt. Grundlage: docs/feet-protokoll.md.
// Keine Diagnosen. Ziel ist Funktion (Kraft, Stabilität, Gleichgewicht, Federung), nicht eine neue Fußform.

const F = 'fuss';
const arch = [['ankle', 'stabil'], ['ankle', 'proprio']];

export const FEET_EXERCISES = [
  // ——— Stufe 1: Erwachen ———
  { id: 'f_toe_spread', rest: 'wrist', name: 'Toe Spreading', cat: F, equipment: [], mode: 'reps', range: [10, 10], tags: [['ankle', 'proprio']], elbowLoad: 0,
    cues: ['Alle Zehen so weit wie möglich auseinander, 3 s halten', 'Am Anfang mit den Fingern helfen'], mistakes: ['Zehen krallen'] },
  { id: 'f_toe_yoga', rest: 'wrist', name: 'Toe Yoga', cat: F, equipment: [], mode: 'reps', range: [10, 10], tags: [['ankle', 'proprio']], elbowLoad: 0,
    cues: ['Großzeh hoch, die anderen Zehen bleiben unten', 'Dann umgekehrt: Großzeh unten, die anderen hoch'], mistakes: ['Ganzer Fuß kippt mit'] },
  { id: 'f_short_seated', rest: 'wrist', name: 'Short Foot (Seated)', cat: F, equipment: [], mode: 'time', range: [10, 10], tags: arch, elbowLoad: 0,
    cues: ['Sitzend, Fuß flach', 'Großzehballen Richtung Ferse ziehen, das Gewölbe hebt sich', 'Zehen bleiben lang, nicht krallen'], mistakes: ['Zehen krallen'] },
  { id: 'f_toe_press', rest: 'wrist', name: 'Big Toe Press', cat: F, equipment: [], mode: 'time', range: [10, 10], perSide: true, tags: [['ankle', 'kraft']], elbowLoad: 0,
    cues: ['Sitzend, Fuß flach', 'Großzeh fest nach unten drücken, Ferse bleibt am Boden', 'Wie im Fuß-Check, als Übung'], mistakes: ['Ferse hebt ab'] },
  { id: 'f_roll', rest: 'wrist', name: 'Sole Rolling (Ball)', cat: F, equipment: ['ball'], alternatives: ['f_roll_bottle'], mode: 'time', range: [60, 60], perSide: true, tags: [['ankle', 'mobil']], elbowLoad: 0,
    cues: ['Fußsohle über einen Ball rollen', 'Locker, nicht schmerzhaft'], mistakes: ['Zu viel Druck'] },
  { id: 'f_roll_bottle', rest: 'wrist', name: 'Sole Rolling (Bottle)', cat: F, equipment: [], mode: 'time', range: [60, 60], perSide: true, tags: [['ankle', 'mobil']], elbowLoad: 0,
    cues: ['Fußsohle über eine Flasche rollen (gekühlt geht auch)', 'Locker, nicht schmerzhaft'], mistakes: ['Zu viel Druck'] },
  { id: 'f_ankle_circles', rest: 'wrist', name: 'Ankle Circles', cat: F, equipment: [], mode: 'reps', range: [10, 10], perSide: true, tags: [['ankle', 'mobil']], elbowLoad: 0,
    cues: ['Je 10 Kreise pro Richtung', 'Langsam und groß'], mistakes: ['Hastig'] },
  // ——— Stufe 2: Aufrichten ———
  { id: 'f_short_stand', rest: 'wrist', name: 'Short Foot (Standing)', cat: F, equipment: [], mode: 'time', range: [10, 15], tags: arch, elbowLoad: 0,
    cues: ['Im Stand das Gewölbe aktiv anheben', 'Später einbeinig', 'Zehen bleiben lang'], mistakes: ['Zehen krallen'] },
  { id: 'f_heel_ball', rest: 'wrist', name: 'Heel Raises (Ball Between Heels)', cat: F, equipment: ['ball'], alternatives: ['f_heel_towel'], mode: 'reps', range: [15, 20],
    tags: [['ankle', 'kraft'], ['ankle', 'stabil']], elbowLoad: 0,
    cues: ['Ball zwischen den Fersen', 'Fersen drücken leicht zusammen und kippen leicht nach außen', 'Voll hoch, langsam runter'], mistakes: ['Ball fällt raus'] },
  { id: 'f_heel_towel', rest: 'wrist', name: 'Heel Raises (Rolled Towel)', cat: F, equipment: [], mode: 'reps', range: [15, 20], tags: [['ankle', 'kraft'], ['ankle', 'stabil']], elbowLoad: 0,
    cues: ['Zusammengerolltes Handtuch oder Socke zwischen den Fersen', 'Fersen drücken leicht zusammen, kippen leicht nach außen'], mistakes: ['Knie fallen nach innen'] },
  { id: 'f_band_add', rest: 'wrist', name: 'Foot Adduction (Band)', cat: F, equipment: ['band'], alternatives: ['f_hand_add'], mode: 'reps', range: [12, 15], perSide: true,
    tags: [['ankle', 'kraft']], elbowLoad: 0,
    cues: ['Sitzend, Band außen um den Vorfuß', 'Fuß gegen das Band zur Mitte schieben', 'Für den Tibialis posterior'], mistakes: ['Bein dreht mit'] },
  { id: 'f_hand_add', rest: 'wrist', name: 'Foot Adduction (Hand Resistance)', cat: F, equipment: [], mode: 'reps', range: [12, 15], perSide: true, tags: [['ankle', 'kraft']], elbowLoad: 0,
    cues: ['Sitzend, Hand außen am Vorfuß als Widerstand', 'Fuß gegen die Hand zur Mitte schieben'], mistakes: ['Bein dreht mit'] },
  { id: 'f_tib_wall', rest: 'wrist', name: 'Tibialis Raises (Wall)', cat: F, equipment: [], mode: 'reps', range: [20, 20], tags: [['ankle', 'kraft']], elbowLoad: 0,
    cues: ['Rücken an der Wand, Füße etwas vor dem Körper', 'Fußspitzen hochziehen', 'Schützt das Schienbein beim Kicken'], mistakes: ['Hüfte kippt'] },
  { id: 'f_stand_short', rest: 'wrist', name: 'Single-Leg Stance with Short Foot', cat: F, equipment: [], mode: 'time', range: [30, 30], perSide: true, tags: arch, elbowLoad: 0,
    cues: ['Einbeinstand, Augen offen', 'Gewölbe aktiv halten'], mistakes: ['Zehen krallen'] },
  { id: 'f_toe_squat', rest: 'wrist', name: 'Toe Squat', cat: F, equipment: [], mode: 'time', range: [20, 30], tags: [['ankle', 'mobil']], elbowLoad: 0,
    cues: ['Tiefe Hocke auf den Fußballen, Zehen aufgestellt', 'Gewicht vorsichtig nach hinten', 'Dehnt die Zehen'], mistakes: ['Zu viel Gewicht'] },
  // ——— Stufe 3: Tragen ———
  { id: 'f_sl_heel_slow', rest: 'wrist', name: 'Single-Leg Heel Raises (Slow)', cat: F, equipment: [], mode: 'reps', range: [8, 15], perSide: true,
    tags: [['ankle', 'kraft'], ['ankle', 'stabil']], elbowLoad: 0,
    cues: ['3 s hoch, 3 s runter', 'Ferse kippt oben leicht nach außen', 'Steigerung: Gewicht in der Hand, dann vom Absatz'], mistakes: ['Einknicken nach innen'] },
  { id: 'f_slant', rest: 'wrist', name: 'Slant Board Heel Raises', cat: F, equipment: ['slant'], alternatives: ['f_slant_wedge'], mode: 'reps', range: [10, 15],
    tags: [['ankle', 'kraft']], elbowLoad: 0,
    cues: ['Auf der Schräge, Zehen erhöht', 'Fersenheben oder Kniebeugen', 'Kraft ins Gewölbe'], mistakes: ['Zu steil'] },
  { id: 'f_slant_wedge', rest: 'wrist', name: 'Wedge Heel Raises (Plate or Box)', cat: F, equipment: [], mode: 'reps', range: [10, 15], tags: [['ankle', 'kraft']], elbowLoad: 0,
    cues: ['Zehen auf eine Hantelscheibe oder die Box-Kante, Ferse tiefer', 'Fersenheben langsam'], mistakes: ['Kante rutscht'] },
  { id: 'f_stand_closed', rest: 'wrist', name: 'Single-Leg Stance Eyes Closed', cat: F, equipment: [], mode: 'time', range: [30, 45], perSide: true, tags: [['ankle', 'proprio']], elbowLoad: 0,
    cues: ['Barfuß, Hände an der Hüfte', 'Augen zu', 'Wand in Reichweite'], mistakes: ['Hüfte schiebt seitlich'] },
  { id: 'f_stand_unstable', rest: 'wrist', name: 'Single-Leg Stance on Balance Board', cat: F, equipment: ['balance_board'], alternatives: ['f_stand_cushion'], mode: 'time', range: [30, 30], perSide: true,
    tags: [['ankle', 'proprio'], ['ankle', 'stabil']], elbowLoad: 0,
    cues: ['Einbeinig auf dem Board', 'Short Foot beibehalten'], mistakes: ['Zehen krallen'] },
  { id: 'f_stand_cushion', rest: 'wrist', name: 'Single-Leg Stance on Cushion', cat: F, equipment: [], mode: 'time', range: [30, 30], perSide: true, tags: [['ankle', 'proprio'], ['ankle', 'stabil']], elbowLoad: 0,
    cues: ['Einbeinig auf einem Kissen', 'Short Foot beibehalten'], mistakes: ['Zehen krallen'] },
  { id: 'f_sl_rdl', rest: 'wrist', name: 'Barefoot Single-Leg RDL', cat: F, equipment: [], mode: 'reps', range: [8, 8], perSide: true, tags: [['hinge', 'stabil'], ['ankle', 'stabil']], elbowLoad: 0,
    cues: ['Barfuß, Fuß bleibt stabil', 'Knie fällt nicht nach innen', 'Langsam'], mistakes: ['Gewölbe sinkt ein'] },
  { id: 'f_pipes', rest: 'wrist', name: 'Balance Pipes or Roller', cat: F, equipment: ['pipes'], mode: 'time', range: [60, 120], tags: [['ankle', 'mobil'], ['ankle', 'proprio']], elbowLoad: 0, optional: true,
    cues: ['Langsam darüber gehen', 'Wand oder Stange in Reichweite', 'Für Zehenbeweglichkeit'], mistakes: ['Ohne Halt'] },
  // ——— Stufe 4: Federn ———
  { id: 'f_pogo', rest: 'wrist', name: 'Barefoot Pogo Jumps', cat: F, equipment: [], mode: 'reps', range: [20, 20], jump: true, tags: [['jump', 'elastisch'], ['ankle', 'elastisch']], elbowLoad: 0,
    cues: ['Kurzer Bodenkontakt', 'Gewölbe bleibt'], mistakes: ['Fersen setzen auf'] },
  { id: 'f_rope', rest: 'wrist', name: 'Barefoot Jump Rope', cat: F, equipment: ['rope'], alternatives: ['f_rope_ghost'], mode: 'time', range: [60, 60], jump: true, tags: [['jump', 'elastisch'], ['cardio', 'ausdauer']], elbowLoad: 0,
    cues: ['Auf der Matte, barfuß', 'Locker auf den Fußballen'], mistakes: ['Zu hoch'] },
  { id: 'f_rope_ghost', rest: 'wrist', name: 'Barefoot Ghost Rope', cat: F, equipment: [], mode: 'time', range: [60, 60], jump: true, tags: [['jump', 'elastisch'], ['cardio', 'ausdauer']], elbowLoad: 0,
    cues: ['Seilspringen ohne Seil', 'Locker auf den Fußballen'], mistakes: ['Zu hoch'] },
  { id: 'f_hops', rest: 'wrist', name: 'Single-Leg Hops (4 Directions)', cat: F, equipment: [], mode: 'reps', range: [10, 10], perSide: true, jump: true, tags: [['jump', 'proprio'], ['ankle', 'elastisch']], elbowLoad: 0,
    cues: ['Vor, zurück, seitlich', 'Saubere Landung, Knie über dem Fuß'], mistakes: ['Knie fällt nach innen'] },
  { id: 'f_sl_heel_heavy', rest: 'wrist', name: 'Heavy Single-Leg Heel Raises', cat: F, equipment: [], mode: 'reps', range: [8, 10], perSide: true, tags: [['ankle', 'kraft']], elbowLoad: 0,
    cues: ['KB oder Rucksack in der Hand', 'Voll hoch, langsam runter', 'Ferse kippt oben leicht nach außen'], mistakes: ['Einknicken'] },
  { id: 'f_shadow', rest: 'wrist', name: 'Barefoot Shadowboxing (Ball of Foot)', cat: F, equipment: [], mode: 'time', range: [120, 120], tags: [['strike', 'ausdauer'], ['ankle', 'elastisch']], elbowLoad: 0,
    cues: ['Leichte, federnde Footwork', 'Fokus auf die Fußballen'], mistakes: ['Auf den Fersen stehen'] },
];

/**
 * Stufen. Einträge: { ex, rounds, sec | reps, oneLeg?, label? } — oneLeg = einbeinig, die schwächere Seite bekommt einen Satz mehr.
 * Pro Einheit 5–8 min.
 */
export const FEET_STAGES = {
  1: { name: 'Erwachen', minutes: 6, steps: [
    { ex: 'f_toe_spread', rounds: 3, reps: 10, label: 'je 3 s halten' },
    { ex: 'f_toe_yoga', rounds: 3, reps: 10 },
    { ex: 'f_short_seated', rounds: 5, sec: 10 },
    { ex: 'f_toe_press', rounds: 3, sec: 10, oneLeg: true },
    { ex: 'f_roll', rounds: 1, sec: 60, oneLeg: true, noExtra: true },
    { ex: 'f_ankle_circles', rounds: 1, reps: 10, oneLeg: true, noExtra: true, label: 'je Richtung' },
  ] },
  2: { name: 'Aufrichten', minutes: 8, steps: [
    { ex: 'f_short_stand', rounds: 5, sec: 12 },
    { ex: 'f_heel_ball', rounds: 3, reps: 15 },
    { ex: 'f_band_add', rounds: 3, reps: 12, oneLeg: true },
    { ex: 'f_tib_wall', rounds: 2, reps: 20 },
    { ex: 'f_stand_short', rounds: 3, sec: 30, oneLeg: true },
    { ex: 'f_toe_squat', rounds: 3, sec: 20 },
  ] },
  3: { name: 'Tragen', minutes: 8, steps: [
    { ex: 'f_sl_heel_slow', rounds: 3, reps: 10, oneLeg: true, label: '3 s hoch, 3 s runter' },
    { ex: 'f_slant', rounds: 3, reps: 12 },
    { ex: 'f_stand_closed', rounds: 3, sec: 30, oneLeg: true },
    { ex: 'f_stand_unstable', rounds: 3, sec: 30, oneLeg: true },
    { ex: 'f_sl_rdl', rounds: 3, reps: 8, oneLeg: true },
    { ex: 'f_pipes', rounds: 1, sec: 60, optional: true },
  ] },
  4: { name: 'Federn', minutes: 8, steps: [
    { ex: 'f_pogo', rounds: 3, reps: 20 },
    { ex: 'f_rope', rounds: 3, sec: 60 },
    { ex: 'f_hops', rounds: 3, reps: 10, oneLeg: true },
    { ex: 'f_sl_heel_heavy', rounds: 3, reps: 8, oneLeg: true },
    { ex: 'f_shadow', rounds: 2, sec: 120, label: '2 Runden' },
  ] },
  5: { name: 'Erhaltung', minutes: 5, steps: [
    { ex: 'f_stand_short', rounds: 2, sec: 30, oneLeg: true, label: 'Short Foot einbeinig' },
    { ex: 'f_sl_heel_heavy', rounds: 2, reps: 10, oneLeg: true },
    { ex: 'f_stand_unstable', rounds: 2, sec: 30, oneLeg: true },
    { ex: 'f_pogo', rounds: 2, reps: 20 },
  ] },
};

// Ohne Sprünge (Tag vor hartem Sparring): Sprungübungen werden durch schweres einbeiniges Fersenheben ersetzt
export const NO_JUMP_SWAP = { ex: 'f_sl_heel_heavy', reps: 10, oneLeg: true };

export const FEET_EQUIPMENT = ['ball', 'band', 'balance_board', 'slant', 'pipes'];

export const FEET_SIGNS = [
  'Schmerz oder Schwellung innen am Knöchel entlang der Sehne (Tibialis posterior), besonders wenn ein Fuß spürbar flacher wird als der andere',
  'Punktueller Knochenschmerz im Mittelfuß',
  'Anhaltender Fersen- oder Fußsohlenschmerz am Morgen über Wochen',
  'Plötzliche Veränderungen der Fußform',
];
export const BAREFOOT_WARN = 'Beim Umstieg auf Barfuß/Minimalschuh: punktueller Schmerz im Mittelfuß, Schmerz an der Achillessehne oder Fußsohle → einen Schritt zurück.';
