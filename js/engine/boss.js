// Veraltet (BANG COMBAT, 19.11.2026): Saison-Gegner gibt es nicht mehr. bossStatus liefert nur noch den Saison-Stand,
// damit Heute und Debrief bis zum UI-Umbau weiterlaufen. Danach löschen (Ersatz: nextUnit in run.js, arcOf(n).sub).
import { weekInfo } from './arc.js';

export function bossStatus(data, arc = data.engine.arc) {
  if (!arc) return null;
  const info = weekInfo(arc);
  return { id: null, name: `BANG COMBAT · ${info.arc.sub}`, season: info.arc, week: arc.week, weeks: info.weeks,
    chapterIndex: info.chapterIndex, chapter: info.chapter, defeated: false, medal: null };
}
