"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/today", label: "Today", icon: "◎" },
  { href: "/coach", label: "Coach", icon: "✦" },
  { href: "/progress", label: "Progress", icon: "▲" },
  { href: "/social", label: "Social", icon: "◇" },
  { href: "/me", label: "Me", icon: "●" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto flex w-full max-w-md items-stretch border-t border-mxp-line bg-mxp-card/95 backdrop-blur">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                active ? "text-mxp-purple" : "text-mxp-muted hover:text-mxp-ink"
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
