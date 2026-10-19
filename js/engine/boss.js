// Boss-Lebensbalken: Lebenspunkte = geplante Einsätze der Arc-Wochen 1–5 (3 pro Woche = 15).
// Schaden: volle Mission 1 · Kompakt 0,6 · SHADOWSTEP 0,3 · ARENA 0,5 · Bestleistung +0,5 (kritischer Treffer).
// Der Boss heilt sich nie. Verpasste Tage kosten nichts.
import { BOSS_BY_ARC } from '../data/lore.js';
import { FULL_MISSIONS } from '../data/missions.js';
import { oathDamage } from './oaths.js';

export const PLANNED_PER_WEEK = 3;
export const BOSS_WEEKS = 5;
export const BOSS_HP = PLANNED_PER_WEEK * BOSS_WEEKS;

export function hitOf(s) {
  let dmg = 0;
  if (s.kind === 'mission' && FULL_MISSIONS.includes(s.missionId)) dmg = s.compact ? 0.6 : 1;
  else if (s.kind === 'express') dmg = 0.3;
  else if (s.kind === 'arena') dmg = 0.5;
  const crits = (s.records?.length || 0) * 0.5;
  return { dmg, crits, total: dmg + crits };
}

// Treffer zählen in den Arc-Wochen 1–5 des laufenden Arcs.
export function bossStatus(data, arc = data.engine.arc) {
  if (!arc) return null;
  const id = BOSS_BY_ARC[arc.n % 4];
  let damage = 0;
  let crits = 0;
  for (const s of data.sessions) {
    if (s.arc?.n !== arc.n || s.arc.week > BOSS_WEEKS) continue;
    const h = hitOf(s);
    damage += h.total;
    crits += h.crits ? 1 : 0;
  }
  // Gehaltene Gelübde: 0,1 pro Gelübde und Tag
  const oaths = oathDamage(data.oaths, arc.n, BOSS_WEEKS);
  damage = Math.round((damage + oaths) * 10) / 10;
  const hp = Math.max(0, Math.round((BOSS_HP - damage) * 10) / 10);
  return { id, max: BOSS_HP, hp, damage, crits, oaths, defeated: hp <= 0,
    retreating: hp > 0 && arc.week > BOSS_WEEKS };
}
