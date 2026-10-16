// Entscheidungsregeln: Check-in + Wissen aus dem Log → Empfehlung für heute.
// Reihenfolge der Regeln ist bewusst fix (siehe README).

/**
 * @param {object} p
 * @param {{yesterdayMT:'none'|'light'|'hard', feeling:'frisch'|'normal'|'platt', tonightMT:'yes'|'no'|'maybe', where:'room'|'gym'|'express'|'mobility'}} p.checkin
 * @param {number} p.hardStreak  harte Tage am Stück bis gestern
 * @param {string[]} p.queue     Rotations-Queue, z. B. ['B','C','D','A']
 * @param {boolean} [p.overrideRest] Ruhetag wurde bewusst überstimmt
 * @returns {{kind:string, missionId:string, profile:string, reason:string, rule:number, canOverride?:boolean}}
 */
export function decide({ checkin, hardStreak, queue, overrideRest = false }) {
  const { yesterdayMT, feeling, tonightMT, where } = checkin;
  const profile = where === 'gym' ? 'gym' : 'room';
  const platt = feeling === 'platt';
  const sparred = yesterdayMT === 'hard';

  if (where === 'mobility') {
    return { rule: 1, kind: 'flow', missionId: 'FLOW', profile, walk: true,
      reason: 'Nur Mobility gewählt: Fluss und danach ein Spaziergang.' };
  }
  if (hardStreak >= 3 && !overrideRest) {
    return { rule: 2, kind: 'rest', missionId: 'FLOW', profile, canOverride: true,
      reason: `${hardStreak} harte Tage am Stück. Heute erholst du dich, nur Fluss.` };
  }
  if (platt && sparred) {
    return { rule: 3, kind: 'flow', missionId: 'FLOW', profile,
      reason: 'Platt und gestern hartes Sparring: Heute nur Fluss.' };
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
      reason: 'Nur 15 Minuten: Kurzeinsatz. Der zählt voll für deine Woche.' };
  }
  const next = queue[0];
  if ((tonightMT === 'yes' || tonightMT === 'maybe') && next === 'B') {
    const alt = queue.find((m) => m !== 'B');
    return { rule: 6, kind: 'mission', missionId: alt, profile,
      reason: tonightMT === 'yes'
        ? 'Heute Abend Arena, darum Oberkörper statt Beine.'
        : 'Vielleicht Arena heute Abend, darum heben wir uns die Beine auf.' };
  }
  return { rule: 7, kind: 'mission', missionId: next, profile,
    reason: tonightMT === 'yes'
      ? 'Nächste Mission in der Rotation, sie verträgt sich mit der Arena heute Abend.'
      : 'Nächste Mission in der Rotation.' };
}

// Queue weiterdrehen: Die erledigte Mission wandert ans Ende, alle anderen behalten ihre Reihenfolge.
export function advanceQueue(queue, missionId) {
  if (!queue.includes(missionId)) return queue.slice();
  return [...queue.filter((m) => m !== missionId), missionId];
}
