"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { dayKey, weekKey } from "@/lib/mainxp/day";
import { emitEvent } from "@/lib/mainxp/events";

const s = (v: FormDataEntryValue | null, max = 1000) => String(v ?? "").trim().slice(0, max);

export async function saveWeeklyReview(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const now = new Date();
  const week = weekKey(now, user.timezone);

  const win = s(formData.get("win"));
  const miss = s(formData.get("miss"));
  const nextPriority = s(formData.get("nextPriority"));
  const content = [
    win && `Plus grande victoire : ${win}`,
    miss && `Plus grand manque : ${miss}`,
    nextPriority && `Priorité de la semaine prochaine : ${nextPriority}`,
  ]
    .filter(Boolean)
    .join("\n");
  if (content) {
    await prisma.mxJournalEntry.create({
      data: {
        userId: user.id,
        kind: "weekly",
        content: `[${week}]\n${content}`,
        dayKey: dayKey(now, user.timezone),
      },
    });
  }

  await emitEvent(
    user,
    "weekly_review_completed",
    { week },
    { idempotencyKey: `weekly:${user.id}:${week}` }
  );
  revalidatePath("/", "layout");
  redirect("/progress");
}
