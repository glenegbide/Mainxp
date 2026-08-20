"use client";

// THE COMPLETION MOMENT — the interaction that happens dozens of times a day.
// It must feel like a native app, not a form submit:
//   press → the check draws itself instantly (optimistic)
//   → haptic tick
//   → the earned XP rises where the finger was (revealed only once the ledger
//      has actually granted it — the reward stays a surprise)
//   → the server catches up in the background; a failure rolls the check back
//      and says so, so nothing is ever silently lost.

import { useState, useTransition } from "react";
import type { ActionReward } from "@/lib/mainxp/action-result";

export function CheckAction({
  id,
  done,
  label,
  act,
  className = "",
}: {
  id: string;
  done: boolean;
  /** Used for the accessible name — screen readers must not hear "✓ button". */
  label: string;
  act: (id: string) => Promise<ActionReward>;
  className?: string;
}) {
  const [on, setOn] = useState(done);
  const [reward, setReward] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Server truth wins whenever the page revalidates — adjusted during render
  // (React's documented pattern) rather than in an effect, which would cause
  // a cascading render on every revalidation.
  const [lastServerState, setLastServerState] = useState(done);
  if (done !== lastServerState) {
    setLastServerState(done);
    setOn(done);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-pressed={on}
        aria-label={`${on ? "Annuler" : "Valider"} : ${label}`}
        className={`mxp-check ${on ? "on" : ""} ${className}`}
        onClick={() => {
          const next = !on;
          setOn(next); // optimistic: the UI never waits for the network
          setError(null);
          if (next && typeof navigator !== "undefined") navigator.vibrate?.(12);
          startTransition(async () => {
            const result = await act(id);
            if (!result.ok) {
              setOn(!next); // honest rollback
              setError(result.error ?? "Réessaie.");
              return;
            }
            if (next && result.xp) {
              setReward(result.xp);
              window.setTimeout(() => setReward(null), 1000);
            }
          });
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5.5 12.5l4.2 4.2 8.8-9.4" className="mxp-check-path" />
        </svg>
      </button>
      {reward !== null && (
        <span className="mxp-xpfloat" aria-live="polite">
          +{reward}
        </span>
      )}
      {error && (
        <span role="alert" className="mxp-checkerror">
          {error}
        </span>
      )}
    </span>
  );
}
