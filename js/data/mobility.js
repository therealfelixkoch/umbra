// Mobility-Check: 8 Regionen, je ein Heimtest mit 5 Stufen.
// weight = Muay-Thai-Relevanz (Priorität = (100 − Score) × weight).
// sketch: Parameter für die SVG-Skizze je Stufe (Winkel in Grad).

export const RETEST_DAYS = 28;

export const REGIONS = [
  {
    id: 'hueftbeuger', name: 'Hüftbeuger', weight: 1.2, mt: 'Teep, Knie, aufrechter Stand',
    test: 'Thomas-Test auf der Box',
    how: ['Mit dem Po an die Kante von Box oder Bett setzen, nach hinten ablegen', 'Ein Knie mit beiden Händen fest zur Brust ziehen, der untere Rücken liegt flach', 'Das andere Bein locker hängen lassen und schauen, wo der Oberschenkel landet', 'Beide Seiten testen, die schlechtere zählt'],
    sketch: 'thomas',
    levels: [
      { label: 'Deutlich darüber', desc: 'Oberschenkel zeigt klar nach oben, Knie fast gestreckt', a: [-22, 15] },
      { label: 'Leicht darüber', desc: 'Oberschenkel etwas über der Waagerechten', a: [-10, 35] },
      { label: 'Waagerecht', desc: 'Oberschenkel waagerecht, Knie leicht gebeugt', a: [0, 55] },
      { label: 'Darunter', desc: 'Oberschenkel sinkt unter die Waagerechte, Knie ca. 80°', a: [10, 75] },
      { label: 'Frei', desc: 'Oberschenkel deutlich darunter, Knie hängt im rechten Winkel', a: [20, 95] },
    ],
  },
  {
    id: 'adduktoren', name: 'Adduktoren / Seitspagat', weight: 1.5, mt: 'hohe Kicks, Teep zur Seite',
    test: 'Breiter Stand',
    how: ['Beine gestreckt, Zehen nach vorn', 'Füße langsam nach außen schieben, Hände an Box oder Boden zur Sicherheit', 'Nur so weit, wie es ohne Schmerz geht', 'Winkel zwischen den Beinen schätzen'],
    sketch: 'split',
    levels: [
      { label: 'unter 90°', desc: 'Füße kaum weiter als doppelte Schulterbreite', a: [80] },
      { label: '90–110°', desc: 'Breiter Stand, Hände kommen nicht zum Boden', a: [100] },
      { label: '110–130°', desc: 'Fingerspitzen erreichen den Boden', a: [120] },
      { label: '130–150°', desc: 'Hände flach am Boden, Hüfte tief', a: [140] },
      { label: 'über 150°', desc: 'Fast im Seitspagat', a: [165] },
    ],
  },
  {
    id: 'hamstrings', name: 'Hamstrings', weight: 1.2, mt: 'Teep, Kopf-Kick, Kniestoß',
    test: 'Aktives Beinheben in Rückenlage',
    how: ['Rückenlage, beide Beine gestreckt', 'Ein Bein gestreckt so hoch heben wie möglich, ohne Hände', 'Das andere Bein bleibt am Boden, Becken ruhig', 'Winkel des gehobenen Beins schätzen, schlechtere Seite zählt'],
    sketch: 'aslr',
    levels: [
      { label: 'unter 50°', desc: 'Bein kommt kaum über die halbe Höhe', a: [42] },
      { label: '50–65°', desc: 'Fuß auf Höhe des anderen Knies (über dem Oberschenkel)', a: [58] },
      { label: '65–80°', desc: 'Deutlich über der Mitte', a: [72] },
      { label: '80–90°', desc: 'Fast senkrecht', a: [85] },
      { label: 'über 90°', desc: 'Senkrecht oder darüber hinaus', a: [100] },
    ],
  },
  {
    id: 'hueftrotation', name: 'Hüftrotation', weight: 1.2, mt: 'Roundhouse, Pivot des Standbeins',
    test: '90/90-Sitz',
    how: ['Auf den Boden setzen: vorderes Bein 90° vor dir, hinteres Bein 90° zur Seite', 'Ohne Hände aufrecht sitzen', 'Wenn es geht: mit langem Rücken über das vordere Schienbein beugen', 'Beide Seiten, die schlechtere zählt'],
    sketch: 'ninety',
    levels: [
      { label: 'Kaum möglich', desc: 'Nur mit Händen hinter dir, Knie heben stark ab', a: [-25] },
      { label: 'Mit Stütze', desc: 'Aufrecht nur mit Hand am Boden', a: [-10] },
      { label: 'Aufrecht', desc: 'Ohne Hände aufrecht, Knie bleiben unten', a: [0] },
      { label: 'Leichte Vorbeuge', desc: 'Oberkörper beugt sich etwas über das Schienbein', a: [20] },
      { label: 'Tief', desc: 'Brust nah am vorderen Schienbein, Rücken lang', a: [40] },
    ],
  },
  {
    id: 'sprunggelenk', name: 'Sprunggelenk', weight: 0.8, mt: 'tiefer Stand, Pivot, Sprungkraft',
    test: 'Knie-zur-Wand',
    how: ['Barfuß im Ausfallschritt vor eine Wand stellen', 'Knie zur Wand schieben, Ferse bleibt am Boden', 'Fuß so weit zurücksetzen, wie es gerade noch geht', 'Abstand große Zehe → Wand messen'],
    sketch: 'kneewall',
    levels: [
      { label: 'unter 4 cm', desc: 'Ferse hebt sehr früh ab', a: [12] },
      { label: '4–7 cm', desc: 'Eingeschränkt', a: [22] },
      { label: '7–10 cm', desc: 'Durchschnitt', a: [30] },
      { label: '10–12 cm', desc: 'Gut', a: [38] },
      { label: 'über 12 cm', desc: 'Sehr gut', a: [46] },
    ],
  },
  {
    id: 'bws', name: 'Brustwirbelsäule', weight: 1.2, mt: 'Schlagkraft, Ellbogen, Ausweichen',
    test: 'Rotation im Vierfüßlerstand',
    how: ['Vierfüßlerstand, Po auf die Fersen setzen (sperrt die Lendenwirbel)', 'Eine Hand an den Hinterkopf', 'Ellbogen nach oben aufdrehen, Blick folgt', 'Winkel des Ellbogens zur Waagerechten schätzen'],
    sketch: 'tspine',
    levels: [
      { label: 'unter 30°', desc: 'Ellbogen kommt kaum hoch', a: [22] },
      { label: '30–45°', desc: 'Eingeschränkt', a: [38] },
      { label: '45–60°', desc: 'Durchschnitt', a: [52] },
      { label: '60–75°', desc: 'Gut', a: [68] },
      { label: 'über 75°', desc: 'Ellbogen zeigt fast senkrecht nach oben', a: [82] },
    ],
  },
  {
    id: 'schulter', name: 'Schulter überkopf', weight: 0.8, mt: 'Deckung, Clinch, Ellbogen von oben',
    test: 'Arme an der Wand',
    how: ['Mit Po, Rücken und Hinterkopf an die Wand stellen', 'Unteren Rücken flach an die Wand', 'Gestreckte Arme vorne nach oben führen', 'Wie weit kommen die Daumen Richtung Wand?'],
    sketch: 'overhead',
    levels: [
      { label: 'Weit davor', desc: 'Arme bleiben deutlich vor dem Kopf', a: [120] },
      { label: 'Vor dem Kopf', desc: 'Arme etwa auf Höhe der Stirn', a: [140] },
      { label: 'Über dem Kopf', desc: 'Arme senkrecht, Wand nicht erreicht', a: [158] },
      { label: 'Fast an der Wand', desc: 'Wenige Zentimeter fehlen', a: [170] },
      { label: 'An der Wand', desc: 'Daumen berühren die Wand, Rücken bleibt flach', a: [180] },
    ],
  },
  {
    id: 'nacken', name: 'Nacken', weight: 0.8, mt: 'Clinch, Kopfbewegung',
    test: 'Rotation im Sitzen',
    how: ['Aufrecht sitzen, Schultern bleiben ruhig', 'Kopf so weit wie möglich zur Seite drehen', 'Kinn Richtung Schulter, nicht neigen', 'Schlechtere Seite zählt'],
    sketch: 'neck',
    levels: [
      { label: 'unter 45°', desc: 'Sehr eingeschränkt', a: [38] },
      { label: '45–60°', desc: 'Blick kommt bis zur Raumecke', a: [55] },
      { label: '60–75°', desc: 'Durchschnitt', a: [68] },
      { label: '75–85°', desc: 'Kinn fast über der Schulter', a: [80] },
      { label: 'über 85°', desc: 'Kinn über der Schulter', a: [90] },
    ],
  },
];

export const REGION = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
