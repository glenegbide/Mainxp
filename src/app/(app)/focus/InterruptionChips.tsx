"use client";

// Logging an interruption must cost less attention than the interruption
// itself: one tap on what just happened, the count wears the chip. The
// totals ride hidden inputs inside the end-session form — no extra network
// round-trip during focus.

import { useState } from "react";

export const INTERRUPTION_SOURCES = [
  ["phone", "Téléphone"],
  ["message", "Message"],
  ["thought", "Pensée"],
  ["person", "Personne"],
  ["fatigue", "Fatigue"],
] as const;

export function InterruptionChips() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  return (
    <div>
      <p className="mxp-meta">Interrompu ? Un tap suffit.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {INTERRUPTION_SOURCES.map(([key, label]) => {
          const n = counts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCounts((c) => ({ ...c, [key]: (c[key] ?? 0) + 1 }));
                if (typeof navigator !== "undefined") navigator.vibrate?.(4);
              }}
              className={`mxp-chip border transition active:scale-95 ${
                n > 0
                  ? "border-mxp-blue/50 bg-mxp-blue/10 text-mxp-blue"
                  : "border-white/25 bg-white/10 text-white/85"
              }`}
            >
              {label}
              {n > 0 && <span className="tabular-nums">×{n}</span>}
            </button>
          );
        })}
      </div>
      {INTERRUPTION_SOURCES.map(([key]) => (
        <input key={key} type="hidden" name={`src_${key}`} value={counts[key] ?? 0} />
      ))}
    </div>
  );
}
