"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { emitEvent } from "@/lib/mainxp/events";
import { focusBlocks } from "@/lib/mainxp/xp/curve";

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

const SOURCES = ["phone", "message", "thought", "person", "fatigue"] as const;

export async function endFocus(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  // One tap per interruption, tagged by source; the total is their sum.
  // (The legacy numeric field still counts when the chips are absent.)
  const sources: Record<string, number> = {};
  for (const key of SOURCES) {
    const n = Math.max(0, Math.min(99, Number(formData.get(`src_${key}`)) || 0));
    if (n > 0) sources[key] = n;
  }
  const tapped = Object.values(sources).reduce((s, n) => s + n, 0);
  const interruptions =
    tapped > 0 ? tapped : Math.max(0, Math.min(99, Number(formData.get("interruptions")) || 0));
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
    data: { endedAt, interruptions, interruptSources: sources, completed },
  });

  if (blocks > 0) {
    // Server-timed → SYSTEM_RECORDED evidence (docs/XP_SYSTEM.md).
    await emitEvent(
      user,
      "focus_completed",
      { sessionId: session.id, blocks, plannedMin: session.plannedMin, interruptions },
      { idempotencyKey: `focus:${session.id}:completed`, evidence: "SYSTEM_RECORDED" }
    );
  }
  revalidatePath("/focus");
  revalidatePath("/today");
}

/** One tap after the arena: duration alone is not the whole truth. Optionally
 *  one line of "what changed". Rating is reflection, never rewarded. */
export async function rateFocus(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  const quality = String(formData.get("quality") ?? "");
  if (!["deep", "good", "fragmented"].includes(quality)) return;
  const note = String(formData.get("note") ?? "").slice(0, 500).trim();
  await prisma.mxFocusSession.updateMany({
    where: { id, userId: user.id, endedAt: { not: null }, quality: null },
    data: { quality, ...(note ? { notes: note } : {}) },
  });
  revalidatePath("/focus");
}
