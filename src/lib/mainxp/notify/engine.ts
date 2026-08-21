// Orchestration: gather facts → evaluate triggers → gate → record → deliver.
//
// Every evaluation writes a row: SENT, or SUPPRESSED with the reason. Silence
// becomes an auditable, learnable decision instead of an absence of data
// (MASTER_1M_PROMPT §7: "silence is a valid decision").

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { dayKey, weekKey } from "@/lib/mainxp/day";
import { loadRecommendation } from "@/lib/mainxp/priority-context";
import { keepRate } from "@/lib/mainxp/insight";
import { asMode, gate, localHour, MODE_POLICY } from "./policy";
import { TRIGGERS } from "./triggers";
import type { TriggerFacts, TriggerType } from "./types";
import { deliver } from "./send";

const MINUTE = 60_000;

async function buildFacts(user: MxUser, now: Date): Promise<TriggerFacts> {
  const today = dayKey(now, user.timezone);
  const { context } = await loadRecommendation(user, now);

  const [eventsToday, tasksToday, focusToday, nnActive, nnLogs7, challenges] = await Promise.all([
    prisma.mxEvent.count({ where: { userId: user.id, dayKey: today } }),
    prisma.mxTask.findMany({
      where: { userId: user.id, dayKey: today, status: "DONE" },
      select: { tier: true },
    }),
    prisma.mxFocusSession.findMany({
      where: { userId: user.id, endedAt: { not: null }, startedAt: { gte: new Date(now.getTime() - 20 * 3600_000) } },
      select: { startedAt: true, endedAt: true },
    }),
    prisma.mxNonNegotiable.count({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
    prisma.mxNonNegotiableLog.count({
      where: { userId: user.id, completed: true, periodKey: { gte: dayKey(new Date(now.getTime() - 6 * 86_400_000), user.timezone) } },
    }),
    prisma.mxChallenge.findMany({
      where: { userId: user.id, status: "active" },
      include: { logs: true },
    }),
  ]);

  const focusMin = focusToday.reduce(
    (s, f) => s + Math.round((f.endedAt!.getTime() - f.startedAt.getTime()) / MINUTE),
    0
  );

  return {
    user,
    dayKey: today,
    weekKey: weekKey(now, user.timezone),
    hourLocal: localHour(now, user.timezone),
    context,
    eventsToday,
    missionsDoneToday: tasksToday.filter((t) => t.tier === "DAILY_MISSION").length,
    focusMinToday: focusMin,
    nnKeepRate7: keepRate(nnLogs7, nnActive * 7),
    goalsBehind: context.goalsAtRisk.map((g) => ({
      title: g.title,
      requiredWeeklyPace: g.requiredWeeklyPace ?? 0,
      unit: g.unit ?? null,
    })),
    activeChallenges: challenges.map((c) => {
      const started = c.startedAt ?? c.createdAt;
      const elapsed = Math.floor((now.getTime() - started.getTime()) / 86_400_000);
      return {
        id: c.id,
        title: c.title,
        targetCount: c.targetCount,
        ticks: c.logs.length,
        daysLeft: Math.max(0, c.durationDays - elapsed),
      };
    }),
  };
}

/** Evaluate every trigger for one user and act on the decisions. */
export async function evaluateUser(user: MxUser, now = new Date()) {
  const mode = asMode(user.notificationMode);
  const policy = MODE_POLICY[mode];
  const hourLocal = localHour(now, user.timezone);

  // Cheap exit: no trigger is even in its window at this local hour.
  const candidates = TRIGGERS.filter((t) => t.windowHours.includes(hourLocal));
  if (candidates.length === 0) return { sent: 0, suppressed: {} as Record<string, number> };

  const facts = await buildFacts(user, now);
  const today = facts.dayKey;

  const [sentTodayRows, lastSent, subCount] = await Promise.all([
    prisma.mxNotification.count({ where: { userId: user.id, dayKey: today, status: "SENT" } }),
    prisma.mxNotification.findFirst({
      where: { userId: user.id, status: "SENT" },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
    prisma.mxPushSubscription.count({ where: { userId: user.id, disabledAt: null } }),
  ]);

  let sentToday = sentTodayRows;
  let lastSentAt = lastSent?.sentAt ?? null;
  let sent = 0;
  const suppressed: Record<string, number> = {};

  for (const trigger of candidates) {
    const result = trigger.evaluate(facts);
    const dedupeKey = `${user.id}:${trigger.type}:${result?.dedupeSuffix ?? today}`;

    if (!result) {
      await record(user, trigger.type, today, dedupeKey, mode, null, "not_relevant");
      suppressed.not_relevant = (suppressed.not_relevant ?? 0) + 1;
      continue;
    }

    const decision = gate({
      result,
      mode,
      hourLocal,
      quietStart: user.quietHoursStart,
      quietEnd: user.quietHoursEnd,
      sentToday,
      dailyCap: user.notifDailyCap ?? policy.dailyCap,
      minutesSinceLastSend: lastSentAt ? (now.getTime() - lastSentAt.getTime()) / MINUTE : null,
      restMode: user.restMode,
      lastSeenMinutesAgo: user.lastSeenAt ? (now.getTime() - user.lastSeenAt.getTime()) / MINUTE : null,
      hasSubscription: subCount > 0,
    });

    if (!decision.send) {
      await record(user, trigger.type, today, dedupeKey, mode, result.urgency, decision.reason, result);
      suppressed[decision.reason] = (suppressed[decision.reason] ?? 0) + 1;
      continue;
    }

    // Insert FIRST: the unique dedupeKey is what makes double sends impossible
    // under overlapping ticks (never check-then-insert).
    const row = await record(user, trigger.type, today, dedupeKey, mode, result.urgency, null, result);
    if (!row) continue; // P2002 → another tick already handled it

    const delivery = await deliver(row);
    if (delivery.sent > 0) {
      await prisma.mxNotification.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      sentToday += 1;
      lastSentAt = new Date();
      sent += 1;
    } else {
      await prisma.mxNotification.update({ where: { id: row.id }, data: { status: "FAILED" } });
    }
  }

  return { sent, suppressed };
}

async function record(
  user: MxUser,
  type: TriggerType,
  day: string,
  dedupeKey: string,
  mode: string,
  urgency: number | null,
  suppressedReason: string | null,
  result?: { title: string; body: string; url: string; evidence: Record<string, unknown> }
) {
  try {
    return await prisma.mxNotification.create({
      data: {
        userId: user.id,
        type,
        dayKey: day,
        dedupeKey,
        title: result?.title ?? "",
        body: result?.body ?? "",
        url: result?.url ?? "/today",
        mode,
        urgency: urgency ?? 0,
        status: suppressedReason ? "SUPPRESSED" : "QUEUED",
        suppressedReason,
        evidence: (result?.evidence ?? {}) as object,
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") return null;
    throw e;
  }
}

/** The tick: every active user whose local hour has a trigger window open. */
export async function runNotificationTick(opts: { now?: Date; limit?: number } = {}) {
  const now = opts.now ?? new Date();
  const activeIds = await prisma.mxEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: new Date(now.getTime() - 14 * 86_400_000) } },
  });
  const users = await prisma.mxUser.findMany({
    where: { id: { in: activeIds.map((a) => a.userId) } },
    take: opts.limit ?? 200,
  });

  let evaluated = 0;
  let sent = 0;
  const suppressed: Record<string, number> = {};
  for (const user of users) {
    try {
      const r = await evaluateUser(user, now);
      evaluated += 1;
      sent += r.sent;
      for (const [k, v] of Object.entries(r.suppressed)) suppressed[k] = (suppressed[k] ?? 0) + v;
    } catch (e) {
      // One user's failure must never abort the tick.
      console.error("notification tick failed for a user:", e instanceof Error ? e.message : e);
    }
  }
  return { evaluated, sent, suppressed };
}

/** Open rate per type over 30 days — the input to "learn what actually helps". */
export async function typeEffectiveness(userId: string) {
  const rows = await prisma.mxNotification.findMany({
    where: { userId, status: "SENT", sentAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    select: { type: true, openedAt: true },
  });
  const out: Record<string, { sent: number; opened: number; rate: number | null }> = {};
  for (const r of rows) {
    const e = (out[r.type] ??= { sent: 0, opened: 0, rate: null });
    e.sent += 1;
    if (r.openedAt) e.opened += 1;
  }
  for (const e of Object.values(out)) e.rate = e.sent > 0 ? Math.round((e.opened / e.sent) * 100) : null;
  return out;
}
