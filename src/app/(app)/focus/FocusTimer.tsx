"use client";

import { useEffect, useState } from "react";

/** Countdown display only — the XP-earning duration is verified server-side. */
export function FocusTimer({ startedAtIso, plannedMin }: { startedAtIso: string; plannedMin: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - new Date(startedAtIso).getTime()) / 1000));
  const total = plannedMin * 60;
  const remaining = Math.max(0, total - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const ratio = Math.min(1, elapsed / total);

  return (
    <div className="text-center">
      <p
        className="font-displaymx text-5xl font-bold tabular-nums text-mxp-blue"
        role="timer"
        aria-live="off"
      >
        {mm}:{ss}
      </p>
      <p className="mt-1 text-xs text-mxp-muted">
        {remaining === 0 ? "Temps écoulé — termine la session pour encaisser l'XP." : `sur ${plannedMin} min`}
      </p>
      <div className="mx-auto mt-3 h-2 w-full overflow-hidden rounded-full bg-mxp-bg">
        <div className="h-full rounded-full bg-mxp-blue" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
