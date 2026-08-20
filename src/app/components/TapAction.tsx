"use client";

// The habit tap: a counter, not a checkbox. Same law as the check —
// instant response, the reward revealed only after the ledger grants it
// (and habits diminish through the day, so the number is never predictable:
// exactly why it must never be advertised in advance).

import { useState, useTransition } from "react";
import type { ActionReward } from "@/lib/mainxp/action-result";

export function TapAction({
  id,
  label,
  count,
  tone = "good",
  act,
}: {
  id: string;
  label: string;
  count: number;
  tone?: "good" | "bad";
  act: (id: string) => Promise<ActionReward>;
}) {
  const [taps, setTaps] = useState(count);
  const [reward, setReward] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const [, startTransition] = useTransition();

  const [lastServerCount, setLastServerCount] = useState(count);
  if (count !== lastServerCount) {
    setLastServerCount(count);
    setTaps(count);
  }

  return (
    <span className="relative inline-flex items-center gap-2">
      <button
        type="button"
        aria-label={`${tone === "good" ? "Marquer" : "Noter un écart"} : ${label}`}
        className={
          tone === "good"
            ? "mxp-tap mxp-tap-good"
            : "mxp-tap mxp-tap-bad"
        }
        onClick={() => {
          setTaps((n) => n + 1);
          setPulse(true);
          window.setTimeout(() => setPulse(false), 240);
          if (typeof navigator !== "undefined") navigator.vibrate?.(tone === "good" ? 12 : 6);
          startTransition(async () => {
            const r = await act(id);
            if (!r.ok) {
              setTaps((n) => Math.max(0, n - 1));
              return;
            }
            if (r.xp) {
              setReward(r.xp);
              window.setTimeout(() => setReward(null), 1000);
            }
          });
        }}
      >
        {tone === "good" ? "+" : "−"}
      </button>
      {taps > 0 && (
        <span
          className={`mxp-tapcount ${pulse ? "mxp-tapcount-pulse" : ""} ${
            tone === "good" ? "text-mxp-green" : "text-mxp-orange"
          }`}
        >
          ×{taps}
        </span>
      )}
      {reward !== null && (
        <span className="mxp-xpfloat" aria-live="polite">
          +{reward}
        </span>
      )}
    </span>
  );
}
