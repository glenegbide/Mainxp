"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { dayKey } from "@/lib/mainxp/day";
import { awardXp } from "@/lib/mainxp/xp/ledger";
import { diminishingFactor, XP_VALUES } from "@/lib/mainxp/xp/curve";
import type { MxAttribute } from "@/generated/prisma/enums";

const s = (v: FormDataEntryValue | null, max = 300) => String(v ?? "").trim().slice(0, max);
const ATTRS: MxAttribute[] = [
  "STRENGTH", "ENDURANCE", "FOCUS", "DISCIPLINE", "KNOWLEDGE", "STRATEGY", "WEALTH", "MIND", "SOCIAL",
];

const refresh = () => {
  revalidatePath("/habits");
  revalidatePath("/today");
};

export async function createHabit(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = s(formData.get("title"));
  if (!title) return;
  const kind = s(formData.get("kind")) === "bad" ? "bad" : "good";
  const attrRaw = s(formData.get("attribute")) as MxAttribute;
  const count = await prisma.mxHabit.count({ where: { userId: user.id, active: true } });
  if (count >= 15) return;
  await prisma.mxHabit.create({
    data: {
      userId: user.id,
      title,
      kind,
      attribute: kind === "good" && ATTRS.includes(attrRaw) ? attrRaw : null,
    },
  });
  refresh();
}

export async function archiveHabit(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxHabit.updateMany({
    where: { id: s(formData.get("id"), 40), userId: user.id },
    data: { active: false },
  });
  refresh();
}

/**
 * Tap a habit (Habitica-inspired ±).
 * Good habit: XP through the ledger with per-habit same-day diminishing returns.
 * Bad habit: zero XP, no ledger punishment — the tap only feeds the Élan gauge.
 */
export async function tapHabit(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const habit = await prisma.mxHabit.findFirst({
    where: { id: s(formData.get("id"), 40), userId: user.id, active: true },
  });
  if (!habit) return;
  const today = dayKey(new Date(), user.timezone);

  const log = await prisma.mxHabitLog.upsert({
    where: { habitId_periodKey: { habitId: habit.id, periodKey: today } },
    create: { userId: user.id, habitId: habit.id, periodKey: today, value: 1 },
    update: { value: { increment: 1 } },
  });

  if (habit.kind === "good") {
    const priorTaps = log.value - 1; // taps before this one, today
    await awardXp({
      userId: user.id,
      sourceType: "habit",
      sourceId: habit.id,
      reason: `Habitude tenue : ${habit.title}`,
      mainDelta: XP_VALUES.HABIT_LOG.main,
      coinsDelta: XP_VALUES.HABIT_LOG.coins,
      attributeDeltas: habit.attribute
        ? { [habit.attribute]: XP_VALUES.HABIT_LOG.attribute }
        : undefined,
      multiplier: diminishingFactor(priorTaps),
      idempotencyKey: `habit:${habit.id}:${today}:${log.value}`,
      timezone: user.timezone,
    });
  }
  refresh();
}
