"use server";

// LE DOJO — server actions. A session is logged in one gesture; the work-list
// ("ce que je travaille") is where the craft lives. Every write is scoped by
// userId; the session insert and its event land in one transaction.

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { dayKey } from "@/lib/mainxp/day";
import { emitEvent } from "@/lib/mainxp/events";
import { DISCIPLINES, GRADES, MAX_FOCUS_ACTIVE } from "@/lib/mainxp/dojo";

export async function logTraining(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const discipline = String(formData.get("discipline") ?? "bjj");
  if (!(discipline in DISCIPLINES)) return;
  const styleRaw = String(formData.get("style") ?? "");
  const style = discipline === "bjj" && (styleRaw === "gi" || styleRaw === "nogi") ? styleRaw : null;
  const minutes = Math.round(Number(formData.get("minutes") ?? 0));
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 300) return;
  const rounds = Math.max(0, Math.min(30, Math.round(Number(formData.get("rounds") ?? 0)) || 0));
  const note = String(formData.get("note") ?? "").slice(0, 2000).trim();

  const today = dayKey(new Date(), user.timezone);
  const priorToday = await prisma.mxTrainingSession.count({
    where: { userId: user.id, dayKey: today },
  });

  const id = randomUUID();
  const label =
    discipline === "bjj"
      ? `BJJ${style ? (style === "gi" ? " gi" : " no-gi") : ""} — ${minutes} min${rounds > 0 ? ` · ${rounds} rounds` : ""}`
      : `${DISCIPLINES[discipline]} — ${minutes} min`;
  await emitEvent(
    user,
    "training_completed",
    { sessionId: id, title: label, discipline, minutes, rounds, priorToday },
    {
      idempotencyKey: `training:${id}`,
      domainOps: [
        prisma.mxTrainingSession.create({
          data: { id, userId: user.id, dayKey: today, discipline, style, minutes, rounds, note },
        }),
      ],
    }
  );
  revalidatePath("/dojo");
  revalidatePath("/today");
}

export async function addFocus(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = String(formData.get("title") ?? "").slice(0, 120).trim();
  if (!title) return;
  const active = await prisma.mxTrainingFocus.count({
    where: { userId: user.id, status: "working" },
  });
  if (active >= MAX_FOCUS_ACTIVE) return; // the UI explains the cap before this
  await prisma.mxTrainingFocus.create({ data: { userId: user.id, title } });
  revalidatePath("/dojo");
}

export async function noteOnFocus(focusId: string, note: string): Promise<{ ok: boolean }> {
  const user = await requireMxUser();
  const focus = await prisma.mxTrainingFocus.findFirst({
    where: { id: focusId, userId: user.id },
    select: { id: true },
  });
  if (!focus) return { ok: false };
  await prisma.mxTrainingFocus.update({
    where: { id: focus.id },
    data: { note: note.slice(0, 2000).trim() },
  });
  revalidatePath("/dojo");
  return { ok: true };
}

/** Declaring a technique solid is an achievement — it pays, once per item. */
export async function masterFocus(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  const focus = await prisma.mxTrainingFocus.findFirst({
    where: { id, userId: user.id, status: "working" },
  });
  if (!focus) return;
  await emitEvent(
    user,
    "technique_mastered",
    { focusId: focus.id, title: focus.title },
    {
      idempotencyKey: `technique:${focus.id}`,
      domainOps: [
        prisma.mxTrainingFocus.update({
          where: { id: focus.id },
          data: { status: "solid", solidAt: new Date() },
        }),
      ],
    }
  );
  revalidatePath("/dojo");
}

/** Back on the work-list — honest, and no double pay (the key already burned). */
export async function reopenFocus(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = String(formData.get("id") ?? "");
  const active = await prisma.mxTrainingFocus.count({
    where: { userId: user.id, status: "working" },
  });
  if (active >= MAX_FOCUS_ACTIVE) return;
  await prisma.mxTrainingFocus.updateMany({
    where: { id, userId: user.id, status: "solid" },
    data: { status: "working", solidAt: null },
  });
  revalidatePath("/dojo");
}

export async function saveSportProfile(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const discipline = String(formData.get("discipline") ?? "").slice(0, 40).trim() || "Jiu-jitsu brésilien";
  const gradeRaw = String(formData.get("grade") ?? "blanche");
  const grade = (GRADES as readonly string[]).includes(gradeRaw) ? gradeRaw : "blanche";
  const stripes = Math.max(0, Math.min(4, Math.round(Number(formData.get("stripes") ?? 0)) || 0));
  const weeklyTarget = Math.max(1, Math.min(7, Math.round(Number(formData.get("weeklyTarget") ?? 3)) || 3));
  await prisma.mxSportProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, discipline, grade, stripes, weeklyTarget },
    update: { discipline, grade, stripes, weeklyTarget },
  });
  revalidatePath("/dojo");
}
