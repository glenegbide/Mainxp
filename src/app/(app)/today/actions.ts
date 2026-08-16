"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { awardXp, reverseXp } from "@/lib/mainxp/xp/ledger";
import { hardModeMultiplier, XP_VALUES } from "@/lib/mainxp/xp/curve";
import type { MxTaskTier } from "@/generated/prisma/enums";

const refresh = () => revalidatePath("/today");

// ── Main Quest (exactly one per day, Part 9) ──

export async function setMainQuest(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title || title.length > 300) return;
  const today = dayKey(new Date(), user.timezone);

  const existing = await prisma.mxTask.findFirst({
    where: { userId: user.id, dayKey: today, tier: "MAIN_QUEST", status: "OPEN" },
  });
  if (existing) return; // one Main Quest per day — UI hides the form when one exists

  await prisma.mxTask.create({
    data: { userId: user.id, title, tier: "MAIN_QUEST", dayKey: today },
  });
  refresh();
}

// ── Tasks ──

export async function addTask(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = String(formData.get("title") ?? "").trim();
  const tierRaw = String(formData.get("tier") ?? "DAILY_MISSION");
  const tier: MxTaskTier = tierRaw === "SIDE_QUEST" ? "SIDE_QUEST" : "DAILY_MISSION";
  if (!title || title.length > 300) return;
  const today = dayKey(new Date(), user.timezone);

  if (tier === "DAILY_MISSION") {
    // Part 9: 3–5 useful actions. Hard cap at 5 open missions per day.
    const openMissions = await prisma.mxTask.count({
      where: { userId: user.id, dayKey: today, tier: "DAILY_MISSION", status: "OPEN" },
    });
    if (openMissions >= 5) return;
  }

  await prisma.mxTask.create({ data: { userId: user.id, title, tier, dayKey: today } });
  refresh();
}

export async function completeTask(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  const task = await prisma.mxTask.findFirst({ where: { id, userId: user.id, status: "OPEN" } });
  if (!task) return;

  await prisma.mxTask.update({
    where: { id: task.id },
    data: { status: "DONE", completedAt: new Date() },
  });

  const base = XP_VALUES[task.tier];
  await awardXp({
    userId: user.id,
    sourceType: task.tier === "SIDE_QUEST" ? "side_quest" : "task",
    sourceId: task.id,
    reason:
      task.tier === "MAIN_QUEST"
        ? `Main Quest accomplie : ${task.title}`
        : `Tâche accomplie : ${task.title}`,
    mainDelta: base.main,
    multiplier: hardModeMultiplier(task.postponeCount),
    idempotencyKey: `task:${task.id}:completed`,
    timezone: user.timezone,
  });
  refresh();
}

export async function postponeTask(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  const task = await prisma.mxTask.findFirst({ where: { id, userId: user.id, status: "OPEN" } });
  if (!task || !task.dayKey) return;
  await prisma.mxTask.update({
    where: { id: task.id },
    data: { dayKey: addDays(task.dayKey, 1), postponeCount: { increment: 1 } },
  });
  refresh();
}

export async function deleteTask(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  // Only open tasks are deletable from the UI; completed ones keep their ledger trace.
  await prisma.mxTask.deleteMany({ where: { id, userId: user.id, status: "OPEN" } });
  refresh();
}

// ── Daily Non-Negotiables (Part 13) ──

export async function addNonNegotiable(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title || title.length > 200) return;
  const count = await prisma.mxNonNegotiable.count({
    where: { userId: user.id, active: true, cadence: "DAILY" },
  });
  if (count >= 7) return; // Part 13: 3–7
  await prisma.mxNonNegotiable.create({ data: { userId: user.id, title, cadence: "DAILY" } });
  refresh();
}

export async function toggleNonNegotiable(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  const nn = await prisma.mxNonNegotiable.findFirst({
    where: { id, userId: user.id, active: true },
  });
  if (!nn) return;
  const today = dayKey(new Date(), user.timezone);

  const log = await prisma.mxNonNegotiableLog.findUnique({
    where: { nonNegotiableId_periodKey: { nonNegotiableId: nn.id, periodKey: today } },
  });
  const nowCompleted = !(log?.completed ?? false);

  await prisma.mxNonNegotiableLog.upsert({
    where: { nonNegotiableId_periodKey: { nonNegotiableId: nn.id, periodKey: today } },
    create: {
      userId: user.id,
      nonNegotiableId: nn.id,
      periodKey: today,
      value: nowCompleted ? nn.target : 0,
      completed: nowCompleted,
    },
    update: { completed: nowCompleted, value: nowCompleted ? nn.target : 0 },
  });

  const keptKey = `non_negotiable:${nn.id}:${today}`;
  const bonusKey = `non_negotiable_bonus:${user.id}:${today}`;

  if (nowCompleted) {
    // Idempotency: un-toggling then re-toggling the same day never awards twice.
    await awardXp({
      userId: user.id,
      sourceType: "non_negotiable",
      sourceId: nn.id,
      reason: `Non-négociable tenu : ${nn.title}`,
      mainDelta: XP_VALUES.NON_NEGOTIABLE.main,
      attributeDeltas: { DISCIPLINE: XP_VALUES.NON_NEGOTIABLE.discipline },
      idempotencyKey: keptKey,
      timezone: user.timezone,
    });

    // All daily non-negotiables kept today → one-time bonus.
    const [actives, doneToday] = await Promise.all([
      prisma.mxNonNegotiable.count({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
      prisma.mxNonNegotiableLog.count({
        where: { userId: user.id, periodKey: today, completed: true },
      }),
    ]);
    if (actives > 0 && doneToday >= actives) {
      await awardXp({
        userId: user.id,
        sourceType: "non_negotiable_bonus",
        reason: "Tous les non-négociables du jour tenus",
        mainDelta: XP_VALUES.ALL_NON_NEGOTIABLES_BONUS.main,
        attributeDeltas: { DISCIPLINE: XP_VALUES.ALL_NON_NEGOTIABLES_BONUS.discipline },
        idempotencyKey: bonusKey,
        timezone: user.timezone,
      });
    }
  } else {
    // Un-toggle: reverse through the ledger (Part 64) — never decrement fields.
    for (const key of [keptKey, bonusKey]) {
      const tx = await prisma.mxXpTransaction.findUnique({ where: { idempotencyKey: key } });
      if (tx) await reverseXp(user.id, tx.id, `Annulation : ${nn.title}`);
    }
  }
  refresh();
}
