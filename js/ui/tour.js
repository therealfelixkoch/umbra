// Geführte Tour: markiert nacheinander echte Stellen der App mit kurzer Erklärung.
// Startet einmal nach dem Saison-Update (settings.tourSeen) und jederzeit aus dem Kodex-Handbuch oder dem Setup.
import { esc } from './kit.js';

export const TOUR = [
  { route: 'heute', sel: '.strip', title: 'Status', text: 'Rang, Kampfkraft und das Kapitel als 15 Einheiten. Rechts unten die Woche: zwei Rauten für Gym, eine für Muay Thai. Tippen öffnet das Profil.' },
  { route: 'heute', sel: '.daily-quote', title: 'Tageszitat', text: 'Jeden Tag ein anderes. Quellen kannst du im Setup abschalten.' },
  { route: 'heute', sel: '.sys', title: 'Was geht heute?', text: 'Eine Frage am Tag: Gym, Muay Thai, beides oder nichts. Bei Gym zeigt die App die nächste Einheit von A, B, C, dazu die Kurzversion mit ca. 30 min, die voll zählt. Nichts verfällt. Darunter liegen Karten für TEMPER, HANDS, FEET und Hinweise.' },
  { route: 'heute', sel: '.tabbar', title: 'Unten', text: 'ARENA für Muay Thai, Kodex für Übungen und das Handbuch, Profil für Saison, Erfolge, Gelenke, Equipment und Verlauf.' },
  { route: 'profil', sel: '.unit-track', fallback: '.sys', title: 'Programm und Kapitel', text: 'Hier steht das aktive Programm, wo du im Kapitel stehst (15 Einheiten) und wohin die Saison geht. Unter Setup liegt die Bibliothek.' },
  { route: 'profil', sel: '.micro-list', fallback: '.asc-grid', title: 'Erfolge', text: 'Kapitel-Erfolge pro Kapitel, dazu Abzeichen, Errungenschaften und die seltenen großen Errungenschaften.' },
  { route: 'kodex', sel: '.archive-link.wide', fallback: '.h', title: 'Handbuch', text: 'Alle Erklärungen gesammelt. Überall in der App gibt es kleine „?“-Punkte, die genau das erklären, was du gerade siehst. Im Training z. B. RIR, Top-Satz, Aufwärmsätze, Superset und + Satz.' },
];

let i = -1;
export const tourActive = () => i >= 0;

export function startTour(c) { i = 0; c.go(TOUR[0].route); setTimeout(() => drawTour(c), 250); }

export function drawTour(c) {
  let el = document.getElementById('tour');
  if (i < 0) { if (el) el.remove(); return; }
  const step = TOUR[i];
  const route = location.hash.replace('#', '').split('/')[0] || 'heute';
  if (route !== step.route) { c.go(step.route); setTimeout(() => drawTour(c), 250); return; }
  const target = document.querySelector(step.sel) || (step.fallback && document.querySelector(step.fallback));
  if (!el) { el = document.createElement('div'); el.id = 'tour'; document.body.appendChild(el); }
  let box = '';
  if (target) {
    target.scrollIntoView({ block: 'center' });
    const r = target.getBoundingClientRect();
    box = `<div class="tour-hole" style="top:${r.top - 6}px;left:${r.left - 6}px;width:${r.width + 12}px;height:${r.height + 12}px"></div>`;
  }
  el.innerHTML = `${box}<div class="tour-card"><small>Tour ${i + 1}/${TOUR.length}</small><b>${esc(step.title)}</b><p>${esc(step.text)}</p>
    <div class="row gap"><button class="btn ghost" data-act="tour-end">Beenden</button><button class="btn primary grow" data-act="tour-next">${i === TOUR.length - 1 ? 'Fertig' : 'Weiter'}</button></div></div>`;
}

export const tourActions = {
  'tour-start': (c) => startTour(c),
  'tour-next': (c) => {
    i += 1;
    if (i >= TOUR.length) { tourActions['tour-end'](c); return; }
    drawTour(c);
  },
  'tour-end': (c) => {
    i = -1;
    drawTour(c);
    if (!c.data.settings.tourSeen) c.update((data) => ({ ...data, settings: { ...data.settings, tourSeen: true } }));
  },
};
