// Regel-Protokoll: jede ausgelöste Regel und jede Empfehlung samt deiner Entscheidung.
// Wird im Arc-Debrief exportiert, damit die Regeln nach jedem Arc verbessert werden können.
const MAX = 3000;

/**
 * @param {object} entry { rule, day, input?, suggestion, decision: 'accepted'|'declined'|'shown'|'override' }
 */
export function logDecision(data, entry) {
  const log = [...(data.ruleLog || []), { at: new Date().toISOString(), ...entry }];
  return { ...data, ruleLog: log.slice(-MAX) };
}
