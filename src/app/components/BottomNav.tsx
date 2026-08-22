"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ICONS: Record<string, React.ReactNode> = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  coach: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5l2.1 6.3 6.4 2.2-6.4 2.2L12 19.5l-2.1-6.3-6.4-2.2 6.4-2.2L12 2.5z" />
      <circle cx="19" cy="4.5" r="1.6" />
    </svg>
  ),
  progress: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V13" />
      <path d="M10 19V9" />
      <path d="M16 19v-4" />
      <path d="M4 8l5-4 4 3.5L20 4" />
    </svg>
  ),
  social: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="17" cy="9.5" r="2.4" />
      <path d="M15.8 14.3c2.3.2 4 1.7 4.7 4.2" />
    </svg>
  ),
  me: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6" />
    </svg>
  ),
};

const TABS = [
  { href: "/today", label: "Jour", icon: "today" },
  { href: "/coach", label: "Coach", icon: "coach" },
  { href: "/progress", label: "Progrès", icon: "progress" },
  { href: "/social", label: "Cercle", icon: "social" },
  { href: "/me", label: "Moi", icon: "me" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  // The tab lights up on touch, not when the server answers. Waiting for the
  // navigation to commit is what made the app feel slow even when it wasn't:
  // 150 ms of "did it register?" costs more than 150 ms of loading.
  const [wanted, setWanted] = useState<string | null>(null);
  const current = wanted ?? pathname;
  if (wanted && pathname === wanted) setWanted(null);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto flex w-full max-w-md items-stretch border-t border-mxp-line bg-white/90 px-1 pb-[max(env(safe-area-inset-bottom),4px)] backdrop-blur-md">
        {TABS.map((tab) => {
          const active = current === tab.href || current.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              onNavigate={() => {
                setWanted(tab.href);
                if (typeof navigator !== "undefined") navigator.vibrate?.(6);
                // If a navigation is abandoned, the highlight must not lie.
                window.setTimeout(() => setWanted((w) => (w === tab.href ? null : w)), 4000);
              }}
              aria-current={active ? "page" : undefined}
              className={`group flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10.5px] font-semibold transition ${
                active ? "text-mxp-purple" : "text-mxp-muted hover:text-mxp-ink"
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                  active ? "bg-mxp-purple-soft" : "group-hover:bg-mxp-bg"
                }`}
              >
                <span className="h-[19px] w-[19px]">{ICONS[tab.icon]}</span>
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
