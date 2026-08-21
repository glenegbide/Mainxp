"use server";

import { revalidatePath } from "next/cache";
import { requireMxUser } from "@/lib/mainxp/auth";
import {
  acceptInvite,
  blockPartner,
  createInvite,
  encourage,
  endLink,
  markSupportSeen,
  revokeInvite,
  setLinkStatus,
  updateSharing,
  type SupportKind,
} from "@/lib/mainxp/circle/service";

/** Returns the token so the client can hand it to the share sheet. */
export async function newInvite(label: string): Promise<{ token: string }> {
  const user = await requireMxUser();
  const invite = await createInvite(user.id, label);
  revalidatePath("/social");
  return { token: invite.token };
}

export async function cancelInvite(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await revokeInvite(user.id, String(formData.get("id") ?? ""));
  revalidatePath("/social");
}

/** The accept: a POST by a signed-in person, never a link being opened. */
export async function joinCircle(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const token = String(formData.get("token") ?? "");
  const result = await acceptInvite(user, token);
  revalidatePath("/social");
  const { redirect } = await import("next/navigation");
  redirect(result.ok ? "/social?bienvenue=1" : `/social/rejoindre/${token}?erreur=${result.error}`);
}

const bool = (fd: FormData, key: string) => fd.get(key) === "on";

export async function saveSharing(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  await updateSharing(user.id, partnerId, {
    shareElan: bool(formData, "shareElan"),
    shareMainQuest: bool(formData, "shareMainQuest"),
    shareChallenges: bool(formData, "shareChallenges"),
    shareWeekly: bool(formData, "shareWeekly"),
    goalIds: formData.getAll("goalIds").map(String),
    challengeIds: formData.getAll("challengeIds").map(String),
  });
  revalidatePath("/social");
}

export async function togglePause(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  const paused = formData.get("paused") === "1";
  await setLinkStatus(user.id, partnerId, paused ? "active" : "paused");
  revalidatePath("/social");
}

export async function leaveCircle(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await endLink(user.id, String(formData.get("partnerId") ?? ""));
  revalidatePath("/social");
}

export async function blockPerson(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await blockPartner(user.id, String(formData.get("partnerId") ?? ""));
  revalidatePath("/social");
}

export async function sendSupport(partnerId: string, kind: SupportKind): Promise<{ ok: boolean }> {
  const user = await requireMxUser();
  const result = await encourage(user, partnerId, kind);
  revalidatePath("/social");
  return result;
}

export async function seenSupport(): Promise<void> {
  const user = await requireMxUser();
  await markSupportSeen(user.id);
  revalidatePath("/social");
}
