// Stagnation, zweistufig. Alles sind Vorschläge; du bestätigst oder lehnst ab.
// Stufe 1 (eine Übung): 3 Einheiten ohne Fortschritt ODER 2 Einheiten in Folge unter dem Arc-Bestwert → Variante wechseln.
// Stufe 2 (mehrere Muster): ≥ 3 Hauptübungen aus verschiedenen Mustern auf Stufe 1 → Deload-Woche jetzt.
// Kein Signal in Arc-Woche 1 und in den ersten 2 Einheiten nach einer Pause.
import { getDef as defaultGetDef } from '../data/exercises.js';
import { MISSIONS } from '../data/missions.js';

// Leistungswert einer Übung in einer Einheit: Epley-1RM bei Last, sonst Summe Wdh./Zeit.
// Zeitübungen mit Last (Carries): Last × Sekunden, damit ein höheres Gewicht nicht als Rückschritt zählt.
export function performance(def, sets, bodyweight = 80) {
  const done = sets.filter((s) => s.done && s.label !== 'Backdown');
  if (!done.length) return null;
  if (def.mode === 'time') return done.reduce((n, s) => n + s.value * (s.load || 1), 0);
  if (def.load) {
    const base = def.bodyweight ? bodyweight : 0;
    return Math.max(...done.map((s) => Math.round((base + (s.load || 0)) * (1 + s.value / 30) * 10) / 10));
  }
  return done.reduce((n, s) => n + s.value, 0);
}

export function isStalled(values) {
  if (values.length >= 4) {
    const last3 = values.slice(-3);
    const before = Math.max(...values.slice(0, -3));
    if (Math.max(...last3) <= before) return 'flat';
  }
  if (values.length >= 3) {
    const best = Math.max(...values.slice(0, -2));
    if (values.slice(-2).every((v) => v < best)) return 'below';
  }
  return null;
}

// Hauptplätze: slotKey → Muster (Primär-Attribut) und Variantenliste
export function mainSlots() {
  const out = [];
  for (const id of ['A', 'B', 'C', 'FORGE']) {
    MISSIONS[id].slots.forEach((s, i) => { if (s.main) out.push({ slotKey: `${id}:${i}`, slot: s, missionId: id }); });
  }
  return out;
}

// Nächste Variante im selben Muster: Variantenliste des Platzes, sonst Alternativen bzw. leichtere/schwerere Stufe.
export function nextVariant(slot, current, getDef = defaultGetDef) {
  if (slot.variants?.length > 1) {
    const at = slot.variants.indexOf(current);
    const v = slot.variants[(at + 1) % slot.variants.length];
    if (v !== current) return v;
  }
  const d = getDef(current);
  return d?.alternatives?.[0] || d?.harder || d?.easier || null;
}

/**
 * @returns {{stage1: object[], stage2: boolean}}
 */
export function stagnationStatus(data, { getDef = defaultGetDef } = {}) {
  const arc = data.engine.arc;
  if (!arc || arc.week === 1) return { stage1: [], stage2: false };
  const bw = data.settings.bodyweight || 80;
  // Einheiten des laufenden Arcs, ohne Woche 1, ohne Deload/Wiedereinstieg, ohne die ersten 2 nach einer Pause
  const arcSessions = data.sessions.filter((s) => s.kind === 'mission' && s.arc?.n === arc.n);
  const skip = new Set();
  arcSessions.forEach((s, i) => { if (s.afterPause) { skip.add(s.id); if (arcSessions[i + 1]) skip.add(arcSessions[i + 1].id); } });
  const usable = arcSessions.filter((s) => s.arc.week > 1 && s.modifier === 'none' && !skip.has(s.id));

  const stage1 = [];
  for (const { slotKey, slot, missionId } of mainSlots()) {
    const current = data.engine.slotVariant?.[slotKey] || slot.ex;
    const def = getDef(current);
    if (!def) continue;
    const values = usable.flatMap((s) => (s.exercises || [])
      .filter((e) => e.key === current || e.exId === current)
      .map((e) => performance(def, e.sets, bw)))
      .filter((v) => v != null);
    const kind = isStalled(values);
    if (!kind) continue;
    if ((data.engine.stagnationDismissed?.[slotKey] ?? -1) >= values.length) continue;
    stage1.push({ slotKey, missionId, exId: current, pattern: def.tags[0]?.[0], kind, sessions: values.length,
      suggestion: nextVariant(slot, current, getDef),
      reason: kind === 'flat'
        ? `${def.name}: drei Einheiten ohne Fortschritt.`
        : `${def.name}: zweimal in Folge unter deinem Bestwert in diesem Arc.` });
  }
  const patterns = new Set(stage1.map((x) => x.pattern));
  return { stage1, stage2: patterns.size >= 3 };
}
