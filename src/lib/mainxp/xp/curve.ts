// XP level curve + base award values. Pure functions — unit-tested.
// Cumulative XP required to *reach* level L: 50·L·(L−1).
// L2=100, L3=300, L10=4500, L25=30000, L50=122500, L100=495000.

export function xpToReachLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  // Inverse of 50·L·(L−1) ≤ xp
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
}

export interface LevelProgress {
  level: number;
  intoLevel: number; // XP earned inside the current level
  neededForNext: number; // XP span of the current level
  ratio: number; // 0..1
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const floor = xpToReachLevel(level);
  const ceil = xpToReachLevel(level + 1);
  const intoLevel = Math.max(0, xp - floor);
  const neededForNext = ceil - floor;
  return { level, intoLevel, neededForNext, ratio: Math.min(1, intoLevel / neededForNext) };
}

// ── Base award values (see docs/XP_SYSTEM.md; tuning changes go through the ledger,
//    past transactions are never rewritten) ──
export const XP_VALUES = {
  MAIN_QUEST: { main: 100 },
  DAILY_MISSION: { main: 25 },
  SIDE_QUEST: { main: 8 },
  BACKLOG: { main: 8 }, // completing an unscheduled task counts like a side quest
  NON_NEGOTIABLE: { main: 20, discipline: 15 },
  ALL_NON_NEGOTIABLES_BONUS: { main: 30, discipline: 20 },
  FOCUS_PER_25MIN: { main: 15, focus: 15 },
  HABIT_LOG: { main: 10, attribute: 8 },
  JOURNAL: { main: 10, mind: 8 },
  GRATITUDE: { main: 10, mind: 8 },
  NIGHT_REVIEW: { main: 10, mind: 8 },
} as const;

/**
 * Hard mode (Part 18): an important task postponed repeatedly and finally done
 * earns a bounded multiplier.
 */
export function hardModeMultiplier(postponeCount: number): number {
  if (postponeCount >= 6) return 2;
  if (postponeCount >= 3) return 1.5;
  return 1;
}

/**
 * Anti-farming (Part 20): same-day repetition of trivial awards decays to zero.
 * `priorCountToday` = how many transactions of this sourceType already exist today.
 */
export function diminishingFactor(priorCountToday: number): number {
  if (priorCountToday <= 0) return 1;
  if (priorCountToday === 1) return 1;
  if (priorCountToday === 2) return 0.6;
  if (priorCountToday === 3) return 0.3;
  return 0;
}

/** Source types considered trivial-repeatable (subject to diminishing returns). */
export const DIMINISHING_SOURCE_TYPES = new Set(["side_quest", "journal", "gratitude"]);
