// Saison-Wächter: einer pro Saison (COLDIRON, STORMLUNG, SCORCH, WITHER), jedes Jahr stärker (COLDIRON II …).
// Besiegt wird er über drei Säulen (Benchmark, Fortschritts-Index, Durchziehen), nicht über Trainingsmenge.
// Die Säulen kommen in Paket 2. Bis dahin liefert der Status nur Name, Saison und Kapitel.
import { BOSS_BY_ARC, guardianName } from '../data/lore.js';
import { weekInfo } from './arc.js';

export function bossStatus(data, arc = data.engine.arc) {
  if (!arc) return null;
  const info = weekInfo(arc);
  const ev = data.engine.bossEvents?.[arc.n] || {};
  return { id: BOSS_BY_ARC[arc.n % 4], name: guardianName(arc.n), season: info.arc, week: arc.week, weeks: info.weeks,
    chapterIndex: info.chapterIndex, chapter: info.chapter, defeated: !!ev.defeated, medal: ev.medal || null };
}
