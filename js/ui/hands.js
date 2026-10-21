// HANDS: 5 Minuten für Hände und Handgelenke, unabhängig vom Handgelenk-Modul.
// Karte auf Heute (morgens, bei „Nur 5 Minuten“ und unterwegs), Minuten pro Woche als Statistik.
import { weekStart } from '../engine/dates.js';

/** HANDS-Minuten und Anzahl in der laufenden Woche. */
export function handsWeek(sessions, today) {
  const ws = weekStart(today);
  const list = sessions.filter((s) => s.kind === 'hands' && s.day >= ws && s.day <= today);
  return { count: list.length, minutes: list.reduce((n, s) => n + Math.max(1, s.minutes || 5), 0) };
}

/** Karte auf Heute: morgens, bei „Nur 5 Minuten“, unterwegs oder mit aktivem Handgelenk-Modul; nicht, wenn heute schon erledigt. */
export function handsCard(c, rec = null) {
  const today = c.today();
  if (c.data.sessions.some((s) => s.kind === 'hands' && s.day === today)) return '';
  if (rec?.kind === 'five') return ''; // steht schon als Hauptkarte da
  const travel = c.data.checkins[today]?.where === 'travel';
  const morning = new Date().getHours() < 12;
  if (!morning && !travel && !c.data.wrist?.on) return '';
  const wk = handsWeek(c.data.sessions, today);
  return `<section class="card flow-card hands-card"><div><b>HANDS</b><small>5 min für Hände und Handgelenke${wk.count ? ` · diese Woche ${wk.minutes} min` : ''}</small></div>
    <button class="btn primary" data-act="start" data-id="HANDS">Start</button></section>`;
}
