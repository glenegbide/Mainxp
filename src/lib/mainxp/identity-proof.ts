// QUI JE DEVIENS — identity through evidence (directive wave 3).
//
// A direction is declared once, in the user's words. The proof comes from
// recorded weeks, and the language strengthens ONLY as the evidence does:
// nothing yet → building proof → becoming a pattern → «across the last 12
// weeks…». Declaring an identity never pays and never unlocks anything.
//
// SELF-TRUST is the same idea applied to promises: the last ten important
// commitments (past Main Quests), kept or not — with rest and Minimum Days
// never counted against you, and consciously cancelled quests excluded.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { restDaysFromEvents } from "@/lib/mainxp/streak";

export const PROOF_SOURCES: Record<
  string,
  { label: string; types: string[]; weeklyBar: number }
> = {
  entrainement: { label: "Entraînement", types: ["training_completed"], weeklyBar: 2 },
  quete: { label: "Main Quest", types: ["main_quest_completed"], weeklyBar: 3 },
  focus: { label: "Focus", types: ["focus_completed"], weeklyBar: 3 },
  engagements: { label: "Engagements", types: ["commitment_kept"], weeklyBar: 10 },
  esprit: {
    label: "Esprit",
    types: ["gratitude_logged", "journal_written", "night_review_completed"],
    weeklyBar: 4,
  },
};

export const MAX_DIRECTIONS = 4;
const WEEKS_WINDOW = 12;

// ── Pure: the graduated voice of evidence ──

export type ProofStage = "debut" | "preuve" | "pattern" | "identite";

export function proofStage(weeksKept: number, weeksObserved: number): ProofStage {
  if (weeksObserved === 0 || weeksKept === 0) return "debut";
  if (weeksObserved >= 10 && weeksKept >= 8) return "identite";
  if (weeksObserved >= 4 && weeksKept >= 3 && weeksKept / weeksObserved >= 0.5) return "pattern";
  return "preuve";
}

export function proofSentence(stage: ProofStage, kept: number, observed: number): string {
  switch (stage) {
    case "debut":
      return "Rien d'enregistré encore — la première semaine écrit la première ligne.";
    case "preuve":
      return `Tu construis la preuve : ${kept} semaine${kept > 1 ? "s" : ""} tenue${kept > 1 ? "s" : ""} sur ${observed}.`;
    case "pattern":
      return `Ça devient un pattern : ${kept} des ${observed} dernières semaines.`;
    case "identite":
      return `Sur les ${observed} dernières semaines, tu l'as tenu ${kept} fois. C'est en train de devenir toi.`;
  }
}

export interface SelfTrust {
  kept: number;
  total: number;
  /** Needs ≥6 data points; null below that — no verdict from thin air. */
  trend: "building" | "steady" | "rebuilding" | null;
}

/** Pure. `results` ordered oldest → newest. */
export function selfTrustVerdict(results: boolean[]): SelfTrust {
  const total = results.length;
  const kept = results.filter(Boolean).length;
  if (total < 6) return { kept, total, trend: null };
  const half = Math.floor(total / 2);
  const rate = (xs: boolean[]) => xs.filter(Boolean).length / xs.length;
  const delta = rate(results.slice(half)) - rate(results.slice(0, half));
  return {
    kept,
    total,
    trend: delta > 0.1 ? "building" : delta < -0.1 ? "rebuilding" : "steady",
  };
}

// ── Bounded aggregations ──

export interface DirectionProof {
  weeksKept: number;
  weeksObserved: number;
  stage: ProofStage;
  sentence: string;
}

/** Rolling 7-day weeks back from today; a week is kept when the source's
 *  event count reaches its bar. Observed = weeks since the first event
 *  (capped at 12) — a two-week-old habit is never judged on twelve. */
export async function directionProof(
  user: Pick<MxUser, "id" | "timezone">,
  source: string
): Promise<DirectionProof> {
  const def = PROOF_SOURCES[source] ?? PROOF_SOURCES.quete;
  const today = dayKey(new Date(), user.timezone);
  const since = addDays(today, -(WEEKS_WINDOW * 7 - 1));
  const [rows, first] = await Promise.all([
    prisma.mxEvent.groupBy({
      by: ["dayKey"],
      where: { userId: user.id, type: { in: def.types }, dayKey: { gte: since } },
      _count: { _all: true },
    }),
    prisma.mxEvent.findFirst({
      where: { userId: user.id, type: { in: def.types } },
      orderBy: { createdAt: "asc" },
      select: { dayKey: true },
    }),
  ]);
  if (!first) {
    return { weeksKept: 0, weeksObserved: 0, stage: "debut", sentence: proofSentence("debut", 0, 0) };
  }

  const perWeek = new Array(WEEKS_WINDOW).fill(0);
  for (const r of rows) {
    // Days since the row's day → week bucket 0 (this week) … 11.
    let cursor = today;
    let diff = 0;
    while (cursor !== r.dayKey && diff < WEEKS_WINDOW * 7) {
      cursor = addDays(cursor, -1);
      diff++;
    }
    const bucket = Math.floor(diff / 7);
    if (bucket < WEEKS_WINDOW) perWeek[bucket] += r._count._all;
  }

  // Weeks observed since the first-ever event of this source.
  let sinceFirst = 0;
  let cur = today;
  while (cur > first.dayKey && sinceFirst < WEEKS_WINDOW * 7) {
    cur = addDays(cur, -1);
    sinceFirst++;
  }
  const weeksObserved = Math.min(WEEKS_WINDOW, Math.floor(sinceFirst / 7) + 1);
  const weeksKept = perWeek
    .slice(0, weeksObserved)
    .filter((n) => n >= def.weeklyBar).length;
  const stage = proofStage(weeksKept, weeksObserved);
  return { weeksKept, weeksObserved, stage, sentence: proofSentence(stage, weeksKept, weeksObserved) };
}

/** The last ten important promises: past Main Quests, oldest → newest.
 *  Consciously cancelled quests are excluded; a quest missed on a rest or
 *  Minimum Day is excused, never counted against trust. */
export async function selfTrust(
  user: Pick<MxUser, "id" | "timezone"> & { restMode?: boolean }
): Promise<SelfTrust> {
  const today = dayKey(new Date(), user.timezone);
  const [quests, restEvents, minimumRows] = await Promise.all([
    prisma.mxTask.findMany({
      where: {
        userId: user.id,
        tier: "MAIN_QUEST",
        dayKey: { lt: today, not: null },
        status: { not: "CANCELLED" },
      },
      orderBy: { dayKey: "desc" },
      take: 20,
      select: { dayKey: true, status: true },
    }),
    prisma.mxEvent.findMany({
      where: { userId: user.id, type: { in: ["rest_started", "rest_ended"] } },
      orderBy: { createdAt: "asc" },
      select: { type: true, dayKey: true },
    }),
    prisma.mxEvent.groupBy({
      by: ["dayKey"],
      where: { userId: user.id, type: "minimum_day_activated" },
    }),
  ]);
  const protectedDays = restDaysFromEvents(restEvents, user.restMode ?? false, today);
  for (const r of minimumRows) protectedDays.add(r.dayKey);

  const results = quests
    .filter((q) => q.status === "DONE" || !protectedDays.has(q.dayKey!))
    .slice(0, 10)
    .reverse()
    .map((q) => q.status === "DONE");
  return selfTrustVerdict(results);
}
