"use server";

import { createHash } from "node:crypto";
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
  const user = await requireMxUser();
  const text = String(formData.get("text") ?? "").trim().slice(0, 3000);
  if (!text) return;
  const provider = getAIProvider(user.aiKey);
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
  const encoded = String(formData.get("p") ?? "");
  const proposals = decodeProposals(encoded);
  if (proposals.length === 0) redirect("/dump");
  const today = dayKey(new Date(), user.timezone);
  const tomorrow = addDays(today, 1);

  // Duplicate protection (#65): the canonical event is created FIRST with an
  // idempotency key derived from the payload — a double-submit is a no-op.
  const dumpHash = createHash("sha256").update(encoded).digest("hex").slice(0, 16);
  const event = await emitEvent(
    user,
    "brain_dump_processed",
    { count: proposals.length, kinds: proposals.map((p) => p.kind).join(",") },
    { idempotencyKey: `dump:${user.id}:${today}:${dumpHash}` }
  );
  if (!event) redirect("/today");

  // Respect the mission caps for today AND tomorrow: overflow → side quests.
  const [openToday, openTomorrow, activeHabits] = await Promise.all([
    prisma.mxTask.count({
      where: { userId: user.id, dayKey: today, tier: "DAILY_MISSION", status: "OPEN" },
    }),
    prisma.mxTask.count({
      where: { userId: user.id, dayKey: tomorrow, tier: "DAILY_MISSION", status: "OPEN" },
    }),
    prisma.mxHabit.count({ where: { userId: user.id, active: true } }),
  ]);
  let missionBudget = Math.max(0, 5 - openToday);
  let tomorrowBudget = Math.max(0, 5 - openTomorrow);
  let habitBudget = Math.max(0, 15 - activeHabits);

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
      case "reminder": {
        const tier = tomorrowBudget > 0 ? "DAILY_MISSION" : "SIDE_QUEST";
        if (tier === "DAILY_MISSION") tomorrowBudget--;
        await prisma.mxTask.create({
          data: { userId: user.id, title: prop.title, tier, dayKey: tomorrow },
        });
        break;
      }
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
        if (habitBudget > 0) {
          habitBudget--;
          await prisma.mxHabit.create({
            data: { userId: user.id, title: prop.title, kind: "good" },
          });
        } else {
          // Habit cap reached — keep the thought as an idea instead of dropping it.
          await prisma.mxJournalEntry.create({
            data: { userId: user.id, kind: "idea", content: `Habitude à créer : ${content}`, dayKey: today },
          });
        }
        break;
    }
  }

  redirect("/today");
}
