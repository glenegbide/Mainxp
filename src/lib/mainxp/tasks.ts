// Task creation with the hard caps enforced in ONE place (Part 9, audit P0):
// used by the Today page action AND the coach's create_task tool, so no code
// path can out-plan the caps. Creation awards nothing — only completion does.

import { prisma } from "@/lib/prisma";
import type { MxTaskTier } from "@/generated/prisma/enums";

export const DAILY_MISSION_CAP = 5;

export interface CreatedTask {
  id: string;
  title: string;
  /** The tier actually used — a 6th "mission" honestly becomes a side quest. */
  tier: MxTaskTier;
  rerouted: boolean;
}

export async function createCappedTask(
  userId: string,
  title: string,
  requestedTier: "DAILY_MISSION" | "SIDE_QUEST",
  dayKeyValue: string
): Promise<CreatedTask | null> {
  const clean = title.trim().slice(0, 300);
  if (!clean) return null;

  let tier: MxTaskTier = requestedTier;
  let rerouted = false;
  if (requestedTier === "DAILY_MISSION") {
    // Cap counts completed missions too — otherwise complete-5-add-5 farms XP.
    const missionsToday = await prisma.mxTask.count({
      where: { userId, dayKey: dayKeyValue, tier: "DAILY_MISSION" },
    });
    if (missionsToday >= DAILY_MISSION_CAP) {
      tier = "SIDE_QUEST";
      rerouted = true;
    }
  }

  const task = await prisma.mxTask.create({
    data: { userId, title: clean, tier, dayKey: dayKeyValue },
  });
  return { id: task.id, title: task.title, tier, rerouted };
}
