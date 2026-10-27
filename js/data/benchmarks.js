// Benchmark-Workouts der Saison-Wächter (Säule 1). Fest und wiederholbar: Baseline in Woche 1, Revanche in der Prüfwoche.
// score: 'time' = auf Zeit (weniger ist besser), 'count' = Wiederholungen/Runden (mehr ist besser).
// Halbe Version für Gelenke und Alltag. Verglichen wird immer die Version, die bei der Baseline gewählt wurde.

export const BENCHMARKS = {
  coldiron: {
    id: 'coldiron', name: 'CAVE-MURPH', score: 'time', cap: 60,
    intro: 'Auf Zeit. Klimmzüge, Push-ups und Kniebeugen frei aufteilen, z. B. 10 Runden à 5 / 10 / 15. Seil am Anfang und am Ende am Stück.',
    variants: {
      full: { label: 'Voll', parts: ['5 min Seilspringen', '50 Klimmzüge', '100 Push-ups', '150 Kniebeugen', '5 min Seilspringen'] },
      half: { label: 'Halb', parts: ['3 min Seilspringen', '25 Klimmzüge', '50 Push-ups', '75 Kniebeugen', '3 min Seilspringen'] },
    },
    subs: ['Klimmzüge → Bodyweight Rows (Gelenk)', 'Push-ups → auf Fäusten oder Griffen', 'Seil → Shadow Boxing'],
  },
  stormlung: {
    id: 'stormlung', name: 'STORM ROUNDS', score: 'count', unit: 'Sprawls',
    intro: 'Jede Runde 3 min: 1 min Sack (Kombinationen), 1 min Sprawls so viele wie möglich, 1 min Sack. 1 min Pause. Gezählt werden alle Sprawls.',
    variants: {
      full: { label: 'Voll', parts: ['5 Runden à 3 min', 'Minute 1: Sack', 'Minute 2: Sprawls max.', 'Minute 3: Sack', '1 min Pause'], rounds: 5, work: 180, rest: 60 },
      half: { label: 'Halb', parts: ['3 Runden à 3 min', 'Minute 1: Sack', 'Minute 2: Sprawls max.', 'Minute 3: Sack', '1 min Pause'], rounds: 3, work: 180, rest: 60 },
    },
    subs: ['Sack → Shadow Boxing mit vollem Tempo', 'Sprawls → Burpees ohne Sprung'],
  },
  scorch: {
    id: 'scorch', name: 'SCORCH CHAIN', score: 'time', cap: 40,
    intro: 'Auf Zeit, Runde für Runde ohne Pause.',
    variants: {
      full: { label: 'Voll', parts: ['5 Runden:', '5 Broad Jumps', '15 KB Swings', 'Bear Crawl 2 Bahnen', '60 Seilsprünge'] },
      half: { label: 'Halb', parts: ['3 Runden:', '5 Broad Jumps', '15 KB Swings', 'Bear Crawl 2 Bahnen', '60 Seilsprünge'] },
    },
    subs: ['Broad Jumps → Squat Jumps', 'Seil → 30 s Laufen auf der Stelle'],
  },
  wither: {
    id: 'wither', name: 'WITHER FLOW', score: 'count', unit: 'Runden',
    intro: 'So viele saubere Runden wie möglich. Qualität vor Tempo: jede Runde zählt nur, wenn sie sauber war.',
    variants: {
      full: { label: 'Voll', parts: ['10 min, so viele Runden wie möglich:', '1 Turkish Get-up je Seite', '5 Cossack Squats je Seite', '30 s Deep Squat Hold'], amrap: 600 },
      half: { label: 'Halb', parts: ['6 min, so viele Runden wie möglich:', '1 Turkish Get-up je Seite', '5 Cossack Squats je Seite', '30 s Deep Squat Hold'], amrap: 360 },
    },
    subs: ['Turkish Get-up → ohne Gewicht'],
  },
};
