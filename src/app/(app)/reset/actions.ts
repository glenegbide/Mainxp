"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { dayKey } from "@/lib/mainxp/day";
import { emitEvent } from "@/lib/mainxp/events";
import { STATES, TRIGGERS } from "@/lib/mainxp/reset-def";

/** The whole Reset lands as ONE event: what happened, which pattern was
 *  active, which state was chosen, and the tiny action that restarts life. */
export async function completeReset(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const trigger = String(formData.get("trigger") ?? "");
  const state = String(formData.get("state") ?? "");
  if (!(trigger in TRIGGERS) || !(state in STATES)) return;
  const action = String(formData.get("action") ?? "").slice(0, 200).trim();
  const patternId = String(formData.get("patternId") ?? "").trim();

  let patternLabel: string | null = null;
  if (patternId) {
    const pattern = await prisma.mxPattern.findFirst({
      where: { id: patternId, userId: user.id },
      select: { fromLabel: true, toLabel: true },
    });
    if (pattern) patternLabel = `${pattern.fromLabel} → ${pattern.toLabel}`;
  }

  const today = dayKey(new Date(), user.timezone);
  const priorToday = await prisma.mxEvent.count({
    where: { userId: user.id, type: "reset_completed", dayKey: today },
  });

  await emitEvent(user, "reset_completed", {
    trigger,
    state,
    action: action || null,
    pattern: patternLabel,
    priorToday,
  });
  revalidatePath("/", "layout");
  redirect("/today?reset=ok");
}

// ── Patterns (old self → new self) — managed on /me/identite ──

export async function addPattern(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const s = (name: string, max: number) => String(formData.get(name) ?? "").trim().slice(0, max);
  const fromLabel = s("fromLabel", 60);
  const toLabel = s("toLabel", 60);
  if (!fromLabel || !toLabel) return;
  const count = await prisma.mxPattern.count({ where: { userId: user.id, active: true } });
  if (count >= 6) return; // more than six named enemies is a list, not a fight
  await prisma.mxPattern.create({
    data: {
      userId: user.id,
      fromLabel,
      toLabel,
      trigger: s("trigger", 200),
      oldResponse: s("oldResponse", 200),
      newResponse: s("newResponse", 200),
    },
  });
  revalidatePath("/me/identite");
  revalidatePath("/reset");
}

export async function dropPattern(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxPattern.updateMany({
    where: { id: String(formData.get("id") ?? ""), userId: user.id },
    data: { active: false },
  });
  revalidatePath("/me/identite");
  revalidatePath("/reset");
}
