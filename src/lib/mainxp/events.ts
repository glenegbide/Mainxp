// EVENT ENGINE — the system of record (addendum #1, #2).
//
// Every meaningful real-life action creates exactly ONE canonical MxEvent.
// Everything else derives from it: the XP ledger is a *listener* here, and
// streaks, Élan, titles and stats already derive from ledger/log rows.
// Server actions emit facts; they never award XP directly.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import type { MxEvidence } from "@/generated/prisma/enums";
import { dayKey } from "@/lib/mainxp/day";
import { awardXp, type AwardInput } from "@/lib/mainxp/xp/ledger";
import { diminishingFactor, hardModeMultiplier, XP_VALUES } from "@/lib/mainxp/xp/curve";
import { LIFE_AREA_ATTRIBUTE } from "@/lib/mainxp/attributes";

export type MxEventType =
  | "main_quest_completed"
  | "task_completed"
  | "commitment_kept" // daily non-negotiable
  | "all_commitments_kept"
  | "habit_completed" // good habit tap
  | "habit_slipped" // bad habit tap — recorded, never punished with XP
  | "focus_completed"
  | "goal_reached"
  | "milestone_completed"
  | "project_completed"
  | "morning_started"
  | "night_review_completed"
  | "gratitude_logged"
  | "weekly_review_completed"
  | "reward_redeemed"
  | "gear_purchased"
  | "task_note_added";

export interface EventPayload {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * XP policy, centralized: given an event, decide the award (or null).
 * Pure — unit-tested. Values come from XP_VALUES so tuning stays one-place.
 */
export function xpForEvent(
  type: MxEventType,
  p: EventPayload
): Omit<AwardInput, "userId" | "timezone" | "idempotencyKey" | "evidence"> | null {
  const title = String(p.title ?? "");
  switch (type) {
    case "main_quest_completed":
      return {
        sourceType: "task",
        sourceId: String(p.taskId ?? ""),
        reason: `Main Quest accomplie : ${title}`,
        mainDelta: XP_VALUES.MAIN_QUEST.main,
        coinsDelta: XP_VALUES.MAIN_QUEST.coins,
        multiplier: hardModeMultiplier(Number(p.postponeCount ?? 0)),
      };
    case "task_completed": {
      const tier = p.tier === "SIDE_QUEST" ? "SIDE_QUEST" : "DAILY_MISSION";
      const base = XP_VALUES[tier];
      return {
        sourceType: tier === "SIDE_QUEST" ? "side_quest" : "task",
        sourceId: String(p.taskId ?? ""),
        reason: `Tâche accomplie : ${title}`,
        mainDelta: base.main,
        coinsDelta: base.coins,
        multiplier: hardModeMultiplier(Number(p.postponeCount ?? 0)),
      };
    }
    case "commitment_kept":
      return {
        sourceType: "non_negotiable",
        sourceId: String(p.nnId ?? ""),
        reason: `Non-négociable tenu : ${title}`,
        mainDelta: XP_VALUES.NON_NEGOTIABLE.main,
        coinsDelta: XP_VALUES.NON_NEGOTIABLE.coins,
        attributeDeltas: { DISCIPLINE: XP_VALUES.NON_NEGOTIABLE.discipline },
      };
    case "all_commitments_kept":
      return {
        sourceType: "non_negotiable_bonus",
        reason: "Tous les non-négociables du jour tenus",
        mainDelta: XP_VALUES.ALL_NON_NEGOTIABLES_BONUS.main,
        coinsDelta: XP_VALUES.ALL_NON_NEGOTIABLES_BONUS.coins,
        attributeDeltas: { DISCIPLINE: XP_VALUES.ALL_NON_NEGOTIABLES_BONUS.discipline },
      };
    case "habit_completed": {
      const attribute = p.attribute ? String(p.attribute) : null;
      return {
        sourceType: "habit",
        sourceId: String(p.habitId ?? ""),
        reason: `Habitude tenue : ${title}`,
        mainDelta: XP_VALUES.HABIT_LOG.main,
        coinsDelta: XP_VALUES.HABIT_LOG.coins,
        attributeDeltas: attribute
          ? ({ [attribute]: XP_VALUES.HABIT_LOG.attribute } as AwardInput["attributeDeltas"])
          : undefined,
        multiplier: diminishingFactor(Number(p.priorTaps ?? 0)),
      };
    }
    case "habit_slipped":
      return null; // recorded honestly; Élan derives from the logs, XP never punishes
    case "focus_completed": {
      const blocks = Number(p.blocks ?? 0);
      if (blocks <= 0) return null;
      return {
        sourceType: "focus",
        sourceId: String(p.sessionId ?? ""),
        reason: `Session focus : ${blocks * 25} min vérifiées`,
        mainDelta: XP_VALUES.FOCUS_PER_25MIN.main * blocks,
        coinsDelta: XP_VALUES.FOCUS_PER_25MIN.coins * blocks,
        attributeDeltas: { FOCUS: XP_VALUES.FOCUS_PER_25MIN.focus * blocks },
      };
    }
    case "goal_reached": {
      const attr = LIFE_AREA_ATTRIBUTE[String(p.lifeArea ?? "")];
      return {
        sourceType: "goal",
        sourceId: String(p.goalId ?? ""),
        reason: `Objectif atteint : ${title}`,
        mainDelta: XP_VALUES.GOAL_COMPLETED.main,
        coinsDelta: XP_VALUES.GOAL_COMPLETED.coins,
        attributeDeltas: attr ? ({ [attr]: 100 } as AwardInput["attributeDeltas"]) : undefined,
      };
    }
    case "milestone_completed":
      return {
        sourceType: "milestone",
        sourceId: String(p.milestoneId ?? ""),
        reason: `Jalon franchi : ${title}`,
        mainDelta: XP_VALUES.MILESTONE.main,
        coinsDelta: XP_VALUES.MILESTONE.coins,
        attributeDeltas: { STRATEGY: XP_VALUES.MILESTONE.strategy },
      };
    case "project_completed":
      return {
        sourceType: "project",
        sourceId: String(p.projectId ?? ""),
        reason: `Projet terminé : ${title}`,
        mainDelta: 120,
        coinsDelta: 60,
        attributeDeltas: { STRATEGY: 80 },
      };
    case "morning_started":
      return {
        sourceType: "morning",
        reason: "Journée lancée (Morning Start)",
        mainDelta: XP_VALUES.MORNING_START.main,
        coinsDelta: XP_VALUES.MORNING_START.coins,
        attributeDeltas: { MIND: XP_VALUES.MORNING_START.mind },
      };
    case "night_review_completed":
      return {
        sourceType: "night_review",
        reason: "Revue du soir + préparation de demain",
        mainDelta: XP_VALUES.NIGHT_REVIEW.main,
        coinsDelta: XP_VALUES.NIGHT_REVIEW.coins,
        attributeDeltas: { MIND: XP_VALUES.NIGHT_REVIEW.mind },
      };
    case "gratitude_logged":
      return {
        sourceType: "gratitude",
        reason: "Gratitude du soir",
        mainDelta: XP_VALUES.GRATITUDE.main,
        coinsDelta: XP_VALUES.GRATITUDE.coins,
        attributeDeltas: { MIND: XP_VALUES.GRATITUDE.mind },
      };
    case "weekly_review_completed":
      return {
        sourceType: "weekly_review",
        reason: `Revue hebdomadaire ${String(p.week ?? "")}`,
        mainDelta: 25,
        coinsDelta: 12,
        attributeDeltas: { MIND: 15 },
      };
    case "reward_redeemed":
      return {
        sourceType: "reward_redeem",
        sourceId: String(p.rewardId ?? ""),
        reason: `Récompense réelle débloquée : ${title}`,
        mainDelta: 0,
        coinsDelta: -Number(p.cost ?? 0),
      };
    case "gear_purchased":
      return {
        sourceType: "gear_purchase",
        sourceId: String(p.gearId ?? ""),
        reason: `Équipement acquis : ${title}`,
        mainDelta: 0,
        coinsDelta: -Number(p.cost ?? 0),
      };
    case "task_note_added":
      return null; // notes are memory, not merit
  }
}

export interface EmitOptions {
  evidence?: MxEvidence;
  /**
   * Base idempotency key (e.g. "task:<id>:completed"). The ledger uses it
   * verbatim — identical to the pre-event-engine keys, so reversal lookups
   * keep working — and the event row stores it prefixed with "evt:".
   */
  idempotencyKey?: string;
}

/**
 * Record the canonical event, then dispatch to listeners (today: the XP
 * ledger; later: notifications, learning engine, stats caches).
 * Returns the created event, or null when the idempotency key already exists.
 */
export async function emitEvent(
  user: Pick<MxUser, "id" | "timezone">,
  type: MxEventType,
  payload: EventPayload,
  opts: EmitOptions = {}
) {
  const evidence: MxEvidence = opts.evidence ?? "SELF_REPORTED";
  let event;
  try {
    event = await prisma.mxEvent.create({
      data: {
        userId: user.id,
        type,
        payload,
        evidence,
        dayKey: dayKey(new Date(), user.timezone),
        idempotencyKey: opts.idempotencyKey ? `evt:${opts.idempotencyKey}` : undefined,
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") return null;
    throw e;
  }

  // Listener: XP ledger — same base key as before the event engine existed.
  const award = xpForEvent(type, payload);
  if (award) {
    await awardXp({
      ...award,
      userId: user.id,
      timezone: user.timezone,
      evidence,
      idempotencyKey: opts.idempotencyKey,
    });
  }
  return event;
}
