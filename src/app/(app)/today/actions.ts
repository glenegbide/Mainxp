"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { countAwardGenerations, reverseLatestAward } from "@/lib/mainxp/xp/ledger";
import { emitEvent } from "@/lib/mainxp/events";
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
    // Part 9: 3–5 useful actions. Hard cap at 5 missions per day — counting
    // completed ones too, otherwise "complete 5, add 5 more" farms +25 XP
    // without limit. Extra real work still belongs in the day: as side quests.
    const missionsToday = await prisma.mxTask.count({
      where: { userId: user.id, dayKey: today, tier: "DAILY_MISSION" },
    });
    if (missionsToday >= 5) {
      await prisma.mxTask.create({
        data: { userId: user.id, title, tier: "SIDE_QUEST", dayKey: today },
      });
      refresh();
      return;
    }
  }

  await prisma.mxTask.create({ data: { userId: user.id, title, tier, dayKey: today } });
  refresh();
}

export async function completeTask(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  const task = await prisma.mxTask.findFirst({ where: { id, userId: user.id, status: "OPEN" } });
  if (!task) return;
  const today = dayKey(new Date(), user.timezone);

  // Completion-side XP cap: even when >5 missions legitimately share a day
  // (carry-overs from the night review), only 5 mission awards exist per day.
  // The 6th+ completion is still recorded — at side-quest value (see events.ts).
  let capExceeded = false;
  if (task.tier === "DAILY_MISSION") {
    const missionsDoneToday = await prisma.mxTask.count({
      where: { userId: user.id, dayKey: today, tier: "DAILY_MISSION", status: "DONE" },
    });
    capExceeded = missionsDoneToday >= 5;
  }

  // System of record: one canonical event, atomic with the state change —
  // never DONE without its event (addendum #1).
  await emitEvent(
    user,
    task.tier === "MAIN_QUEST" ? "main_quest_completed" : "task_completed",
    {
      taskId: task.id,
      title: task.title,
      tier: task.tier,
      postponeCount: task.postponeCount,
      capExceeded,
    },
    {
      idempotencyKey: `task:${task.id}:completed`,
      domainOps: [
        prisma.mxTask.update({
          where: { id: task.id },
          data: { status: "DONE", completedAt: new Date() },
        }),
      ],
    }
  );
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

  const logUpsert = prisma.mxNonNegotiableLog.upsert({
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
    // Generation-aware idempotency (ledger.ts): an accidental uncheck/recheck
    // earns the award back exactly once — never zero, never double. The Nth
    // keep is a distinct fact → distinct event row; the ledger's logical key
    // keeps net XP equal to final toggle state.
    const generation = (await countAwardGenerations(keptKey)) + 1;
    await emitEvent(
      user,
      "commitment_kept",
      { nnId: nn.id, title: nn.title, day: today, generation },
      {
        idempotencyKey: keptKey,
        eventIdempotencyKey: `${keptKey}:g${generation}`,
        domainOps: [logUpsert],
      }
    );

    // All daily non-negotiables kept today → one-time-per-day bonus (its own
    // generation chain: reversed by any uncheck, re-earned when all are green).
    const [actives, doneToday] = await Promise.all([
      prisma.mxNonNegotiable.count({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
      prisma.mxNonNegotiableLog.count({
        where: { userId: user.id, periodKey: today, completed: true },
      }),
    ]);
    if (actives > 0 && doneToday >= actives) {
      const bonusGen = (await countAwardGenerations(bonusKey)) + 1;
      await emitEvent(
        user,
        "all_commitments_kept",
        { day: today, count: actives },
        { idempotencyKey: bonusKey, eventIdempotencyKey: `${bonusKey}:g${bonusGen}` }
      );
    }
  } else {
    await logUpsert;
    // Un-toggle: reverse through the ledger (Part 64) — never decrement fields.
    await reverseLatestAward(user.id, keptKey, `Annulation : ${nn.title}`);
    await reverseLatestAward(user.id, bonusKey, "Annulation du bonus non-négociables");
  }
  refresh();
}

// ── Task notes (what the user learned / what happened — memory, not merit) ──

export async function addTaskNote(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const task = await prisma.mxTask.findFirst({ where: { id, userId: user.id, status: "DONE" } });
  if (!task || !note) return;
  await prisma.mxTask.update({ where: { id: task.id }, data: { notes: note } });
  await emitEvent(user, "task_note_added", { taskId: task.id, title: task.title, note });
  refresh();
}
