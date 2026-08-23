// The Day Ring — the day at a glance, worn by the character.
//
// Inspiration acknowledged, execution original: Apple Fitness taught the
// world that three closing rings ARE the day; Duolingo taught that the ring
// belongs around the identity. MAINXP fuses both: your Block Hero stands
// inside the day it is building.
//
//   outer  · purple · the Main Quest (all or nothing — the day's ONE result)
//   middle · green  · non-négociables kept / total
//   inner  · blue   · deep-work minutes vs a soft 50-min target
//
// Pure SVG, server-rendered, no animation loop — the arcs simply ARE the
// state (reduced-motion safe by construction). Nothing here shows XP.

import type { ReactNode } from "react";

const TAU = 2 * Math.PI;

function Arc({
  r,
  ratio,
  stroke,
  track,
}: {
  r: number;
  ratio: number;
  stroke: string;
  track: string;
}) {
  const c = TAU * r;
  const filled = Math.max(0, Math.min(1, ratio)) * c;
  return (
    <>
      <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth="6" />
      {filled > 0 && (
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      )}
    </>
  );
}

export function DayRing({
  questDone,
  nnKept,
  nnTotal,
  focusMin,
  size = 64,
  children,
}: {
  questDone: boolean;
  nnKept: number;
  nnTotal: number;
  focusMin: number;
  size?: number;
  /** The identity the day belongs to — typically the BlockHero. */
  children?: ReactNode;
}) {
  const nnRatio = nnTotal > 0 ? nnKept / nnTotal : 0;
  const focusRatio = Math.min(1, focusMin / 50);
  const label = [
    `Quête principale ${questDone ? "accomplie" : "en cours"}`,
    nnTotal > 0 ? `${nnKept} non-négociable${nnKept > 1 ? "s" : ""} sur ${nnTotal}` : null,
    focusMin > 0 ? `${focusMin} minutes de focus` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <span
      role="img"
      aria-label={`Anneau du jour : ${label}`}
      className="relative inline-flex flex-none items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <Arc r={46} ratio={questDone ? 1 : 0} stroke="rgba(255,255,255,.95)" track="rgba(255,255,255,.18)" />
        <Arc r={38} ratio={nnRatio} stroke="#6ee7b7" track="rgba(110,231,183,.18)" />
        <Arc r={30} ratio={focusRatio} stroke="#93c5fd" track="rgba(147,197,253,.18)" />
      </svg>
      <span className="relative" aria-hidden>
        {children}
      </span>
    </span>
  );
}
