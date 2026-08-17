"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import {
  acceptChallenge,
  proposeChallenge,
  STARTER_CHALLENGES,
  tickChallenge,
} from "@/lib/mainxp/challenges";

const refresh = () => revalidatePath("/today");

/** Accept a starter dare in one tap: propose (source starter) then accept. */
export async function acceptStarterChallenge(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const key = String(formData.get("key") ?? "");
  const starter = STARTER_CHALLENGES.find((s) => s.key === key);
  if (!starter) return;
  const created = await proposeChallenge(user, { ...starter, source: "starter" });
  if (created) await acceptChallenge(user, created.id);
  refresh();
}

export async function acceptProposedChallenge(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await acceptChallenge(user, String(formData.get("id") ?? ""));
  refresh();
  revalidatePath("/coach");
}

export async function declineChallenge(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxChallenge.updateMany({
    where: { id: String(formData.get("id") ?? ""), userId: user.id, status: "proposed" },
    data: { status: "declined" },
  });
  refresh();
}

export async function tickChallengeToday(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await tickChallenge(user, String(formData.get("id") ?? ""));
  refresh();
  revalidatePath("/progress");
}

export async function abandonChallenge(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  // Quitting is allowed and honest — no punishment, the logs remain.
  await prisma.mxChallenge.updateMany({
    where: { id: String(formData.get("id") ?? ""), userId: user.id, status: "active" },
    data: { status: "abandoned" },
  });
  refresh();
}
