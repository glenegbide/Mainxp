"use server";

// Notes at the moment of doing. One file, because they are one idea: the
// user's own words attached to the thing they just did.
//
// Every write is scoped by userId — the id in the form is never trusted — and
// every one is an upsert, because the note often arrives before the log does
// (you can write "hard morning" on a step you have not ticked yet).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { dayKey } from "@/lib/mainxp/day";

const MAX = 2000;
const clean = (s: string) => s.slice(0, MAX).trim();

export async function noteOnHabit(habitId: string, note: string): Promise<{ ok: boolean }> {
  const user = await requireMxUser();
  const habit = await prisma.mxHabit.findFirst({
    where: { id: habitId, userId: user.id },
    select: { id: true, cadence: true },
  });
  if (!habit) return { ok: false };
  const periodKey = dayKey(new Date(), user.timezone);
  await prisma.mxHabitLog.upsert({
    where: { habitId_periodKey: { habitId: habit.id, periodKey } },
    // A note alone is not a tap: value stays 0 until the user actually taps.
    create: { userId: user.id, habitId: habit.id, periodKey, value: 0, note: clean(note) },
    update: { note: clean(note) },
  });
  revalidatePath("/habits");
  revalidatePath("/today");
  return { ok: true };
}

export async function noteOnCommitment(
  nonNegotiableId: string,
  note: string
): Promise<{ ok: boolean }> {
  const user = await requireMxUser();
  const nn = await prisma.mxNonNegotiable.findFirst({
    where: { id: nonNegotiableId, userId: user.id },
    select: { id: true },
  });
  if (!nn) return { ok: false };
  const periodKey = dayKey(new Date(), user.timezone);
  await prisma.mxNonNegotiableLog.upsert({
    where: { nonNegotiableId_periodKey: { nonNegotiableId: nn.id, periodKey } },
    create: { userId: user.id, nonNegotiableId: nn.id, periodKey, completed: false, note: clean(note) },
    update: { note: clean(note) },
  });
  revalidatePath("/today");
  return { ok: true };
}

export async function noteOnRoutineStep(itemId: string, note: string): Promise<{ ok: boolean }> {
  const user = await requireMxUser();
  const item = await prisma.mxRoutineItem.findFirst({
    where: { id: itemId, userId: user.id },
    select: { id: true },
  });
  if (!item) return { ok: false };
  const day = dayKey(new Date(), user.timezone);
  await prisma.mxRoutineLog.upsert({
    where: { routineItemId_dayKey: { routineItemId: item.id, dayKey: day } },
    create: { userId: user.id, routineItemId: item.id, dayKey: day, done: false, note: clean(note) },
    update: { note: clean(note) },
  });
  revalidatePath("/today/morning");
  return { ok: true };
}

export async function noteOnTask(taskId: string, note: string): Promise<{ ok: boolean }> {
  const user = await requireMxUser();
  const { count } = await prisma.mxTask.updateMany({
    where: { id: taskId, userId: user.id },
    data: { notes: clean(note) },
  });
  revalidatePath("/today");
  return { ok: count > 0 };
}

export async function noteOnGratitude(entryId: string, note: string): Promise<{ ok: boolean }> {
  const user = await requireMxUser();
  const { count } = await prisma.mxGratitudeEntry.updateMany({
    where: { id: entryId, userId: user.id },
    data: { note: clean(note) },
  });
  revalidatePath("/journal");
  return { ok: count > 0 };
}
