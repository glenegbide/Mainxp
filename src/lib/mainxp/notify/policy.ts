// PURE gating: modes, quiet hours, caps. Every decision here is unit-tested,
// because the cost of getting it wrong is spam on someone's phone at 2am.

import type { NotifMode, TriggerResult, TriggerType } from "./types";

export interface ModePolicy {
  dailyCap: number;
  minGapMin: number;
  urgencyFloor: number;
  allowedTypes: readonly TriggerType[];
}

const ALL: readonly TriggerType[] = [
  "main_quest_stale",
  "commitment_open",
  "night_review",
  "goal_pace_behind",
  "challenge_tick",
];

export const MODE_POLICY: Record<NotifMode, ModePolicy> = {
  quiet: { dailyCap: 1, minGapMin: 720, urgencyFloor: 80, allowedTypes: ["night_review"] },
  normal: {
    dailyCap: 2,
    minGapMin: 240,
    urgencyFloor: 55,
    allowedTypes: ["main_quest_stale", "commitment_open", "night_review"],
  },
  coach_me: {
    dailyCap: 4,
    minGapMin: 120,
    urgencyFloor: 35,
    allowedTypes: ["main_quest_stale", "commitment_open", "night_review", "goal_pace_behind", "challenge_tick"],
  },
  beast: { dailyCap: 6, minGapMin: 60, urgencyFloor: 20, allowedTypes: ALL },
};

export function asMode(value: string): NotifMode {
  return value === "quiet" || value === "coach_me" || value === "beast" ? value : "normal";
}

/** Hour 0–23 in the user's timezone. Never use server-local hours (Vercel is UTC). */
export function localHour(now: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone }).format(now)
  );
}

/** Quiet hours wrap past midnight (22 → 7 means 22,23,0..6 are quiet). */
export function inQuietHours(hourLocal: number, start: number | null, end: number | null): boolean {
  const s = start ?? 22;
  const e = end ?? 7;
  if (s === e) return false;
  return s < e ? hourLocal >= s && hourLocal < e : hourLocal >= s || hourLocal < e;
}

export interface GateInput {
  result: TriggerResult;
  mode: NotifMode;
  hourLocal: number;
  quietStart: number | null;
  quietEnd: number | null;
  sentToday: number;
  dailyCap: number;
  minutesSinceLastSend: number | null;
  restMode: boolean;
  lastSeenMinutesAgo: number | null;
  hasSubscription: boolean;
}

export type GateDecision = { send: true } | { send: false; reason: string };

/** Cheapest rejection first. Sleep is NEVER overridden, not even in beast mode. */
export function gate(input: GateInput): GateDecision {
  if (input.restMode) return { send: false, reason: "rest_mode" };
  if (inQuietHours(input.hourLocal, input.quietStart, input.quietEnd)) {
    return { send: false, reason: "quiet_hours" };
  }
  const policy = MODE_POLICY[input.mode];
  if (!policy.allowedTypes.includes(input.result.type)) return { send: false, reason: "mode" };
  if (input.result.urgency < policy.urgencyFloor) return { send: false, reason: "mode" };
  // Never push at someone who is already looking at the screen: on iOS a push
  // cannot be received and withheld, so suppression must happen server-side.
  if (input.lastSeenMinutesAgo !== null && input.lastSeenMinutesAgo < 10) {
    return { send: false, reason: "in_app" };
  }
  if (input.sentToday >= input.dailyCap) return { send: false, reason: "daily_cap" };
  if (input.minutesSinceLastSend !== null && input.minutesSinceLastSend < policy.minGapMin) {
    return { send: false, reason: "min_gap" };
  }
  if (!input.hasSubscription) return { send: false, reason: "no_subscription" };
  return { send: true };
}
