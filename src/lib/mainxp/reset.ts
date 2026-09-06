// Recovery is measured, not judged (PRODUCT_NORTH phase 3). Server-only:
// this module touches Prisma — client code imports reset-def instead.

import { prisma } from "@/lib/prisma";
import { medianMinutes } from "@/lib/mainxp/reset-def";

/** Return-to-action window: an action later than this doesn't count as
 *  "the reset worked" — it was just the next day happening. */
const RETURN_WINDOW_MIN = 360;

export interface RecoveryStats {
  resets30: number;
  /** Median minutes between a reset and the next real (paid) action. */
  medianReturnMin: number | null;
}

export async function recoveryStats(userId: string): Promise<RecoveryStats> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const resets = await prisma.mxEvent.findMany({
    where: { userId, type: "reset_completed", createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (resets.length === 0) return { resets30: 0, medianReturnMin: null };

  // One query for all candidate follow-up actions; the reset's own XP row
  // (sourceType "reset") must not count as the return it is measuring.
  const txs = await prisma.mxXpTransaction.findMany({
    where: {
      userId,
      mainDelta: { gt: 0 },
      sourceType: { not: "reset" },
      createdAt: { gte: resets[0].createdAt },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const returns: number[] = [];
  let i = 0;
  for (const r of resets) {
    while (i < txs.length && txs[i].createdAt <= r.createdAt) i++;
    if (i < txs.length) {
      const min = (txs[i].createdAt.getTime() - r.createdAt.getTime()) / 60_000;
      if (min <= RETURN_WINDOW_MIN) returns.push(min);
    }
  }
  return { resets30: resets.length, medianReturnMin: medianMinutes(returns) };
}
