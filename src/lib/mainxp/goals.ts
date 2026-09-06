// Goal pace math (Part 7). Pure functions — unit-tested. Weeks are 7-day windows
// from goal creation; timezone-correct keys come from day.ts at the call site.

export interface PaceInput {
  targetValue: number;
  currentValue: number;
  createdAt: Date;
  deadline: Date;
  now?: Date;
}

export type PaceVerdict = "ahead" | "on_track" | "behind";

export interface PaceReport {
  targetPace: number; // per week
  actualPace: number; // per week
  remaining: number;
  requiredWeeklyPace: number;
  projection: number; // value at deadline if actual pace holds
  verdict: PaceVerdict;
  weeksTotal: number;
  weeksElapsed: number;
  weeksLeft: number;
}

const WEEK_MS = 7 * 86_400_000;

export function goalPace({ targetValue, currentValue, createdAt, deadline, now }: PaceInput): PaceReport {
  const at = now ?? new Date();
  const weeksTotal = Math.max((deadline.getTime() - createdAt.getTime()) / WEEK_MS, 1e-9);
  const weeksElapsed = Math.min(
    Math.max((at.getTime() - createdAt.getTime()) / WEEK_MS, 0),
    weeksTotal
  );
  const weeksLeft = Math.max(weeksTotal - weeksElapsed, 0);

  const targetPace = targetValue / weeksTotal;
  const actualPace = weeksElapsed > 0 ? currentValue / weeksElapsed : 0;
  const remaining = Math.max(targetValue - currentValue, 0);
  const requiredWeeklyPace = weeksLeft > 0 ? remaining / weeksLeft : remaining;
  const projection = currentValue + actualPace * weeksLeft;

  let verdict: PaceVerdict = "on_track";
  if (projection >= targetValue * 1.05) verdict = "ahead";
  else if (projection < targetValue * 0.95) verdict = "behind";

  return {
    targetPace,
    actualPace,
    remaining,
    requiredWeeklyPace,
    projection,
    verdict,
    weeksTotal,
    weeksElapsed,
    weeksLeft,
  };
}

/** "Goal at risk" (surfaces on TODAY + coach context): behind, with a near deadline. */
export function isGoalAtRisk(report: PaceReport, daysToDeadline: number): boolean {
  return report.verdict === "behind" && daysToDeadline <= 14;
}

// ── Mission health (PRODUCT_NORTH phase 2): every direction is either moving,
// slipping, or untouched — and the app must say WHICH, with the reason.

export type MissionStatus = "on_track" | "at_risk" | "stalled";

export interface MissionHealthInput {
  paceVerdict: PaceVerdict | null; // null when the goal has no numbers
  /** Days since the last linked action (task done, focus session, progress
   *  logged). Null = never acted on. */
  daysSinceAction: number | null;
  ageDays: number;
}

export interface MissionHealth {
  status: MissionStatus;
  reason: string | null;
}

const STALL_DAYS = 5;

/** Stalled beats at-risk: an untouched goal's problem is never its pace. */
export function missionHealth(i: MissionHealthInput): MissionHealth {
  const idle = i.daysSinceAction ?? i.ageDays;
  if (idle >= STALL_DAYS) {
    return {
      status: "stalled",
      reason:
        i.daysSinceAction === null
          ? "aucune action liée depuis sa création"
          : `aucune action liée depuis ${idle} jours`,
    };
  }
  if (i.paceVerdict === "behind") {
    return { status: "at_risk", reason: "en retard sur le rythme requis" };
  }
  return { status: "on_track", reason: null };
}
