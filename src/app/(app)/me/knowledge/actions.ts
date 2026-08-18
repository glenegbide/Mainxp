"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { MEMORY_SCOPES, scopeExpiry, type MemoryScope } from "@/lib/mainxp/memory";

const s = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);
const refresh = () => revalidatePath("/me/knowledge");

/** « Ajoute ça à ta connaissance » — the user feeds the coach directly. */
export async function addKnowledge(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const content = s(formData.get("content"), 500);
  if (!content) return;
  const scopeRaw = s(formData.get("scope"), 20);
  const scope: MemoryScope = (MEMORY_SCOPES as readonly string[]).includes(scopeRaw)
    ? (scopeRaw as MemoryScope)
    : "permanent";
  await prisma.mxMemory.create({
    data: {
      userId: user.id,
      type: "identity",
      content,
      source: "user_stated",
      importance: 4, // stated deliberately by the user — weighs more
      scope,
      expiresAt: scopeExpiry(scope, new Date()),
    },
  });
  refresh();
}

/** The user's knowledge is theirs — wrong or stale entries can be removed. */
export async function deleteKnowledge(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxMemory.deleteMany({
    where: { id: s(formData.get("id"), 40), userId: user.id },
  });
  refresh();
}
