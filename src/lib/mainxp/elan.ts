// Élan (momentum) — MAINXP's no-shame answer to Habitica's HP.
// A derived 0–100 gauge over the last 7 days: informative, never punitive,
// never stored, never a punishment ledger. Recovery mode pauses decay entirely.

import { prisma } from "@/lib/prisma";
import { addDays, dayKey } from "@/lib/mainxp/day";

export interface ElanFactors {
  missedDays: number; // days (last 7, excluding today) where some active daily NN was not kept
  badTaps: number; // bad-habit taps over the last 7 days
  rest: boolean;
}

export interface ElanReport extends ElanFactors {
  value: number | null; // null while resting — the gauge shows "récupération"
}

/** Pure math — unit-tested. */
export function computeElan(f: ElanFactors): number | null {
  if (f.rest) return null;
  const value = 100 - 10 * f.missedDays - 3 * Math.min(f.badTaps, 10);
  return Math.max(10, Math.min(100, value));
}

export async function elanReport(userId: string, timezone: string, rest: boolean): Promise<ElanReport> {
  const today = dayKey(new Date(), timezone);
  const window: string[] = [];
  for (let i = 1; i <= 7; i++) window.push(addDays(today, -i));

  const [nns, nnLogs, badHabits] = await Promise.all([
    prisma.mxNonNegotiable.findMany({
      where: { userId, active: true, cadence: "DAILY" },
      select: { id: true, createdAt: true },
    }),
    prisma.mxNonNegotiableLog.findMany({
      where: { userId, periodKey: { in: window }, completed: true },
      select: { nonNegotiableId: true, periodKey: true },
    }),
    prisma.mxHabit.findMany({
      where: { userId, kind: "bad", active: true },
      select: { logs: { where: { periodKey: { in: [...window, today] } }, select: { value: true } } },
    }),
  ]);

  let missedDays = 0;
  for (const day of window) {
    // Only NNs that already existed that day count — new commitments never
    // retro-penalize the past.
    const due = nns.filter((n) => dayKey(n.createdAt, timezone) <= day);
    if (due.length === 0) continue;
    const kept = new Set(
      nnLogs.filter((l) => l.periodKey === day).map((l) => l.nonNegotiableId)
    );
    if (due.some((n) => !kept.has(n.id))) missedDays++;
  }

  const badTaps = badHabits.reduce(
    (sum, h) => sum + h.logs.reduce((s, l) => s + l.value, 0),
    0
  );

  const factors: ElanFactors = { missedDays, badTaps: Math.round(badTaps), rest };
  return { ...factors, value: computeElan(factors) };
}
