// Zentrale XP-Konfiguration: alle Werte, Deckel und Rangschwellen an einer Stelle.
// Nach jedem Arc-Debrief hier anpassen. Ziel: eine normale Woche bringt ca. 750–850 XP,
// UMBRA nach ca. 13 Monaten, Unzerbrechlich nach ca. 2 Jahren.

export const XP_CONFIG = {
  // Gesamtränge (Index = Wächter-Stufe guardian-0 … guardian-5)
  ranks: [
    { id: 'SHADE', xp: 0 },
    { id: 'BLADE', xp: 3000 },
    { id: 'WARDEN', xp: 9000 },
    { id: 'PHANTOM', xp: 21000 },
    { id: 'UMBRA', xp: 45000 },
    { id: 'UNBREAKABLE', xp: 90000, name: 'Unzerbrechlich' },
  ],

  // XP pro Quelle
  sources: {
    mission: 100, // volle Mission (A–D, FORGE, 4x4), anteilig bei unvollständig
    compact: 70, // QUICK STRIKE
    light: 60, // INFILTRATION leicht
    express: 40, // SHADOWSTEP
    arena: 80, // ARENA, pauschal
    flow: 20,
    rest: 10, // Ruhetag mit FLOW
    record: 25, // pro Bestleistung
    weekGoal: 100, // Wochenziel erreicht
    boss: 500, // Boss besiegt
    quest: 100, // Side Quest
    ascension: 150,
    check: 50, // Mobility-Check
    surge: 15,
    wimhof: 15, // unabhängig von der Retentionszeit
    cold: 10,
    oath: 10, // pro gehaltenem Gelübde
    sundayReset: 50,
    oathSealed: 100,
  },

  partialMin: 0.2, // unvollständige Mission zählt mindestens 20 %

  // Nebenquellen zusammen höchstens 60 XP pro Tag. Training bleibt die Hauptquelle.
  sideDailyCap: 60,
  sideSources: ['flow', 'rest', 'surge', 'wimhof', 'cold', 'oath'],
};

export const SOURCE_LABELS = {
  mission: 'Missionen', compact: 'QUICK STRIKE', light: 'INFILTRATION leicht', express: 'SHADOWSTEP', arena: 'ARENA',
  flow: 'FLOW', rest: 'Ruhetag', record: 'Bestleistungen', weekGoal: 'Wochenziel', boss: 'Boss besiegt', quest: 'Side Quests',
  ascension: 'Ascensions', check: 'Mobility-Check', surge: 'SURGE', wimhof: 'Wim Hof', cold: 'Kälte', oath: 'Gelübde',
  sundayReset: 'SUNDAY RESET', oathSealed: 'Gelübde besiegelt',
};
