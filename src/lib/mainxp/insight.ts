// Bird's-eye view (life-assistant wave): the aggregates and patterns the
// coach needs to hold the user accountable from FACTS — per-day execution,
// week-over-week trend, chronic postpones, commitment keep-rates. Pure
// helpers are unit-tested; the loader is bounded queries, no full history.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { goalPace } from "@/lib/mainxp/goals";
import { isActiveMemory } from "@/lib/mainxp/memory";

export interface DayLine {
  day: string;
  xp: number;
  missionsDone: number;
  mainQuestDone: boolean;
  nnKept: number;
  focusMin: number;
}

export interface WeekTrend {
  thisWeekXp: number;
  lastWeekXp: number;
  /** −1..1-ish relative change; null when last week has no data. */
  delta: number | null;
  verdict: "up" | "down" | "flat" | "new";
}

/** Pure: week-over-week XP trend with an honest "new" state. */
export function weekTrend(thisWeekXp: number, lastWeekXp: number): WeekTrend {
  if (lastWeekXp <= 0) {
    return { thisWeekXp, lastWeekXp, delta: null, verdict: thisWeekXp > 0 ? "new" : "flat" };
  }
  const delta = (thisWeekXp - lastWeekXp) / lastWeekXp;
  return {
    thisWeekXp,
    lastWeekXp,
    delta,
    verdict: delta > 0.1 ? "up" : delta < -0.1 ? "down" : "flat",
  };
}

/** Pure: keep-rate as a safe percentage. */
export function keepRate(kept: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((kept / total) * 100);
}

export async function birdsEyeView(user: Pick<MxUser, "id" | "timezone">) {
  const today = dayKey(new Date(), user.timezone);
  const start14 = addDays(today, -13); // this week + last week
  const days7: string[] = [];
  for (let i = 6; i >= 0; i--) days7.push(addDays(today, -i));

  const [tx, tasks14, nnLogs14, nnActive, focus14, openChronic, goals, memories] =
    await Promise.all([
      prisma.mxXpTransaction.findMany({
        where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 15 * 86_400_000) } },
        select: { mainDelta: true, createdAt: true },
      }),
      prisma.mxTask.findMany({
        where: { userId: user.id, dayKey: { gte: start14 } },
        select: { dayKey: true, tier: true, status: true, title: true, postponeCount: true },
      }),
      prisma.mxNonNegotiableLog.findMany({
        where: { userId: user.id, periodKey: { gte: start14 }, completed: true },
        select: { periodKey: true },
      }),
      prisma.mxNonNegotiable.count({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
      prisma.mxFocusSession.findMany({
        where: { userId: user.id, endedAt: { not: null }, startedAt: { gte: new Date(Date.now() - 15 * 86_400_000) } },
        select: { startedAt: true, endedAt: true },
      }),
      prisma.mxTask.findMany({
        where: { userId: user.id, status: "OPEN", postponeCount: { gte: 2 } },
        select: { title: true, postponeCount: true, tier: true },
        orderBy: { postponeCount: "desc" },
        take: 5,
      }),
      prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" } }),
      prisma.mxMemory.findMany({
        where: { userId: user.id, type: "commitment", doNotUseInCoaching: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  const xpByDay = new Map<string, number>();
  for (const t of tx) {
    const d = dayKey(t.createdAt, user.timezone);
    xpByDay.set(d, (xpByDay.get(d) ?? 0) + Math.max(0, t.mainDelta));
  }
  const focusByDay = new Map<string, number>();
  for (const f of focus14) {
    const d = dayKey(f.startedAt, user.timezone);
    const min = Math.round(((f.endedAt!.getTime() - f.startedAt.getTime()) / 60_000) * 10) / 10;
    focusByDay.set(d, (focusByDay.get(d) ?? 0) + min);
  }
  const nnByDay = new Map<string, number>();
  for (const l of nnLogs14) nnByDay.set(l.periodKey, (nnByDay.get(l.periodKey) ?? 0) + 1);

  const line = (day: string): DayLine => {
    const dayTasks = tasks14.filter((t) => t.dayKey === day);
    return {
      day,
      xp: xpByDay.get(day) ?? 0,
      missionsDone: dayTasks.filter((t) => t.tier === "DAILY_MISSION" && t.status === "DONE").length,
      mainQuestDone: dayTasks.some((t) => t.tier === "MAIN_QUEST" && t.status === "DONE"),
      nnKept: nnByDay.get(day) ?? 0,
      focusMin: Math.round(focusByDay.get(day) ?? 0),
    };
  };
  const last7 = days7.map(line);

  const sumRange = (from: number, to: number) => {
    let s = 0;
    for (let i = from; i <= to; i++) s += xpByDay.get(addDays(today, -i)) ?? 0;
    return s;
  };
  const trend = weekTrend(sumRange(0, 6), sumRange(7, 13));

  const now = new Date();
  const nnKeptThisWeek = last7.reduce((s, l) => s + l.nnKept, 0);
  return {
    last7,
    trend,
    nnKeepRate7: keepRate(nnKeptThisWeek, nnActive * 7),
    mainQuestDays7: last7.filter((l) => l.mainQuestDone).length,
    focusMin7: last7.reduce((s, l) => s + l.focusMin, 0),
    chronicPostpones: openChronic.map((t) => ({
      title: t.title,
      tier: t.tier,
      postponeCount: t.postponeCount,
    })),
    goalsBehind: goals
      .filter((g) => g.targetValue && g.deadline)
      .map((g) => ({
        title: g.title,
        pace: goalPace({
          targetValue: g.targetValue!,
          currentValue: g.currentValue,
          createdAt: g.createdAt,
          deadline: g.deadline!,
        }),
      }))
      .filter((g) => g.pace.verdict === "behind")
      .map((g) => ({
        title: g.title,
        requiredWeeklyPace: Math.round(g.pace.requiredWeeklyPace * 10) / 10,
        weeksLeft: Math.round(g.pace.weeksLeft * 10) / 10,
      })),
    commitments: memories.filter((m) => isActiveMemory(m, now)).map((m) => m.content),
  };
}
