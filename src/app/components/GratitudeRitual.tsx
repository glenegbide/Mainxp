"use client";

// Gratitude 01–10, revealed progressively: three lines to start, and each
// filled line invites the next. Ten empty boxes at once is a homework sheet;
// one more line each time is a ritual. Plain inputs inside the surrounding
// form — the parent action saves them; nothing here talks to the network.

import { useMemo, useState } from "react";

// Mirrors GRATITUDE_MAX in lib/mainxp/gratitude.ts — kept literal here because
// that module touches Prisma and must never enter the client bundle.
const GRATITUDE_MAX = 10;

export function GratitudeRitual({
  period,
  initial = [],
}: {
  period: "morning" | "night";
  initial?: string[];
}) {
  const seed = useMemo(
    () => Array.from({ length: GRATITUDE_MAX }, (_, i) => initial[i] ?? ""),
    [initial]
  );
  const [items, setItems] = useState(seed);
  const filled = items.filter((v) => v.trim()).length;
  const firstEmpty = items.findIndex((v) => !v.trim());
  const visible = Math.min(
    GRATITUDE_MAX,
    Math.max(3, firstEmpty === -1 ? GRATITUDE_MAX : firstEmpty + 1)
  );
  const prefix = period === "morning" ? "gratitudeMorning" : "gratitudeNight";
  const sun = period === "morning";

  return (
    <div className={`mxp-gratitude ${sun ? "mxp-gratitude-sun" : "mxp-gratitude-moon"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`mxp-label ${sun ? "text-mxp-gold" : "text-mxp-teal"}`}>
          {sun ? "Gratitude — ce qui est déjà là" : "Gratitude — ce qui a compté"}
        </p>
        <span className="mxp-meta tabular-nums" aria-live="polite">
          {filled}/{GRATITUDE_MAX}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {items.slice(0, visible).map((value, index) => (
          <label key={index} className="flex items-center gap-2.5">
            <span className="w-6 flex-none text-right font-mono text-[11px] tabular-nums text-mxp-muted/70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <input
              type="text"
              name={`${prefix}_${index}`}
              value={value}
              maxLength={240}
              autoComplete="off"
              aria-label={`Gratitude ${index + 1}`}
              onChange={(e) => {
                const next = [...items];
                next[index] = e.target.value;
                setItems(next);
              }}
              placeholder={
                index === 0
                  ? sun
                    ? "Quelque chose de vrai, même petit…"
                    : "Un moment, une personne, un détail…"
                  : ""
              }
              className="mxp-gratline min-w-0 flex-1"
            />
          </label>
        ))}
      </div>
      <p className="mxp-meta mt-2.5">
        Pas besoin d&apos;en écrire dix — la sincérité compte plus que le volume.
      </p>
    </div>
  );
}
