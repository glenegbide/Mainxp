// Notification engine types. No I/O here — the pure layer depends on this only.

import type { MxUser } from "@/generated/prisma/client";
import type { PriorityContext } from "@/lib/mainxp/priority";

export type TriggerType =
  | "main_quest_stale"
  | "commitment_open"
  | "night_review"
  | "goal_pace_behind"
  | "challenge_tick";

export type NotifMode = "quiet" | "normal" | "coach_me" | "beast";

export interface TriggerFacts {
  user: Pick<
    MxUser,
    "id" | "name" | "timezone" | "notificationMode" | "quietHoursStart" | "quietHoursEnd" | "restMode" | "notifDailyCap"
  >;
  dayKey: string;
  weekKey: string;
  hourLocal: number;
  context: PriorityContext;
  eventsToday: number;
  missionsDoneToday: number;
  focusMinToday: number;
  nnKeepRate7: number | null;
  goalsBehind: Array<{ title: string; requiredWeeklyPace: number; unit: string | null }>;
  activeChallenges: Array<{ id: string; title: string; targetCount: number; ticks: number; daysLeft: number }>;
}

export interface TriggerResult {
  type: TriggerType;
  urgency: number; // 0–100
  title: string;
  body: string;
  url: string;
  /** target id for per-entity triggers (challenge, goal) */
  dedupeSuffix?: string;
  /** the numbers that justified the copy — every notification must be defensible */
  evidence: Record<string, string | number | boolean>;
}

export interface Trigger {
  type: TriggerType;
  /** LOCAL hours during which this trigger is even considered */
  windowHours: readonly number[];
  evaluate(f: TriggerFacts): TriggerResult | null;
}
