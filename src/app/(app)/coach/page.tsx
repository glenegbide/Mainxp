import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/mainxp/ai/provider";
import { sendToCoach } from "./actions";

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;
  const configured = getAIProvider() !== null;

  const conversation = configured
    ? await prisma.mxConversation.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 60 } },
      })
    : null;

  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col px-4 pt-5">
      <h1 className="text-xl font-semibold">Coach</h1>

      {!configured ? (
        <section className="mt-4 mxp-card p-5">
          <p className="text-sm font-medium">Coach hors ligne.</p>
          <p className="mt-2 text-sm text-mxp-muted">
            Aucune clé IA n&apos;est configurée (variable d&apos;environnement{" "}
            <code className="rounded bg-mxp-bg px-1 py-0.5 text-xs">MAINXP_ANTHROPIC_API_KEY</code>,
            côté serveur uniquement). Rien n&apos;est simulé : ajoute la clé et le coach
            s&apos;active immédiatement — il connaît ton North Star, ta Main Quest, tes
            objectifs et leur rythme.
          </p>
        </section>
      ) : (
        <>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
            {!conversation?.messages.length && (
              <section className="mxp-card p-4 text-sm text-mxp-muted">
                Ton coach connaît ton North Star, ta journée et le rythme de tes objectifs.
                Essaie : « Que devrais-je faire maintenant ? » ou « Aide-moi à planifier ma
                semaine. » Il utilise des faits, jamais la honte — et il n&apos;attribue
                jamais d&apos;XP lui-même.
              </section>
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
                Le service IA n&apos;a pas répondu. Ton message est conservé — réessaie dans un
                instant.
              </p>
            )}
          </div>
          <form action={sendToCoach} className="sticky bottom-16 flex gap-2 bg-mxp-bg pb-3 pt-1">
            <input
              type="text"
              name="text"
              required
              maxLength={4000}
              placeholder="Parle à ton coach…"
              autoComplete="off"
              className="min-w-0 flex-1 mxp-input px-4 py-3 text-sm"
            />
            <button className="mxp-btn px-4 py-3 text-sm">
              →
            </button>
          </form>
        </>
      )}
    </main>
  );
}
