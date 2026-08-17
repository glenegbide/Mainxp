"use server";

import { revalidatePath } from "next/cache";
import { requireMxUser } from "@/lib/mainxp/auth";
import { writeJournal } from "@/lib/mainxp/journal";

export async function addJournalEntry(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const content = String(formData.get("content") ?? "");
  const mood = String(formData.get("mood") ?? "");
  await writeJournal(user, content, { kind: "free", mood });
  revalidatePath("/journal");
  revalidatePath("/today");
}
