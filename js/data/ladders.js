// Progressionsleitern: Körpergewichts-Übungen (und solche mit fixem Gewicht) von leicht nach schwer.
// Aufstieg: 2 Einheiten in Folge in allen Sätzen das obere Ende der Spanne mit RIR ≥ 2 → Vorschlag nächste Stufe.
// Abstieg: 2× in Folge das untere Ende verfehlt → Vorschlag eine Stufe leichter. Zurückschalten geht jederzeit.
// Aus den Leitern werden `easier`/`harder` der Übungen abgeleitet (Stagnation, Kalibrierung, Arc-Wechsel nutzen das mit).

export const LADDERS = [
  { id: 'row', name: 'Rudern am Barren', steps: ['bw_row_bent', 'bw_row', 'bw_row_elevated', 'bw_row_weighted', 'archer_row', 'one_arm_row_assisted'] },
  { id: 'pushup', name: 'Push-ups', steps: ['pushup', 'pushup_feet_elevated', 'pushup_deficit', 'plyo_pushup', 'archer_pushup', 'pseudo_planche_pushup'] },
  { id: 'pike', name: 'Pike Push-ups', steps: ['pike_pushup', 'pike_pushup_box', 'pike_pushup_high', 'hspu_negative', 'hspu_wall'] },
  { id: 'pullup', name: 'Klimmzüge', steps: ['pullup_negative', 'pullup_band', 'pullup_tactical', 'archer_pullup'],
    note: 'Auf Tactical Pull-ups kommt erst Zusatzgewicht in Stufen (mit Dip-Gürtel), dann Archer.' },
  { id: 'dip', name: 'Dips', steps: ['chair_dip', 'dip_negative', 'dip'], note: 'Danach Zusatzgewicht in Stufen (Dip-Gürtel).' },
  { id: 'split', name: 'Split Squat', steps: ['split_squat', 'bw_bulgarian', 'bulgarian_split_squat', 'bulgarian_deficit'] },
  { id: 'nordic', name: 'Nordic Curl', steps: ['nordic_band', 'nordic_negative', 'nordic_curl'] },
  { id: 'legraise', name: 'Beinheben hängend', steps: ['hanging_knee_raise', 'hanging_leg_raise', 'toes_to_bar'] },
  { id: 'copenhagen', name: 'Copenhagen Plank', steps: ['copenhagen_short', 'copenhagen_plank', 'copenhagen_dynamic'] },
  { id: 'rope', name: 'Seilspringen', steps: ['jump_rope', 'jump_rope_alt', 'jump_rope_double'], note: 'Zeit-Runden: Stufe wechselst du von Hand.' },
  { id: 'hollow', name: 'Hollow Body', steps: ['hollow_tuck', 'hollow_body', 'hollow_rock'] },
  { id: 'slrdl', name: 'Einbeiniges Kreuzheben', steps: ['sl_rdl_bw', 'kickstand_deadlift', 'sl_rdl'] },
  { id: 'cossack', name: 'Cossack Squat', steps: ['cossack_squat_bw', 'cossack_squat'] },
  { id: 'wrist', name: 'Handgelenk exzentrisch', steps: ['wrist_ext_eccentric_bw', 'wrist_ext_eccentric'] },
];

const BY_ID = {};
for (const l of LADDERS) l.steps.forEach((id, i) => { BY_ID[id] = { ladder: l, index: i }; });

/** Leiter und Stufe einer Übung (oder null). */
export const ladderOf = (id) => BY_ID[id] || null;

/** Nächste Stufe in Richtung dir (+1 schwerer, −1 leichter) oder null. */
export function stepFrom(id, dir) {
  const at = BY_ID[id];
  if (!at) return null;
  return at.ladder.steps[at.index + dir] || null;
}

/** Leitern überschreiben easier/harder in der Datenbank. */
export function applyLadders(exercises) {
  for (const l of LADDERS) {
    l.steps.forEach((id, i) => {
      const d = exercises[id];
      if (!d) return;
      d.easier = l.steps[i - 1] || d.easier;
      d.harder = l.steps[i + 1] || undefined;
      if (i === l.steps.length - 1 && !l.steps[i + 1]) delete d.harder;
    });
  }
}
