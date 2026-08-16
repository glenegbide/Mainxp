"use client";

// Native bridge (Phase 5): when MAINXP runs inside the Capacitor shell
// (mobile/), this component lights up native behavior. In ordinary browsers
// window.Capacitor is absent and everything here is a silent no-op — never
// fake native capability (CLAUDE.md rule 4).

import { useEffect } from "react";

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    Haptics?: { impact: (opts: { style: string }) => Promise<void> };
    LocalNotifications?: {
      requestPermissions: () => Promise<{ display: string }>;
      schedule: (opts: unknown) => Promise<void>;
      getPending: () => Promise<{ notifications: Array<{ id: number }> }>;
    };
  };
}

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

export function NativeBridge() {
  useEffect(() => {
    const cap = window.Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    // Haptic tick on game-feel taps (checks, primary buttons).
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(".mxp-check, .mxp-btn");
      if (el) cap.Plugins?.Haptics?.impact({ style: "LIGHT" }).catch(() => {});
    };
    document.addEventListener("click", onClick, { passive: true });

    // Gentle daily rhythm reminders (Part 48: contextual > generic; these are
    // the Phase-5 baseline — server-driven contextual push replaces them later).
    void (async () => {
      try {
        const ln = cap.Plugins?.LocalNotifications;
        if (!ln) return;
        const perm = await ln.requestPermissions();
        if (perm.display !== "granted") return;
        const pending = await ln.getPending();
        if (pending.notifications.length > 0) return; // already scheduled
        await ln.schedule({
          notifications: [
            {
              id: 1,
              title: "MAINXP",
              body: "☀️ Morning Start — 2 minutes pour lancer la journée.",
              schedule: { on: { hour: 7, minute: 30 }, allowWhileIdle: true },
            },
            {
              id: 2,
              title: "MAINXP",
              body: "🌙 Revue du soir — clore la journée et préparer demain.",
              schedule: { on: { hour: 21, minute: 30 }, allowWhileIdle: true },
            },
          ],
        });
      } catch {
        /* native-only surface; stay silent on the web */
      }
    })();

    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
