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
