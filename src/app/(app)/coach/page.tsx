import { getAIProvider } from "@/lib/mainxp/ai/provider";

export default function CoachPage() {
  const configured = getAIProvider() !== null;
  return (
    <main className="px-4 pt-5">
      <h1 className="text-xl font-semibold">Coach</h1>
      <section className="mt-4 rounded-2xl border border-mxp-line bg-mxp-card p-5">
        <p className="text-sm font-medium">
          {configured ? "Le coach arrive en Phase 1." : "Coach hors ligne."}
        </p>
        <p className="mt-2 text-sm text-mxp-muted">
          {configured
            ? "La clé IA est configurée. La conversation, le Brain Dump et l'onboarding « Apprends à me connaître » sont la prochaine étape du plan de build (docs/ROADMAP.md)."
            : "Aucune clé IA n'est configurée (MAINXP_ANTHROPIC_API_KEY). Rien n'est simulé : le coach conversationnel sera activé en Phase 1, une fois la clé fournie."}
        </p>
        <p className="mt-3 text-xs text-mxp-muted">
          En attendant, la page Aujourd&apos;hui te donne une recommandation « Et
          maintenant ? » basée sur ta Main Quest, tes missions et tes non-négociables.
        </p>
      </section>
    </main>
  );
}
