// Assembles a PriorityContext from domain rows (pure) or from the database
// (for the coach's get_priorities tool). The Today page and the coach share
// this, so the human view and the AI view of "what matters now" never drift.

import { prisma } from "@/lib/prisma";
import type { MxDayPlan, MxGoal, MxNonNegotiable, MxNonNegotiableLog, MxTask, MxUser } from "@/generated/prisma/client";
import { dayKey, daysBetween } from "@/lib/mainxp/day";
import { goalPace } from "@/lib/mainxp/goals";
import { whatNow, type PriorityContext, type PriorityGoalFact, type Recommendation } from "./priority";

function goalFact(g: MxGoal, today: string, timezone: string): PriorityGoalFact {
  const fact: PriorityGoalFact = { title: g.title, priority: g.priority };
  if (g.targetValue && g.deadline) {
    const report = goalPace({
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      createdAt: g.createdAt,
      deadline: g.deadline,
    });
    fact.verdict = report.verdict;
    fact.requiredWeeklyPace = report.requiredWeeklyPace;
    fact.unit = g.unit;
    fact.daysToDeadline = daysBetween(today, dayKey(g.deadline, timezone));
  }
  return fact;
}

export interface PriorityRows {
  tasks: MxTask[]; // today's tasks
  goals: MxGoal[]; // active goals
  nonNegotiables: MxNonNegotiable[];
  nnLogs: MxNonNegotiableLog[]; // today's logs
  dayPlan: MxDayPlan | null;
  restMode: boolean;
  timezone: string;
  now?: Date;
}

/** Pure assembly — callers that already fetched the rows (Today page) use this. */
export function contextFromRows(rows: PriorityRows): PriorityContext {
  const at = rows.now ?? new Date();
  const today = dayKey(at, rows.timezone);
  const facts = new Map(rows.goals.map((g) => [g.id, goalFact(g, today, rows.timezone)]));
  const withGoal = (t: MxTask) => ({
    id: t.id,
    title: t.title,
    postponeCount: t.postponeCount,
    goal: t.goalId ? (facts.get(t.goalId) ?? null) : null,
  });

  const mq = rows.tasks.find((t) => t.tier === "MAIN_QUEST");
  const doneByNn = new Map(rows.nnLogs.map((l) => [l.nonNegotiableId, l.completed]));
  const hourOfDay = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: rows.timezone }).format(at)
  );

  return {
    minimumDay: rows.dayPlan?.minimumDay ?? false,
    restMode: rows.restMode,
    energy: rows.dayPlan?.energy ?? null,
    stress: rows.dayPlan?.stress ?? null,
    hourOfDay,
    mainQuest: mq ? { ...withGoal(mq), status: mq.status === "DONE" ? "DONE" : "OPEN" } : null,
    openMissions: rows.tasks.filter((t) => t.tier === "DAILY_MISSION" && t.status === "OPEN").map(withGoal),
    unmetNonNegotiables: rows.nonNegotiables
      .filter((n) => !doneByNn.get(n.id))
      .map((n) => ({ id: n.id, title: n.title })),
    goalsAtRisk: rows.goals
      .map((g) => facts.get(g.id)!)
      .filter((f) => f.verdict === "behind")
      .sort((a, b) => b.priority - a.priority),
    nightReviewDone: rows.dayPlan?.reviewedAt != null,
  };
}

/** DB-loading variant for the coach tools. */
export async function loadRecommendation(
  user: Pick<MxUser, "id" | "timezone" | "restMode">
): Promise<{ context: PriorityContext; recommendation: Recommendation }> {
  const today = dayKey(new Date(), user.timezone);
  const [tasks, goals, nonNegotiables, nnLogs, dayPlan] = await Promise.all([
    prisma.mxTask.findMany({ where: { userId: user.id, dayKey: today } }),
    prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.mxNonNegotiable.findMany({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
    prisma.mxNonNegotiableLog.findMany({ where: { userId: user.id, periodKey: today } }),
    prisma.mxDayPlan.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey: today } } }),
  ]);
  const context = contextFromRows({
    tasks, goals, nonNegotiables, nnLogs, dayPlan,
    restMode: user.restMode,
    timezone: user.timezone,
  });
  return { context, recommendation: whatNow(context) };
}
