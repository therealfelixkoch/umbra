// Programm-Bibliothek (Interview 19.11.2026): Es ist immer genau ein Programm aktiv, der Fortschritt bleibt je Programm gespeichert.
// units: Einheiten in fester Reihenfolge (Missions-IDs) · unitsPerChapter: Einheiten pro Kapitel
// seasonal: Kapitel kommen aus den Saisons (js/data/arcs.js), die Saison-Empfehlung kommt am Kapitelende
// seasons: Saisons, zu denen der Schwerpunkt passt (Markierung „passt zur Saison“ in der Bibliothek)
// Weitere Programme (z. B. 6–12-Wochen-Pläne) kommen später als eigene Einträge dazu.

export const LIBRARY = [
  {
    id: 'bang_combat',
    name: 'BANG COMBAT',
    desc: '3× Ganzkörper in fester Reihenfolge, Kapitel mit 15 Einheiten, die Saison bestimmt den Schwerpunkt.',
    units: ['BC_A', 'BC_B', 'BC_C'],
    unitsPerChapter: 15,
    seasonal: true,
    seasons: ['WINTER', 'SPRING', 'SUMMER', 'AUTUMN'],
    goodWeek: { gym: 2, arena: 1 }, // Gute Woche: 2× Gym + 1× Muay Thai, alles darüber ist Bonus
  },
];

export const DEFAULT_PROGRAM = 'bang_combat';

export const programOf = (id) => LIBRARY.find((p) => p.id === id) || null;

/** Programme, deren Schwerpunkt zur Saison passt (für die Markierung in der Bibliothek). */
export const programsForSeason = (seasonId) => LIBRARY.filter((p) => (p.seasons || []).includes(seasonId)).map((p) => p.id);
