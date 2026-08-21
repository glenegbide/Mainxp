// Person-to-person notifications.
//
// A message from a human is not a nudge from the product: it is not subject to
// the machine's daily cap or urgency floor (someone chose to send it). What it
// IS still subject to: sleep, rest mode, and the fact that a person already
// looking at the app does not need their phone to buzz.
//
// It goes through the same MxNotification table, so "why did my phone ring?"
// has exactly one place to look.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { dayKey } from "@/lib/mainxp/day";
import { inQuietHours, localHour } from "./policy";
import { deliver } from "./send";

const SUPPORT_COPY: Record<string, { title: string; body: (name: string) => string }> = {
  support: {
    title: "Quelqu'un est avec toi",
    body: (n) => `${n} te soutient aujourd'hui.`,
  },
  proud: {
    title: "Quelqu'un l'a remarqué",
    body: (n) => `${n} est fier de ce que tu as fait.`,
  },
  push: {
    title: "Quelqu'un compte sur toi",
    body: (n) => `${n} te dit : vas-y, aujourd'hui.`,
  },
};

/** Records the message for the recipient and pushes it when that is decent. */
export async function notifySupport(from: MxUser, toId: string, kind: string) {
  const copy = SUPPORT_COPY[kind] ?? SUPPORT_COPY.support;
  const to = await prisma.mxUser.findUnique({ where: { id: toId } });
  if (!to) return;

  const now = new Date();
  const hour = localHour(now, to.timezone);
  const quiet = inQuietHours(hour, to.quietHoursStart, to.quietHoursEnd);
  const inApp = to.lastSeenAt ? now.getTime() - to.lastSeenAt.getTime() < 10 * 60_000 : false;
  const suppressed = to.restMode ? "rest_mode" : quiet ? "quiet_hours" : inApp ? "in_app" : null;

  let row;
  try {
    row = await prisma.mxNotification.create({
      data: {
        userId: to.id,
        type: "encouragement",
        dayKey: dayKey(now, to.timezone),
        dedupeKey: `${to.id}:encouragement:${from.id}:${kind}:${dayKey(now, to.timezone)}`,
        title: copy.title,
        body: copy.body(from.name),
        url: "/social",
        mode: to.notificationMode,
        urgency: 50,
        status: suppressed ? "SUPPRESSED" : "QUEUED",
        suppressedReason: suppressed,
        evidence: { fromId: from.id, kind },
      },
    });
  } catch {
    return; // same person, same kind, same day — already recorded
  }
  if (suppressed) return;

  const result = await deliver(row);
  await prisma.mxNotification.update({
    where: { id: row.id },
    data:
      result.sent > 0
        ? { status: "SENT", sentAt: new Date() }
        : { status: "FAILED" },
  });
}
