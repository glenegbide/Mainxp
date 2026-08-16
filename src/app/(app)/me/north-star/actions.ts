"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";

const s = (v: FormDataEntryValue | null, max = 1000) => String(v ?? "").trim().slice(0, max);
const list = (v: FormDataEntryValue | null) =>
  s(v, 2000)
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);

export async function saveNorthStar(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const data = {
    why: s(formData.get("why")),
    futureSelf: s(formData.get("futureSelf")),
    vision1Year: s(formData.get("vision1Year")),
    mission90Days: s(formData.get("mission90Days"), 500),
    season: s(formData.get("season"), 120),
    refusals: s(formData.get("refusals")),
    values: list(formData.get("values")),
    priorities: list(formData.get("priorities")),
    personalRules: list(formData.get("personalRules")),
  };
  await prisma.mxNorthStar.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  revalidatePath("/me/north-star");
  revalidatePath("/today");
}
