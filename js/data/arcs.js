// Saisons (Makro-Arcs): 4 pro Jahr, je 13 Trainingswochen = 2 Kapitel à 6 Wochen (5 Aufbau + 1 Deload) + 1 Prüfwoche.
// Das ganze Jahr läuft SuperMover mit denselben Missionen, die Saison dreht nur an Reglern (rules) pro Kapitel.
// Stand 27.10.2026, Konzept: docs/umbra-saisons-konzept.md. Intern heißt eine Saison weiter „arc“ (n = laufende Nummer).
// rules: extraMainSet (+1 Satz Hauptübungen) · topSet (Top-Satz + Backdown) · contrast (Kontrastpaare) ·
//        fourByFour (1× pro Woche 4x4 statt Zirkel) · lessAccessory (Nebenübungen −1 Satz) · minusSet (alle −1 Satz) ·
//        loadedMobility (belastete Mobility-Plätze). plyo: Plyo-Stufe je Kapitelwoche (Index 0 = Woche 1).

export const ARC_WEEKS = 13; // Wochen pro Saison
export const CHAPTER_WEEKS = 6;
export const EXAM_WEEK = 13;
export const MIN_MISSIONS_PER_WEEK = 2;

export const ARCS = [
  { id: 'WINTER', name: 'WINTER ARC', guardian: 'coldiron', months: [11, 12, 1], weeks: 13,
    focus: 'Kraft und etwas Muskel',
    desc: 'Mehr Kraftvolumen, dann schwerer heben. Alles andere läuft mit.',
    why: 'Im Winter ist Zeit, Kraft aufzubauen: etwas mehr Volumen und etwas mehr Muskel, ohne klassischen Bulk. Kraft ist die Basis für Power und Durchhalten im Frühjahr. Sprünge, Zirkel, Mobility und Muay Thai laufen weiter, nur der Schwerpunkt liegt auf den Hauptübungen.',
    chapters: [
      { name: 'Volumen', rules: { extraMainSet: true }, plyo: [1, 1, 2, 2, 2, 1],
        changes: ['Hauptübungen +1 Satz (z. B. Klimmzüge 5 statt 4)', 'Wiederholungsbereiche wie im Plan (6–10)', 'Plyo-Stufe 1–2: sauber landen, Pogos'] },
      { name: 'Kraft', rules: { topSet: true }, plyo: [2, 3, 3, 3, 3, 2],
        changes: ['Hauptübungen: 1 Top-Satz 3–5 Wdh. (1 Wdh. im Tank), dann Backdown ca. −18 % für 6–10 Wdh.', 'Der Fortschritt läuft über den Top-Satz', 'Plyo-Stufe 3: reaktive Sprünge'] },
    ] },
  { id: 'SPRING', name: 'FRÜHJAHR', guardian: 'stormlung', months: [2, 3, 4], weeks: 13,
    focus: 'Power und Kondition: Fight-Shape',
    desc: 'Kraft wird schnell, der Motor hält mehrere harte Runden.',
    why: 'Die Kraft aus dem Winter wird in Schnelligkeit umgesetzt, und die Kondition für mehrere harte Runden wächst. Ein Top-Satz pro Hauptübung hält die Kraft. Am Ende steht die Fight-Shape: leaner, schneller, belastbarer.',
    chapters: [
      { name: 'Power', rules: { contrast: true, topSet: true }, plyo: [3, 4, 4, 4, 4, 2],
        changes: ['Kontrastpaare: nach jeder schweren Hauptübung ein explosiver Partner (Kreuzheben → Vertical Jump, Dips → Plyo-Push-ups, Klimmzüge → explosive Klimmzüge)', 'Top-Satz + Backdown als Kraft-Erhalt', 'Plyo-Stufe 4: Broad und Box Jumps'] },
      { name: 'Motor', rules: { contrast: true, topSet: true, fourByFour: true }, plyo: [3, 4, 4, 4, 4, 2],
        changes: ['1× pro Woche Norwegian 4x4 statt Zirkel', 'Kontrastpaare und Top-Satz bleiben', 'Plyo-Stufe 4 (ab dem 2. Jahr in Woche 4–5 Stufe 5)'] },
    ] },
  { id: 'SUMMER', name: 'SOMMER', guardian: 'scorch', months: [5, 6, 7], weeks: 13,
    focus: 'Athletik und Ausdauer, Kraft auf Erhalt',
    desc: 'Schnell, ausdauernd, beweglich. Weniger Kraftvolumen.',
    why: 'Im Sommer bist du am leichtesten und am aktivsten. Die Kraft wird mit etwas weniger Volumen gehalten, dafür rücken Athletik, Sprünge und Ausdauer nach vorn. Das hält leaner, ohne Kraft zu verlieren.',
    chapters: [
      { name: 'Athletik', rules: { lessAccessory: true }, plyo: [3, 3, 4, 4, 4, 2],
        changes: ['Nebenübungen −1 Satz, Hauptübungen wie im Plan', 'Plyo-Stufe 3–4: reaktiv und intensiv', 'Zirkel wie gehabt'] },
      { name: 'Motor', rules: { lessAccessory: true, fourByFour: true, zone2: true }, plyo: [3, 3, 3, 3, 3, 2],
        changes: ['1× pro Woche Norwegian 4x4 statt Zirkel', '1× pro Woche ZONE 2: 30 min locker (zusätzlich)', 'Nebenübungen −1 Satz', 'Plyo-Stufe 3'] },
    ] },
  { id: 'AUTUMN', name: 'HERBST', guardian: 'wither', months: [8, 9, 10], weeks: 13,
    focus: 'Mobility, Gelenke, Reset',
    desc: 'Entlasten, beweglicher werden, Sehnen für den Winter vorbereiten.',
    why: 'Nach drei Saisons Aufbau holen Gelenke, Sehnen und Nervensystem auf. Weniger Volumen, mehr Beweglichkeit unter Last, dann ein Fundament-Kapitel mit höheren Wiederholungen. So startest du gesund und vorbereitet in den nächsten Winter.',
    chapters: [
      { name: 'Reset', rules: { minusSet: true, loadedMobility: true }, plyo: [1, 1, 2, 2, 2, 1],
        changes: ['Alle Übungen −1 Satz', 'Belastete Mobility kommt dazu: Copenhagen Plank, Long Lunge Hold, KB Windmill, Seated Shoulder Extension', 'Plyo-Stufe 1–2'] },
      { name: 'Basis', rules: { loadedMobility: true }, plyo: [1, 2, 2, 2, 2, 1],
        changes: ['Normale Satzzahl, Wiederholungen eher oben', 'Belastete Mobility bleibt', 'Mobility-Check in der Prüfwoche'] },
    ] },
];

/** Saison n (laufende Nummer, 0 = Winter Arc 2026/27). */
export const arcOf = (n) => ARCS[((n % 4) + 4) % 4];
export const arcWeeks = () => ARC_WEEKS;
/** Jahr der Saison (1 = erstes Jahr): COLDIRON, COLDIRON II … */
export const seasonYear = (n) => Math.floor(n / 4) + 1;
/** Kapitel einer Saisonwoche: 0, 1 oder 'exam'. */
export const chapterOf = (week) => (week <= CHAPTER_WEEKS ? 0 : week <= 2 * CHAPTER_WEEKS ? 1 : 'exam');
/** Welche Zeile aus WEEK_PLAN gilt? Kapitelwoche 1–6 oder 'exam'. */
export const planWeek = (arc) => (chapterOf(arc.week) === 'exam' ? 'exam' : ((arc.week - 1) % CHAPTER_WEEKS) + 1);
/** Saison passend zum Monat (für neue Nutzer und den Start einer Saison). */
export const seasonIndexForMonth = (m) => ARCS.findIndex((a) => a.months.includes(m));

// Was in jeder Saison gleich bleibt und wie Übungen wechseln (für die Erklärung im Profil)
export const CYCLE_INFO = {
  name: 'Das Jahr',
  summary: 'Vier Saisons pro Jahr, je 13 Trainingswochen: zwei Kapitel à 6 Wochen und eine Prüfwoche. Das ganze Jahr wird nach SuperMover trainiert, mit denselben Missionen. Jede Saison stellt einen Schwerpunkt nach vorn, der Rest läuft auf Erhaltung. Im Winter etwas mehr Kraft und Muskel, im Frühjahr Fight-Shape, im Sommer Athletik, im Herbst Reset.',
  stays: ['Rotation A → B → C → D → FORGE und die Missionen selbst', 'Double Progression: erst Wiederholungen, dann Gewicht', 'Aufwärmen, Mobility-Block, FLOW, Muay Thai', 'Wochenrhythmus im Kapitel: Einstieg, Aufbau, Zuspitzung, Deload'],
  exercises: 'Die Übungen wechseln nicht komplett. Die Missionen bleiben gleich gebaut, damit Fortschritt messbar ist. Beim Saisonwechsel tauschen nur Nebenplätze mit Variante (z. B. Rudern an den Barren ↔ am Tisch). Hauptübungen wechseln, wenn die Progression eine schwerere Stufe vorgemerkt hat. Der Sprungplatz folgt der Plyo-Stufe. Was sich vor allem ändert, ist die Art zu trainieren: Sätze, Satzstruktur, Sprünge, Kondition.',
};

// RIR-Ziel je Kapitelwoche (1–6) und Prüfwoche
export const WEEK_PLAN = {
  1: { rir: 3, label: 'Einstieg, Gewichte finden' },
  2: { rir: 2, label: 'Aufbau' },
  3: { rir: 2, label: 'Aufbau' },
  4: { rir: 1, label: 'Zuspitzung', failLast: true },
  5: { rir: 1, label: 'Zuspitzung', failLast: true },
  6: { rir: 3, label: 'Deload', deload: true },
  exam: { rir: 3, label: 'Prüfwoche', exam: true }, // ausgeruht, die Säulen entscheiden
};

// Plyo-Stufen → Übung (bei Stufe 4 wechseln Broad und Box Jump pro Arc-Woche)
export const PLYO = {
  1: ['landing_drill'],
  2: ['pogo_jumps'],
  3: ['lateral_hops'],
  4: ['broad_jump', 'box_jump'],
  5: ['depth_jump_low'],
};
export const PLYO_NAMES = { 1: 'Landung', 2: 'extensiv', 3: 'reaktiv', 4: 'intensiv', 5: 'fortgeschritten' };

// Kontrastpaare: schwere Übung → explosiver Partner desselben Musters
export const CONTRAST = {
  bulgarian_split_squat: 'broad_jump',
  back_squat: 'box_jump',
  pullup_tactical: 'pullup_explosive',
  pullup_neutral: 'pullup_explosive',
  pullup_lsit: 'pullup_explosive',
  dip: 'plyo_pushup',
  kb_swing: 'bag_knee_series',
  deadlift: 'vertical_jump',
  snatch_grip_deadlift: 'vertical_jump',
};
