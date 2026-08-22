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

  // Free morning writing — intention, pensées. L'écriture est structure, pas
  // mérite : 0 XP, mais elle nourrit le contexte du coach.
  const morningIntention = s(formData.get("intention"), 2000);

  const fields = {
    mood: scale10(formData.get("mood")),
    energy: scale10(formData.get("energy")),
    stress: scale10(formData.get("stress")),
    focus: scale10(formData.get("focus")),
    morningIntention,
    startedAt: new Date(),
  };
  await prisma.mxDayPlan.upsert({
    where: { userId_dayKey: { userId: user.id, dayKey: today } },
    create: { userId: user.id, dayKey: today, ...fields },
    update: fields,
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

  revalidatePath("/", "layout");
  redirect("/today");
}

export async function saveNight(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const today = dayKey(new Date(), user.timezone);
  const tomorrow = addDays(today, 1);
  const oneBigThing = s(formData.get("tomorrowBigThing"), 300);

  const reviewFields = {
    reviewedAt: new Date(),
    reviewWentWell: s(formData.get("wentWell")),
    reviewMissedWhy: s(formData.get("missedWhy")),
    reviewLesson: s(formData.get("lesson")),
    reviewFeelings: s(formData.get("feelings")),
    reviewAlignment: s(formData.get("alignment")),
    tomorrowBigThing: oneBigThing,
    preparedAt: new Date(),
  };
  await prisma.mxDayPlan.upsert({
    where: { userId_dayKey: { userId: user.id, dayKey: today } },
    create: { userId: user.id, dayKey: today, ...reviewFields },
    update: reviewFields,
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

  // ── Feedback du soir : le coach lit la journée racontée et répond (le cœur
  // de « je veux lui dire comment ma journée s'est passée ») ──
  const gotFeedback = await nightFeedback(user, {
    wentWell: s(formData.get("wentWell")),
    missedWhy: s(formData.get("missedWhy")),
    lesson: s(formData.get("lesson")),
    feelings: s(formData.get("feelings")),
    alignment: s(formData.get("alignment")),
    tomorrowBigThing: oneBigThing,
  });

  revalidatePath("/today");
  redirect(gotFeedback ? "/coach" : "/today");
}

/**
 * Evening feedback: one bounded AI call that reads the user's own account of
 * the day plus the real numbers, and answers like a coach — in the chat, so
 * the conversation can continue naturally. Fails silent (returns false):
 * the review itself must never depend on the AI being up.
 */
async function nightFeedback(
  user: Awaited<ReturnType<typeof requireMxUser>>,
  review: {
    wentWell: string;
    missedWhy: string;
    lesson: string;
    feelings: string;
    alignment: string;
    tomorrowBigThing: string;
  }
): Promise<boolean> {
  if (!review.wentWell && !review.missedWhy && !review.lesson && !review.feelings) return false;
  try {
    const { getAIProvider } = await import("@/lib/mainxp/ai/provider");
    const provider = getAIProvider(user.aiKey);
    if (!provider) return false;
    const [{ buildCoachSystemPrompt }, { birdsEyeView }] = await Promise.all([
      import("@/lib/mainxp/ai/coach"),
      import("@/lib/mainxp/insight"),
    ]);
    const [system, view] = await Promise.all([buildCoachSystemPrompt(user), birdsEyeView(user)]);
    const result = await provider.chat({
      system,
      maxTokens: 800,
      messages: [
        {
          role: "user",
          content:
            `[REVUE DU SOIR — l'utilisateur vient de raconter sa journée dans le formulaire. Réponds-lui en coach, dans le chat.]\n` +
            `Ce qui a bien marché : ${review.wentWell || "—"}\n` +
            `Ce qui a été manqué et pourquoi : ${review.missedWhy || "—"}\n` +
            `Ce qu'il a RESSENTI : ${review.feelings || "—"}\n` +
            `Leçon du jour : ${review.lesson || "—"}\n` +
            `Alignement avec sa mission : ${review.alignment || "—"}\n` +
            `Priorité de demain : ${review.tomorrowBigThing || "—"}\n` +
            `Chiffres réels du jour et de la semaine : ${JSON.stringify(view)}\n\n` +
            `Donne ton feedback du soir en 4–7 phrases : reconnais le réel (chiffres à l'appui), ` +
            `réagis à SES mots — y compris ce qu'il a RESSENTI (accueille l'émotion avant de coacher, ` +
            `surtout s'il est fatigué) — creuse UNE chose (la leçon, le blocage ou l'alignement avec sa ` +
            `mission), et valide ou challenge la priorité de demain. Termine par une question courte qui ` +
            `l'aligne pour demain. Commence exactement par « 🌙 Feedback du soir — ».`,
        },
      ],
    });
    const conversation =
      (await prisma.mxConversation.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      })) ?? (await prisma.mxConversation.create({ data: { userId: user.id, title: "Coach" } }));
    await prisma.mxMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: result.text },
    });
    await prisma.mxConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return true;
  } catch (e) {
    console.error("nightFeedback failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

// ── Morning routine (audit P9, first slice) ─────────────────────────────────
// Structure the user walks through each morning, distinct from habits.
// Ticking an item never awards XP (structure, not merit) — the Morning Start
// event already carries the morning's XP, once per day.

const ROUTINE_CAP = 10;

export async function addRoutineItem(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = s(formData.get("title"), 200);
  if (!title) return;
  const note = s(formData.get("note"), 500); // l'écriture libre : pourquoi / comment
  const timeOfDay = s(formData.get("timeOfDay"), 20) === "evening" ? "evening" : "morning";
  const count = await prisma.mxRoutineItem.count({
    where: { userId: user.id, active: true, timeOfDay },
  });
  if (count >= ROUTINE_CAP) return;
  await prisma.mxRoutineItem.create({
    data: { userId: user.id, title, note, timeOfDay, position: count },
  });
  revalidatePath("/today/morning");
  revalidatePath("/today/night");
}

export async function toggleRoutineItem(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const item = await prisma.mxRoutineItem.findFirst({
    where: { id, userId: user.id, active: true },
  });
  if (!item) return;
  const today = dayKey(new Date(), user.timezone);
  const log = await prisma.mxRoutineLog.findUnique({
    where: { routineItemId_dayKey: { routineItemId: item.id, dayKey: today } },
  });
  await prisma.mxRoutineLog.upsert({
    where: { routineItemId_dayKey: { routineItemId: item.id, dayKey: today } },
    create: { userId: user.id, routineItemId: item.id, dayKey: today, done: true },
    update: { done: !(log?.done ?? false) },
  });
  revalidatePath("/today/morning");
  revalidatePath("/today/night");
  revalidatePath("/today");
}

export async function archiveRoutineItem(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxRoutineItem.updateMany({
    where: { id: s(formData.get("id"), 40), userId: user.id },
    data: { active: false },
  });
  revalidatePath("/today/morning");
  revalidatePath("/today/night");
}

// ── Minimum Day (addendum #7): on a bad day, protect the essentials ──

export async function activateMinimumDay(): Promise<void> {
  const user = await requireMxUser();
  const today = dayKey(new Date(), user.timezone);
  await prisma.mxDayPlan.upsert({
    where: { userId_dayKey: { userId: user.id, dayKey: today } },
    create: { userId: user.id, dayKey: today, minimumDay: true },
    update: { minimumDay: true },
  });
  await emitEvent(
    user,
    "minimum_day_activated",
    { day: today },
    { idempotencyKey: `minday:${user.id}:${today}` }
  );
  revalidatePath("/today");
}

const MIN_SLOTS = ["body", "progress", "mind"] as const;

export async function toggleMinimumSlot(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const slot = String(formData.get("slot") ?? "") as (typeof MIN_SLOTS)[number];
  if (!MIN_SLOTS.includes(slot)) return;
  const today = dayKey(new Date(), user.timezone);
  const plan = await prisma.mxDayPlan.findUnique({
    where: { userId_dayKey: { userId: user.id, dayKey: today } },
  });
  if (!plan?.minimumDay) return;

  const field =
    slot === "body" ? "minBodyDone" : slot === "progress" ? "minProgressDone" : "minMindDone";
  const nowDone = !plan[field];
  const updated = await prisma.mxDayPlan.update({
    where: { id: plan.id },
    data: { [field]: nowDone },
  });

  if (nowDone) {
    await emitEvent(
      user,
      "minimum_action_completed",
      { day: today, slot },
      { idempotencyKey: `minslot:${user.id}:${today}:${slot}` }
    );
    if (updated.minBodyDone && updated.minProgressDone && updated.minMindDone) {
      await emitEvent(
        user,
        "minimum_day_completed",
        { day: today },
        { idempotencyKey: `minday-done:${user.id}:${today}` }
      );
    }
  }
  revalidatePath("/today");
}

// ── Comeback Quest (addendum #8): returning is part of the game — no guilt ──

export async function submitComeback(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const today = dayKey(new Date(), user.timezone);
  const whatChanged = s(formData.get("whatChanged"));
  const priority = s(formData.get("priority"), 300);

  if (whatChanged) {
    await prisma.mxJournalEntry.create({
      data: { userId: user.id, kind: "comeback", content: whatChanged, dayKey: today },
    });
  }
  if (priority) {
    // The chosen priority becomes a temporary memory the coach respects.
    await prisma.mxMemory.create({
      data: {
        userId: user.id,
        type: "commitment",
        content: `Priorité de reprise : ${priority}`,
        source: "user_stated",
        scope: "temporary",
        expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
      },
    });
  }
  await emitEvent(
    user,
    "comeback_completed",
    { day: today, priority: priority || null },
    { idempotencyKey: `comeback:${user.id}:${today}` }
  );
  revalidatePath("/today");
}
