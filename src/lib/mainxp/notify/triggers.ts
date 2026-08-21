// PURE trigger evaluation + the French copy.
//
// Two structural guarantees live here:
//   1. A trigger that cannot cite a real number returns null. There is no code
//      path that can emit "sois productif !" — evidence is required alongside
//      the body, so generic encouragement is impossible by construction.
//   2. XP amounts never appear (CLAUDE.md rule 9): a notification states the
//      situation, never the payout.

import type { Trigger, TriggerFacts, TriggerResult } from "./types";

const plural = (n: number) => (n > 1 ? "s" : "");

/** 1 — The Main Quest is still open in the early afternoon. */
export const mainQuestStale: Trigger = {
  type: "main_quest_stale",
  windowHours: [13, 14, 15],
  evaluate(f: TriggerFacts): TriggerResult | null {
    const mq = f.context.mainQuest;
    if (!mq || mq.status !== "OPEN") return null;
    if (f.context.minimumDay) return null; // a protected day has its own win condition

    let urgency = 70 + Math.min(3, mq.postponeCount) * 10;
    const goal = mq.goal;
    let body = `« ${mq.title} » attend depuis ce matin. C'est le résultat que tu as choisi.`;

    if (goal?.verdict === "behind") {
      urgency += 15;
      const pace =
        goal.requiredWeeklyPace != null
          ? `${Math.ceil(goal.requiredWeeklyPace)} ${goal.unit ?? ""}/semaine nécessaires`.replace("  ", " ")
          : "en retard";
      body = `« ${mq.title} » attend depuis ce matin. Elle sert « ${goal.title} » : ${pace}.`;
    } else if (mq.postponeCount >= 3) {
      body = `« ${mq.title} » attend depuis ce matin — reportée ${mq.postponeCount} fois. Trente minutes suffisent à la débloquer.`;
    }

    return {
      type: "main_quest_stale",
      urgency: Math.min(100, urgency),
      title: "Main Quest — encore ouverte",
      body,
      url: "/today",
      evidence: {
        postponeCount: mq.postponeCount,
        goalBehind: goal?.verdict === "behind",
      },
    };
  },
};

/** 2 — Commitments still open at the end of the working day. */
export const commitmentOpen: Trigger = {
  type: "commitment_open",
  windowHours: [18, 19],
  evaluate(f: TriggerFacts): TriggerResult | null {
    const open = f.context.unmetNonNegotiables;
    if (open.length === 0) return null;
    if (f.context.restMode || f.context.minimumDay) return null;

    const rate = f.nnKeepRate7;
    let urgency = 60;
    if (rate !== null && rate < 70) urgency += 20;

    const body =
      open.length === 1
        ? rate !== null
          ? `Dernier non-négociable du jour : « ${open[0].title} ». Ton taux de tenue sur 7 jours est à ${rate} %.`
          : `« ${open[0].title} » n'est pas encore tenu. C'est un engagement que tu as pris quoi qu'il arrive.`
        : rate !== null
          ? `Il te reste ${open.length} non-négociables : ${open.slice(0, 2).map((n) => n.title).join(", ")}. Taux de tenue sur 7 jours : ${rate} %.`
          : `Il te reste ${open.length} non-négociables : ${open.slice(0, 2).map((n) => n.title).join(", ")}.`;

    return {
      type: "commitment_open",
      urgency: Math.min(100, urgency),
      title: `Non-négociables — ${open.length} restant${plural(open.length)}`,
      body,
      url: "/today",
      evidence: { open: open.length, keepRate7: rate ?? "n/a" },
    };
  },
};

/** 3 — Close the loop: the night review feeds tomorrow. */
export const nightReview: Trigger = {
  type: "night_review",
  windowHours: [21, 22],
  evaluate(f: TriggerFacts): TriggerResult | null {
    if (f.context.nightReviewDone) return null;
    if (f.eventsToday === 0) return null; // never nudge a day that never started

    const body =
      f.missionsDoneToday > 0
        ? `${f.missionsDoneToday} mission${plural(f.missionsDoneToday)} faite${plural(f.missionsDoneToday)}, ${f.focusMinToday} min de focus. Trois minutes pour fermer la boucle et écrire la Main Quest de demain.`
        : `Journée terminée. Trois minutes pour dire ce qui a bloqué et préparer demain — c'est ce qui rend le lendemain plus simple.`;

    return {
      type: "night_review",
      urgency: 65,
      title: "Revue du soir",
      body,
      url: "/today/night",
      evidence: { missionsDone: f.missionsDoneToday, focusMin: f.focusMinToday },
    };
  },
};

/** 4 — Weekly only (Monday morning): a goal that needs a decision, not nagging. */
export const goalPaceBehind: Trigger = {
  type: "goal_pace_behind",
  windowHours: [8, 9],
  evaluate(f: TriggerFacts): TriggerResult | null {
    const day = new Date(`${f.dayKey}T12:00:00Z`).getUTCDay();
    if (day !== 1) return null; // Monday
    const g = f.goalsBehind[0];
    if (!g) return null;
    return {
      type: "goal_pace_behind",
      urgency: 60,
      title: "Objectif en retard",
      body: `« ${g.title} » demande ${Math.ceil(g.requiredWeeklyPace)} ${g.unit ?? "unités"} cette semaine pour tenir l'échéance. Décide maintenant : accélérer, réduire, ou repousser.`,
      url: "/goals",
      dedupeSuffix: f.weekKey,
      evidence: { requiredWeeklyPace: g.requiredWeeklyPace },
    };
  },
};

/** 5 — A challenge whose window is genuinely at risk. One missed day is fine. */
export const challengeTick: Trigger = {
  type: "challenge_tick",
  windowHours: [19, 20],
  evaluate(f: TriggerFacts): TriggerResult | null {
    const at = f.activeChallenges.find((c) => {
      const remaining = c.targetCount - c.ticks;
      return remaining > 0 && c.daysLeft <= remaining + 2;
    });
    if (!at) return null;
    const remaining = at.targetCount - at.ticks;
    return {
      type: "challenge_tick",
      urgency: 55,
      title: "Défi — la fenêtre se referme",
      body: `« ${at.title} » : ${remaining} restant${plural(remaining)} et ${at.daysLeft} jour${plural(at.daysLeft)} devant toi. Aujourd'hui compte.`,
      url: "/defis",
      dedupeSuffix: at.id,
      evidence: { remaining, daysLeft: at.daysLeft },
    };
  },
};

export const TRIGGERS: readonly Trigger[] = [
  mainQuestStale,
  commitmentOpen,
  nightReview,
  goalPaceBehind,
  challengeTick,
];
