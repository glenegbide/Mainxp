// Cancellation in the request path. When the user does the thing, we insert
// the notification's dedupe row PRE-EMPTIVELY as SUPPRESSED(resolved) — the
// unique key then makes it structurally impossible for a later tick to send
// it. Race-free, and it reuses the idempotency trick already in the codebase.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { dayKey } from "@/lib/mainxp/day";
import type { MxEventType } from "@/lib/mainxp/events";
import type { TriggerType } from "./types";

const RESOLVES: Partial<Record<MxEventType, TriggerType[]>> = {
  main_quest_completed: ["main_quest_stale"],
  night_review_completed: ["night_review"],
  all_commitments_kept: ["commitment_open"],
  challenge_tick: ["challenge_tick"],
};

export async function notifyOnEvent(
  user: Pick<MxUser, "id" | "timezone">,
  type: MxEventType
): Promise<void> {
  const types = RESOLVES[type];
  if (!types) return;
  const today = dayKey(new Date(), user.timezone);
  for (const t of types) {
    try {
      await prisma.mxNotification.create({
        data: {
          userId: user.id,
          type: t,
          dayKey: today,
          dedupeKey: `${user.id}:${t}:${today}`,
          title: "",
          body: "",
          mode: "",
          status: "SUPPRESSED",
          suppressedReason: "resolved",
        },
      });
    } catch {
      /* already recorded (P2002) — nothing to do */
    }
  }
}
