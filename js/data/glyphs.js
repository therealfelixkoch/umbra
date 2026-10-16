// Glyph-System: Attribute (Gelenkaktion / Bewegungsmuster) + Ausprägung (Farbe).

export const EXPRESSIONS = {
  kraft: { name: 'Kraft', color: '#ff4d5e' },
  explosiv: { name: 'Explosivität', color: '#ff5fc8' },
  elastisch: { name: 'Elastizität', color: '#a874ff' },
  mobil: { name: 'Mobilität', color: '#4da3ff' },
  proprio: { name: 'Propriozeption', color: '#3fd68a' },
  ausdauer: { name: 'Ausdauer', color: '#ffd23f' },
  stabil: { name: 'Stabilität', color: '#ff9a3c' },
};

// Kürzel sind die „Glyphe“ im Chip.
export const ATTRIBUTES = {
  v_pull: { name: 'Vertikales Ziehen', short: '↑Z' },
  h_pull: { name: 'Horizontales Ziehen', short: '→Z' },
  v_push: { name: 'Vertikales Drücken', short: '↑D' },
  h_push: { name: 'Horizontales Drücken', short: '→D' },
  squat: { name: 'Kniebeuge-Muster', short: 'SQ' },
  hinge: { name: 'Hip Hinge', short: 'HH' },
  lunge: { name: 'Ausfallschritt / einbeinig', short: 'AS' },
  knee_ext: { name: 'Kniestreckung', short: 'KS' },
  knee_flex: { name: 'Kniebeugung', short: 'KF' },
  hip_ext: { name: 'Hüftstreckung', short: 'HS' },
  hip_flex: { name: 'Hüftbeugung', short: 'HF' },
  hip_abd: { name: 'Hüftabduktion', short: 'AB' },
  hip_add: { name: 'Hüftadduktion', short: 'AD' },
  hip_rot: { name: 'Hüftrotation', short: 'HR' },
  rotation: { name: 'Rumpfrotation', short: 'RO' },
  anti_ext: { name: 'Rumpf Anti-Extension', short: 'AE' },
  anti_lat: { name: 'Rumpf Anti-Seitneigung', short: 'AL' },
  torso_flex: { name: 'Rumpfbeugung', short: 'RB' },
  t_spine: { name: 'Brustwirbelsäule', short: 'BWS' },
  shoulder: { name: 'Schulter überkopf', short: 'SÜ' },
  scap: { name: 'Schulterblatt', short: 'SB' },
  elbow_flex: { name: 'Ellbogenbeugung', short: 'EB' },
  grip: { name: 'Griff', short: 'GR' },
  carry: { name: 'Tragen', short: 'TR' },
  neck: { name: 'Nacken', short: 'NA' },
  ankle: { name: 'Sprunggelenk', short: 'SG' },
  jump: { name: 'Springen', short: 'SP' },
  crawl: { name: 'Krabbeln / Fortbewegung', short: 'KR' },
  strike: { name: 'Schlagen / Treten', short: 'ST' },
  cardio: { name: 'Kondition', short: 'KO' },
  wrist: { name: 'Handgelenk', short: 'HG' },
};

// Aktivitätsprofile (Phase 3: Wochenabdeckung gegen diese Profile).
export const PROFILES = {
  muaythai: {
    name: 'Muay Thai',
    attributes: ['rotation', 'hip_rot', 'hip_abd', 'hip_flex', 'hip_ext', 'neck', 'strike', 'cardio',
      'anti_lat', 'ankle', 'h_push', 'grip', 't_spine'],
    expressions: ['explosiv', 'elastisch', 'ausdauer', 'mobil', 'stabil', 'proprio'],
  },
  vater: {
    name: 'Vater-Alltag',
    attributes: ['carry', 'anti_lat', 'hinge', 'squat', 'rotation', 'grip', 'lunge'],
    expressions: ['kraft', 'stabil', 'ausdauer'],
  },
};
