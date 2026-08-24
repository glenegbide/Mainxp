import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { isActiveMemory } from "@/lib/mainxp/memory";
import { addKnowledge, deleteKnowledge } from "./actions";

// « Ajoute ça à ta connaissance » — the coach's memory, finally visible and
// FED directly by the user. Everything here shapes coaching; nothing here is
// hidden from its owner.
const SCOPE_LABEL: Record<string, string> = {
  permanent: "Permanent",
  long_term: "Long terme",
  temporary: "7 jours",
  immediate: "24 h",
};

const SOURCE_LABEL: Record<string, string> = {
  user_stated: "toi",
  coach_conversation: "conversation",
  onboarding: "bienvenue",
  ai_inferred: "déduit",
};

export default async function KnowledgePage() {
  const user = await getMxUser();
  if (!user) redirect("/login");

  const memories = await prisma.mxMemory.findMany({
    where: { userId: user.id },
    orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  const now = new Date();
  const active = memories.filter((m) => isActiveMemory(m, now));

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/me" className="mxp-meta">← Moi</Link>
      <h1 className="mt-3 mxp-display">Connaissance</h1>
      <p className="text-sm text-mxp-muted">
        Tout ce que ton coach sait de toi — et que tu peux nourrir directement.
        Dis-lui aussi en chat : « retiens que… ».
      </p>

      <section className="mxp-card mt-4 p-4">
        <p className="mxp-label text-mxp-purple">Ajoute à sa connaissance</p>
        <form action={addKnowledge} className="mt-2 space-y-2">
          <textarea
            name="content"
            required
            rows={3}
            maxLength={500}
            placeholder="Ex. Je veux acheter un appartement d'ici 3 ans · Mon meilleur créneau de prospection : 9h-11h · Ne me propose jamais de réunions le mercredi après-midi…"
            className="w-full mxp-input px-3 py-2.5 text-sm"
          />
          <div className="flex gap-2">
            <select name="scope" className="mxp-input px-2 py-2 text-xs">
              <option value="permanent">Permanent</option>
              <option value="long_term">Long terme</option>
              <option value="temporary">7 jours</option>
              <option value="immediate">24 h</option>
            </select>
            <button className="flex-1 mxp-btn px-4 py-2 text-sm">Retenir</button>
          </div>
        </form>
      </section>

      {active.length === 0 ? (
        <p className="mt-6 text-center text-sm text-mxp-muted">
          Sa mémoire est vide — commence par une chose que ton coach devrait toujours savoir.
        </p>
      ) : (
        <section className="mt-4 space-y-2">
          {active.map((m) => (
            <article key={m.id} className="mxp-card flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm">{m.content}</p>
                <p className="mt-1 text-[11px] text-mxp-muted">
                  {SCOPE_LABEL[m.scope] ?? m.scope} · source : {SOURCE_LABEL[m.source] ?? m.source}
                </p>
              </div>
              <form action={deleteKnowledge}>
                <input type="hidden" name="id" value={m.id} />
                <button
                  aria-label="Oublier"
                  title="Oublier"
                  className="text-xs text-mxp-muted hover:text-mxp-red"
                >
                  ✕
                </button>
              </form>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
