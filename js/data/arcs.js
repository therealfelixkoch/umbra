// Saisons (Makro-Arcs): 4 pro Jahr, je 13 Trainingswochen = 2 Kapitel à 6 Wochen (5 Aufbau + 1 Deload) + 1 Prüfwoche.
// UMBRA 2.0: Übungen je Saison und Kapitel in js/data/program.js. rules hier nur noch für Extras (ZONE 2, optionaler 4x4).
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
    desc: 'Erst Fundament mit mehr Wiederholungen, dann schwer heben.',
    why: 'Im Winter baust du Kraft und etwas Muskel auf. Kapitel 1 legt mit Top-Satz 6–8 das Fundament, Kapitel 2 macht daraus mit Top-Satz 3–5 Kraft. Power, Rumpf, Mobility und Muay Thai laufen in jeder Mission mit.',
    chapters: [
      { name: 'Fundament', rules: {}, plyo: [1, 1, 2, 2, 2, 1],
        changes: ['Hauptübung: Top-Satz 6–8 Wdh. (1 im Tank), 2 Backdowns 8–10 mit ca. −15 %', 'CMPND Block: 3 Sätze, letzter Satz bis RIR 0', 'Power: Landungen und leichte Plyo-Push-ups', 'Finisher: Zirkel'] },
      { name: 'Kraft', rules: {}, plyo: [2, 3, 3, 3, 3, 2],
        changes: ['Hauptübung: Top-Satz 3–5 Wdh., 2 Backdowns 5–7', 'Neue Varianten: Push Press, Pendlay Row, Kniebeuge, Kreuzheben', 'CMPND Block: Anker 3, Partner 2 Sätze', 'Finisher: EMOM'] },
    ] },
  { id: 'SPRING', name: 'FRÜHJAHR', guardian: 'stormlung', months: [2, 3, 4], weeks: 13,
    focus: 'Power und Kondition: Fight-Shape',
    desc: 'Aus Kraft wird Schnelligkeit, der Motor hält harte Runden.',
    why: 'Die Kraft aus dem Winter wird schnell: Nach dem Top-Satz kommt ein Sprung oder Slam im gleichen Muster. Kapitel 2 baut mit kurzen harten Intervallen den Motor.',
    chapters: [
      { name: 'Kontrast', rules: { contrast: true }, plyo: [3, 4, 4, 4, 4, 2],
        changes: ['Hauptübung: Top-Satz 3–5 → 3 explosive Wiederholungen → 1 Backdown', 'Power: seitliche und reaktive Sprünge', 'Finisher: 10 × 30/30'] },
      { name: 'Motor', rules: { optional4x4: true }, plyo: [3, 4, 4, 4, 4, 2],
        changes: ['Hauptübung: explosive Varianten (Landmine Press, Hang Power Clean), 2 Backdowns 4–6', 'Finisher: 2 × 4 min hart', 'Optional: voller 4x4 an einem freien Tag'] },
    ] },
  { id: 'SUMMER', name: 'SOMMER', guardian: 'scorch', months: [5, 6, 7], weeks: 13,
    focus: 'Athletik und Ausdauer, Kraft auf Erhalt',
    desc: 'Einbeinig, seitlich, schnell. Kraft mit weniger Sätzen halten.',
    why: 'Im Sommer hältst du die Kraft mit einem Top-Satz und einem Backdown und wirst athletisch: einbeinig, seitlich, schnelle Richtungswechsel. Dazu kommt Ausdauer, gern draußen.',
    chapters: [
      { name: 'Athletik', rules: {}, plyo: [3, 3, 4, 4, 4, 2],
        changes: ['Hauptübung: Top-Satz 4–6 + 1 Backdown', 'Nebenübungen 2 Sätze', 'Power: einbeinige und seitliche Sprünge', 'Finisher: Sprints'] },
      { name: 'Motor', rules: { zone2: true }, plyo: [3, 3, 3, 3, 3, 2],
        changes: ['Hauptübung: Top-Satz 3–5 + 1 Backdown', 'Finisher: 2 × 4 min hart', '1× pro Woche ZONE 2: 30–45 min locker draußen'] },
    ] },
  { id: 'AUTUMN', name: 'HERBST', guardian: 'wither', months: [8, 9, 10], weeks: 13,
    focus: 'Gelenke, Mobility, Reset',
    desc: 'Entlasten, beweglicher werden, Basis für den Winter.',
    why: 'Nach drei Saisons holen Gelenke und Sehnen auf: weniger Sätze, langsames Tempo, mehr belastete Mobility. Kapitel 2 legt mit höheren Wiederholungen die Basis für den nächsten Winter.',
    chapters: [
      { name: 'Reset', rules: {}, plyo: [1, 1, 2, 2, 2, 1],
        changes: ['Hauptübung: Top-Satz 10–12 mit 2 Wdh. im Tank, 3 s ablassen, 1 Backdown', 'Letzter Satz RIR 1 statt 0', 'Belastete Mobility in jeder Mission', 'Finisher: Zirkel locker'] },
      { name: 'Basis', rules: {}, plyo: [1, 2, 2, 2, 2, 1],
        changes: ['Hauptübung: Top-Satz 8–10 + 2 Backdowns 10–12', 'Normale Satzzahl', 'Prüfwoche: Jahresvergleich mit den Ankern'] },
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
  summary: 'Vier Saisons pro Jahr, je 13 Wochen: zwei Kapitel à 6 Wochen und eine Prüfwoche. Vier feste Kraft-Tage pro Woche: Push, Pull, Legs, Full Body. Jedes Muster kommt zweimal pro Woche dran. Jede Saison stellt einen Schwerpunkt nach vorn: Winter Kraft, Frühjahr Fight-Shape, Sommer Athletik, Herbst Reset.',
  stays: ['Jede Mission in Blöcken: Aufwärmen, Power, Hauptübung, CMPND Block, Rumpf & Zusätze', 'Die vier Anker: Dips, Tactical Pull-ups, Bulgarian Split Squat, Chin-ups', 'Hauptübung als Top-Satz mit Backdowns, steigern nach Double Progression', 'Nacken, Nordic Curls, Waden und Tibialis', 'FLOW täglich, Muay Thai, Wochenrhythmus im Kapitel'],
  exercises: 'Mit jedem Kapitel (alle 6 Wochen) wechseln Power, die Variante der Hauptübung, der CMPND-Partner, Rumpf, Arme, Mobility und Finisher. Der Anker im CMPND Block und die Prehab-Zusätze bleiben das ganze Jahr. So bleibt das Training frisch, und jede Prüfwoche misst an denselben vier Ankern.',
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
