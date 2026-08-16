"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { dayKey, addDays } from "@/lib/mainxp/day";
import { emitEvent } from "@/lib/mainxp/events";
import { getAIProvider } from "@/lib/mainxp/ai/provider";
import {
  decodeProposals,
  encodeProposals,
  EXTRACT_INSTRUCTION,
  parseDumpReply,
} from "@/lib/mainxp/braindump";

export async function processDump(formData: FormData): Promise<void> {
  await requireMxUser();
  const text = String(formData.get("text") ?? "").trim().slice(0, 3000);
  if (!text) return;
  const provider = getAIProvider();
  if (!provider) redirect("/dump?error=offline");

  let proposals;
  try {
    const reply = await provider.structuredExtract(EXTRACT_INSTRUCTION, text);
    proposals = parseDumpReply(reply);
  } catch {
    redirect("/dump?error=provider");
  }
  if (!proposals || proposals.length === 0) redirect("/dump?error=empty");
  redirect(`/dump?p=${encodeProposals(proposals)}`);
}

export async function confirmDump(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const proposals = decodeProposals(String(formData.get("p") ?? ""));
  if (proposals.length === 0) redirect("/dump");
  const today = dayKey(new Date(), user.timezone);
  const tomorrow = addDays(today, 1);

  // Respect the mission cap: overflow lands as side quests, never beyond 5.
  const openMissions = await prisma.mxTask.count({
    where: { userId: user.id, dayKey: today, tier: "DAILY_MISSION", status: "OPEN" },
  });
  let missionBudget = Math.max(0, 5 - openMissions);

  for (const prop of proposals) {
    const content = prop.detail ? `${prop.title} — ${prop.detail}` : prop.title;
    switch (prop.kind) {
      case "task": {
        const tier = missionBudget > 0 ? "DAILY_MISSION" : "SIDE_QUEST";
        if (tier === "DAILY_MISSION") missionBudget--;
        await prisma.mxTask.create({
          data: { userId: user.id, title: prop.title, tier, dayKey: today },
        });
        break;
      }
      case "reminder":
        await prisma.mxTask.create({
          data: { userId: user.id, title: prop.title, tier: "DAILY_MISSION", dayKey: tomorrow },
        });
        break;
      case "idea":
        await prisma.mxJournalEntry.create({
          data: { userId: user.id, kind: "idea", content, dayKey: today },
        });
        break;
      case "journal":
        await prisma.mxJournalEntry.create({
          data: { userId: user.id, kind: "free", content, dayKey: today },
        });
        break;
      case "habit":
        await prisma.mxHabit.create({
          data: { userId: user.id, title: prop.title, kind: "good" },
        });
        break;
    }
  }

  await emitEvent(user, "brain_dump_processed", {
    count: proposals.length,
    kinds: proposals.map((p) => p.kind).join(","),
  });
  redirect("/today");
}
