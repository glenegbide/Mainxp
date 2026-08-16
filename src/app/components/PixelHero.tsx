// Original MAINXP pixel hero (no licensed IP — Part 57). Starts plain, earns
// visual upgrades at level tiers (10: gold headband, 25: cape; 50/75/100 with
// the full Phase 2+ character system) and can wear cosmetic gear bought with
// Coins (src/lib/mainxp/gear.ts) — cosmetics only, never prestige.

const SKIN = "#e9b48a";
const SKIN_D = "#d99f74";
const HAIR = "#2d2622";
const EYE = "#1c1917";
const HOODIE = "#7c3aed";
const HOODIE_D = "#5b21b6";
const ZIP = "#c4b5fd";
const PANTS = "#27313f";
const SHOE = "#f4f1ec";
const GOLD = "#fbbf24";
const CAPE = "#312e81";

type Px = [x: number, y: number, w: number, color: string];

const BASE: Px[] = [
  // hair
  [3, 0, 6, HAIR],
  [2, 1, 8, HAIR],
  [2, 2, 2, HAIR], [8, 2, 2, HAIR],
  // face
  [4, 2, 4, SKIN],
  [3, 3, 6, SKIN],
  [3, 4, 6, SKIN],
  [4, 5, 4, SKIN_D],
  // eyes
  [4, 3, 1, EYE], [7, 3, 1, EYE],
  // hoodie
  [3, 6, 6, HOODIE],
  [2, 7, 8, HOODIE],
  [1, 8, 10, HOODIE],
  [2, 9, 8, HOODIE],
  // sleeves shading + zipper
  [1, 8, 1, HOODIE_D], [10, 8, 1, HOODIE_D],
  [2, 7, 1, HOODIE_D], [9, 7, 1, HOODIE_D],
  [5, 7, 1, ZIP], [6, 8, 1, ZIP], [5, 9, 1, ZIP],
  // pants
  [3, 10, 6, PANTS],
  [3, 11, 2, PANTS], [7, 11, 2, PANTS],
  // shoes
  [2, 12, 3, SHOE], [7, 12, 3, SHOE],
];

const HEADBAND: Px[] = [[2, 2, 8, GOLD]];
const CAPE_PX: Px[] = [
  [0, 7, 1, CAPE], [0, 8, 1, CAPE], [0, 9, 1, CAPE], [0, 10, 1, CAPE],
  [11, 7, 1, CAPE], [11, 8, 1, CAPE], [11, 9, 1, CAPE], [11, 10, 1, CAPE],
];

/** Cosmetic layers: recolors swap palette colors; overlays add pixels on top. */
const GEAR_RECOLOR: Record<string, Array<[from: string, to: string]>> = {
  hoodie_vert: [[HOODIE, "#10b981"], [HOODIE_D, "#047857"], [ZIP, "#a7f3d0"]],
  hoodie_or: [[HOODIE, "#eab308"], [HOODIE_D, "#a16207"], [ZIP, "#fef08a"]],
  chaussures_rouges: [[SHOE, "#ef4444"]],
  bandana_bleu: [[HAIR, HAIR]], // handled as overlay below; recolor entry keeps ids uniform
};
const GEAR_OVERLAY: Record<string, Px[]> = {
  lunettes: [[3, 3, 6, "#1f2937"], [4, 3, 1, "#93c5fd"], [7, 3, 1, "#93c5fd"]],
  bandana_bleu: [[3, 0, 6, "#2563eb"], [2, 1, 8, "#3b82f6"], [10, 2, 1, "#2563eb"]],
};

export function PixelHero({
  level = 1,
  size = 56,
  gear = [],
}: {
  level?: number;
  size?: number;
  gear?: string[];
}) {
  const recolor = new Map<string, string>();
  for (const id of gear) for (const [from, to] of GEAR_RECOLOR[id] ?? []) recolor.set(from, to);

  const pixels: Px[] = [
    ...(level >= 25 ? CAPE_PX : []),
    ...BASE.map(([x, y, w, c]) => [x, y, w, recolor.get(c) ?? c] as Px),
    ...(level >= 10 ? HEADBAND : []),
    ...gear.flatMap((id) => GEAR_OVERLAY[id] ?? []),
  ];
  return (
    <svg
      width={size}
      height={Math.round((size / 12) * 13)}
      viewBox="0 0 12 13"
      role="img"
      aria-label={`Personnage niveau ${level}`}
      shapeRendering="crispEdges"
    >
      {pixels.map(([x, y, w, color], i) => (
        <rect key={i} x={x} y={y} width={w} height={1} fill={color} />
      ))}
    </svg>
  );
}
