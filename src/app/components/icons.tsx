// Premium iconography (DESIGN_BIBLE: no emoji as final icons). One coherent
// stroke family, matching BottomNav — 24px viewBox, stroke 2, round caps.
// Color comes from the parent (currentColor) so area semantics stay in CSS.

interface IconProps {
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Matin — sunrise over a horizon. */
export function IconSunrise({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3.5v2.5" />
      <path d="M5.6 6.6l1.8 1.8" />
      <path d="M18.4 6.6l-1.8 1.8" />
      <path d="M7.5 15a4.5 4.5 0 019 0" />
      <path d="M3 18.5h18" />
    </svg>
  );
}

/** Focus — timer. */
export function IconTimer({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 10v3.5l2.5 1.5" />
      <path d="M9.5 3.5h5" />
    </svg>
  );
}

/** Habitudes — repeat loop. */
export function IconLoop({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M17 4l3 3-3 3" />
      <path d="M20 7H8a4 4 0 00-4 4" />
      <path d="M7 20l-3-3 3-3" />
      <path d="M4 17h12a4 4 0 004-4" />
    </svg>
  );
}

/** Soir — crescent moon. */
export function IconMoon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M19.5 14.5A8 8 0 019.6 4.4a8 8 0 109.9 10.1z" />
    </svg>
  );
}

/** Vide-tête — spark of thought. */
export function IconSpark({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" strokeWidth="1.6" />
    </svg>
  );
}

/** Journal — pen on page. */
export function IconPen({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M5 19h14" />
      <path d="M14.5 4.5l3 3L9 16l-4 1 1-4 8.5-8.5z" />
    </svg>
  );
}

/** Défis — banner/flag. */
export function IconFlag({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M5.5 21V4" />
      <path d="M5.5 4.5c2.5-1.6 5-1.6 7.5 0s5 1.6 6.5.5v8.5c-1.5 1.1-4 1.1-6.5-.5s-5-1.6-7.5 0" />
    </svg>
  );
}

/** North Star — compass needle. */
export function IconCompass({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2.2 5-5 2.2 2.2-5 5-2.2z" />
    </svg>
  );
}

export function IconTomorrow({ className }: IconProps) {
  // Push to tomorrow — an arrow meeting a day boundary.
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12h11" />
      <path d="M11 8l4 4-4 4" />
      <path d="M19 5v14" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
    </svg>
  );
}

export function IconGem({ className }: IconProps) {
  // MAINXP artifact mark — faceted, original.
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <path d="M7 3h10l4 6-9 12L3 9z" />
      <path d="M7 3l2 6 3 12 3-12 2-6" />
      <path d="M3 9h18" />
    </svg>
  );
}

/** Earned coin — MAINXP's own mark, never an emoji (asset policy). */
export function IconCoin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.2 9.6c.6-.9 1.6-1.4 2.8-1.4 1.7 0 2.9.9 2.9 2.1 0 2.7-5.6 1.5-5.6 4.1 0 1.2 1.2 2.1 2.9 2.1 1.2 0 2.2-.5 2.8-1.4" strokeLinecap="round" />
    </svg>
  );
}

/** A title still to be earned. */
export function IconLock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="5.5" y="10.5" width="13" height="9" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** The MAINXP bolt — the brand mark, drawn once, used everywhere. */
export function IconBolt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.6 2.5 5.8 13.2c-.3.4 0 1 .5 1h4.2l-1.6 7c-.1.6.6 1 1 .5l7.8-10.7c.3-.4 0-1-.5-1h-4.2l1.6-7c.1-.6-.6-1-1-.5Z" />
    </svg>
  );
}
