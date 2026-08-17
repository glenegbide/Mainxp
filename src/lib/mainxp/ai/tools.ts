// COACH TOOL LAYER (audit P1): the AI reads real state and acts through
// validated tools — never arbitrary SQL, never around the caps, never through
// any path the UI itself doesn't use. Every argument is validated before the
// handler runs; every mutation flows through the same invariants as the
// server actions (event-first, caps, 0 XP for organizing).
//
// The model only ever sees JSON in and JSON out. Errors are returned as data
// ({ ok:false, error }) so the coach can explain honestly instead of crashing.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { dayKey } from "@/lib/mainxp/day";
import { emitEvent } from "@/lib/mainxp/events";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { levelProgress } from "@/lib/mainxp/xp/curve";
import { goalPace } from "@/lib/mainxp/goals";
import { elanReport } from "@/lib/mainxp/elan";
import { loadRecommendation } from "@/lib/mainxp/priority-context";
import { createCappedTask, DAILY_MISSION_CAP } from "@/lib/mainxp/tasks";
import { isActiveMemory, MEMORY_SCOPES, scopeExpiry, type MemoryScope } from "@/lib/mainxp/memory";
import type { MxAttribute } from "@/generated/prisma/enums";

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

type ToolHandler = (user: MxUser, input: Record<string, unknown>) => Promise<unknown>;

interface ToolDef {
  spec: ToolSpec;
  run: ToolHandler;
}

// ── Validation helpers (no dependency; explicit and boring on purpose) ──
const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;
const oneOf = <T extends string>(v: unknown, values: readonly T[]): T | null =>
  typeof v === "string" && (values as readonly string[]).includes(v) ? (v as T) : null;
const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const ATTRS: MxAttribute[] = [
  "STRENGTH", "ENDURANCE", "FOCUS", "DISCIPLINE", "KNOWLEDGE", "STRATEGY", "WEALTH", "MIND", "SOCIAL",
];

const err = (error: string) => ({ ok: false as const, error });
const ok = (data: unknown) => ({ ok: true as const, data });

// ── The registry ──

const TOOLS: ToolDef[] = [
  {
    spec: {
      name: "get_today_context",
      description:
        "État complet du jour : Main Quest, missions, side quests, non-négociables (tenus ou non), plan du matin (humeur/énergie/stress), Élan, niveau et totaux XP/pièces. Toujours consulter avant de conseiller.",
      input_schema: { type: "object", properties: {} },
    },
    run: async (user) => {
      const today = dayKey(new Date(), user.timezone);
      const [tasks, nns, logs, plan, totals, elan] = await Promise.all([
        prisma.mxTask.findMany({ where: { userId: user.id, dayKey: today }, orderBy: { createdAt: "asc" } }),
        prisma.mxNonNegotiable.findMany({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
        prisma.mxNonNegotiableLog.findMany({ where: { userId: user.id, periodKey: today } }),
        prisma.mxDayPlan.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey: today } } }),
        xpTotals(user.id),
        elanReport(user.id, user.timezone, user.restMode),
      ]);
      const done = new Map(logs.map((l) => [l.nonNegotiableId, l.completed]));
      const lp = levelProgress(totals.main);
      return ok({
        day: today,
        tasks: tasks.map((t) => ({
          id: t.id, title: t.title, tier: t.tier, status: t.status, postponeCount: t.postponeCount,
        })),
        nonNegotiables: nns.map((n) => ({ id: n.id, title: n.title, keptToday: done.get(n.id) ?? false })),
        morning: plan
          ? {
              mood: plan.mood,
              energy: plan.energy,
              stress: plan.stress,
              focus: plan.focus,
              intention: plan.morningIntention || null,
              minimumDay: plan.minimumDay,
              nightReviewDone: plan.reviewedAt != null,
            }
          : null,
        elan: elan.value,
        restMode: user.restMode,
        level: lp.level,
        xp: totals.main,
        coins: totals.coins,
      });
    },
  },
  {
    spec: {
      name: "get_north_star",
      description: "Le pourquoi profond de l'utilisateur, sa saison actuelle et sa mission 90 jours.",
      input_schema: { type: "object", properties: {} },
    },
    run: async (user) => {
      const ns = await prisma.mxNorthStar.findUnique({ where: { userId: user.id } });
      return ns
        ? ok({
            why: ns.why,
            season: ns.season,
            mission90: ns.mission90Days,
            vision1Year: ns.vision1Year,
            rules: ns.personalRules,
          })
        : ok({ empty: true, note: "Pas encore défini — proposer de le faire dans Moi → North Star." });
    },
  },
  {
    spec: {
      name: "get_goals",
      description:
        "Objectifs actifs avec leur rythme : cible, progression, verdict (ahead/on_track/behind), rythme hebdo requis, échéance.",
      input_schema: { type: "object", properties: {} },
    },
    run: async (user) => {
      const goals = await prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" } });
      return ok(
        goals.map((g) => {
          const base = {
            id: g.id, title: g.title, lifeArea: g.lifeArea, horizon: g.horizon, priority: g.priority,
            currentValue: g.currentValue, targetValue: g.targetValue, unit: g.unit,
            deadline: g.deadline?.toISOString().slice(0, 10) ?? null,
          };
          if (!g.targetValue || !g.deadline) return base;
          const pace = goalPace({
            targetValue: g.targetValue, currentValue: g.currentValue, createdAt: g.createdAt, deadline: g.deadline,
          });
          return { ...base, verdict: pace.verdict, requiredWeeklyPace: Math.round(pace.requiredWeeklyPace * 10) / 10 };
        })
      );
    },
  },
  {
    spec: {
      name: "get_projects",
      description: "Projets avec statut, progression et prochaine action.",
      input_schema: { type: "object", properties: {} },
    },
    run: async (user) => {
      const projects = await prisma.mxProject.findMany({
        where: { userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        include: { milestones: true },
      });
      return ok(
        projects.map((p) => ({
          id: p.id, title: p.title, status: p.status, nextAction: p.nextAction,
          milestonesDone: p.milestones.filter((m) => m.done).length,
          milestonesTotal: p.milestones.length,
        }))
      );
    },
  },
  {
    spec: {
      name: "get_priorities",
      description:
        "Le moteur de priorité MAINXP : LA prochaine action recommandée avec ses raisons factuelles (WHY). À utiliser pour « que devrais-je faire maintenant ? ».",
      input_schema: { type: "object", properties: {} },
    },
    run: async (user) => ok(await loadRecommendation(user)),
  },
  {
    spec: {
      name: "get_capacity",
      description:
        "Capacité restante du jour : missions (plafond 5), non-négociables (plafond 7), habitudes (plafond 15), mode récupération / journée minimum. À consulter AVANT de proposer d'ajouter quoi que ce soit.",
      input_schema: { type: "object", properties: {} },
    },
    run: async (user) => {
      const today = dayKey(new Date(), user.timezone);
      const [missions, nns, habits, plan] = await Promise.all([
        prisma.mxTask.count({ where: { userId: user.id, dayKey: today, tier: "DAILY_MISSION" } }),
        prisma.mxNonNegotiable.count({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
        prisma.mxHabit.count({ where: { userId: user.id, active: true } }),
        prisma.mxDayPlan.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey: today } } }),
      ]);
      return ok({
        missionsToday: missions, missionCap: DAILY_MISSION_CAP,
        missionSlotsLeft: Math.max(0, DAILY_MISSION_CAP - missions),
        nonNegotiables: nns, nonNegotiableCap: 7,
        habits, habitCap: 15,
        restMode: user.restMode,
        minimumDay: plan?.minimumDay ?? false,
        energy: plan?.energy ?? null,
      });
    },
  },
  {
    spec: {
      name: "search_memory",
      description: "Recherche dans la mémoire du coach (souvenirs actifs, non expirés) par mots-clés.",
      input_schema: {
        type: "object",
        properties: { query: { type: "string", description: "mots-clés" } },
        required: ["query"],
      },
    },
    run: async (user, input) => {
      const q = str(input.query, 200);
      if (!q) return err("query manquant");
      const memories = await prisma.mxMemory.findMany({
        where: { userId: user.id, doNotUseInCoaching: false, content: { contains: q, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const now = new Date();
      return ok(
        memories
          .filter((m) => isActiveMemory(m, now))
          .slice(0, 10)
          .map((m) => ({ content: m.content, scope: m.scope, type: m.type }))
      );
    },
  },

  // ── Mutations — validated, capped, event-first; the user's ask in chat is
  //    the confirmation for these small reversible creations ──
  {
    spec: {
      name: "create_task",
      description:
        "Créer une tâche pour aujourd'hui. tier DAILY_MISSION (plafond 5/jour — au-delà elle devient automatiquement SIDE_QUEST) ou SIDE_QUEST. Créer ne rapporte jamais d'XP.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          tier: { type: "string", enum: ["DAILY_MISSION", "SIDE_QUEST"] },
        },
        required: ["title"],
      },
    },
    run: async (user, input) => {
      const title = str(input.title, 300);
      if (!title) return err("titre manquant ou trop long (300 max)");
      const tier = oneOf(input.tier, ["DAILY_MISSION", "SIDE_QUEST"] as const) ?? "DAILY_MISSION";
      const created = await createCappedTask(user.id, title, tier, dayKey(new Date(), user.timezone));
      if (!created) return err("création impossible");
      return ok({
        ...created,
        note: created.rerouted
          ? "Plafond de 5 missions atteint — créée en side quest (honnêteté du système)."
          : undefined,
      });
    },
  },
  {
    spec: {
      name: "postpone_task",
      description: "Reporter une tâche ouverte à demain (augmente son compteur de report — mode difficile au-delà de 3).",
      input_schema: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
    },
    run: async (user, input) => {
      const id = str(input.taskId, 40);
      if (!id) return err("taskId manquant");
      const task = await prisma.mxTask.findFirst({ where: { id, userId: user.id, status: "OPEN" } });
      if (!task || !task.dayKey) return err("tâche introuvable ou déjà terminée");
      const { addDays } = await import("@/lib/mainxp/day");
      await prisma.mxTask.update({
        where: { id: task.id },
        data: { dayKey: addDays(task.dayKey, 1), postponeCount: { increment: 1 } },
      });
      return ok({ postponed: task.title, postponeCount: task.postponeCount + 1 });
    },
  },
  {
    spec: {
      name: "create_goal",
      description:
        "Créer un objectif. horizon: LIFETIME|THREE_YEAR|ONE_YEAR|NINETY_DAY|MONTHLY|WEEKLY. priority 1-5. Mesurable si targetValue+unit+deadline (YYYY-MM-DD).",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          why: { type: "string" },
          lifeArea: { type: "string" },
          horizon: { type: "string", enum: ["LIFETIME", "THREE_YEAR", "ONE_YEAR", "NINETY_DAY", "MONTHLY", "WEEKLY"] },
          targetValue: { type: "number" },
          unit: { type: "string" },
          deadline: { type: "string", description: "YYYY-MM-DD" },
          priority: { type: "number", description: "1-5" },
        },
        required: ["title"],
      },
    },
    run: async (user, input) => {
      const title = str(input.title, 300);
      if (!title) return err("titre manquant");
      const deadlineRaw = typeof input.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.deadline) ? input.deadline : null;
      const goal = await prisma.mxGoal.create({
        data: {
          userId: user.id,
          title,
          why: str(input.why, 1000) ?? "",
          lifeArea: str(input.lifeArea, 40) ?? "",
          horizon: oneOf(input.horizon, ["LIFETIME", "THREE_YEAR", "ONE_YEAR", "NINETY_DAY", "MONTHLY", "WEEKLY"] as const) ?? "NINETY_DAY",
          targetValue: numOrNull(input.targetValue),
          unit: str(input.unit, 40),
          deadline: deadlineRaw ? new Date(`${deadlineRaw}T12:00:00Z`) : null,
          priority: Math.min(5, Math.max(1, numOrNull(input.priority) ?? 3)),
        },
      });
      return ok({ id: goal.id, title: goal.title });
    },
  },
  {
    spec: {
      name: "create_non_negotiable",
      description: "Créer un non-négociable quotidien (plafond 7 — refusé au-delà).",
      input_schema: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
    },
    run: async (user, input) => {
      const title = str(input.title, 200);
      if (!title) return err("titre manquant");
      const count = await prisma.mxNonNegotiable.count({
        where: { userId: user.id, active: true, cadence: "DAILY" },
      });
      if (count >= 7) return err("plafond atteint (7) — en retirer un d'abord, la contrainte fait le système");
      const nn = await prisma.mxNonNegotiable.create({ data: { userId: user.id, title, cadence: "DAILY" } });
      return ok({ id: nn.id, title: nn.title });
    },
  },
  {
    spec: {
      name: "create_habit",
      description:
        "Créer une habitude. kind: good|bad. attribute (good uniquement) : STRENGTH|ENDURANCE|FOCUS|DISCIPLINE|KNOWLEDGE|STRATEGY|WEALTH|MIND|SOCIAL. description = les mots de l'utilisateur (pourquoi/comment/déclencheur). Plafond 15.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          kind: { type: "string", enum: ["good", "bad"] },
          attribute: { type: "string" },
          description: { type: "string" },
        },
        required: ["title"],
      },
    },
    run: async (user, input) => {
      const title = str(input.title, 300);
      if (!title) return err("titre manquant");
      const kind = oneOf(input.kind, ["good", "bad"] as const) ?? "good";
      const count = await prisma.mxHabit.count({ where: { userId: user.id, active: true } });
      if (count >= 15) return err("plafond atteint (15 habitudes)");
      const attribute = kind === "good" ? oneOf(input.attribute, ATTRS) : null;
      const habit = await prisma.mxHabit.create({
        data: { userId: user.id, title, kind, attribute, description: str(input.description, 500) ?? "" },
      });
      return ok({ id: habit.id, title: habit.title, kind });
    },
  },
  {
    spec: {
      name: "create_memory",
      description:
        "Mémoriser un fait/une préférence/une correction de l'utilisateur. scope: permanent|long_term|temporary (7j)|immediate (24h).",
      input_schema: {
        type: "object",
        properties: {
          content: { type: "string" },
          scope: { type: "string", enum: [...MEMORY_SCOPES] },
        },
        required: ["content", "scope"],
      },
    },
    run: async (user, input) => {
      const content = str(input.content, 500);
      const scope = oneOf(input.scope, MEMORY_SCOPES) as MemoryScope | null;
      if (!content || !scope) return err("content/scope invalide");
      await prisma.mxMemory.create({
        data: {
          userId: user.id,
          type: "coach_noted",
          content,
          source: "coach_conversation",
          scope,
          expiresAt: scopeExpiry(scope, new Date()),
        },
      });
      return ok({ remembered: content, scope });
    },
  },
  {
    spec: {
      name: "create_journal_entry",
      description: "Écrire une entrée de journal au nom de l'utilisateur (ce qu'il vient de raconter et veut garder).",
      input_schema: {
        type: "object",
        properties: { content: { type: "string" } },
        required: ["content"],
      },
    },
    run: async (user, input) => {
      const content = str(input.content, 4000);
      if (!content) return err("contenu manquant");
      const today = dayKey(new Date(), user.timezone);
      await prisma.mxJournalEntry.create({
        data: { userId: user.id, kind: "journal", content, dayKey: today },
      });
      return ok({ saved: true });
    },
  },
  {
    spec: {
      name: "log_gratitude",
      description: "Enregistrer la gratitude exprimée par l'utilisateur (XP au plus une fois par jour, via le registre).",
      input_schema: {
        type: "object",
        properties: { content: { type: "string" } },
        required: ["content"],
      },
    },
    run: async (user, input) => {
      const content = str(input.content, 1000);
      if (!content) return err("contenu manquant");
      const today = dayKey(new Date(), user.timezone);
      await emitEvent(
        user,
        "gratitude_logged",
        { day: today },
        {
          idempotencyKey: `gratitude:${user.id}:${today}`,
          domainOps: [
            prisma.mxGratitudeEntry.create({ data: { userId: user.id, dayKey: today, content } }),
          ],
        }
      );
      return ok({ saved: true });
    },
  },
];

export function coachToolSpecs(): ToolSpec[] {
  return TOOLS.map((t) => t.spec);
}

/** Execute a tool call. Unknown names and thrown errors come back as data. */
export async function executeCoachTool(
  user: MxUser,
  name: string,
  input: unknown
): Promise<string> {
  const tool = TOOLS.find((t) => t.spec.name === name);
  if (!tool) return JSON.stringify(err(`outil inconnu : ${name}`));
  try {
    const args = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
    return JSON.stringify(await tool.run(user, args));
  } catch (e) {
    console.error(`coach tool ${name} failed:`, e instanceof Error ? e.message : e);
    return JSON.stringify(err("erreur interne de l'outil"));
  }
}
