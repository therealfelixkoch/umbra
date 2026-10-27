// Lore-Bilder (WebP in assets/lore/, Dateinamen laut docs/umbra-bild-prompts.md).
// Fehlt ein Bild, zeigt die App einen SVG-Platzhalter in derselben Bildsprache.

export const LORE_DIR = 'assets/lore/';
export const LORE_BG = '#0B0A10';
export const MAX_KB = 300;

// Wächter-Stufen 0–5 (Pose identisch, Detailgrad steigt). ratio = Breite/Höhe
export const GUARDIANS = [
  { id: 'guardian-0', file: 'guardian-0-shade.webp', name: 'SHADE', ratio: 3 / 4 },
  { id: 'guardian-1', file: 'guardian-1-blade.webp', name: 'BLADE', ratio: 3 / 4 },
  { id: 'guardian-2', file: 'guardian-2-warden.webp', name: 'WARDEN', ratio: 3 / 4 },
  { id: 'guardian-3', file: 'guardian-3-phantom.webp', name: 'PHANTOM', ratio: 3 / 4 },
  { id: 'guardian-4', file: 'guardian-4-umbra.webp', name: 'UMBRA', ratio: 3 / 4 },
  { id: 'guardian-5', file: 'guardian-5-unbreakable.webp', name: 'UNZERBRECHLICH', ratio: 3 / 4, gold: true },
];

// Saison-Wächter (Saison-Index 0–3: Winter, Frühjahr, Sommer, Herbst) und Nemesis.
// Bilder fehlen noch (Prompts in docs/umbra-bild-prompts.md), bis dahin zeigt die App eine Silhouette.
export const BOSSES = {
  coldiron: { file: 'warden-coldiron.webp', name: 'COLDIRON', arc: 0, shape: 'colossus', ratio: 3 / 4 },
  stormlung: { file: 'warden-stormlung.webp', name: 'STORMLUNG', arc: 1, shape: 'wraith', ratio: 3 / 4 },
  scorch: { file: 'warden-scorch.webp', name: 'SCORCH', arc: 2, shape: 'shards', ratio: 3 / 4 },
  wither: { file: 'warden-wither.webp', name: 'WITHER', arc: 3, shape: 'serpent', ratio: 3 / 4 },
  plateau: { file: 'nemesis-plateau.webp', name: 'THE PLATEAU', nemesis: true, shape: 'monolith', ratio: 3 / 4 },
};
export const BOSS_BY_ARC = ['coldiron', 'stormlung', 'scorch', 'wither'];
/** Name mit Jahreszahl: COLDIRON, COLDIRON II … */
export const guardianName = (n) => {
  const b = BOSSES[BOSS_BY_ARC[((n % 4) + 4) % 4]];
  const y = Math.floor(n / 4) + 1;
  return y > 1 ? `${b.name} ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][y] || y}` : b.name;
};

// Saison-Szenen (4:5): Establishing, Konfrontation, Sieg, Rückzug
export const SCENE_KINDS = ['establishing', 'confront', 'victory', 'retreat'];
export const sceneFile = (arcIndex, kind) => `season${arcIndex + 1}-${kind}.webp`;
export const NEMESIS_SCENES = { appears: 'nemesis-appears.webp', fades: 'nemesis-fades.webp' };

export const EXTRAS = { splash: { file: 'splash.webp', ratio: 9 / 16 }, icon: { file: 'icon-1024.png', ratio: 1 } };

// Optionale Missions-Banner (16:9)
export const MISSION_BANNERS = {
  A: 'mission-ascent.webp', B: 'mission-bedrock.webp', C: 'mission-impact.webp', D: 'mission-infiltration.webp',
  QUICK: 'mission-quickstrike.webp', EXPRESS: 'mission-shadowstep.webp', FLOW: 'mission-flow.webp',
  ARENA: 'mission-arena.webp', FORGE: 'mission-forge.webp',
};

// Alle erwarteten Dateien (für Precache und Archiv-Übersicht)
export function allLoreFiles() {
  const scenes = [0, 1, 2, 3].flatMap((a) => SCENE_KINDS.map((k) => sceneFile(a, k)));
  return [
    ...GUARDIANS.map((g) => g.file),
    ...Object.values(BOSSES).map((b) => b.file),
    ...scenes,
    ...Object.values(NEMESIS_SCENES),
    EXTRAS.splash.file,
    ...Object.values(MISSION_BANNERS),
  ];
}

// Gesamtrang → Wächter-Stufe (SHADE 0 … Unzerbrechlich 5)
export function guardianTier(rankId) {
  return { SHADE: 0, BLADE: 1, WARDEN: 2, PHANTOM: 3, UMBRA: 4, UNBREAKABLE: 5 }[rankId] ?? 0;
}
