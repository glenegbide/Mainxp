"use server";

// Morning Start (Part 12) and Night Review + tomorrow prep (Parts 31–32).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { awardXp } from "@/lib/mainxp/xp/ledger";
import { XP_VALUES } from "@/lib/mainxp/xp/curve";

const s = (v: FormDataEntryValue | null, max = 1000) => String(v ?? "").trim().slice(0, max);
const scale10 = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
};

export async function saveMorning(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const today = dayKey(new Date(), user.timezone);

  await prisma.mxDayPlan.upsert({
    where: { userId_dayKey: { userId: user.id, dayKey: today } },
    create: {
      userId: user.id,
      dayKey: today,
      mood: scale10(formData.get("mood")),
      energy: scale10(formData.get("energy")),
      stress: scale10(formData.get("stress")),
      focus: scale10(formData.get("focus")),
      startedAt: new Date(),
    },
    update: {
      mood: scale10(formData.get("mood")),
      energy: scale10(formData.get("energy")),
      stress: scale10(formData.get("stress")),
      focus: scale10(formData.get("focus")),
      startedAt: new Date(),
    },
  });

  // Optional Main Quest set during the flow (one per day rule still holds).
  const mainQuest = s(formData.get("mainQuest"), 300);
  if (mainQuest) {
    const existing = await prisma.mxTask.findFirst({
      where: { userId: user.id, dayKey: today, tier: "MAIN_QUEST" },
    });
    if (!existing) {
      await prisma.mxTask.create({
        data: { userId: user.id, title: mainQuest, tier: "MAIN_QUEST", dayKey: today },
      });
    }
  }

  await awardXp({
    userId: user.id,
    sourceType: "morning",
    reason: "Journée lancée (Morning Start)",
    mainDelta: XP_VALUES.MORNING_START.main,
    coinsDelta: XP_VALUES.MORNING_START.coins,
    attributeDeltas: { MIND: XP_VALUES.MORNING_START.mind },
    idempotencyKey: `morning:${user.id}:${today}`,
    timezone: user.timezone,
  });

  redirect("/today");
}

export async function saveNight(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const today = dayKey(new Date(), user.timezone);
  const tomorrow = addDays(today, 1);
  const oneBigThing = s(formData.get("tomorrowBigThing"), 300);

  await prisma.mxDayPlan.upsert({
    where: { userId_dayKey: { userId: user.id, dayKey: today } },
    create: {
      userId: user.id,
      dayKey: today,
      reviewedAt: new Date(),
      reviewWentWell: s(formData.get("wentWell")),
      reviewMissedWhy: s(formData.get("missedWhy")),
      reviewLesson: s(formData.get("lesson")),
      tomorrowBigThing: oneBigThing,
      preparedAt: new Date(),
    },
    update: {
      reviewedAt: new Date(),
      reviewWentWell: s(formData.get("wentWell")),
      reviewMissedWhy: s(formData.get("missedWhy")),
      reviewLesson: s(formData.get("lesson")),
      tomorrowBigThing: oneBigThing,
      preparedAt: new Date(),
    },
  });

  // Gratitude (Part 30) — optional, its own record + XP.
  const gratitude = s(formData.get("gratitude"), 1000);
  if (gratitude) {
    await prisma.mxGratitudeEntry.create({
      data: { userId: user.id, dayKey: today, content: gratitude },
    });
    await awardXp({
      userId: user.id,
      sourceType: "gratitude",
      reason: "Gratitude du soir",
      mainDelta: XP_VALUES.GRATITUDE.main,
      coinsDelta: XP_VALUES.GRATITUDE.coins,
      attributeDeltas: { MIND: XP_VALUES.GRATITUDE.mind },
      idempotencyKey: `gratitude:${user.id}:${today}`,
      timezone: user.timezone,
    });
  }

  // ── Tomorrow preparation (Part 32): carry-overs + Main Quest candidate ──
  await prisma.mxTask.updateMany({
    where: { userId: user.id, dayKey: today, status: "OPEN", tier: { not: "MAIN_QUEST" } },
    data: { dayKey: tomorrow },
  });
  // An unfinished Main Quest carries over as a hard-mode candidate.
  await prisma.mxTask.updateMany({
    where: { userId: user.id, dayKey: today, status: "OPEN", tier: "MAIN_QUEST" },
    data: { dayKey: tomorrow, postponeCount: { increment: 1 } },
  });
  if (oneBigThing) {
    const existing = await prisma.mxTask.findFirst({
      where: { userId: user.id, dayKey: tomorrow, tier: "MAIN_QUEST" },
    });
    if (!existing) {
      await prisma.mxTask.create({
        data: { userId: user.id, title: oneBigThing, tier: "MAIN_QUEST", dayKey: tomorrow },
      });
    }
  }

  await awardXp({
    userId: user.id,
    sourceType: "night_review",
    reason: "Revue du soir + préparation de demain",
    mainDelta: XP_VALUES.NIGHT_REVIEW.main,
    coinsDelta: XP_VALUES.NIGHT_REVIEW.coins,
    attributeDeltas: { MIND: XP_VALUES.NIGHT_REVIEW.mind },
    idempotencyKey: `night:${user.id}:${today}`,
    timezone: user.timezone,
  });

  revalidatePath("/today");
  redirect("/today");
}
