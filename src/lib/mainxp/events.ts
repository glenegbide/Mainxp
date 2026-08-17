// EVENT ENGINE — the system of record (addendum #1, #2).
//
// Every meaningful real-life action creates exactly ONE canonical MxEvent.
// Everything else derives from it: the XP ledger is a *listener* here, and
// streaks, Élan, titles and stats already derive from ledger/log rows.
// Server actions emit facts; they never award XP directly.

import { prisma } from "@/lib/prisma";
import type { MxUser, Prisma } from "@/generated/prisma/client";
import type { MxEvidence } from "@/generated/prisma/enums";
import { dayKey } from "@/lib/mainxp/day";
import { awardXp, awardXpReawardable, type AwardInput } from "@/lib/mainxp/xp/ledger";
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
  | "task_note_added"
  | "minimum_day_activated"
  | "minimum_action_completed"
  | "minimum_day_completed"
  | "comeback_completed"
  | "brain_dump_processed"
  | "journal_written";

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
      // Anti-farming: a day carries at most 5 mission-value awards. Beyond the
      // cap (possible via carry-overs) the completion still counts — honestly,
      // at side-quest value with side-quest diminishing.
      const overCap = p.capExceeded === true;
      const tier = p.tier === "SIDE_QUEST" || overCap ? "SIDE_QUEST" : "DAILY_MISSION";
      const base = XP_VALUES[tier];
      return {
        sourceType: tier === "SIDE_QUEST" ? "side_quest" : "task",
        sourceId: String(p.taskId ?? ""),
        reason: overCap
          ? `Tâche accomplie (plafond de missions atteint) : ${title}`
          : `Tâche accomplie : ${title}`,
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
    case "minimum_day_activated":
      return null; // choosing to protect the essentials costs nothing
    case "minimum_action_completed": {
      const slot = String(p.slot ?? "");
      const attr =
        slot === "body" ? { STRENGTH: 6 } : slot === "mind" ? { MIND: 6 } : undefined;
      return {
        sourceType: "minimum_action",
        sourceId: slot,
        reason:
          slot === "body"
            ? "Journée minimum : le corps est protégé"
            : slot === "mind"
              ? "Journée minimum : l'esprit est posé"
              : "Journée minimum : une action qui compte",
        mainDelta: 8,
        coinsDelta: 4,
        attributeDeltas: attr as AwardInput["attributeDeltas"],
      };
    }
    case "minimum_day_completed":
      return {
        sourceType: "minimum_day",
        reason: "Journée de récupération réussie — l'essentiel est protégé",
        mainDelta: 15,
        coinsDelta: 8,
        attributeDeltas: { MIND: 10 },
      };
    case "comeback_completed":
      return {
        sourceType: "comeback",
        reason: "Comeback — de retour dans l'arène",
        mainDelta: 40,
        coinsDelta: 20,
        attributeDeltas: { MIND: 15 },
      };
    case "brain_dump_processed":
      return null; // organizing thoughts is input, not achievement
    case "journal_written":
      // Reflection is rewarded — with same-day diminishing (ledger-side, the
      // "journal" source type) so volume never beats sincerity.
      return {
        sourceType: "journal",
        sourceId: String(p.entryId ?? ""),
        reason: "Journal — poser ce qu'on vit compte",
        mainDelta: XP_VALUES.JOURNAL.main,
        coinsDelta: XP_VALUES.JOURNAL.coins,
        attributeDeltas: { MIND: XP_VALUES.JOURNAL.mind },
      };
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
  /**
   * Event-row key override for re-earnable actions (toggles): the Nth keep of
   * a commitment is a new fact deserving its own event row, while the LEDGER
   * key stays the logical base so generation-aware idempotency governs XP.
   * Defaults to idempotencyKey.
   */
  eventIdempotencyKey?: string;
  /**
   * Domain mutations that must land atomically WITH the event (addendum #1:
   * never DONE-without-event). Passed as un-awaited Prisma promises; they run
   * in one transaction with the event insert, so either the fact and its state
   * change both exist or neither does. On an idempotency replay the whole
   * transaction rolls back — correct, because a replayed event means the
   * domain change already committed the first time.
   */
  domainOps?: Prisma.PrismaPromise<unknown>[];
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
  let replay = false;
  const eventCreate = prisma.mxEvent.create({
    data: {
      userId: user.id,
      type,
      payload,
      evidence,
      dayKey: dayKey(new Date(), user.timezone),
      idempotencyKey:
        opts.eventIdempotencyKey || opts.idempotencyKey
          ? `evt:${opts.eventIdempotencyKey ?? opts.idempotencyKey}`
          : undefined,
    },
  });
  let event: Awaited<typeof eventCreate> | null = null;
  try {
    if (opts.domainOps?.length) {
      const results = await prisma.$transaction([...opts.domainOps, eventCreate]);
      event = results[results.length - 1] as Awaited<typeof eventCreate>;
    } else {
      event = await eventCreate;
    }
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") replay = true;
    else throw e;
  }

  // Listener: XP ledger — same base key as before the event engine existed.
  // Runs on replays too: if a past award failed after its event was written,
  // the retry self-heals. Keyed awards go through the generation-aware path so
  // a legitimate reversal (un-toggle) can be legitimately re-earned — while a
  // live award still blocks any double.
  const award = xpForEvent(type, payload);
  if (award) {
    const input = {
      ...award,
      userId: user.id,
      timezone: user.timezone,
      evidence,
    };
    if (opts.idempotencyKey) {
      await awardXpReawardable({ ...input, idempotencyKey: opts.idempotencyKey });
    } else {
      await awardXp(input);
    }
  }
  return replay ? null : event;
}
