"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { emitEvent } from "@/lib/mainxp/events";
import type { MxGoalHorizon } from "@/generated/prisma/enums";

const s = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);
const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const HORIZONS: MxGoalHorizon[] = ["LIFETIME", "THREE_YEAR", "ONE_YEAR", "NINETY_DAY", "MONTHLY", "WEEKLY"];

export async function createGoal(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = s(formData.get("title"), 300);
  if (!title) return;
  const horizonRaw = s(formData.get("horizon")) as MxGoalHorizon;
  const deadlineRaw = s(formData.get("deadline"), 10);

  const goal = await prisma.mxGoal.create({
    data: {
      userId: user.id,
      title,
      why: s(formData.get("why"), 1000),
      lifeArea: s(formData.get("lifeArea"), 40),
      horizon: HORIZONS.includes(horizonRaw) ? horizonRaw : "NINETY_DAY",
      targetValue: num(formData.get("targetValue")),
      unit: s(formData.get("unit"), 40) || null,
      deadline: deadlineRaw ? new Date(`${deadlineRaw}T12:00:00Z`) : null,
      priority: Math.min(5, Math.max(1, num(formData.get("priority")) ?? 3)),
      reward: s(formData.get("reward"), 300) || null,
    },
  });
  redirect(`/goals/${goal.id}`);
}

export async function logGoalProgress(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const value = num(formData.get("value"));
  if (value == null) return;
  const goal = await prisma.mxGoal.findFirst({ where: { id, userId: user.id, status: "ACTIVE" } });
  if (!goal) return;
  await prisma.mxGoal.update({
    where: { id: goal.id },
    data: { currentValue: Math.max(0, goal.currentValue + value) },
  });
  revalidatePath(`/goals/${goal.id}`);
  revalidatePath("/goals");
}

export async function completeGoal(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const goal = await prisma.mxGoal.findFirst({ where: { id, userId: user.id, status: "ACTIVE" } });
  if (!goal) return;

  // Honest evidence (addendum #3): a measurable goal whose logged progress
  // reached its target is SYSTEM_RECORDED; declaring victory below target (or
  // on an unmeasured goal) stays SELF_REPORTED and says so in the payload.
  // Rare titles can later require the stronger level. No shame either way.
  const measurable = goal.targetValue != null && goal.targetValue > 0;
  const targetMet = measurable && goal.currentValue >= (goal.targetValue as number);

  await emitEvent(
    user,
    "goal_reached",
    {
      goalId: goal.id,
      title: goal.title,
      lifeArea: goal.lifeArea,
      measurable,
      targetMet: measurable ? targetMet : null,
      declaredBelowTarget: measurable && !targetMet,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
    },
    {
      idempotencyKey: `goal:${goal.id}:completed`,
      evidence: targetMet ? "SYSTEM_RECORDED" : "SELF_REPORTED",
      domainOps: [
        prisma.mxGoal.update({
          where: { id: goal.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        }),
      ],
    }
  );
  revalidatePath(`/goals/${goal.id}`);
  revalidatePath("/goals");
}

export async function addGoalTask(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const goalId = s(formData.get("goalId"), 40);
  const title = s(formData.get("title"), 300);
  if (!title) return;
  const goal = await prisma.mxGoal.findFirst({ where: { id: goalId, userId: user.id } });
  if (!goal) return;
  const { dayKey } = await import("@/lib/mainxp/day");
  await prisma.mxTask.create({
    data: {
      userId: user.id,
      goalId: goal.id,
      title,
      tier: "DAILY_MISSION",
      dayKey: dayKey(new Date(), user.timezone),
    },
  });
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/today");
}

// ── DIRECTION (PRODUCT_NORTH phase 2) ──

/** One season at a time — creating while one is active is refused, not merged. */
export async function createSeason(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = s(formData.get("seasonTitle"), 120);
  const endRaw = s(formData.get("endDay"), 10);
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) return;
  const existing = await prisma.mxSeason.findFirst({
    where: { userId: user.id, status: "active" },
  });
  if (existing) return;
  const { dayKey } = await import("@/lib/mainxp/day");
  const startDay = dayKey(new Date(), user.timezone);
  if (endRaw <= startDay) return;
  const primaryGoalId = s(formData.get("primaryGoalId"), 40) || null;
  if (primaryGoalId) {
    const owns = await prisma.mxGoal.findFirst({ where: { id: primaryGoalId, userId: user.id } });
    if (!owns) return;
  }
  const season = await prisma.mxSeason.create({
    data: {
      userId: user.id,
      title,
      startDay,
      endDay: endRaw,
      primaryGoalId,
      supportNote: s(formData.get("supportNote"), 300),
    },
  });
  await emitEvent(user, "season_started", { seasonId: season.id, title });
  revalidatePath("/goals");
  revalidatePath("/today");
}

export async function closeSeason(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const season = await prisma.mxSeason.findFirst({
    where: { id, userId: user.id, status: "active" },
  });
  if (!season) return;
  await prisma.mxSeason.update({
    where: { id: season.id },
    data: { status: "closed", closedAt: new Date() },
  });
  await emitEvent(user, "season_closed", { seasonId: season.id, title: season.title });
  revalidatePath("/goals");
  revalidatePath("/today");
}

/** «Pas maintenant» — the idea is saved, the priority is unchanged. */
export async function addNotNow(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = s(formData.get("notNowTitle"), 300);
  if (!title) return;
  await prisma.mxNotNow.create({ data: { userId: user.id, title } });
  revalidatePath("/goals");
  revalidatePath("/progress/week");
}

export async function dropNotNow(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxNotNow.deleteMany({
    where: { id: s(formData.get("id"), 40), userId: user.id },
  });
  revalidatePath("/goals");
  revalidatePath("/progress/week");
}

/** Its time has come: the idea becomes a real goal, deliberately. */
export async function promoteNotNow(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const item = await prisma.mxNotNow.findFirst({ where: { id, userId: user.id } });
  if (!item) return;
  const goal = await prisma.mxGoal.create({
    data: { userId: user.id, title: item.title },
  });
  await prisma.mxNotNow.delete({ where: { id: item.id } });
  revalidatePath("/goals", "layout");
  revalidatePath("/progress/week");
  redirect(`/goals/${goal.id}`);
}

/** The goal's direction: where it's ACTUALLY blocked, and the input the user
 *  controls. Declared in the user's words; the coach reads both. */
export async function saveGoalDirection(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  await prisma.mxGoal.updateMany({
    where: { id, userId: user.id },
    data: {
      bottleneck: s(formData.get("bottleneck"), 300),
      leadingInput: s(formData.get("leadingInput"), 300),
    },
  });
  revalidatePath(`/goals/${id}`);
  revalidatePath("/goals");
  revalidatePath("/today");
}
