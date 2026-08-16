"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { awardXp } from "@/lib/mainxp/xp/ledger";
import { focusBlocks, XP_VALUES } from "@/lib/mainxp/xp/curve";

const ALLOWED = [25, 50, 90];

export async function startFocus(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const custom = Number(formData.get("custom"));
  const preset = Number(formData.get("minutes"));
  const plannedMin = ALLOWED.includes(preset)
    ? preset
    : Number.isInteger(custom) && custom >= 10 && custom <= 240
      ? custom
      : 25;
  const taskId = String(formData.get("taskId") ?? "").trim() || null;
  if (taskId) {
    const task = await prisma.mxTask.findFirst({ where: { id: taskId, userId: user.id } });
    if (!task) return;
  }
  const running = await prisma.mxFocusSession.findFirst({
    where: { userId: user.id, endedAt: null },
  });
  if (running) return; // one live session at a time
  await prisma.mxFocusSession.create({ data: { userId: user.id, plannedMin, taskId } });
  revalidatePath("/focus");
}

export async function endFocus(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  const interruptions = Math.max(0, Math.min(99, Number(formData.get("interruptions")) || 0));
  const session = await prisma.mxFocusSession.findFirst({
    where: { id, userId: user.id, endedAt: null },
  });
  if (!session) return;

  const endedAt = new Date();
  // Verified server-side: XP counts only whole 25-min blocks actually elapsed.
  const elapsedMin = (endedAt.getTime() - session.startedAt.getTime()) / 60_000;
  const blocks = focusBlocks(session.plannedMin, elapsedMin);
  const completed = elapsedMin >= session.plannedMin - 1;

  await prisma.mxFocusSession.update({
    where: { id: session.id },
    data: { endedAt, interruptions, completed },
  });

  if (blocks > 0) {
    await awardXp({
      userId: user.id,
      sourceType: "focus",
      sourceId: session.id,
      reason: `Session focus : ${blocks * 25} min vérifiées`,
      mainDelta: XP_VALUES.FOCUS_PER_25MIN.main * blocks,
      coinsDelta: XP_VALUES.FOCUS_PER_25MIN.coins * blocks,
      attributeDeltas: { FOCUS: XP_VALUES.FOCUS_PER_25MIN.focus * blocks },
      idempotencyKey: `focus:${session.id}:completed`,
      timezone: user.timezone,
    });
  }
  revalidatePath("/focus");
  revalidatePath("/today");
}
