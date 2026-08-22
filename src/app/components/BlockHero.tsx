// The MAINXP Block Hero — the original character system (VISUAL_SYSTEM_2).
//
// A modular, collectible-toy figure: geometric silhouette, adult proportions,
// readable at 32 / 64 / 128 px. Entirely original — no licensed IP, no anime
// costume, no minifigure geometry. Everything visible is EARNED:
//   level 10  → a discreet gold band (kept from the pixel era)
//   level 25  → back piece + a soft aura in the dominant attribute's color
//   level 50  → ambient particles: the path has become presence
// The chest core is always the dominant attribute — two users at the same
// level look different because they LIVED differently, which is the point.
//
// Gear ids are the existing catalog (src/lib/mainxp/gear.ts): recolors and
// overlays, cosmetics only. The old PixelHero call sites migrate by import
// swap — same props, no data change.

import type { CSSProperties } from "react";
import type { MxAttribute } from "@/generated/prisma/client";

export type Dominant = MxAttribute;

const ACCENT: Record<Dominant, string> = {
  STRENGTH: "#10b981",
  ENDURANCE: "#22c55e",
  FOCUS: "#3b82f6",
  DISCIPLINE: "#7c3aed",
  KNOWLEDGE: "#2563eb",
  STRATEGY: "#f97316",
  WEALTH: "#ca8a04",
  MIND: "#14b8a6",
  SOCIAL: "#fb7185",
};

const has = (gear: string[], id: string) => gear.includes(id);

export function BlockHero({
  level = 1,
  size = 72,
  gear = [],
  dominant = "DISCIPLINE",
  className,
}: {
  level?: number;
  size?: number;
  gear?: string[];
  /** The attribute with the most earned XP — decides the core and the aura. */
  dominant?: Dominant;
  className?: string;
}) {
  const accent = ACCENT[dominant] ?? ACCENT.DISCIPLINE;
  const torso = has(gear, "hoodie_vert") ? "#0f8a62" : has(gear, "hoodie_or") ? "#b8860b" : "#6d28d9";
  const torsoDeep = has(gear, "hoodie_vert") ? "#065f46" : has(gear, "hoodie_or") ? "#8a6508" : "#4c1d95";
  const shoes = has(gear, "chaussures_rouges") ? "#dc2626" : "#2f3440";
  const aura = level >= 25;
  const sparks = level >= 50;
  // ids must be unique per instance — several heroes can share one screen.
  const uid = `bh${level}-${dominant}-${gear.join("")}`.replace(/[^a-zA-Z0-9-]/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`Personnage MAINXP niveau ${level}`}
      className={className}
      style={{ "--hero-accent": accent } as CSSProperties}
    >
      <defs>
        <linearGradient id={`${uid}-torso`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={torso} />
          <stop offset="1" stopColor={torsoDeep} />
        </linearGradient>
        <radialGradient id={`${uid}-aura`}>
          <stop offset="0" stopColor={accent} stopOpacity="0.16" />
          <stop offset="0.72" stopColor={accent} stopOpacity="0.05" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {aura && <circle cx="60" cy="60" r={sparks ? 53 : 47} fill={`url(#${uid}-aura)`} />}
      {sparks && (
        <g fill={accent} opacity="0.65">
          <circle cx="29" cy="46" r="2.6" />
          <circle cx="93" cy="38" r="2" />
          <circle cx="89" cy="80" r="1.8" />
        </g>
      )}

      {/* ground shadow keeps the figure planted at any size */}
      <ellipse cx="60" cy="109" rx="27" ry="4.5" fill="#1c1917" opacity="0.10" />

      {/* back piece — earned at 25, quiet, never a superhero cape */}
      {level >= 25 && (
        <path d="M39 58 Q26 73 32 99 L48 91 L72 91 L88 99 Q94 73 81 58Z" fill="#312e81" opacity="0.85" />
      )}

      {/* legs — split geometric stance */}
      <path d="M43 82 L58 82 L56 103 L38 103Z" fill="#28303d" />
      <path d="M62 82 L77 82 L82 103 L64 103Z" fill="#242a34" />
      <rect x="34" y="99" width="24" height="9" rx="4.5" fill={shoes} />
      <rect x="62" y="99" width="24" height="9" rx="4.5" fill={shoes} />

      {/* arms — short capsules, slightly open */}
      <rect x="27" y="55" width="16" height="34" rx="7" transform="rotate(7 27 55)" fill={torso} />
      <rect x="77" y="55" width="16" height="34" rx="7" transform="rotate(-7 77 55)" fill={torso} />
      <circle cx="32" cy="88" r="6" fill="#dca47d" />
      <circle cx="88" cy="88" r="6" fill="#dca47d" />

      {/* torso — tapered block, the silhouette that makes it OURS */}
      <path d={`M39 52 Q60 46 81 52 L77 86 Q60 92 43 86Z`} fill={`url(#${uid}-torso)`} />
      <path d="M60 51 L60 84" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />

      {/* the mastery core: dominant attribute, earned by living */}
      <path d="M60 62 L66 68 L60 76 L54 68Z" fill={accent} />
      <path d="M60 64.5 L63 68 L60 71.8 L57 68Z" fill="#ffffff" opacity="0.75" />

      {/* neck + head — rounded block, adult, not a cylinder */}
      <rect x="54" y="43" width="12" height="11" rx="4" fill="#dca47d" />
      <rect x="39" y="17" width="42" height="36" rx="13" fill="#e8b48c" />
      {/* hair — asymmetric geometric sweep */}
      <path d="M40 31 Q39 15 56 13 Q75 10 82 26 L78 21 Q70 24 62 21 Q54 29 40 31Z" fill="#2d2724" />

      {/* face — two-point eyes, small warm mouth */}
      <rect x="49" y="34" width="4" height="4" rx="2" fill="#231f20" />
      <rect x="68" y="34" width="4" height="4" rx="2" fill="#231f20" />
      <path d="M55 44 Q60 47 65 44" fill="none" stroke="#9a5e48" strokeWidth="1.6" strokeLinecap="round" />

      {/* cosmetic gear — the existing catalog, worn honestly */}
      {has(gear, "lunettes") && (
        <g fill="none" stroke="#232832" strokeWidth="2.4">
          <rect x="44" y="30" width="13" height="10" rx="4" />
          <rect x="64" y="30" width="13" height="10" rx="4" />
          <path d="M57 35 H64" />
        </g>
      )}
      {has(gear, "bandana_bleu") && (
        <path d="M39 27 Q60 22 81 27 L80 32 Q60 28 40 32Z" fill="#2563eb" />
      )}

      {/* level-10 band, unless the bandana already owns the brow */}
      {level >= 10 && !has(gear, "bandana_bleu") && (
        <path d="M44 22 Q60 18 76 22" fill="none" stroke="#d4a017" strokeWidth="3" strokeLinecap="round" />
      )}
    </svg>
  );
}
