// The gratitude ritual — 01 to 10, morning and night as distinct lists.
//
// Two promises hold everything:
//   1. Both rituals STORE. Only one gratitude XP award exists per day — the
//      same idempotency key the product has always used, so the second ritual
//      (and the coach's log_gratitude tool) can never mint a second payout.
//   2. Replacing is idempotent: saving the same form twice leaves the same
//      rows, never duplicates (rule 10: no XP per sentence, no farming).

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { emitEvent } from "@/lib/mainxp/events";

export type GratitudePeriod = "morning" | "night";

export const GRATITUDE_MAX = 10;
const ITEM_MAX = 240;

/** Reads gratitude_0 … gratitude_9 (prefixed) preserving the user's order. */
export function gratitudeItems(formData: FormData, prefix: string): string[] {
  return Array.from({ length: GRATITUDE_MAX }, (_, i) =>
    String(formData.get(`${prefix}_${i}`) ?? "").trim().slice(0, ITEM_MAX)
  ).filter(Boolean);
}

/**
 * Replaces one period's list for today, inside a transaction, and emits the
 * daily gratitude event. The ledger's idempotency does the anti-farming work.
 */
export async function saveGratitudeList(
  user: MxUser,
  day: string,
  period: GratitudePeriod,
  items: string[]
): Promise<void> {
  await prisma.$transaction([
    prisma.mxGratitudeEntry.deleteMany({ where: { userId: user.id, dayKey: day, period } }),
    ...items.slice(0, GRATITUDE_MAX).map((content, position) =>
      prisma.mxGratitudeEntry.create({
        data: { userId: user.id, dayKey: day, period, position, content },
      })
    ),
  ]);
  if (items.length > 0) {
    // ONE key per day for morning, night and the coach tool alike: the first
    // sincere list pays, everything after it is stored without a payout.
    await emitEvent(
      user,
      "gratitude_logged",
      { day, period, count: items.length },
      { idempotencyKey: `gratitude:${user.id}:${day}` }
    );
  }
}

export async function loadGratitude(userId: string, day: string, period: GratitudePeriod) {
  const rows = await prisma.mxGratitudeEntry.findMany({
    where: { userId, dayKey: day, period },
    orderBy: { position: "asc" },
  });
  return rows.map((r) => r.content);
}
