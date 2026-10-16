// Datums-Helfer. Alle Tage sind lokale Kalendertage als 'YYYY-MM-DD'.

const pad = (n) => String(n).padStart(2, '0');

export function toDay(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toUTC(day) {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(fromDay, toDayStr) {
  return Math.round((toUTC(toDayStr) - toUTC(fromDay)) / 86400000);
}

export function addDays(day, n) {
  const d = new Date(toUTC(day) + n * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Montag der Woche, in der `day` liegt.
export function weekStart(day) {
  const dow = new Date(toUTC(day)).getUTCDay(); // 0 = So
  return addDays(day, -((dow + 6) % 7));
}

export function monthKey(day) {
  return day.slice(0, 7);
}

export function formatDay(day) {
  const [y, m, d] = day.split('-');
  return `${d}.${m}.${y.slice(2)}`;
}
