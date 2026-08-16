// Coach context assembly + conversation service (docs/COACH_SYSTEM.md).
// Bounded context: profile + North Star + today + goals pace — never full history.

import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { dayKey, daysBetween } from "@/lib/mainxp/day";
import { goalPace } from "@/lib/mainxp/goals";
import { getAIProvider, type ChatMessage } from "./provider";
import { extractMemoryTags, isActiveMemory, scopeExpiry } from "@/lib/mainxp/memory";

const MAX_TURNS = 12; // last N messages sent to the model

export async function buildCoachSystemPrompt(user: MxUser): Promise<string> {
  const today = dayKey(new Date(), user.timezone);
  const [northStar, tasks, goals, nns, nnLogs, memories] = await Promise.all([
    prisma.mxNorthStar.findUnique({ where: { userId: user.id } }),
    prisma.mxTask.findMany({ where: { userId: user.id, dayKey: today } }),
    prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" }, take: 10 }),
    prisma.mxNonNegotiable.findMany({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
    prisma.mxNonNegotiableLog.findMany({ where: { userId: user.id, periodKey: today, completed: true } }),
    prisma.mxMemory.findMany({
      where: { userId: user.id },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: 30,
    }),
  ]);
  const now = new Date();
  const activeMemories = memories.filter((m) => isActiveMemory(m, now)).slice(0, 12);

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
- EXPLICABILITÉ : pour toute recommandation importante, donne le POURQUOI en 1–3 faits chiffrés tirés du contexte (rythme d'objectif, échéance, temps disponible). L'utilisateur doit comprendre pourquoi ça compte.
- CONFIANCE : quand les données sont minces, dis-le explicitement (« Je manque d'historique pour en être sûr »). Ne présente jamais une hypothèse comme un fait.
- SILENCE INTELLIGENT : si l'utilisateur avance bien et qu'aucune intervention n'apporte de valeur, dis-le sobrement au lieu de créer du bruit.
- CAPACITÉ : le temps est fini. Ne propose jamais un plan qui dépasse la capacité réaliste de la journée ; si ses objectifs entrent en conflit (temps/argent/énergie), nomme le conflit et propose : réduire / mettre en pause / déléguer / repousser l'échéance.
- CORRECTIONS : si l'utilisateur te corrige (« non, Y est prioritaire parce que… »), prends-le en compte ET mémorise-le en terminant ta réponse par une ligne exacte : [RETENIR:temporary] <la correction en une phrase>. Scopes possibles : immediate (24 h), temporary (7 j), long_term, permanent. N'utilise ce format que pour de vraies informations à retenir.
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
${goalLines || "- aucun"}
${activeMemories.length ? `\nMÉMOIRE (à respecter, avec leur portée) :\n${activeMemories.map((m) => `- [${m.scope}] ${m.content}`).join("\n")}` : ""}`;
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

    // User corrections & priorities the coach was told to keep (addendum #13/#14).
    const { cleaned, memories: toRemember } = extractMemoryTags(result.text);
    for (const m of toRemember) {
      await prisma.mxMemory.create({
        data: {
          userId: user.id,
          type: "commitment",
          content: m.content,
          source: "user_stated",
          scope: m.scope,
          expiresAt: scopeExpiry(m.scope, new Date()),
        },
      });
    }

    await prisma.mxMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: cleaned || result.text },
    });
    await prisma.mxConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return { ok: true };
  } catch (e) {
    console.error("askCoach provider failure:", e instanceof Error ? e.message : e);
    return { ok: false, error: "provider" };
  }
}
