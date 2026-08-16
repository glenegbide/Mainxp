"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMxUser } from "@/lib/mainxp/auth";
import { askCoach } from "@/lib/mainxp/ai/coach";

export async function sendToCoach(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const text = String(formData.get("text") ?? "").trim().slice(0, 4000);
  if (!text) return;
  const result = await askCoach(user, text);
  revalidatePath("/coach");
  if (!result.ok && result.error === "provider") redirect("/coach?error=provider");
}
