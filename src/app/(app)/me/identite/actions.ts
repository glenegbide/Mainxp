"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";

/**
 * Saves the story (self-concept) and how true it FEELS. Writing here is
 * structure, not merit: 0 XP — the identity layer pays in alignment, not in
 * points (rule 10).
 */
export async function saveIdentity(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const selfConcept = String(formData.get("selfConcept") ?? "").trim().slice(0, 4000);
  const feltRaw = Number(formData.get("identityFelt"));
  const identityFelt = Number.isInteger(feltRaw) && feltRaw >= 1 && feltRaw <= 10 ? feltRaw : null;

  await prisma.mxNorthStar.upsert({
    where: { userId: user.id },
    create: { userId: user.id, selfConcept, identityFelt },
    update: { selfConcept, identityFelt },
  });
  revalidatePath("/me/identite");
  revalidatePath("/me");
}

// ── QUI JE DEVIENS (wave 3): directions declared once, proved by behavior.
// Declaring pays nothing and unlocks nothing — that rule is load-bearing.

export async function addDirection(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = String(formData.get("directionTitle") ?? "").trim().slice(0, 80);
  if (!title) return;
  const { MAX_DIRECTIONS, PROOF_SOURCES } = await import("@/lib/mainxp/identity-proof");
  const sourceRaw = String(formData.get("source") ?? "quete");
  const source = sourceRaw in PROOF_SOURCES ? sourceRaw : "quete";
  const count = await prisma.mxIdentityDirection.count({
    where: { userId: user.id, active: true },
  });
  if (count >= MAX_DIRECTIONS) return;
  await prisma.mxIdentityDirection.create({
    data: {
      userId: user.id,
      title,
      source,
      proofNote: String(formData.get("proofNote") ?? "").trim().slice(0, 300),
    },
  });
  revalidatePath("/me/identite");
}

export async function dropDirection(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxIdentityDirection.updateMany({
    where: { id: String(formData.get("id") ?? ""), userId: user.id },
    data: { active: false },
  });
  revalidatePath("/me/identite");
}
