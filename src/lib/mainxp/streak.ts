// LA FLAMME — consecutive days with at least one real action.
//
// Why the flame used to die "for no reason", and what governs it now:
//
//   1. REST BROKE IT. Récupération pauses Élan but the streak still demanded
//      action. Wrong: rest is part of the game (the inn). A rest day now
//      BRIDGES the flame — it doesn't grow it, it doesn't kill it.
//   2. MIDNIGHT BROKE IT. Closing the day at 00:30 credited only the new
//      calendar day, leaving yesterday empty. The night-owl grace: an action
//      before 03:00 local also keeps the PREVIOUS day alight.
//   3. VOLUME BROKE IT. The old walk read the last 500 XP rows — a long
//      streak on a busy account silently truncated. The computation now
//      derives from DISTINCT event days, so history length never matters.
//
// The core is pure and unit-tested; the assembler reads the event log.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { addDays, dayKey, tzOffsetMs } from "@/lib/mainxp/day";

/** Event types that count as "you acted today" — real actions, including the
 *  zero-XP ones (a challenge tick is structure, but it IS a done thing).
 *  Deliberately excluded: notes, brain dumps, purchases, toggles. */
export const ACTIVE_EVENT_TYPES = [
  "main_quest_completed",
  "task_completed",
  "commitment_kept",
  "all_commitments_kept",
  "habit_completed",
  "focus_completed",
  "goal_reached",
  "milestone_completed",
  "project_completed",
  "morning_started",
  "night_review_completed",
  "gratitude_logged",
  "weekly_review_completed",
  "minimum_action_completed",
  "minimum_day_completed",
  "comeback_completed",
  "journal_written",
  "challenge_tick",
  "challenge_completed",
  "book_finished",
  "training_completed",
  "technique_mastered",
] as const;

export interface StreakDays {
  today: string;
  /** Days with at least one real action. */
  active: Set<string>;
  /** Days protected by Récupération — they bridge, they never count. */
  rest: Set<string>;
  /** Gap days credited by the night-owl grace (action before 03:00 next day). */
  bridged?: Set<string>;
}

export interface StreakResult {
  streak: number;
  /** The inactive, unprotected day that ended the walk — the candidate for
   *  the night-owl grace. Null when the walk exhausted its guard. */
  brokeAt: string | null;
}

/** Pure walk. Today not yet acted is never a break — grace until midnight. */
export function computeStreak(d: StreakDays): StreakResult {
  const lit = (day: string) => d.active.has(day) || d.bridged?.has(day) === true;
  let streak = 0;
  let cursor = lit(d.today) ? d.today : addDays(d.today, -1);
  // Ten years of walking is enough for anyone.
  for (let guard = 0; guard < 3660; guard++) {
    if (lit(cursor)) streak++;
    else if (!d.rest.has(cursor)) return { streak, brokeAt: cursor };
    cursor = addDays(cursor, -1);
  }
  return { streak, brokeAt: null };
}

/** Rest intervals from rest_started/rest_ended events (chronological order).
 *  An open interval protects through today; a legacy "on" state with no
 *  events still protects today itself. Intervals are capped at a year. */
export function restDaysFromEvents(
  events: Array<{ type: string; dayKey: string }>,
  restModeNow: boolean,
  today: string
): Set<string> {
  const rest = new Set<string>();
  const cover = (from: string, to: string) => {
    let day = from;
    for (let i = 0; i < 366 && day <= to; i++) {
      rest.add(day);
      day = addDays(day, 1);
    }
  };
  let open: string | null = null;
  for (const e of events) {
    if (e.type === "rest_started" && open === null) open = e.dayKey;
    else if (e.type === "rest_ended" && open !== null) {
      cover(open, e.dayKey);
      open = null;
    }
  }
  if (open !== null) cover(open, today);
  else if (restModeNow) rest.add(today); // toggled on before events existed
  return rest;
}

/** UTC instant of 03:00 local on the given day. */
function threeAmUtc(day: string, timeZone: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 3);
  return new Date(guess - tzOffsetMs(new Date(guess), timeZone));
}

/**
 * The user's current flame. Distinct-day reads (no volume cap), rest
 * bridging, and at most a handful of pinpoint queries for the night-owl
 * grace — one per bridged gap, and a gap that doesn't bridge ends the walk.
 */
export async function streakForUser(
  user: Pick<MxUser, "id" | "timezone" | "restMode">
): Promise<number> {
  const today = dayKey(new Date(), user.timezone);
  const [eventDays, restEvents, recentTx] = await Promise.all([
    prisma.mxEvent.groupBy({
      by: ["dayKey"],
      where: { userId: user.id, type: { in: [...ACTIVE_EVENT_TYPES] } },
    }),
    prisma.mxEvent.findMany({
      where: { userId: user.id, type: { in: ["rest_started", "rest_ended"] } },
      orderBy: { createdAt: "asc" },
      select: { type: true, dayKey: true },
    }),
    // Pre-event-engine history: XP rows older than the first event still count.
    prisma.mxXpTransaction.findMany({
      where: { userId: user.id, mainDelta: { gt: 0 } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const active = new Set(eventDays.map((r) => r.dayKey));
  for (const t of recentTx) active.add(dayKey(t.createdAt, user.timezone));
  const rest = restDaysFromEvents(restEvents, user.restMode, today);
  const bridged = new Set<string>();

  // Bridge gaps one at a time: a gap survives only if the FOLLOWING day has
  // an action before 03:00 local (the evening that ran long).
  for (let attempts = 0; attempts < 8; attempts++) {
    const r = computeStreak({ today, active, rest, bridged });
    if (r.brokeAt === null) return r.streak;
    const nextDay = addDays(r.brokeAt, 1);
    const early = await prisma.mxEvent.findFirst({
      where: {
        userId: user.id,
        type: { in: [...ACTIVE_EVENT_TYPES] },
        dayKey: nextDay,
        createdAt: { lt: threeAmUtc(nextDay, user.timezone) },
      },
      select: { id: true },
    });
    if (!early) return r.streak;
    bridged.add(r.brokeAt);
  }
  return computeStreak({ today, active, rest, bridged }).streak;
}
