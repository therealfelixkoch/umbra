// Conditioning in der Fighting Cave (Felix, 21.11.2026): 15 oder 30 min reine Power, on top nach den Sack-Runden
// oder frei unter ARENA. Zählt für die Woche, nicht als Einheit von BANG COMBAT. Eigene Formulierungen.
// Jede Station sagt, welche Ausstattung sie braucht (needs, bei Kettlebells minKg). Neue Geräte in der Cave
// schalten passende Stationen ohne Code-Änderung frei.

export const COND_STATIONS = [
  // Power am Sack
  { id: 'speed', ex: 'bag_speed_shots', group: 'bag', needs: ['bag'], text: 'Speed Shots: links-rechts Geraden ohne Pause' },
  { id: 'kicks', ex: 'bag_power_kicks', group: 'bag', needs: ['bag'], text: 'Roundhouse links/rechts im Wechsel, jeder Kick voll' },
  { id: 'knees', ex: 'bag_knee_series', group: 'bag', needs: ['bag'], text: 'Knie im Wechsel, Hände im Clinch am Sack' },
  { id: 'combo', ex: 'bag_power_combo', group: 'bag', needs: ['bag'], text: 'Dreier-Kombis, jeder Schlag voll' },
  // Körpergewicht
  { id: 'sprawl', ex: 'sprawl', group: 'body', needs: [], text: 'Sprawls, sofort zurück in die Stellung' },
  { id: 'burpee', ex: 'burpee', group: 'body', needs: [], text: 'Burpees, gleichmäßiges Tempo' },
  { id: 'squatjump', ex: 'squat_jump', group: 'body', needs: [], text: 'Squat Jumps, weich landen' },
  { id: 'plyopush', ex: 'plyo_pushup', group: 'body', needs: [], text: 'Explosive Push-ups' },
  { id: 'skater', ex: 'skater_bound', group: 'body', needs: [], text: 'Skater-Sprünge seitlich' },
  // Kettlebell (leichte gehen schon mit 6 kg, schwere erst ab passendem Gewicht)
  { id: 'halo', ex: 'kb_halo', group: 'kb', needs: ['kb'], minKg: 4, text: 'KB Halos, abwechselnd beide Richtungen' },
  { id: 'press', ex: 'kb_press_sa', group: 'kb', needs: ['kb'], minKg: 6, text: 'KB Press einarmig, Seite pro Runde wechseln' },
  { id: 'swing', ex: 'kb_swing', group: 'kb', needs: ['kb'], minKg: 12, text: 'KB Swings, Hüfte schnappt' },
  { id: 'goblet', ex: 'goblet_squat_pause', group: 'kb', needs: ['kb'], minKg: 12, text: 'Goblet Squats zügig' },
  // Später (sobald in der Cave angehakt)
  { id: 'slam', ex: 'ball_slam', group: 'body', needs: ['medball'], text: 'Ball Slams mit voller Kraft' },
  { id: 'rope', ex: 'jump_rope', group: 'body', needs: ['rope'], text: 'Seilspringen schnell' },
];

// POWER: nur Sack, kurz und voll, lange Erholung. MIX: Sack und Körpergewicht/KB im Wechsel.
export const COND_FORMATS = {
  power: { id: 'power', name: 'POWER', focus: 'Sack · kurz und voll', work: 20, rest: 40, warmup: 120, groups: [['bag']] },
  mix: { id: 'mix', name: 'MIX', focus: 'Sack und Körpergewicht im Wechsel', work: 40, rest: 20, warmup: 120, groups: [['bag'], ['body', 'kb']] },
};

export const COND_MINUTES = [15, 30];
