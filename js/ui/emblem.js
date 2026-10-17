// Rang-Embleme als SVG: Sechseck, innen ein Zeichen, das mit jedem Rang an Form gewinnt.
// SHADE: Rauchpunkt · BLADE: Klinge · WARDEN: Klinge mit Parierstange · PHANTOM: gekreuzte Klingen ·
// UMBRA: Eklipse · Unzerbrechlich: goldene Eklipse mit Ring.
const V = '#8b7dff';
const G = '#ffcf5a';

const MARKS = [
  '<circle cx="32" cy="34" r="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 3" opacity=".7"/>',
  '<path d="M32 16v30M29 46h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  '<path d="M32 15v31M24 38h16M29 48h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  '<path d="M21 17l22 30M43 17L21 47M18 41l8-6M46 41l-8-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  '<circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="36" cy="29" r="10" fill="#0B0A10"/>',
  '<circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".7"/><circle cx="32" cy="32" r="11" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="35.5" cy="29.5" r="9" fill="#0B0A10"/><circle cx="41" cy="25" r="1.6" fill="currentColor"/>',
];

export function rankEmblem(index, { size = 56 } = {}) {
  const i = Math.max(0, Math.min(5, index));
  const col = i === 5 ? G : V;
  return `<svg class="emblem tier-${i}" width="${size}" height="${size}" viewBox="0 0 64 64" style="color:${col}" aria-hidden="true">
    <path d="M32 3l25 14.5v29L32 61 7 46.5v-29z" fill="#100e19" stroke="currentColor" stroke-width="${1.5 + i * 0.3}" stroke-opacity="${0.5 + i * 0.1}"/>
    ${MARKS[i]}</svg>`;
}
