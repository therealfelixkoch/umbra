// Entscheidungsregeln: Check-in + Wissen aus dem Log → Empfehlung für heute.
// Reihenfolge der Regeln ist bewusst fix (siehe README). Jede Empfehlung ist überstimmbar.
import { loadClass } from './load.js';

const NAMES = { A: 'Ziehen', B: 'Beine', C: 'Drücken', D: 'Zirkel' };

/**
 * @param {object} p
 * @param {{yesterdayMT:'none'|'light'|'hard', feeling:'frisch'|'normal'|'platt', tonightMT:'yes'|'no'|'maybe', morning?:boolean,
 *          where?:'room'|'gym'|'travel'|'kompakt'|'express'|'mobility'}} p.checkin
 * @param {number} p.hardStreak  harte Tage am Stück bis gestern
 * @param {string[]} p.queue     Rotations-Queue, z. B. ['B','C','D','A']
 * @param {boolean} [p.overrideRest] Ruhetag wurde bewusst überstimmt
 * @param {'high'|'normal'|'low'|null} [p.yesterday] Belastungsklasse von gestern
 * @param {number|null} [p.gap] Tage seit der letzten vollen Mission (ohne Feiertage)
 * @param {object} [p.lastDone] letzter Tag je Rotationsplatz
 * @param {boolean} [p.holiday] Feiertagsmodus aktiv (keine Pausenlogik)
 * @param {boolean} [p.fourByFourDue] Arc III: 4x4 diese Woche noch offen
 */
export function decide({ checkin, hardStreak, queue, overrideRest = false, yesterday = null, gap = null,
  lastDone = {}, holiday = false, fourByFourDue = false }) {
  const { yesterdayMT, feeling, tonightMT, where } = checkin;
  const profile = where === 'gym' ? 'gym' : where === 'travel' ? 'travel' : 'room';
  const platt = feeling === 'platt';
  const sparred = yesterdayMT === 'hard';

  // ARENA heute Abend reicht in der Regel: morgens frei, außer du willst bewusst eine Morgeneinheit.
  if (tonightMT === 'yes' && !checkin.morning) {
    return { rule: 0, kind: 'arenaday', missionId: 'FLOW', profile,
      reason: 'Heute Abend ARENA. Das reicht, heute früh nur FLOW, damit du abends frisch bist.' };
  }
  if (where === 'mobility') {
    return { rule: 1, kind: 'flow', missionId: 'FLOW', profile, walk: true,
      reason: 'Nur Mobility gewählt: FLOW und danach ein Spaziergang.' };
  }
  if (hardStreak >= 3 && !overrideRest) {
    return { rule: 2, kind: 'rest', missionId: 'FLOW', profile, canOverride: true,
      reason: `${hardStreak} harte Tage am Stück. Heute erholst du dich, nur FLOW.` };
  }
  if (platt && sparred) {
    return { rule: 3, kind: 'flow', missionId: 'FLOW', profile,
      reason: 'Platt und gestern hartes Sparring: Heute nur FLOW.' };
  }
  if (platt || sparred) {
    const why = platt ? 'Du bist platt' : 'Gestern hartes Sparring';
    if (where === 'express') {
      return { rule: 4, kind: 'express', missionId: 'EXPRESS', profile,
        reason: `${why}, darum nur ein kurzer Einsatz.` };
    }
    return { rule: 4, kind: 'mission', missionId: 'D_LIGHT', profile,
      reason: `${why}, darum ein leichter Zirkel in ruhigem Tempo.` };
  }
  if (where === 'express') {
    return { rule: 5, kind: 'express', missionId: 'EXPRESS', profile,
      reason: 'Nur 15 Minuten: SHADOWSTEP. Der zählt voll für deine Woche.' };
  }

  // ——— Welche Mission? ———
  const compact = where === 'kompakt';
  let rule = 7;
  let next = queue[0];
  let rotate = null;
  const reasons = [];

  // Pause 5–14 Tage: die Mission, deren Muster am längsten liegt. Danach läuft die Rotation ab ihr weiter.
  if (!holiday && gap != null && gap >= 5 && gap <= 14) {
    const overdue = [...queue].sort((a, b) => (lastDone[a] || '').localeCompare(lastDone[b] || ''))[0];
    next = overdue;
    rotate = 'restart';
    rule = 9;
    reasons.push(`${gap} Tage Pause. Am längsten liegt ${NAMES[overdue]}, da steigen wir ein.`);
  }

  // ARENA heute Abend: keine Beine.
  if ((tonightMT === 'yes' || tonightMT === 'maybe') && next === 'B') {
    next = queue.find((m) => m !== 'B');
    rule = 6;
    reasons.push(tonightMT === 'yes'
      ? 'Heute Abend ARENA, darum Oberkörper statt Beine.'
      : 'Vielleicht ARENA heute Abend, darum heben wir uns die Beine auf.');
  }

  // Was steht konkret auf dem Platz? Home Gym → FORGE, Arc III → 4x4 statt D.
  let missionId = next;
  let slot = null;
  if (profile === 'gym' && !compact) {
    missionId = 'FORGE';
    slot = next;
  } else if (next === 'D' && fourByFourDue && !compact) {
    missionId = 'NOR4X4';
    slot = 'D';
  } else if (next === 'D' && profile === 'travel') {
    missionId = 'HOTEL';
    slot = 'D';
  }

  // Nicht zwei High-Tage in Folge (Kompakt ist Low und fällt nicht darunter).
  if (yesterday === 'high' && loadClass({ kind: 'mission', missionId, compact }) === 'high') {
    const normal = queue.find((m) => m !== next && loadClass({ kind: 'mission', missionId: m }) === 'normal');
    if (normal) {
      rule = 8;
      reasons.push(`Gestern war ein High-Tag, darum heute ${NAMES[normal]}. ${missionId === 'FORGE' ? 'FORGE' : NAMES[next]} bleibt vorgemerkt.`);
      next = normal;
      missionId = normal;
      slot = null;
      rotate = null;
    }
  }

  if (!reasons.length) {
    reasons.push(tonightMT === 'yes'
      ? 'Nächste Mission in der Rotation, sie verträgt sich mit der ARENA heute Abend.'
      : missionId === 'FORGE' ? 'Home Gym: FORGE übernimmt den nächsten Platz in der Rotation.'
        : missionId === 'HOTEL' ? 'Unterwegs: Der Hotel-Zirkel übernimmt den Zirkel-Platz.'
        : profile === 'travel' ? 'Unterwegs: gleiche Mission, jede Übung mit gleichem Muster und dem, was da ist. Zählt voll.'
        : missionId === 'NOR4X4' ? 'Arc-Fokus Ausdauer: Heute 4x4 statt Zirkel.'
          : 'Nächste Mission in der Rotation.');
  }
  if (compact) reasons.push('Kompakt: nur die Hauptübungen, je 2 Sätze.');

  return { rule, kind: 'mission', missionId, slot, rotate, compact, profile, reason: reasons.join(' ') };
}

// Queue weiterdrehen: Die erledigte Mission wandert ans Ende, alle anderen behalten ihre Reihenfolge.
export function advanceQueue(queue, missionId) {
  if (!queue.includes(missionId)) return queue.slice();
  return [...queue.filter((m) => m !== missionId), missionId];
}
