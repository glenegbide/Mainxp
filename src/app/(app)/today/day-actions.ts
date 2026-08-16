"use server";

// Morning Start (Part 12) and Night Review + tomorrow prep (Parts 31–32).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { emitEvent } from "@/lib/mainxp/events";

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

  await emitEvent(
    user,
    "morning_started",
    { day: today },
    { idempotencyKey: `morning:${user.id}:${today}` }
  );

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
    await emitEvent(
      user,
      "gratitude_logged",
      { day: today },
      { idempotencyKey: `gratitude:${user.id}:${today}` }
    );
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

  await emitEvent(
    user,
    "night_review_completed",
    { day: today, oneBigThing: oneBigThing || null },
    { idempotencyKey: `night:${user.id}:${today}` }
  );

  revalidatePath("/today");
  redirect("/today");
}
