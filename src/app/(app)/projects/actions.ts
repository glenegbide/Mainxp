"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { awardXp } from "@/lib/mainxp/xp/ledger";
import { XP_VALUES } from "@/lib/mainxp/xp/curve";
import type { MxProjectStatus } from "@/generated/prisma/enums";

const s = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);

async function refreshProgress(projectId: string): Promise<void> {
  const milestones = await prisma.mxMilestone.findMany({ where: { projectId } });
  if (milestones.length === 0) return;
  const progress = Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100);
  await prisma.mxProject.update({ where: { id: projectId }, data: { progress } });
}

export async function createProject(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = s(formData.get("title"), 300);
  if (!title) return;
  const goalId = s(formData.get("goalId"), 40) || null;
  if (goalId) {
    const goal = await prisma.mxGoal.findFirst({ where: { id: goalId, userId: user.id } });
    if (!goal) return;
  }
  const project = await prisma.mxProject.create({
    data: {
      userId: user.id,
      title,
      desiredOutcome: s(formData.get("desiredOutcome"), 1000),
      why: s(formData.get("why"), 1000),
      goalId,
      nextAction: s(formData.get("nextAction"), 300),
      status: "ACTIVE",
    },
  });
  redirect(`/projects/${project.id}`);
}

export async function addMilestone(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const projectId = s(formData.get("projectId"), 40);
  const title = s(formData.get("title"), 300);
  if (!title) return;
  const project = await prisma.mxProject.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) return;
  const count = await prisma.mxMilestone.count({ where: { projectId } });
  if (count >= 12) return; // milestones, not a task dump (Part 8)
  await prisma.mxMilestone.create({ data: { projectId, title, order: count } });
  await refreshProgress(projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleMilestone(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const milestone = await prisma.mxMilestone.findFirst({
    where: { id, project: { userId: user.id } },
    include: { project: true },
  });
  if (!milestone) return;
  const done = !milestone.done;
  await prisma.mxMilestone.update({
    where: { id: milestone.id },
    data: { done, completedAt: done ? new Date() : null },
  });
  await refreshProgress(milestone.projectId);

  if (done) {
    await awardXp({
      userId: user.id,
      sourceType: "milestone",
      sourceId: milestone.id,
      reason: `Jalon franchi : ${milestone.title}`,
      mainDelta: XP_VALUES.MILESTONE.main,
      coinsDelta: XP_VALUES.MILESTONE.coins,
      attributeDeltas: { STRATEGY: XP_VALUES.MILESTONE.strategy },
      idempotencyKey: `milestone:${milestone.id}:completed`,
      timezone: user.timezone,
    });
  } else {
    const tx = await prisma.mxXpTransaction.findUnique({
      where: { idempotencyKey: `milestone:${milestone.id}:completed` },
    });
    if (tx) {
      const { reverseXp } = await import("@/lib/mainxp/xp/ledger");
      await reverseXp(user.id, tx.id, `Annulation du jalon : ${milestone.title}`);
    }
  }
  revalidatePath(`/projects/${milestone.projectId}`);
}

export async function updateNextAction(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const project = await prisma.mxProject.findFirst({ where: { id, userId: user.id } });
  if (!project) return;
  await prisma.mxProject.update({
    where: { id: project.id },
    data: { nextAction: s(formData.get("nextAction"), 300) },
  });
  revalidatePath(`/projects/${id}`);
}

const STATUSES: MxProjectStatus[] = [
  "IDEA", "PLANNING", "ACTIVE", "WAITING", "BLOCKED", "AT_RISK", "PAUSED", "COMPLETED", "CANCELLED",
];

export async function setProjectStatus(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const status = s(formData.get("status"), 20) as MxProjectStatus;
  if (!STATUSES.includes(status)) return;
  const project = await prisma.mxProject.findFirst({ where: { id, userId: user.id } });
  if (!project) return;
  await prisma.mxProject.update({
    where: { id: project.id },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
  });
  if (status === "COMPLETED") {
    await awardXp({
      userId: user.id,
      sourceType: "project",
      sourceId: project.id,
      reason: `Projet terminé : ${project.title}`,
      mainDelta: 120,
      coinsDelta: 60,
      attributeDeltas: { STRATEGY: 80 },
      idempotencyKey: `project:${project.id}:completed`,
      timezone: user.timezone,
    });
  }
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
}
