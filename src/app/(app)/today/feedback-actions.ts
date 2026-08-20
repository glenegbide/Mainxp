"use server";

// Rewarded variants of the daily-loop actions: same code path as the plain
// form actions (no duplicated award logic), but they RETURN what the ledger
// actually granted so the UI can reveal the surprise at the right moment —
// after the real action, never before it (CLAUDE.md rule 9).
//
// The delta is measured from the ledger itself, so caps, diminishing returns
// and multipliers are always reflected honestly.

import { requireMxUser } from "@/lib/mainxp/auth";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { completeTask, toggleNonNegotiable } from "./actions";
import { toggleMinimumSlot } from "./day-actions";
import type { ActionReward } from "@/lib/mainxp/action-result";

async function withReward(fn: (fd: FormData) => Promise<void>, fd: FormData): Promise<ActionReward> {
  try {
    const user = await requireMxUser();
    const before = (await xpTotals(user.id)).main;
    await fn(fd);
    const after = (await xpTotals(user.id)).main;
    return { ok: true, xp: Math.max(0, after - before) };
  } catch (e) {
    console.error("rewarded action failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Action non enregistrée — réessaie." };
  }
}

export async function completeTaskRewarded(id: string): Promise<ActionReward> {
  const fd = new FormData();
  fd.set("id", id);
  return withReward(completeTask, fd);
}

export async function toggleNonNegotiableRewarded(id: string): Promise<ActionReward> {
  const fd = new FormData();
  fd.set("id", id);
  return withReward(toggleNonNegotiable, fd);
}

export async function toggleMinimumSlotRewarded(slot: string): Promise<ActionReward> {
  const fd = new FormData();
  fd.set("slot", slot);
  return withReward(toggleMinimumSlot, fd);
}
