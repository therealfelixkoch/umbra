// TEMPER: tägliches Ritual für den Geist, unabhängig von den Arcs. Episoden = Story + getaktete Übung + Klarheit.
// Skripte sind Daten: eine Folge von Abschnitten, jeder mit Typ und Dauer (oder ohne Dauer = per Tipp weiter).
//   guide   Text-Hinweise, gleichmäßig über die Dauer verteilt
//   count   Klinge: Atemzüge 1–10 zählen; tap = Abschweif-Taps werden gezählt (nicht bewertet)
//   breath  geführter Kreis: out = Ausatem in s (4 s ein)   ·   sigh: physiologische Seufzer (cycles)
//   wave    90 s Welle   ·   scan: ECHO-Scan über Regionen (mode: release | ask | name | warm)
//   wimhof  eine Runde (Tipp startet/stoppt das Halten)   ·   co2: CO2-Test   ·   choice: Regler hoch/runter
//   reset   3-Atemzüge-Reset (reps)   ·   map: Innenkarte (3 Orte antippen)   ·   silent: nur Ton am Anfang und Ende
import { BOOK1_TEXT, BOOK1_PARTS } from './temper-book1.js';

export const ECHO_DEFAULT = 'tritt aus deinem Mund, klein, dunkel, mit deinen Augen';

export const BODY = {
  head: ['Stirn', 'Augen', 'Kiefer', 'Zunge'],
  neck: ['Hals', 'Nacken', 'Schultern'],
  core: ['Hals', 'Brust', 'Bauch'],
  arms: ['Schultern', 'Oberarme', 'Unterarme', 'Hände', 'oberer Rücken', 'unterer Rücken'],
  full: ['Scheitel', 'Stirn', 'Augen', 'Kiefer', 'Nacken', 'Schultern', 'Arme', 'Hände', 'Brust', 'Bauch', 'Rücken', 'Becken', 'Oberschenkel', 'Knie', 'Unterschenkel', 'Füße'],
  stress: ['Kiefer', 'Nacken', 'Schultern', 'Brust', 'Bauch'],
  jaw: ['Schultern', 'Kiefer'],
};
// Orte für die Innenkarte (Episode 20)
export const MAP_PLACES = ['Stirn', 'Kiefer', 'Nacken', 'Schultern', 'Brust', 'Bauch', 'Hände', 'unterer Rücken', 'Hüfte', 'Beine'];
export const FEELING_WORDS = ['eng', 'heiß', 'schwer', 'leer', 'kalt', 'unruhig', 'weit', 'ruhig'];

const OBSERVE = ['Bequem sitzen. Augen zu.', 'Der Atem kommt. Der Atem geht.', 'Nichts verändern. Nur hinhören.',
  'Wo spürst du ihn am deutlichsten? Nase, Brust, Bauch.', 'Wenn du abschweifst: einfach zurück zum Atem.', 'Noch ein paar Atemzüge. Nur beobachten.'];
const intro = (sec, cues) => ({ t: 'guide', sec, cues });
const count = (sec, o = {}) => ({ t: 'count', sec, tap: true, ...o });

/** Übungsskripte für Buch I, nach Episode. */
export const BOOK1_SCRIPTS = {
  1: [intro(300, OBSERVE)],
  2: [intro(20, ['Augen zu. Zähl beim Ausatmen: eins.', 'Beim nächsten Ausatmen: zwei. Bis zehn, dann von vorn.']), count(280, { tap: false })],
  3: [intro(20, ['Zähl beim Ausatmen bis zehn.', 'Verzählt oder abgeschweift? Ein Tipp irgendwo. Zurück zu eins.']), count(280)],
  4: [{ t: 'breath', sec: 120, out: 6 }, count(180)],
  5: [{ t: 'co2' }, count(180)],
  6: [count(300, { thought: 'Gedanke' })],
  7: [count(360, { thought: 'planen · erinnern · sorgen' })],
  8: [intro(15, ['Heute ohne Zählen. Der Atem ist der Anker.', 'Gedanken sind Wolken über der Stadt. Sieh zu, wie sie weiterziehen. Abgedriftet? Tipp.']),
    { t: 'guide', sec: 345, tap: true, cues: ['Atem als Anker.', 'Eine Wolke zieht auf. Lass sie ziehen.', 'Du bist nicht die Wolke. Du bist der, der zusieht.', 'Zurück zum Atem.'] }],
  9: [{ t: 'wave', sec: 90 }, count(270)],
  10: [{ t: 'silent', sec: 420, tap: true }],
  11: [{ t: 'echo' }, { t: 'scan', sec: 360, regions: BODY.head, mode: 'release' }],
  12: [{ t: 'scan', sec: 360, regions: [...BODY.head, ...BODY.neck], mode: 'release' }],
  13: [{ t: 'scan', sec: 420, regions: BODY.core, mode: 'ask' }],
  14: [{ t: 'scan', sec: 420, regions: BODY.arms, mode: 'release' }],
  15: [{ t: 'scan', sec: 480, regions: BODY.full, mode: 'release' }],
  16: [{ t: 'scan', sec: 360, regions: BODY.full, mode: 'name' }],
  17: [{ t: 'scan', sec: 270, regions: BODY.stress, mode: 'name' }, { t: 'sigh', cycles: 5, sec: 45 }, count(45)],
  18: [intro(45, ['Denk an einen Moment, der dich wütend gemacht hat. Nicht hineinsteigern, nur erinnern.', 'Wo sitzt die Wut gerade im Körper?']),
    { t: 'scan', sec: 135, regions: ['Kiefer', 'Brust', 'Fäuste', 'Bauch'], mode: 'name' }, { t: 'breath', sec: 180, out: 8 }],
  19: [{ t: 'scan', sec: 360, regions: BODY.full.filter((_, i) => i % 2 === 0), mode: 'warm' }],
  20: [{ t: 'scan', sec: 390, regions: BODY.full, mode: 'name' }, { t: 'map' }],
  21: [{ t: 'wimhof' }, count(120)],
  22: [{ t: 'breath', sec: 240, out: 8 }, { t: 'scan', sec: 120, regions: BODY.jaw, mode: 'release' }],
  23: [{ t: 'choice' }, count(120)],
  24: [{ t: 'wimhof' }, intro(60, ['Normal atmen. Spür nach.']), { t: 'breath', sec: 180, out: 8 }, count(60)],
  25: [{ t: 'co2' }, count(180)],
  26: [{ t: 'reset', reps: 5 }, count(120)],
  27: [count(300, { eyes: 'open' }), { t: 'scan', sec: 60, regions: ['Kiefer', 'Schultern', 'Bauch'], mode: 'release' }],
  28: [count(360, { eyes: 'open', loud: true })],
  29: [{ t: 'scan', sec: 120, regions: 'map', mode: 'release' }, { t: 'reset', reps: 1 },
    intro(120, ['Geh die erste Minute durch. Der Weg dorthin, die Tür, der erste Blick.', 'Ruhig. Klar. Du weißt, was du tust.', 'Der erste Schlag, das erste Wort. Ruhig.', 'Atme. ECHO war schon da.'])],
  30: [{ t: 'free' }, { t: 'co2' }],
};

export const BOOKS = [
  {
    n: 1, id: 'HEAT', name: 'ERWACHEN', minutes: '5–8', parts: BOOK1_PARTS,
    episodes: BOOK1_TEXT.map((e) => ({ ...e, script: BOOK1_SCRIPTS[e.n] })),
    done: 'Systemmeldung: Stufe HEAT abgeschlossen. Der Stahl ist heiß. Jetzt wird er geschlagen.',
  },
  // Buch II–V folgen (Buch II wird vorher abgestimmt).
];

export const STAGES = ['HEAT', 'HAMMER', 'QUENCH', 'TEMPER', 'EDGE'];

/** Situations-Einsätze, frei ab einer Episode von Buch I. */
export const MISSIONS_T = [
  { id: 'prefight', name: 'Vor dem Kampf / Termin', sub: '3-Atemzüge-Reset und ein Satz von ECHO', from: 26,
    script: [{ t: 'reset', reps: 1 }, intro(15, ['ECHO: „Ich hab nachgesehen. Du bist bereit. Atme.“'])] },
  { id: 'stress', name: 'Nach Stress oder Wut', sub: '3 min ECHO-Scan mit Benennen', from: 18,
    script: [{ t: 'scan', sec: 180, regions: 'map', mode: 'name' }] },
  { id: 'craving', name: 'Verlangen', sub: 'Handy, Essen, Drink · 90 s Welle', from: 9,
    script: [{ t: 'wave', sec: 90 }, intro(30, ['ECHO: „Benenn es. Was zieht gerade? Ein Wort.“', 'ECHO: „Es war eine Welle. Sie ist gebrochen.“'])] },
  { id: 'nsdr', name: 'Zu wenig geschlafen', sub: '10 min NSDR mit ECHO-Scan', from: 15,
    script: [{ t: 'nsdr', sec: 600 }] },
  { id: 'sleep', name: 'Kann nicht einschlafen', sub: 'langes Ausatmen und langsamer ECHO-Scan', from: 22,
    script: [{ t: 'breath', sec: 240, out: 8 }, { t: 'scan', sec: 360, regions: BODY.full, mode: 'warm', soft: true }] },
];

/** Was die einzelnen Bausteine körperlich tun (1–2 Sätze, ohne Esoterik). */
export const WHY = {
  breath: 'Ein langer Ausatem aktiviert über den Vagusnerv den Teil des Nervensystems, der Puls und Anspannung senkt.',
  sigh: 'Zweimal einatmen öffnet zusammengefallene Lungenbläschen, das lange Ausatmen senkt den CO2-Druck: der schnellste bekannte Weg, Stress im Moment zu senken.',
  count: 'Zählen gibt der Aufmerksamkeit einen festen Punkt. Jedes Zurückkommen trainiert das Netzwerk, das Ablenkung bemerkt und umlenkt.',
  scan: 'Aufmerksamkeit durch den Körper zu führen verbessert die Wahrnehmung innerer Signale. Gefühle zu benennen dämpft messbar die Alarmreaktion.',
  wimhof: 'Schnelles tiefes Atmen senkt kurzzeitig das CO2 im Blut und schüttet Adrenalin aus: wacher, wärmer, aktiver. Nur im Sitzen oder Liegen.',
  co2: 'Wie lange du langsam ausatmen kannst, zeigt grob, wie gelassen dein Atemsystem auf CO2 reagiert. Es steigt mit ruhiger Übung.',
  wave: 'Verlangen steigt, erreicht einen Gipfel und fällt, meist innerhalb weniger Minuten, wenn du ihm nicht folgst.',
  nsdr: 'Tiefe Entspannung ohne Schlaf (Non-Sleep Deep Rest) senkt Anspannung und kann sich nach kurzen Nächten erholsam anfühlen.',
  reset: 'Drei lange Ausatmer und lockere Schultern sind kurz genug für jeden Moment und senken spürbar die Erregung.',
};
