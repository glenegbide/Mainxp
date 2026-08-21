"use client";

// « Je te soutiens » — the only social gesture in MAINXP. It costs nothing,
// earns nothing, and cannot be counted publicly: it exists so that a hard day
// is witnessed by someone. One per person per day, then the button says so.

import { useState, useTransition } from "react";

export function SupportAction({
  partnerId,
  name,
  sent,
  act,
}: {
  partnerId: string;
  name: string;
  sent: boolean;
  act: (partnerId: string, kind: "support") => Promise<{ ok: boolean }>;
}) {
  const [done, setDone] = useState(sent);
  const [, startTransition] = useTransition();

  const [lastServer, setLastServer] = useState(sent);
  if (sent !== lastServer) {
    setLastServer(sent);
    setDone(sent);
  }

  if (done) {
    return (
      <p className="mxp-meta mt-3" aria-live="polite">
        Envoyé — {name} le verra.
      </p>
    );
  }

  return (
    <button
      type="button"
      className="mxp-btn-ghost mt-3 w-full py-3 text-[15px]"
      onClick={() => {
        setDone(true);
        if (typeof navigator !== "undefined") navigator.vibrate?.(12);
        startTransition(async () => {
          const r = await act(partnerId, "support");
          if (!r.ok) setDone(false);
        });
      }}
    >
      Je te soutiens
    </button>
  );
}
