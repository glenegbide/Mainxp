"use client";

// The Training Arena's center: a ring of time closing around your character.
// The ring is the ONE continuously-moving element in MAINXP — allowed because
// it communicates elapsed time, nothing else. Display only: the duration that
// counts is measured server-side, so pausing the tab changes nothing.

import { useEffect, useMemo, useState } from "react";
import { BlockHero, type Dominant } from "../../components/BlockHero";

export function FocusTimer({
  startedAtIso,
  plannedMin,
  level = 1,
  gear = [],
  dominant = "FOCUS",
}: {
  startedAtIso: string;
  plannedMin: number;
  level?: number;
  gear?: string[];
  dominant?: Dominant;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const started = useMemo(() => new Date(startedAtIso).getTime(), [startedAtIso]);
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  const total = Math.max(1, plannedMin * 60);
  const remaining = Math.max(0, total - elapsed);
  const ratio = Math.min(1, elapsed / total);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const r = 54;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="text-center" aria-label="Session de focus en cours">
      <div className="relative mx-auto h-[236px] w-[236px]">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--mxp-line)" strokeWidth="4.5" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--mxp-blue)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={`${circumference * ratio} ${circumference * (1 - ratio)}`}
            className="transition-[stroke-dasharray] duration-700 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <BlockHero level={level} size={62} gear={gear} dominant={dominant} />
          <p
            className="mt-1 font-displaymx text-[40px] leading-none tabular-nums text-mxp-ink"
            role="timer"
            aria-live="off"
          >
            {mm}:{ss}
          </p>
          <p className="mxp-meta mt-1.5">
            {remaining === 0 ? "Temps écoulé — termine la session" : `sur ${plannedMin} min`}
          </p>
        </div>
      </div>
      <p className="mxp-meta mx-auto mt-1 max-w-[280px]">
        Une seule chose. Le reste peut attendre.
      </p>
    </div>
  );
}
