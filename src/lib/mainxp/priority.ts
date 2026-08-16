// WHAT NOW engine (audit P2): ONE recommended action, backed by 1–3 concrete
// facts ("WHY THIS"). Pure and deterministic — the Today page and the coach's
// get_priorities tool both call this, so the app and the AI never disagree
// about what matters. Extend by adding facts/scores, never by adding output:
// the contract is one action, explained, no overwhelm.

export interface PriorityGoalFact {
  title: string;
  priority: number; // 1–5 (5 = vital)
  verdict?: "ahead" | "on_track" | "behind";
  daysToDeadline?: number | null;
  requiredWeeklyPace?: number | null;
  unit?: string | null;
}

export interface PriorityTask {
  id: string;
  title: string;
  postponeCount: number;
  goal?: PriorityGoalFact | null;
}

export interface PriorityContext {
  minimumDay: boolean;
  restMode: boolean;
  /** 1–10 from Morning Start; null when the morning flow didn't run. */
  energy: number | null;
  stress: number | null;
  /** Hour 0–23 in the user's timezone. */
  hourOfDay: number;
  mainQuest: (PriorityTask & { status: "OPEN" | "DONE" }) | null;
  openMissions: PriorityTask[];
  unmetNonNegotiables: Array<{ id: string; title: string }>;
  goalsAtRisk: PriorityGoalFact[];
  nightReviewDone: boolean;
}

export interface Recommendation {
  kind:
    | "minimum_day"
    | "define_main_quest"
    | "main_quest"
    | "mission"
    | "non_negotiable"
    | "night_review"
    | "day_done";
  /** The one action, user-facing. */
  action: string;
  /** WHY THIS — 1–3 concrete facts drawn from the data, never filler. */
  why: string[];
  targetId?: string;
}

const fmtPace = (g: PriorityGoalFact) =>
  g.requiredWeeklyPace != null
    ? `${Math.ceil(g.requiredWeeklyPace)} ${g.unit ?? ""}/semaine nécessaires`.replace("  ", " ")
    : null;

/** Score a mission by goal importance, pace danger, deadline, and age (postpones). */
export function missionScore(t: PriorityTask): number {
  let score = 0;
  if (t.goal) {
    score += t.goal.priority * 10;
    if (t.goal.verdict === "behind") score += 15;
    if (t.goal.daysToDeadline != null && t.goal.daysToDeadline <= 7) score += 10;
  }
  score += Math.min(t.postponeCount, 5) * 4; // old debts surface before they rot
  return score;
}

/** The 1–3 facts that justify picking this mission — mirrors missionScore. */
function missionWhy(t: PriorityTask, energy: number | null): string[] {
  const why: string[] = [];
  if (t.goal) {
    if (t.goal.verdict === "behind") {
      const pace = fmtPace(t.goal);
      why.push(
        `L'objectif « ${t.goal.title} » est en retard${pace ? ` — ${pace}` : ""}.`
      );
    } else if (t.goal.priority >= 4) {
      why.push(`Liée à ton objectif prioritaire « ${t.goal.title} ».`);
    }
    if (t.goal.daysToDeadline != null && t.goal.daysToDeadline <= 7) {
      why.push(`Échéance dans ${t.goal.daysToDeadline} jour${t.goal.daysToDeadline > 1 ? "s" : ""}.`);
    }
  }
  if (t.postponeCount >= 2) {
    why.push(`Reportée ${t.postponeCount} fois déjà — chaque report la rend plus lourde.`);
  }
  if (why.length === 0) {
    why.push("La prochaine mission ouverte de ta journée planifiée.");
  }
  if (energy != null && energy <= 3 && why.length < 3) {
    why.push(`Énergie ${energy}/10 ce matin — une seule action bien choisie suffit.`);
  }
  return why.slice(0, 3);
}

export function whatNow(ctx: PriorityContext): Recommendation {
  // A protected day beats everything: the win condition changed this morning.
  if (ctx.minimumDay) {
    return {
      kind: "minimum_day",
      action: "Protège l'essentiel : corps, une action qui compte, l'esprit.",
      why: ["Tu as activé la journée minimum — la réussite d'aujourd'hui, c'est tenir ces trois points."],
    };
  }

  // No Main Quest and the day is still alive → define it (with the most
  // urgent goal as suggested ammunition).
  if (!ctx.mainQuest && ctx.hourOfDay < 18) {
    const why: string[] = ["Sans résultat n°1 défini, la journée se décide par défaut."];
    const risky = ctx.goalsAtRisk[0];
    if (risky) {
      const pace = fmtPace(risky);
      why.push(`« ${risky.title} » est en retard${pace ? ` — ${pace}` : ""} : bon candidat.`);
    }
    return {
      kind: "define_main_quest",
      action: "Définis ta Main Quest : le résultat le plus important du jour.",
      why,
    };
  }

  // An open Main Quest is, by definition, the highest-impact action.
  if (ctx.mainQuest && ctx.mainQuest.status === "OPEN") {
    const mq = ctx.mainQuest;
    const why: string[] = ["C'est le résultat que TU as désigné comme le plus important."];
    if (mq.goal?.verdict === "behind") {
      const pace = fmtPace(mq.goal);
      why.push(`Elle sert « ${mq.goal.title} », en retard${pace ? ` (${pace})` : ""}.`);
    }
    if (mq.postponeCount >= 3) {
      why.push(`Reportée ${mq.postponeCount} fois — mode difficile actif, l'XP est majorée.`);
    } else if (ctx.energy != null && ctx.energy >= 7) {
      why.push(`Énergie ${ctx.energy}/10 — le bon moment pour la chose difficile.`);
    }
    return {
      kind: "main_quest",
      action: `Ta Main Quest : « ${mq.title} ».`,
      why: why.slice(0, 3),
      targetId: mq.id,
    };
  }

  // Missions: pick ONE by score, explain with the facts that scored.
  if (ctx.openMissions.length > 0) {
    const best = [...ctx.openMissions].sort((a, b) => missionScore(b) - missionScore(a))[0];
    return {
      kind: "mission",
      action: `Prochaine mission : « ${best.title} ».`,
      why: missionWhy(best, ctx.energy),
      targetId: best.id,
    };
  }

  // Non-négociables keep the day honest even when the work is done.
  if (ctx.unmetNonNegotiables.length > 0) {
    const nn = ctx.unmetNonNegotiables[0];
    const n = ctx.unmetNonNegotiables.length;
    return {
      kind: "non_negotiable",
      action: `Tiens « ${nn.title} ».`,
      why: [
        n === 1
          ? "C'est le dernier non-négociable du jour — la journée se clôt dessus."
          : `Il reste ${n} non-négociables — ce sont tes engagements quoi qu'il arrive.`,
      ],
      targetId: nn.id,
    };
  }

  // Evening with everything done → close the loop (it feeds tomorrow's plan).
  if (!ctx.nightReviewDone && ctx.hourOfDay >= 19) {
    return {
      kind: "night_review",
      action: "Clos ta journée : revue du soir + Main Quest de demain.",
      why: ["Tout est fait — 3 minutes ce soir décident de demain matin."],
    };
  }

  return {
    kind: "day_done",
    action: "Journée accomplie. Récupère — c'est aussi du jeu.",
    why: ["Main Quest, missions et non-négociables : tout est réglé."],
  };
}
