// Feature flags (addendum #29): unfinished modules stay dark in production
// without breaking anything. Server-side env reads; default = current state.

const on = (v: string | undefined, fallback: boolean) =>
  v === undefined || v === "" ? fallback : v === "1" || v.toLowerCase() === "true";

export const FLAGS = {
  AI_COACH: on(process.env.FEATURE_AI_COACH, true), // still requires the API key
  FINANCE: on(process.env.FEATURE_FINANCE, false), // Phase 3
  CIRCLE: on(process.env.FEATURE_CIRCLE, true), // Le Cercle — invite-only partners
  CLUBS: on(process.env.FEATURE_CLUBS, false), // Phase 4 (groups — a different animal)
  SCREEN_TIME: on(process.env.FEATURE_SCREEN_TIME, false), // Phase 5 (native)
  SPIRITUALITY: on(process.env.FEATURE_SPIRITUALITY, false), // optional module
} as const;
