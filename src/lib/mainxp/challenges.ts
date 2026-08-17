// Challenge service (audit #24): time-boxed dares with explicit acceptance.
// Philosophy: the ASK is personal (« Glen, tu acceptes ? »), ticking is
// structure (0 XP), and completing is a SURPRISE reward — amounts are never
// advertised, the ledger carries the reason afterwards.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { dayKey } from "@/lib/mainxp/day";
import { emitEvent } from "@/lib/mainxp/events";

export const MAX_ALIVE_CHALLENGES = 3; // proposed + active combined — no overwhelm

/** Starter dares shown when nothing is alive — accepted in one tap. */
export const STARTER_CHALLENGES = [
  {
    key: "meditation-30",
    title: "30 jours de méditation — 5 minutes",
    description: "5 minutes par jour, 30 jours. Pas la perfection : la présence.",
    durationDays: 30,
    targetCount: 30,
    unitLabel: "jours",
  },
  {
    key: "livre-semaine",
    title: "1 livre cette semaine",
    description: "Un livre, fini, en 7 jours. Coche le jour où tu tournes la dernière page.",
    durationDays: 7,
    targetCount: 1,
    unitLabel: "livre",
  },
  {
    key: "organisation-7",
    title: "7 jours organisé",
    description: "Chaque soir : bureau rangé, demain préparé. Une semaine complète.",
    durationDays: 7,
    targetCount: 7,
    unitLabel: "jours",
  },
] as const;

export async function aliveChallengeCount(userId: string): Promise<number> {
  return prisma.mxChallenge.count({
    where: { userId, status: { in: ["proposed", "active"] } },
  });
}

export async function proposeChallenge(
  user: Pick<MxUser, "id">,
  input: { title: string; description?: string; durationDays: number; targetCount: number; unitLabel?: string; source?: string }
) {
  if ((await aliveChallengeCount(user.id)) >= MAX_ALIVE_CHALLENGES) return null;
  const durationDays = Math.min(90, Math.max(1, Math.round(input.durationDays)));
  const targetCount = Math.min(durationDays, Math.max(1, Math.round(input.targetCount)));
  return prisma.mxChallenge.create({
    data: {
      userId: user.id,
      title: input.title.trim().slice(0, 200),
      description: (input.description ?? "").trim().slice(0, 500),
      durationDays,
      targetCount,
      unitLabel: (input.unitLabel ?? "jours").slice(0, 30),
      source: input.source ?? "coach",
    },
  });
}

export async function acceptChallenge(user: Pick<MxUser, "id" | "timezone">, challengeId: string) {
  const challenge = await prisma.mxChallenge.findFirst({
    where: { id: challengeId, userId: user.id, status: "proposed" },
  });
  if (!challenge) return null;
  await emitEvent(
    user,
    "challenge_accepted",
    { challengeId: challenge.id, title: challenge.title, durationDays: challenge.durationDays },
    {
      idempotencyKey: `challenge:${challenge.id}:accepted`,
      domainOps: [
        prisma.mxChallenge.update({
          where: { id: challenge.id },
          data: { status: "active", startedAt: new Date() },
        }),
      ],
    }
  );
  return challenge;
}

/** Tick today (structure, 0 XP). Completing the target fires the surprise. */
export async function tickChallenge(user: Pick<MxUser, "id" | "timezone">, challengeId: string) {
  const challenge = await prisma.mxChallenge.findFirst({
    where: { id: challengeId, userId: user.id, status: "active" },
  });
  if (!challenge) return null;
  const today = dayKey(new Date(), user.timezone);
  try {
    await prisma.mxChallengeLog.create({
      data: { userId: user.id, challengeId: challenge.id, dayKey: today },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") return "already";
    throw e;
  }
  await emitEvent(user, "challenge_tick", {
    challengeId: challenge.id,
    title: challenge.title,
    day: today,
  });

  const ticks = await prisma.mxChallengeLog.count({ where: { challengeId: challenge.id } });
  if (ticks >= challenge.targetCount) {
    await emitEvent(
      user,
      "challenge_completed",
      {
        challengeId: challenge.id,
        title: challenge.title,
        durationDays: challenge.durationDays,
        targetCount: challenge.targetCount,
      },
      {
        idempotencyKey: `challenge:${challenge.id}:completed`,
        domainOps: [
          prisma.mxChallenge.update({
            where: { id: challenge.id },
            data: { status: "completed", completedAt: new Date() },
          }),
        ],
      }
    );
    return "completed";
  }
  return "ticked";
}
