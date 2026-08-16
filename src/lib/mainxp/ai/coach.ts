// Coach context assembly + conversation service (docs/COACH_SYSTEM.md).
// Bounded context: profile + North Star + today + goals pace — never full history.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { dayKey, daysBetween } from "@/lib/mainxp/day";
import { goalPace } from "@/lib/mainxp/goals";
import { getAIProvider, type ChatMessage } from "./provider";

const MAX_TURNS = 12; // last N messages sent to the model

export async function buildCoachSystemPrompt(user: MxUser): Promise<string> {
  const today = dayKey(new Date(), user.timezone);
  const [northStar, tasks, goals, nns, nnLogs] = await Promise.all([
    prisma.mxNorthStar.findUnique({ where: { userId: user.id } }),
    prisma.mxTask.findMany({ where: { userId: user.id, dayKey: today } }),
    prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" }, take: 10 }),
    prisma.mxNonNegotiable.findMany({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
    prisma.mxNonNegotiableLog.findMany({ where: { userId: user.id, periodKey: today, completed: true } }),
  ]);

  const mq = tasks.find((t) => t.tier === "MAIN_QUEST");
  const missions = tasks.filter((t) => t.tier === "DAILY_MISSION");
  const goalLines = goals
    .map((g) => {
      let pace = "";
      if (g.targetValue && g.deadline) {
        const r = goalPace({
          targetValue: g.targetValue,
          currentValue: g.currentValue,
          createdAt: g.createdAt,
          deadline: g.deadline,
        });
        const days = daysBetween(today, dayKey(g.deadline, user.timezone));
        pace = ` — ${g.currentValue}/${g.targetValue} ${g.unit ?? ""}, ${r.verdict}, échéance dans ${days} j`;
      }
      return `- ${g.title}${pace}`;
    })
    .join("\n");

  return `Tu es le Coach MAINXP de ${user.name} — un système d'exploitation de vie sous forme de RPG réel. La vie de l'utilisateur est la quête principale.

RÈGLES DE COMPORTEMENT (absolues) :
- Jamais de honte, jamais d'insulte, jamais "paresseux". Utilise des faits et des chiffres, pas des jugements.
- N'invente jamais : pas de souvenirs, pas de chiffres, pas de données bancaires, pas d'accomplissements. Si tu ne sais pas, dis-le.
- Tu n'attribues JAMAIS d'XP toi-même — l'XP vient uniquement des actions réelles enregistrées.
- Face à un report répété, cherche le blocage : trop gros / flou / peur / pas le temps / énergie basse / en attente / plus important.
- Réduis la complexité : une recommandation claire vaut mieux que cinq options.
- Réponds dans la langue de l'utilisateur (${user.locale === "en" ? "anglais" : "français"}), de façon concise (2–6 phrases sauf si on te demande un plan).

CONTEXTE DU JOUR (${today}, fuseau ${user.timezone}) :
${user.occupation ? `Métier : ${user.occupation}` : ""}
${northStar?.why ? `Pourquoi : ${northStar.why}` : ""}
${northStar?.season ? `Saison actuelle : ${northStar.season}` : ""}
${northStar?.mission90Days ? `Mission 90 jours : ${northStar.mission90Days}` : ""}
Main Quest du jour : ${mq ? `${mq.title} (${mq.status === "DONE" ? "accomplie" : "en cours"})` : "non définie"}
Missions : ${missions.length ? missions.map((m) => `${m.title}${m.status === "DONE" ? " ✓" : ""}`).join(" · ") : "aucune"}
Non-négociables tenus : ${nnLogs.length}/${nns.length}
Objectifs actifs :
${goalLines || "- aucun"}`;
}

export interface CoachReply {
  ok: boolean;
  error?: string;
}

/** Persist the user message, call the provider, persist the reply. */
export async function askCoach(user: MxUser, text: string): Promise<CoachReply> {
  const provider = getAIProvider();
  if (!provider) return { ok: false, error: "offline" };

  let conversation = await prisma.mxConversation.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  if (!conversation) {
    conversation = await prisma.mxConversation.create({
      data: { userId: user.id, title: "Coach" },
    });
  }
  await prisma.mxMessage.create({
    data: { conversationId: conversation.id, role: "user", content: text },
  });

  const recent = await prisma.mxMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: MAX_TURNS,
  });
  const messages: ChatMessage[] = recent
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }) as ChatMessage);

  try {
    const system = await buildCoachSystemPrompt(user);
    const result = await provider.chat({ system, messages, maxTokens: 800 });
    await prisma.mxMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: result.text },
    });
    await prisma.mxConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "provider" };
  }
}
