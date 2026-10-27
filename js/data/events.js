// Freiwillige Events: eins pro Kapitel, am Samstag/Sonntag der Kapitelwoche 4, eine Woche vorher angekündigt.
// Zählen nicht für Rotation und Wochenziel, bringen ein Event-Abzeichen und XP.
export const EVENTS = [
  { id: 'hero', name: 'HERO DAY', desc: 'Ein langes Workout für einen ganzen Vormittag.',
    parts: ['1 km Laufen oder 5 min Seil', '100 Push-ups', '100 Kniebeugen', '50 Klimmzüge oder Rows', '1 km Laufen oder 5 min Seil'] },
  { id: 'bagmarathon', name: 'SACK-MARATHON', desc: 'Zwölf Runden wie ein langer Kampfabend.',
    parts: ['12 × 3 min am Sack', '1 min Pause', 'Jede vierte Runde: nur Knie und Teeps'] },
  { id: 'burpee100', name: '100 BURPEES', desc: 'Auf Zeit, so sauber wie möglich.', parts: ['100 Burpees', 'Zeit notieren'] },
  { id: 'ladder', name: 'IRON LADDER', desc: 'Leitern bis zur Grenze, ohne Versagen.',
    parts: ['Klimmzüge 1-2-3-4-5', 'Dips 2-4-6-8-10', '3 Durchgänge, Pause nach Gefühl'] },
  { id: 'haul', name: 'LONG HAUL', desc: 'Tragen, bis die Hände aufgeben wollen.',
    parts: ['20 min: Suitcase Carry links, rechts, Farmer Walk im Wechsel', 'Gewicht so wählen, dass 1 min pro Strecke geht'] },
  { id: 'deepflow', name: 'DEEP FLOW', desc: 'Eine Dreiviertelstunde Beweglichkeit ohne Eile.',
    parts: ['45 min Mobility-Flow', 'Jede Position 60–90 s', 'Hüfte, Brustwirbelsäule, Schultern'] },
];
