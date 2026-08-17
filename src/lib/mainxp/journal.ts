// Journal service (writing wave): one shared path for "write what I feel,
// right now" — used by the /journal page AND the coach's tool, so XP and
// events stay identical whichever door the words come through.
// XP: JOURNAL value with same-day diminishing (10, 10, 6, 3, 0) — writing is
// rewarded as reflection, never farmable.

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { dayKey } from "@/lib/mainxp/day";
import { emitEvent } from "@/lib/mainxp/events";

export const JOURNAL_MOODS = ["bien", "moyen", "dur", "a_fond", "epuise"] as const;
export type JournalMood = (typeof JOURNAL_MOODS)[number];

export const MOOD_LABEL: Record<JournalMood, string> = {
  bien: "🙂 Bien",
  moyen: "😐 Moyen",
  dur: "😣 Dur",
  a_fond: "🔥 À fond",
  epuise: "😴 Épuisé",
};

export async function writeJournal(
  user: Pick<MxUser, "id" | "timezone">,
  content: string,
  opts: { kind?: string; mood?: string } = {}
) {
  const clean = content.trim().slice(0, 4000);
  if (!clean) return null;
  const today = dayKey(new Date(), user.timezone);
  const id = randomUUID(); // known before the write → entry + event are atomic
  const mood = (JOURNAL_MOODS as readonly string[]).includes(opts.mood ?? "") ? opts.mood! : "";

  await emitEvent(
    user,
    "journal_written",
    { entryId: id, kind: opts.kind ?? "free", mood: mood || null, day: today },
    {
      idempotencyKey: `journal:${id}`,
      domainOps: [
        prisma.mxJournalEntry.create({
          data: { id, userId: user.id, kind: opts.kind ?? "free", mood, content: clean, dayKey: today },
        }),
      ],
    }
  );
  return id;
}
