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
