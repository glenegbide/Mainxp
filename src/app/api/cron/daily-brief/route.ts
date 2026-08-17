// Proactive coach (audit P10, first slice): every morning, the coach studies
// the user's bird's-eye view and leaves a short accountability brief in the
// conversation — ready when the app opens. The model never runs continuously;
// this is one scheduled, bounded call per active user per day.

import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/mainxp/ai/provider";
import { buildCoachSystemPrompt } from "@/lib/mainxp/ai/coach";
import { birdsEyeView } from "@/lib/mainxp/insight";

export const dynamic = "force-dynamic";

const BRIEF_MARK = "☀️";

function authorized(req: Request): boolean {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when the env var
  // exists; otherwise its requests carry the vercel-cron user-agent. Anyone
  // else gets a 401 — worst case an authorized replay is a no-op (idempotent).
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return (req.headers.get("user-agent") ?? "").includes("vercel-cron");
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });

  // Active = at least one canonical event in the last 14 days.
  const activeUserIds = await prisma.mxEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) } },
  });
  const users = await prisma.mxUser.findMany({
    where: { id: { in: activeUserIds.map((u) => u.userId) } },
  });

  let sent = 0;
  const skipped: string[] = [];
  for (const user of users) {
    try {
      const provider = getAIProvider(user.aiKey);
      if (!provider) {
        skipped.push("no-key");
        continue;
      }
      const conversation =
        (await prisma.mxConversation.findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
        })) ??
        (await prisma.mxConversation.create({ data: { userId: user.id, title: "Coach" } }));

      // One brief per day, whatever the cron replay count.
      const already = await prisma.mxMessage.findFirst({
        where: {
          conversationId: conversation.id,
          role: "assistant",
          content: { startsWith: BRIEF_MARK },
          createdAt: { gte: new Date(Date.now() - 20 * 3600_000) },
        },
      });
      if (already) {
        skipped.push("already-sent");
        continue;
      }

      const [system, view] = await Promise.all([
        buildCoachSystemPrompt(user),
        birdsEyeView(user),
      ]);
      const result = await provider.chat({
        system,
        maxTokens: 700,
        messages: [
          {
            role: "user",
            content:
              `[BRIEF AUTOMATIQUE DU MATIN — l'utilisateur n'a rien écrit ; tu ouvres la journée en assistant de vie.]\n` +
              `Données réelles (bird's eye view) : ${JSON.stringify(view)}\n\n` +
              `Écris le brief du matin en 4–6 phrases MAX, en te basant uniquement sur ces chiffres : ` +
              `1) où il en est (tendance, taux de tenue) ; 2) le suivi d'un engagement ou d'un report chronique s'il y en a ; ` +
              `3) UNE action prioritaire concrète pour aujourd'hui. Ton direct, zéro honte, zéro remplissage. ` +
              `Commence ta réponse exactement par « ${BRIEF_MARK} Brief du matin — ».`,
          },
        ],
      });

      await prisma.mxMessage.create({
        data: { conversationId: conversation.id, role: "assistant", content: result.text },
      });
      await prisma.mxConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
      sent++;
    } catch (e) {
      console.error("daily-brief failed for user:", e instanceof Error ? e.message : e);
      skipped.push("error");
    }
  }
  return Response.json({ sent, skipped });
}
