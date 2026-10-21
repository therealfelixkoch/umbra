// Handgelenk-Modul (TFCC) und HANDS: Übungen, Stufen, Blöcke. Grundlage: docs/tfcc-protokoll.md.
// Keine Diagnosen: Die App spricht nur von Ampel, Stufe und Empfehlung.
// Übungsfelder wie in exercises.js, dazu:
//   levels  Steigerungsstufen der Übung (Last, Hebel, Leiter), gesteigert nach 3 grünen Einheiten in Folge
//   dirs    Isometrie: Richtungen als Sätze (je Satz ein Hold, Wiederholungen über holdReps)

const W = 'handgelenk';
const iso = { tags: [['wrist', 'stabil'], ['grip', 'stabil']], elbowLoad: 0 };

export const WRIST_EXERCISES = [
  // ——— Isometrie, Ansteuerung, Gelenkgefühl ———
  { id: 'w_iso', rest: 'wrist', name: 'Wrist Isometrics', cat: W, equipment: [], mode: 'time', range: [10, 20], ...iso, dirs: true,
    cues: ['Unterarm auf dem Tisch, Handgelenk neutral', 'Mit der anderen Hand Widerstand geben, keine sichtbare Bewegung', 'Pro Satz eine Richtung (steht am Satz)', 'Kleinfingerseite zuletzt und am vorsichtigsten'],
    mistakes: ['Gegen Schmerz drücken', 'Luft anhalten'] },
  { id: 'w_pq', rest: 'wrist', name: 'Pronator Quadratus Turns', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['wrist', 'stabil'], ['elbow_flex', 'stabil']], elbowLoad: 0,
    cues: ['Ellbogen 90°, am Körper, Unterarm neutral', 'Gegen leichten Widerstand (Band oder andere Hand) nach innen drehen', 'Nur ein kleiner Bereich, langsam'],
    mistakes: ['Ellbogen wandert vom Körper weg'] },
  { id: 'w_ecu', rest: 'wrist', name: 'ECU Raises', cat: W, equipment: [], mode: 'reps', range: [10, 10], ...iso,
    cues: ['Unterarm nach unten gedreht auf dem Oberschenkel', 'Handgelenk leicht gestreckt', 'Gegen leichten Widerstand Richtung Kleinfinger und nach oben heben', 'Klein und langsam'],
    mistakes: ['Großer Bewegungsumfang'] },
  { id: 'w_dart', rest: 'wrist', name: 'Dart Thrower Motion', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['wrist', 'mobil'], ['wrist', 'proprio']], elbowLoad: 0,
    cues: ['Von gestreckt und Daumenseite zu gebeugt und Kleinfingerseite', 'Wie ein Dartwurf, ohne Last', 'Fließend und langsam'],
    mistakes: ['Aus dem Unterarm drehen'] },
  { id: 'w_grip', rest: 'wrist', name: 'Grip Squeeze (Ball or Towel)', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['grip', 'kraft']], elbowLoad: 0,
    cues: ['Tennisball, Knetmasse oder zusammengerolltes Handtuch', 'Je Wiederholung 5 s fest drücken, dann lösen', 'Handgelenk bleibt gerade'],
    mistakes: ['Handgelenk knickt ab'] },
  { id: 'w_proprio', rest: 'wrist', name: 'Wrist Position Sense', cat: W, equipment: [], mode: 'time', range: [60, 120], tags: [['wrist', 'proprio']], elbowLoad: 0,
    cues: ['Augen zu', 'Handgelenk in eine Position bringen, dann zurück zur Mitte', 'Die Position mit geschlossenen Augen wiederfinden', 'Augen auf, prüfen, nächste Position'],
    mistakes: ['Zu große Winkel'] },
  { id: 'w_tendon', rest: 'wrist', name: 'Tendon Glides', cat: W, equipment: [], mode: 'reps', range: [5, 5], tags: [['grip', 'mobil']], elbowLoad: 0,
    cues: ['5 Positionen: gestreckt, Haken, Faust, Tischplatte, gerade Faust', 'Jede Position kurz halten', 'Langsam, ohne Druck'],
    mistakes: ['Hastig durchklappen'] },
  { id: 'w_finger_ext', rest: 'wrist', name: 'Finger Extensions (Rubber Band)', cat: W, equipment: [], mode: 'reps', range: [15, 15], tags: [['grip', 'ausdauer']], elbowLoad: 0,
    cues: ['Haargummi oder Gummiband um die Fingerspitzen', 'Finger gegen den Widerstand spreizen', 'Langsam zurück'],
    mistakes: ['Zu starkes Band'] },
  // ——— Kraft (Stufe 3) ———
  { id: 'w_curl', rest: 'wrist', name: 'Wrist Curls (Bottle)', cat: W, equipment: [], mode: 'reps', range: [12, 15], tags: [['grip', 'kraft'], ['wrist', 'kraft']], elbowLoad: 1,
    levels: ['Flasche 0,5 l', 'Flasche 1 l', 'Flasche 1,5 l', 'Rucksack ca. 2,5 kg', 'Rucksack ca. 3,5 kg'],
    cues: ['Unterarm auf dem Oberschenkel, Handfläche oben', 'Nur das Handgelenk bewegt sich', 'Kontrolliert hoch und ab'],
    mistakes: ['Unterarm hebt mit ab'] },
  { id: 'w_rev_curl', rest: 'wrist', name: 'Reverse Wrist Curls (Bottle)', cat: W, equipment: [], mode: 'reps', range: [12, 15], tags: [['wrist', 'kraft']], elbowLoad: 1,
    levels: ['Flasche 0,5 l', 'Flasche 0,75 l', 'Flasche 1 l', 'Flasche 1,5 l'],
    cues: ['Handfläche nach unten, ca. halbes Gewicht der Curls', 'Handgelenk strecken, langsam ab', 'Nicht Richtung Kleinfinger kippen'],
    mistakes: ['Zu schwer'] },
  { id: 'w_ecc_ext', rest: 'wrist', name: 'Eccentric Wrist Extension (Bottle)', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['wrist', 'kraft'], ['grip', 'kraft']], elbowLoad: 1,
    levels: ['Flasche 0,5 l', 'Flasche 1 l', 'Flasche 1,5 l', 'Rucksack ca. 2,5 kg'],
    cues: ['Handfläche nach unten, die andere Hand hilft hoch', '3–4 s langsam absenken', 'Unterarm bleibt liegen'],
    mistakes: ['Schnell fallen lassen'] },
  { id: 'w_hammer_rot', rest: 'wrist', name: 'Hammer Rotations', cat: W, equipment: ['hammer'], alternatives: ['w_bottle_rot'], mode: 'reps', range: [10, 10],
    tags: [['wrist', 'kraft'], ['wrist', 'stabil']], elbowLoad: 1, levels: ['Griff nah am Kopf', 'Griff in der Mitte', 'Griff am Stielende'],
    cues: ['Unterarm auf dem Tisch, Hammer senkrecht', 'Langsam nach innen und außen drehen', 'Steigern über die Hebellänge, nicht über Gewicht'],
    mistakes: ['Schwung', 'Endposition erzwingen'] },
  { id: 'w_bottle_rot', rest: 'wrist', name: 'Bottle Rotations', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['wrist', 'kraft'], ['wrist', 'stabil']], elbowLoad: 1,
    levels: ['Flasche in der Mitte gefasst', 'Flasche am Boden gefasst', 'Flasche am Hals gefasst (langer Hebel)'],
    cues: ['Wasserflasche wie einen Hammer halten', 'Langsam nach innen und außen drehen', 'Hebel über den Griffpunkt verlängern'],
    mistakes: ['Schwung'] },
  { id: 'w_radial', rest: 'wrist', name: 'Radial Hammer Lever', cat: W, equipment: ['hammer'], alternatives: ['w_bottle_radial'], mode: 'reps', range: [10, 10],
    tags: [['wrist', 'kraft']], elbowLoad: 0, levels: ['Griff nah am Kopf', 'Griff in der Mitte', 'Griff am Stielende'],
    cues: ['Hammer neutral, Kopf nach vorn', 'Richtung Daumen anheben, kleiner Bereich', 'Langsam ab'], mistakes: ['Unterarm hebt ab'] },
  { id: 'w_bottle_radial', rest: 'wrist', name: 'Radial Bottle Lever', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['wrist', 'kraft']], elbowLoad: 0,
    levels: ['Flasche in der Mitte gefasst', 'Flasche am Boden gefasst', 'Flasche am Hals gefasst'],
    cues: ['Flasche neutral, Inhalt nach vorn', 'Richtung Daumen anheben, kleiner Bereich'], mistakes: ['Zu großer Bereich'] },
  { id: 'w_ulnar', rest: 'wrist', name: 'Ulnar Hammer Lever', cat: W, equipment: ['hammer'], alternatives: ['w_bottle_ulnar'], mode: 'reps', range: [10, 10],
    tags: [['wrist', 'kraft'], ['wrist', 'stabil']], elbowLoad: 0, levels: ['Griff nah am Kopf', 'Griff in der Mitte', 'Griff am Stielende'], needs: 'w_radial',
    cues: ['Hammer neutral, Kopf nach hinten', 'Richtung Kleinfinger anheben, sehr kleiner Bereich', 'Erst, wenn der Radial-Hebel grün läuft'], mistakes: ['Endposition unter Last'] },
  { id: 'w_bottle_ulnar', rest: 'wrist', name: 'Ulnar Bottle Lever', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['wrist', 'kraft'], ['wrist', 'stabil']], elbowLoad: 0,
    levels: ['Flasche in der Mitte gefasst', 'Flasche am Boden gefasst', 'Flasche am Hals gefasst'], needs: 'w_radial',
    cues: ['Flasche neutral, Inhalt nach hinten', 'Richtung Kleinfinger anheben, sehr kleiner Bereich'], mistakes: ['Endposition unter Last'] },
  { id: 'w_pushup_ladder', rest: 'wrist', name: 'Push-up Ladder (Fists)', cat: W, equipment: [], mode: 'reps', range: [10, 15], tags: [['h_push', 'kraft'], ['wrist', 'stabil']], elbowLoad: 1,
    levels: ['Wand', 'Tisch', 'Knie', 'Boden'],
    cues: ['Auf Fäusten oder Griffen, Handgelenk gerade', 'Körper eine Linie', 'Flache Hand erst, wenn Test 2 grün ist'], mistakes: ['Handgelenk knickt ab'] },
  { id: 'w_reactive', rest: 'wrist', name: 'Reactive Wrist Control', cat: W, equipment: [], mode: 'time', range: [120, 180], tags: [['wrist', 'proprio']], elbowLoad: 0,
    cues: ['Ball mit flacher Hand an der Wand kreisen', 'Oder Vierfüßler mit Händen auf einem Kissen, Gewicht verlagern', 'Ruhig und kontrolliert'], mistakes: ['Hektik'] },
  // ——— Belastbar machen (Stufe 4) ———
  { id: 'w_bottomup', rest: 'wrist', name: 'Kettlebell Bottom-up Hold', cat: W, equipment: ['kb'], alternatives: ['w_bottle_bottomup'], mode: 'time', range: [20, 30], load: 'kb', startKg: 8,
    tags: [['wrist', 'stabil'], ['grip', 'kraft'], ['shoulder', 'stabil']], elbowLoad: 1, levels: ['Halten', 'Halten, länger', 'Drücken (3 × 5)'],
    cues: ['KB kopfüber am Griff, Unterarm senkrecht', 'Fest greifen, Handgelenk gerade', 'Ruhig halten, nicht kippen lassen'], mistakes: ['Glocke kippt, Handgelenk knickt'] },
  { id: 'w_bottle_bottomup', rest: 'wrist', name: 'Bottle Bottom-up Hold', cat: W, equipment: [], mode: 'time', range: [20, 30], tags: [['wrist', 'stabil'], ['grip', 'kraft']], elbowLoad: 0,
    levels: ['Halten', 'Halten, länger', 'Drücken (3 × 5)'],
    cues: ['Volle Flasche am Hals, Boden nach oben', 'Unterarm senkrecht, ruhig halten'], mistakes: ['Kippen'] },
  { id: 'w_knuckle_taps', rest: 'wrist', name: 'Knuckle Shoulder Taps', cat: W, equipment: [], mode: 'reps', range: [20, 20], tags: [['wrist', 'stabil'], ['anti_ext', 'stabil']], elbowLoad: 1,
    levels: ['Matte', 'Kissen', 'Dickes Kissen'],
    cues: ['Liegestütz-Position auf den Knöcheln', 'Abwechselnd die gegenüberliegende Schulter antippen', 'Hüfte ruhig, weicher Untergrund ist schwerer'], mistakes: ['Hüfte schaukelt'] },
  { id: 'w_ball_catch', rest: 'wrist', name: 'Fast Ball Catches', cat: W, equipment: [], mode: 'time', range: [30, 30], tags: [['wrist', 'proprio'], ['grip', 'explosiv']], elbowLoad: 0,
    cues: ['Ball oder Sockenknäuel schnell zwischen den Händen werfen und fangen', 'Handgelenke locker, schnell reagieren'], mistakes: ['Verkrampfen'] },
  { id: 'w_rot_iso', rest: 'wrist', name: 'Rotation Isometrics', cat: W, equipment: [], mode: 'time', range: [5, 10], tags: [['wrist', 'stabil'], ['grip', 'kraft']], elbowLoad: 1,
    levels: ['ca. 50 %', 'ca. 70 %', 'ca. 90 %'],
    cues: ['Unterarm gegen Widerstand ein- und ausdrehen (Band, andere Hand, Handtuch)', 'Mittlere Positionen zuerst, Endpositionen zuletzt', 'Kraft langsam aufbauen'], mistakes: ['Ruckartig'] },
  // ——— HANDS ———
  { id: 'h_wrist_circles', rest: 'wrist', name: 'Wrist Circles (Loose Fist)', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['wrist', 'mobil']], elbowLoad: 0,
    cues: ['Lockere Faust', 'Je 10 Kreise pro Richtung', 'Langsam, im schmerzfreien Bereich'], mistakes: ['Schnell kreisen'] },
  { id: 'h_flexor', rest: 'wrist', name: 'Wrist Flexor Stretch', cat: W, equipment: [], mode: 'time', range: [20, 30], tags: [['wrist', 'mobil'], ['grip', 'mobil']], elbowLoad: 0,
    cues: ['Arm gestreckt, Handfläche nach vorn', 'Finger mit der anderen Hand sanft zurückziehen', 'Nicht zusätzlich Richtung Kleinfinger kippen'], mistakes: ['Zu stark ziehen'] },
  { id: 'h_extensor', rest: 'wrist', name: 'Wrist Extensor Stretch', cat: W, equipment: [], mode: 'time', range: [20, 30], tags: [['wrist', 'mobil']], elbowLoad: 0,
    cues: ['Faust machen, Arm gestreckt', 'Handgelenk sanft beugen', 'Nicht zusätzlich Richtung Kleinfinger kippen'], mistakes: ['Ruckartig'] },
  { id: 'h_quadruped', rest: 'wrist', name: 'Quadruped Weight Shifts', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['wrist', 'mobil'], ['wrist', 'stabil']], elbowLoad: 0,
    cues: ['Vierfüßlerstand', 'Gewicht langsam vor und zurück verlagern', 'Erst auf den Knöcheln, flache Hand erst, wenn Test 2 grün ist'], mistakes: ['Zu weit nach vorn'] },
  { id: 'h_thumb', rest: 'wrist', name: 'Thumb Circles & Opposition', cat: W, equipment: [], mode: 'reps', range: [10, 10], tags: [['grip', 'mobil']], elbowLoad: 0,
    cues: ['Daumen 10× kreisen', 'Dann nacheinander jede Fingerspitze mit dem Daumen berühren', 'Für Griff und eine saubere Faust'], mistakes: ['Hastig'] },
];

export const WRIST_DIRS = ['Beugen', 'Strecken', 'Innen drehen', 'Außen drehen', 'Daumenseite', 'Kleinfingerseite'];
export const WRIST_DIRS_S1 = WRIST_DIRS.slice(0, 4); // Stufe 1: Ulnardeviation vorerst weglassen

/**
 * Blöcke je Stufe. Einträge: { ex, sets, target, reps? (Holds pro Richtung), dirs? }.
 * Kraftblöcke der Stufen 3 und 4 wechseln zwischen Variante A und B (je ca. 10–12 min).
 */
export const WRIST_BLOCKS = {
  activation: {
    1: [{ ex: 'w_iso', dirs: 'S1', target: 10, reps: 1 }],
    default: [{ ex: 'w_iso', dirs: 'all', target: 10, reps: 1 }, { ex: 'w_pq', sets: 1 }, { ex: 'w_ecu', sets: 1 }],
  },
  minimal: [{ ex: 'w_iso', dirs: 'all', target: 15, reps: 2 }, { ex: 'w_proprio', sets: 1, target: 60 }],
  maintenance: [{ ex: 'w_iso', dirs: 'all', target: 15, reps: 2 }, { ex: 'w_hammer_rot', sets: 2 }, { ex: 'w_bottomup', sets: 2 }],
  strength: {
    1: { A: [{ ex: 'w_tendon', sets: 2 }, { ex: 'w_iso', dirs: 'S1', target: 10, reps: 3 }, { ex: 'w_finger_ext', sets: 2 }] },
    2: { A: [{ ex: 'w_iso', dirs: 'all', target: 15, reps: 4 }, { ex: 'w_pq', sets: 3 }, { ex: 'w_ecu', sets: 3 }, { ex: 'w_dart', sets: 3 }, { ex: 'w_grip', sets: 3 }, { ex: 'w_proprio', sets: 1, target: 120 }] },
    3: {
      A: [{ ex: 'w_curl', sets: 3 }, { ex: 'w_rev_curl', sets: 3 }, { ex: 'w_ecc_ext', sets: 3 }, { ex: 'w_reactive', sets: 1, target: 120 }],
      B: [{ ex: 'w_hammer_rot', sets: 3 }, { ex: 'w_radial', sets: 3 }, { ex: 'w_ulnar', sets: 3 }, { ex: 'hammer_curl_kb', sets: 3 }, { ex: 'suitcase_carry', sets: 3, target: 30 }, { ex: 'w_pushup_ladder', sets: 3 }],
    },
    4: {
      A: [{ ex: 'w_bottomup', sets: 3 }, { ex: 'w_knuckle_taps', sets: 3 }, { ex: 'w_rot_iso', sets: 5 }, { ex: 'w_ball_catch', sets: 3 }],
      B: [{ ex: 'pushup', sets: 3, flat: true }, { ex: 'w_hammer_rot', sets: 3 }, { ex: 'w_ecc_ext', sets: 3 }, { ex: 'suitcase_carry', sets: 2, target: 40 }],
    },
  },
};

/** HANDS: 5 min, in dieser Reihenfolge. sec = getimt, reps = Wiederholungszähler. */
export const HANDS_SEQUENCE = [
  { ex: 'w_tendon', rounds: 2, reps: 5, label: 'Sehnengleiten: 5 Positionen' },
  { ex: 'w_finger_ext', rounds: 2, reps: 15 },
  { ex: 'h_wrist_circles', rounds: 1, reps: 10, label: 'je Richtung' },
  { ex: 'w_dart', rounds: 2, reps: 10 },
  { ex: 'w_bottle_rot', rounds: 2, reps: 10, label: 'leichter Hebel, Endbereich sanft' },
  { ex: 'h_flexor', rounds: 2, sec: 25 },
  { ex: 'h_extensor', rounds: 2, sec: 25 },
  { ex: 'h_quadruped', rounds: 2, reps: 10 },
  { ex: 'h_thumb', rounds: 1, reps: 10 },
];

// Übungen, die bei aktivem Modul angepasst werden (Abschnitt 5 des Protokolls)
export const FLAT_HAND = ['pushup', 'pushup_max', 'pushup_deficit', 'pushup_feet_elevated', 'pike_pushup', 'pike_pushup_box', 'pike_pushup_high',
  'plyo_pushup', 'archer_pushup', 'pseudo_planche_pushup', 'hspu_negative', 'hspu_wall', 'chair_dip', 'bear_crawl', 'lizard_crawl'];
export const DIP_BARS = ['dip', 'dip_negative'];
export const NEUTRAL_GRIP = { pullup_tactical: 'pullup_neutral', pullup: 'pullup_neutral' };
export const ROW_GRIP = ['bw_row', 'bw_row_bent', 'bw_row_elevated', 'bw_row_weighted', 'bw_row_table', 'towel_row', 'archer_row', 'barbell_row'];
// Isolierte Pronations-/Armwrestling-Übungen: bis Stufe 4 durch das Modul ersetzt
export const ARMWRESTLING = ['forearm_rotation'];

export const WRIST_SIGNS = [
  'Gefühl, dass das Handgelenk instabil ist oder „wegrutscht“, oder schmerzhaftes Klacken bei Drehung',
  'Nachtschmerz oder Ruheschmerz',
  'Schwellung, die wiederkommt',
  'Taubheit oder Kribbeln im Klein- oder Ringfinger',
  'Kein Fortschritt nach 6–8 Wochen mit dem Protokoll',
  'Wenn die Stabilität des Gelenks zwischen Elle und Speiche (DRUJ) nie ärztlich geprüft wurde',
];
