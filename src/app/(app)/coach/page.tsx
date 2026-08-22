import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/mainxp/ai/provider";
import { loadRecommendation } from "@/lib/mainxp/priority-context";
import { FLAGS } from "@/lib/mainxp/flags";
import { sendToCoach } from "./actions";
import { CoachComposer, QuestionChip } from "./CoachComposer";

// COACH — one coherent assistant, anchored on its standing recommendation.
// The chat is the conversation; the brief on top is the coach's position RIGHT
// NOW, computed from the same priority engine as the Today card, with its
// reasons visible. Facts first, then talk (SCREEN_PRIORITY_MATRIX: anchor =
// latest recommendation, not a blank chat box).

const STARTERS = [
  "Qu'est-ce que je dois faire maintenant ?",
  "Organise ma semaine autour de mon objectif principal.",
  "Qu'est-ce que j'évite depuis trop longtemps ?",
];

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;
  const configured = FLAGS.AI_COACH && getAIProvider(user.aiKey) !== null;

  const [conversation, { recommendation }] = await Promise.all([
    configured
      ? prisma.mxConversation.findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          include: { messages: { orderBy: { createdAt: "asc" }, take: 60 } },
        })
      : Promise.resolve(null),
    loadRecommendation(user),
  ]);
  const hasMessages = Boolean(conversation?.messages.length);

  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col px-4 pt-5">
      <h1 className="mxp-display">Coach</h1>

      {/* The standing position — real numbers, visible reasoning, no key needed. */}
      <section className="mxp-card mxp-quest mt-3 p-4">
        <p className="mxp-label text-mxp-purple">Sa position, là maintenant</p>
        <p className="mt-1.5 mxp-body font-medium">{recommendation.action}</p>
        {recommendation.why.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {recommendation.why.map((fact) => (
              <li key={fact} className="mxp-meta">
                · {fact}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!configured ? (
        <section className="mt-3 mxp-card p-5">
          <p className="text-sm font-medium">Pour en discuter, il lui faut une voix.</p>
          <p className="mt-2 text-sm text-mxp-muted">
            Colle ta clé IA (gratuite avec Gemini, ou Claude) dans les réglages — testée
            en direct, stockée côté serveur. Ta mémoire (conversations, souvenirs,
            contexte) vit dans TA base de données, pas chez le fournisseur — en changer
            ne perd rien.
          </p>
          <Link href="/me#coach-ia" className="mxp-btn mt-4 inline-block px-4 py-2.5 text-sm">
            Configurer ma clé IA
          </Link>
        </section>
      ) : (
        <>
          <div className="mt-3 flex-1 space-y-3 overflow-y-auto pb-4">
            {!hasMessages && (
              <div className="space-y-2">
                <p className="mxp-meta px-1">
                  Il connaît ton North Star, ta journée, le rythme de tes objectifs et tes
                  notes. Commence ici :
                </p>
                {STARTERS.map((q) => (
                  <QuestionChip key={q} action={sendToCoach} question={q} />
                ))}
                <p className="mxp-meta px-1 pt-1">
                  Il répond avec des faits, jamais avec la honte — et il n&apos;attribue
                  jamais d&apos;XP lui-même.
                </p>
              </div>
            )}
            {conversation?.messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-mxp-purple text-white"
                    : "border border-mxp-line bg-mxp-card"
                }`}
              >
                {m.content}
              </div>
            ))}
            {error === "provider" && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-mxp-red">
                Le service IA n&apos;a pas répondu. Ton message est conservé — réessaie dans
                un instant.
              </p>
            )}
          </div>
          <CoachComposer action={sendToCoach} />
        </>
      )}
    </main>
  );
}
