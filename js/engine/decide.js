// Entscheidungsregeln: Check-in + Wissen aus dem Log → Empfehlung für heute.
// Reihenfolge der Regeln ist bewusst fix (siehe README). Jede Empfehlung ist überstimmbar.

const NAMES = { A: 'ASCENT', B: 'BEDROCK', C: 'IMPACT', D: 'INFILTRATION', FORGE: 'FORGE' };

// Ort und Zeit getrennt. Alte Check-ins hatten beides in „where“ (kompakt, express, five, mobility).
const TIMES = ['kompakt', 'express', 'five', 'mobility'];
export function placeAndTime(checkin) {
  const legacy = TIMES.includes(checkin.where);
  return { where: legacy ? 'room' : checkin.where || 'room', time: legacy ? checkin.where : checkin.time || 'full' };
}

const HIGH = new Set(['B', 'FORGE', 'NOR4X4']);

/**
 * Hinweise statt Tausch: Die Rotation bleibt, du entscheidest über die Dauer.
 * @returns {{ lines: string[], suggest: 'full'|'kompakt'|'express'|'mobility'|null }}
 */
export function advice({ checkin, hardStreak = 0, yesterday = null, next = null }) {
  const lines = [];
  let suggest = null;
  const pick = (t) => { const order = ['full', 'kompakt', 'express', 'mobility']; if (!suggest || order.indexOf(t) > order.indexOf(suggest)) suggest = t; };
  const platt = checkin.feeling === 'platt';
  const sparred = checkin.yesterdayMT === 'hard';
  if (hardStreak >= 3) { lines.push(`${hardStreak} harte Tage am Stück. Ein ruhiger Tag würde dir guttun.`); pick('mobility'); }
  if (platt && sparred) { lines.push('Platt und gestern hartes Sparring.'); pick('mobility'); }
  else if (platt) { lines.push('Du fühlst dich platt.'); pick('express'); }
  else if (sparred) { lines.push('Gestern hartes Sparring.'); pick('kompakt'); }
  if (yesterday === 'high' && HIGH.has(next)) {
    lines.push(sparred ? `Heute wäre wieder ein schwerer Platz dran (${NAMES[next]}).` : `Gestern war ein High-Tag und heute ist wieder ein schwerer Platz dran (${NAMES[next]}).`);
    pick('kompakt');
  }
  if ((checkin.tonightMT === 'yes' || checkin.tonightMT === 'maybe') && next === 'B') {
    lines.push(`${checkin.tonightMT === 'yes' ? 'Heute Abend' : 'Vielleicht heute Abend'} ARENA und Beine sind dran.`); pick('kompakt');
  }
  return { lines, suggest };
}

const TIME_TEXT = { full: 'die volle Einheit', kompakt: '30 Minuten', express: '15 Minuten', mobility: 'nur Mobility' };
export const adviceText = (a) => (a.lines.length ? `${a.lines.join(' ')} Empfehlung: ${TIME_TEXT[a.suggest]}. Du entscheidest.` : '');

/** Nächster Platz der Rotation, der heute machbar ist (FORGE braucht das Home Gym). */
export function nextSlot(queue, where) {
  return queue.find((m) => m !== 'FORGE' || where === 'gym') || queue[0];
}

/**
 * Rotation strikt: A → B → C → D → FORGE, an keine Wochentage gebunden. Regeln tauschen keine Mission mehr,
 * sie geben Hinweise (advice). Du wählst Ort und Zeit (voll, 30, 15, 5 min, Mobility).
 * @param {object} p
 * @param {{yesterdayMT:'none'|'light'|'hard', feeling:'frisch'|'normal'|'platt', tonightMT:'yes'|'no'|'maybe', morning?:boolean,
 *          where?:'room'|'gym'|'travel', time?:'full'|'kompakt'|'express'|'five'|'mobility'}} p.checkin
 * @param {number} p.hardStreak  harte Tage am Stück bis gestern
 * @param {string[]} p.queue     Rotations-Queue, z. B. ['B','C','D','FORGE','A']
 * @param {'high'|'normal'|'low'|null} [p.yesterday] Belastungsklasse von gestern
 * @param {number|null} [p.gap] Tage seit der letzten vollen Mission (ohne Feiertage)
 * @param {object} [p.lastDone] letzter Tag je Rotationsplatz
 * @param {boolean} [p.holiday] Feiertagsmodus aktiv (keine Pausenlogik)
 * @param {boolean} [p.fourByFourDue] Arc III: 4x4 diese Woche noch offen
 */
export function decide({ checkin, hardStreak, queue, yesterday = null, gap = null,
  lastDone = {}, holiday = false, fourByFourDue = false }) {
  const { where, time } = placeAndTime(checkin);
  const profile = where === 'gym' ? 'gym' : where === 'travel' ? 'travel' : 'room';

  // ARENA heute Abend reicht in der Regel: morgens frei, außer du willst bewusst eine Morgeneinheit.
  if (checkin.tonightMT === 'yes' && !checkin.morning) {
    return { rule: 0, kind: 'arenaday', missionId: 'FLOW', profile,
      reason: 'Heute Abend ARENA. Das reicht, heute früh nur FLOW, damit du abends frisch bist.' };
  }
  if (time === 'five') {
    return { rule: 1, kind: 'five', missionId: 'HANDS', profile,
      reason: 'Nur 5 Minuten: HANDS für Hände und Handgelenke. Das hält beweglich, ohne den Tag zu belasten.' };
  }
  if (time === 'mobility') {
    return { rule: 1, kind: 'flow', missionId: 'FLOW', profile, walk: true,
      reason: 'Nur Mobility gewählt: FLOW und danach ein Spaziergang.' };
  }

  // ——— Welcher Platz? ———
  let rule = 7;
  let next = nextSlot(queue, where);
  let rotate = null;
  const reasons = [];
  if (next !== queue[0]) reasons.push('FORGE ist dran, braucht aber das Home Gym und bleibt vorgemerkt.');

  // Pause 5–14 Tage: der Platz, dessen Muster am längsten liegt. Danach läuft die Rotation ab ihm weiter.
  if (!holiday && gap != null && gap >= 5 && gap <= 14) {
    const overdue = [...queue].filter((m) => m !== 'FORGE' || where === 'gym')
      .sort((a, b) => (lastDone[a] || '').localeCompare(lastDone[b] || ''))[0];
    next = overdue;
    rotate = 'restart';
    rule = 9;
    reasons.push(`${gap} Tage Pause. Am längsten liegt ${NAMES[overdue]}, da steigen wir ein.`);
  }

  const hint = advice({ checkin, hardStreak, yesterday, next });

  if (time === 'express') {
    return { rule: 5, kind: 'express', missionId: 'EXPRESS', profile, hint, next,
      reason: `Nur 15 Minuten: SHADOWSTEP. Zählt für deine Woche, ${NAMES[next]} bleibt als Nächstes dran.` };
  }

  // Was steht konkret auf dem Platz? Arc III → 4x4 statt D, unterwegs Hotel-Zirkel.
  const compact = time === 'kompakt';
  let missionId = next;
  let slot = null;
  if (next === 'D' && fourByFourDue && !compact) {
    missionId = 'NOR4X4';
    slot = 'D';
  } else if (next === 'D' && profile === 'travel') {
    missionId = 'HOTEL';
    slot = 'D';
  }

  if (!reasons.length) {
    reasons.push(missionId === 'FORGE' ? 'FORGE ist dran: der Home-Gym-Platz der Rotation.'
      : missionId === 'HOTEL' ? 'Unterwegs: Der Hotel-Zirkel übernimmt den Zirkel-Platz.'
        : profile === 'travel' ? 'Unterwegs: gleiche Mission, jede Übung mit gleichem Muster und dem, was da ist. Zählt voll.'
          : missionId === 'NOR4X4' ? 'Arc-Fokus Ausdauer: Heute 4x4 statt Zirkel.'
            : profile === 'gym' ? 'Nächste Mission in der Rotation, mit den Home-Gym-Übungen.'
              : 'Nächste Mission in der Rotation.');
  }
  if (compact) reasons.push('30 Minuten: nur die Hauptübungen, je 2 Sätze.');

  return { rule, kind: 'mission', missionId, slot, rotate, compact, profile, hint, reason: reasons.join(' ') };
}

// Queue weiterdrehen: Die erledigte Mission wandert ans Ende, alle anderen behalten ihre Reihenfolge.
export function advanceQueue(queue, missionId) {
  if (!queue.includes(missionId)) return queue.slice();
  return [...queue.filter((m) => m !== missionId), missionId];
}
