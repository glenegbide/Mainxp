"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";

const s = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);

export async function saveOnboarding(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const occupation = s(formData.get("occupation"), 200);
  const why = s(formData.get("why"), 1000);
  const season = s(formData.get("season"), 120);
  const mission90Days = s(formData.get("mission90"), 500);
  const coachTone = ["soft", "balanced", "demanding"].includes(s(formData.get("coachTone")))
    ? s(formData.get("coachTone"))
    : "balanced";

  await prisma.$transaction([
    prisma.mxUser.update({
      where: { id: user.id },
      data: { occupation, coachTone, onboardingStage: "bio_done" },
    }),
    prisma.mxNorthStar.upsert({
      where: { userId: user.id },
      create: { userId: user.id, why, season, mission90Days },
      update: { why, season, mission90Days },
    }),
  ]);
  redirect("/today");
}
