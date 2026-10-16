// Rundentimer für die Arena: Bereit → Runde → Pause → Runde … → fertig.
// cfg: { work: Sekunden, rest: Sekunden (0 = keine Pause), rounds: Anzahl }

export const PREP_SEC = 10;
export const WARN_SEC = 10;

export function startTimer(cfg, now) {
  return { phase: 'prep', round: 0, endAt: now + PREP_SEC * 1000 };
}

// Ein Phasenwechsel. event sagt, welcher Ton kommt: 'gong' (Rundenende) oder 'bell' (Rundenstart).
export function nextPhase(st, cfg, base) {
  if (st.phase === 'prep' || st.phase === 'rest') {
    return { phase: 'work', round: st.round + 1, endAt: base + cfg.work * 1000, event: 'bell' };
  }
  if (st.phase === 'work') {
    if (st.round >= cfg.rounds) return { phase: 'done', round: st.round, endAt: null, event: 'gong' };
    if (!cfg.rest) return { phase: 'work', round: st.round + 1, endAt: base + cfg.work * 1000, event: 'gong' };
    return { phase: 'rest', round: st.round, endAt: base + cfg.rest * 1000, event: 'gong' };
  }
  return { ...st, event: null };
}

// Bis jetzt aufholen (z. B. nach kurzem Sperrbildschirm). Liefert den letzten Ton.
export function advanceTo(st, cfg, now) {
  let cur = st;
  let event = null;
  while (cur.endAt != null && cur.endAt <= now && cur.phase !== 'done') {
    cur = nextPhase(cur, cfg, cur.endAt);
    event = cur.event;
  }
  return { st: cur, event };
}

export function totalMinutes(cfg, roundsDone) {
  return Math.max(1, Math.round((roundsDone * cfg.work + Math.max(0, roundsDone - 1) * cfg.rest) / 60));
}
