// Körpersignale: Ellbogen-Zähler (7-Tage-Fenster) und Zwick-Melder für die übrigen Regionen.
// Alles sind Vorschläge. Die App ersetzt Übungen automatisch, du kannst es für den Tag ablehnen.
import { getDef as defaultGetDef } from '../data/exercises.js';
import { addDays, daysBetween, weekStart } from './dates.js';

export const WINDOW = 7;
export const DEFAULT_ELBOW_THRESHOLD = 3;
export const PHYSIO_WEEKS = 3;

export const REGIONS = {
  schulter: 'Schulter', handgelenk: 'Handgelenk', ruecken: 'Unterer Rücken', huefte: 'Hüfte / Leiste',
  knie: 'Knie', sprunggelenk: 'Sprunggelenk', nacken: 'Nacken',
};

// Welche Bewegungsmuster belasten eine Region, wenn sie mit Kraft/Explosivität ausgeführt werden
export const REGION_ATTRS = {
  schulter: ['v_push', 'h_push', 'shoulder', 'v_pull', 'scap'],
  handgelenk: ['wrist', 'h_push', 'grip'],
  ruecken: ['hinge', 'carry', 'anti_ext', 'torso_flex'],
  huefte: ['hip_add', 'hip_flex', 'hip_rot', 'hip_abd', 'lunge'],
  knie: ['knee_ext', 'knee_flex', 'jump', 'squat', 'lunge'],
  sprunggelenk: ['ankle', 'jump'],
  nacken: ['neck'],
};
const LOADED = ['kraft', 'explosiv', 'elastisch'];

export const emptySignals = () => ({ elbow: [], pain: [] });
const inWindow = (day, today) => daysBetween(day, today) >= 0 && daysBetween(day, today) < WINDOW;

// ——— Ellbogen ———
export const elbowLoad = (def) => def?.elbowLoad || 0;
// Der „gezwickt“-Tap erscheint nur bei Übungen mit Ellbogenlast.
export const showsElbowTap = (def) => elbowLoad(def) > 0;

export function elbowCount(signals, today) {
  return (signals?.elbow || []).filter((r) => inWindow(r.day, today)).length;
}

export function elbowStatus(data, today) {
  const threshold = data.settings.elbowThreshold || DEFAULT_ELBOW_THRESHOLD;
  const count = elbowCount(data.signals, today);
  return { count, threshold, full: data.settings.jointPause !== true && count >= threshold };
}

export function reportElbow(data, { day, exId = null, source }) {
  const s = data.signals || emptySignals();
  return { ...data, signals: { ...s, elbow: [...s.elbow, { day, exId, source }] } };
}

// Nach 3 Kalenderwochen in Folge mit vollem Zähler: einmal ein nüchterner Hinweis.
export function physioNoteDue(data, today) {
  if (data.engine.physioNoteShown) return false;
  const threshold = data.settings.elbowThreshold || DEFAULT_ELBOW_THRESHOLD;
  const reports = data.signals?.elbow || [];
  if (!reports.length) return false;
  const fullInWeek = (ws) => {
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      if (d > today) break;
      if (elbowCount({ elbow: reports }, d) >= threshold) return true;
    }
    return false;
  };
  let streak = 0;
  for (let ws = weekStart(today); streak < PHYSIO_WEEKS; ws = addDays(ws, -7)) {
    if (!fullInWeek(ws)) break;
    streak++;
  }
  return streak >= PHYSIO_WEEKS;
}

// ——— Zwick-Melder ———
export function reportPain(data, { day, regions }) {
  const s = data.signals || emptySignals();
  return { ...data, signals: { ...s, pain: [...s.pain, ...regions.map((region) => ({ day, region }))] } };
}

// Regionen, die in den letzten 7 Tagen gemeldet wurden (danach läuft die Anpassung aus).
export function activeRegions(signals, today) {
  return [...new Set((signals?.pain || []).filter((r) => inWindow(r.day, today)).map((r) => r.region))];
}

export function stressedRegions(def) {
  return Object.keys(REGION_ATTRS).filter((r) => (def?.tags || []).some(([a, x]) => REGION_ATTRS[r].includes(a) && LOADED.includes(x)));
}

/**
 * Ersatz für eine Übung bei aktiven Signalen.
 * @returns {null | {id:string, reason:string, lessLoad?:boolean, caution?:boolean}}
 */
export function adjustment(def, { elbowFull, regions, equipment, all, getDef = defaultGetDef }) {
  if (!def || def.mode === 'fixed' || def.cat === 'mobility') return null;
  const available = (d) => (d.equipment || []).every((e) => equipment.includes(e));
  // Ellbogen zuerst: nur Übungen mit hoher Ellbogenlast
  if (elbowFull && elbowLoad(def) >= 2 && def.elbowAlt) {
    if (def.elbowAlt === 'lessLoad') return { id: def.id, lessLoad: true, reason: 'Ellbogen: weniger Zusatzgewicht' };
    const alt = getDef(def.elbowAlt);
    if (alt && available(alt)) return { id: alt.id, reason: `Ellbogen: ${alt.name} statt ${def.name}` };
  }
  const hit = regions.filter((r) => stressedRegions(def).includes(r));
  if (!hit.length) return null;
  // Gleiches Bewegungsmuster (Primär-Attribut), aber ohne Last auf der gemeldeten Region
  const pattern = def.tags[0]?.[0];
  const direct = [...(def.alternatives || []), def.easier].filter(Boolean);
  const candidates = Object.values(all)
    .filter((d) => d.id !== def.id && d.cat !== 'mobility' && d.mode !== 'fixed' && available(d))
    .filter((d) => direct.includes(d.id) || d.tags.some(([a]) => a === pattern))
    .filter((d) => !hit.some((r) => stressedRegions(d).includes(r)))
    .sort((a, b) => (direct.includes(b.id) ? 1 : 0) - (direct.includes(a.id) ? 1 : 0));
  const names = hit.map((r) => REGIONS[r]).join(', ');
  if (candidates.length) return { id: candidates[0].id, reason: `${names}: ${candidates[0].name} statt ${def.name}` };
  return { id: def.id, caution: true, reason: `${names}: ${def.name} nur locker und schmerzfrei, notfalls weglassen` };
}

/**
 * Muster: Region meldet sich innerhalb von 1–3 Tagen nach einer bestimmten Übung, mindestens zweimal.
 * @returns {{region:string, exId:string, lag:number, count:number, text:string}[]}
 */
export function painPatterns(data, { from = '0000-00-00', to = '9999-99-99', getDef = defaultGetDef } = {}) {
  const reports = (data.signals?.pain || []).filter((r) => r.day >= from && r.day <= to);
  const counts = new Map();
  for (const r of reports) {
    const seen = new Set();
    for (const s of data.sessions) {
      const lag = daysBetween(s.day, r.day);
      if (lag < 1 || lag > 3) continue;
      const ids = [...(s.exercises || []).filter((e) => e.sets?.some((x) => x.done)).map((e) => e.exId), ...(s.items || [])];
      for (const id of ids) {
        const def = getDef(id);
        if (!def || !stressedRegions(def).includes(r.region)) continue;
        const key = `${r.region}|${id}|${lag}`;
        if (seen.has(key)) continue;
        seen.add(key);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  return [...counts.entries()].filter(([, n]) => n >= 2).map(([key, count]) => {
    const [region, exId, lag] = key.split('|');
    const name = getDef(exId).name;
    return { region, exId, lag: Number(lag), count,
      text: `${REGIONS[region]} meldet sich ${lag === '1' ? 'einen Tag' : `${lag} Tage`} nach ${name} (${count}×).` };
  }).sort((a, b) => b.count - a.count);
}
