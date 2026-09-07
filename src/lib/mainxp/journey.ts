// MON PARCOURS — the life calendar (calendar+identity directive, wave 1).
//
// The first purpose is not scheduling. It is: SEE WHAT I ACTUALLY DID.
// One quiet mark per day, derived from canonical history — never a second
// "calendar events" database, never invented records. A day with nothing
// says «Aucune activité enregistrée» and implies no failure.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { addDays, dayKey, dayStartUtc } from "@/lib/mainxp/day";
import { ACTIVE_EVENT_TYPES, restDaysFromEvents } from "@/lib/mainxp/streak";

// ── Pure month math (unit-tested) ──

/** "2026-08-25" → "2026-08" */
export const monthKeyOf = (day: string) => day.slice(0, 7);

export function monthDays(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);
}

/** Column of the month's 1st in a Monday-first grid (0 = Monday). */
export function monthGridOffset(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
}

export function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type DayMark = "quest" | "active" | "rest" | "none";

export interface MonthDay {
  day: string;
  mark: DayMark;
  /** A rare gold ring: a goal reached that day. */
  gold: boolean;
}

/** One strong signal per date — quest beats everything, activity beats rest
 *  (a rest day where you still acted was an acting day). */
export function classifyDay(
  day: string,
  sets: { quest: Set<string>; active: Set<string>; rest: Set<string>; gold: Set<string> }
): MonthDay {
  const mark: DayMark = sets.quest.has(day)
    ? "quest"
    : sets.active.has(day)
      ? "active"
      : sets.rest.has(day)
        ? "rest"
        : "none";
  return { day, mark, gold: sets.gold.has(day) };
}

// ── Bounded aggregation over real history ──

export interface MonthJourney {
  monthKey: string;
  days: MonthDay[];
  questDays: number;
  activeDays: number;
  restDays: number;
}

export async function loadMonthJourney(
  user: Pick<MxUser, "id" | "timezone" | "restMode">,
  monthKey: string
): Promise<MonthJourney> {
  const days = monthDays(monthKey);
  const first = days[0];
  const last = days[days.length - 1];
  const today = dayKey(new Date(), user.timezone);
  const range = { gte: first, lte: last };

  const [questRows, activeRows, goldRows, minimumRows, restEvents] = await Promise.all([
    prisma.mxEvent.groupBy({
      by: ["dayKey"],
      where: { userId: user.id, type: "main_quest_completed", dayKey: range },
    }),
    prisma.mxEvent.groupBy({
      by: ["dayKey"],
      where: { userId: user.id, type: { in: [...ACTIVE_EVENT_TYPES] }, dayKey: range },
    }),
    prisma.mxEvent.groupBy({
      by: ["dayKey"],
      where: { userId: user.id, type: "goal_reached", dayKey: range },
    }),
    prisma.mxEvent.groupBy({
      by: ["dayKey"],
      where: { userId: user.id, type: "minimum_day_activated", dayKey: range },
    }),
    prisma.mxEvent.findMany({
      where: { userId: user.id, type: { in: ["rest_started", "rest_ended"] } },
      orderBy: { createdAt: "asc" },
      select: { type: true, dayKey: true },
    }),
  ]);

  const rest = restDaysFromEvents(restEvents, user.restMode, today);
  for (const r of minimumRows) rest.add(r.dayKey); // a Minimum Day is chosen recovery

  const sets = {
    quest: new Set(questRows.map((r) => r.dayKey)),
    active: new Set(activeRows.map((r) => r.dayKey)),
    rest,
    gold: new Set(goldRows.map((r) => r.dayKey)),
  };
  const marked = days.map((d) => classifyDay(d, sets));
  return {
    monthKey,
    days: marked,
    questDays: marked.filter((d) => d.mark === "quest").length,
    activeDays: marked.filter((d) => d.mark === "quest" || d.mark === "active").length,
    restDays: marked.filter((d) => d.mark === "rest").length,
  };
}

export interface DayReplay {
  day: string;
  quest: { title: string; done: boolean } | null;
  missionsDone: number;
  nnKept: number;
  nnLogged: number;
  focusMin: number;
  trainings: string[];
  challengeTicks: number;
  gratitudeMorning: boolean;
  gratitudeNight: boolean;
  journalEntries: number;
  morningStarted: boolean;
  nightReviewed: boolean;
  xpNet: number;
  resets: number;
  /** Genuinely earned that day: goals reached, challenges completed, books finished. */
  earned: string[];
  empty: boolean;
}

export async function loadDayReplay(
  user: Pick<MxUser, "id" | "timezone">,
  day: string
): Promise<DayReplay> {
  const start = dayStartUtc(new Date(`${day}T12:00:00Z`), user.timezone);
  const end = dayStartUtc(new Date(`${addDays(day, 1)}T12:00:00Z`), user.timezone);

  const [quest, missionsDone, nnLogs, focus, trainings, ticks, gratitude, journal, plan, tx, earnedEvts, resets] =
    await Promise.all([
      prisma.mxTask.findFirst({
        where: { userId: user.id, dayKey: day, tier: "MAIN_QUEST" },
        select: { title: true, status: true },
      }),
      prisma.mxTask.count({
        where: { userId: user.id, dayKey: day, tier: "DAILY_MISSION", status: "DONE" },
      }),
      prisma.mxNonNegotiableLog.findMany({
        where: { userId: user.id, periodKey: day },
        select: { completed: true },
      }),
      prisma.mxFocusSession.findMany({
        where: { userId: user.id, endedAt: { not: null }, startedAt: { gte: start, lt: end } },
        select: { startedAt: true, endedAt: true },
      }),
      prisma.mxTrainingSession.findMany({
        where: { userId: user.id, dayKey: day },
        select: { discipline: true, style: true, minutes: true, rounds: true },
      }),
      prisma.mxChallengeLog.count({ where: { userId: user.id, dayKey: day } }),
      prisma.mxGratitudeEntry.groupBy({
        by: ["period"],
        where: { userId: user.id, dayKey: day },
      }),
      prisma.mxJournalEntry.count({ where: { userId: user.id, dayKey: day } }),
      prisma.mxDayPlan.findUnique({
        where: { userId_dayKey: { userId: user.id, dayKey: day } },
        select: { startedAt: true, reviewedAt: true },
      }),
      prisma.mxXpTransaction.aggregate({
        where: { userId: user.id, createdAt: { gte: start, lt: end } },
        _sum: { mainDelta: true },
      }),
      prisma.mxEvent.findMany({
        where: {
          userId: user.id,
          dayKey: day,
          type: { in: ["goal_reached", "challenge_completed", "book_finished"] },
        },
        select: { type: true, payload: true },
      }),
      prisma.mxEvent.count({ where: { userId: user.id, type: "reset_completed", dayKey: day } }),
    ]);

  const focusMin = focus.reduce(
    (s, f) => s + Math.round((f.endedAt!.getTime() - f.startedAt.getTime()) / 60_000),
    0
  );
  const periods = new Set(gratitude.map((g) => g.period));
  const earned = earnedEvts.map((e) => {
    const title = String((e.payload as Record<string, unknown>)?.title ?? "");
    return e.type === "goal_reached"
      ? `Objectif atteint : ${title}`
      : e.type === "challenge_completed"
        ? `Défi relevé : ${title}`
        : `Livre terminé : ${title}`;
  });

  const replay: DayReplay = {
    day,
    quest: quest ? { title: quest.title, done: quest.status === "DONE" } : null,
    missionsDone,
    nnKept: nnLogs.filter((l) => l.completed).length,
    nnLogged: nnLogs.length,
    focusMin,
    trainings: trainings.map((t) =>
      t.discipline === "bjj"
        ? `BJJ${t.style ? (t.style === "gi" ? " gi" : " no-gi") : ""} · ${t.minutes} min${t.rounds ? ` · ${t.rounds} rd` : ""}`
        : `${t.discipline} · ${t.minutes} min`
    ),
    challengeTicks: ticks,
    gratitudeMorning: periods.has("morning"),
    gratitudeNight: periods.has("night"),
    journalEntries: journal,
    morningStarted: !!plan?.startedAt,
    nightReviewed: !!plan?.reviewedAt,
    xpNet: Math.max(0, tx._sum.mainDelta ?? 0),
    resets,
    earned,
    empty: false,
  };
  replay.empty =
    !replay.quest &&
    replay.missionsDone === 0 &&
    replay.nnLogged === 0 &&
    replay.focusMin === 0 &&
    replay.trainings.length === 0 &&
    replay.challengeTicks === 0 &&
    !replay.gratitudeMorning &&
    !replay.gratitudeNight &&
    replay.journalEntries === 0 &&
    !replay.morningStarted &&
    !replay.nightReviewed &&
    replay.xpNet === 0 &&
    replay.resets === 0 &&
    replay.earned.length === 0;
  return replay;
}
