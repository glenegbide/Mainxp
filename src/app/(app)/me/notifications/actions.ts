"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";

export async function saveSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}): Promise<{ ok: boolean }> {
  const user = await requireMxUser();
  const platform = /iPhone|iPad|iOS/i.test(input.userAgent)
    ? "ios"
    : /Android/i.test(input.userAgent)
      ? "android"
      : "desktop";
  await prisma.mxPushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: { userId: user.id, ...input, platform },
    update: { userId: user.id, p256dh: input.p256dh, auth: input.auth, disabledAt: null, failureCount: 0 },
  });
  await prisma.mxUser.update({
    where: { id: user.id },
    data: { pushEnabledAt: new Date() },
  });
  revalidatePath("/me/notifications");
  return { ok: true };
}

export async function removeSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const user = await requireMxUser();
  await prisma.mxPushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  revalidatePath("/me/notifications");
  return { ok: true };
}

const MODES = ["quiet", "normal", "coach_me", "beast"] as const;

export async function saveNotificationPrefs(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const mode = String(formData.get("mode") ?? "normal");
  const start = Number(formData.get("quietStart"));
  const end = Number(formData.get("quietEnd"));
  await prisma.mxUser.update({
    where: { id: user.id },
    data: {
      notificationMode: (MODES as readonly string[]).includes(mode) ? mode : "normal",
      quietHoursStart: Number.isInteger(start) && start >= 0 && start <= 23 ? start : 22,
      quietHoursEnd: Number.isInteger(end) && end >= 0 && end <= 23 ? end : 7,
    },
  });
  revalidatePath("/me/notifications");
}
