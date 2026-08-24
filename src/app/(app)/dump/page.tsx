import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { getAIProvider } from "@/lib/mainxp/ai/provider";
import { decodeProposals, KIND_LABEL } from "@/lib/mainxp/braindump";
import { confirmDump, processDump } from "./actions";

export default async function DumpPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; error?: string }>;
}) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const { p, error } = await searchParams;
  const configured = getAIProvider(user.aiKey) !== null;
  const proposals = p ? decodeProposals(p) : [];

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="mxp-meta">← Aujourd&apos;hui</Link>
      <h1 className="mt-3 mxp-display">Vide-tête</h1>
      <p className="text-sm text-mxp-muted">
        Dis tout d&apos;un coup — je range. Chaque élément devient une mission, un rappel,
        une idée ou une note. Rien n&apos;est créé sans ta confirmation.
      </p>

      {!configured ? (
        <section className="mxp-card mt-4 p-5">
          <p className="text-sm font-medium">Vide-tête hors ligne.</p>
          <p className="mt-2 text-sm text-mxp-muted">
            Cette fonction utilise l&apos;IA. Ajoute ta clé (gratuite avec Gemini) dans{" "}
            <Link href="/me" className="font-semibold text-mxp-purple underline">
              Moi → Coach IA
            </Link>{" "}
            et le tri devient automatique.
          </p>
        </section>
      ) : proposals.length > 0 ? (
        <section className="mxp-card mxp-quest mt-4 p-4">
          <p className="mxp-label text-mxp-purple">Ce que j&apos;ai compris</p>
          <ul className="mt-3 space-y-2.5">
            {proposals.map((prop, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span aria-hidden className="mt-0.5">{KIND_LABEL[prop.kind].icon}</span>
                <span className="min-w-0">
                  <span className="block font-medium">{prop.title}</span>
                  <span className="block text-xs text-mxp-muted">
                    {KIND_LABEL[prop.kind].label}
                    {prop.detail ? ` · ${prop.detail}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <form action={confirmDump} className="mt-4 flex gap-2">
            <input type="hidden" name="p" value={p} />
            <button className="flex-1 mxp-btn px-4 py-3 text-sm">TOUT CONFIRMER</button>
            <Link href="/dump" className="mxp-btn-ghost px-4 py-3 text-sm">
              Annuler
            </Link>
          </form>
        </section>
      ) : (
        <form action={processDump} className="mt-4 space-y-3">
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-mxp-red">
              {error === "empty"
                ? "Je n'ai rien pu extraire — reformule en une ou deux phrases concrètes."
                : "Le service IA n'a pas répondu. Réessaie dans un instant."}
            </p>
          )}
          <textarea
            name="text"
            required
            rows={5}
            maxLength={3000}
            placeholder="Ex. 45 francs de parking, appeler Paul demain, idée de club de course, stressé par le loyer du bureau, et j'ai fait mon BJJ."
            className="w-full mxp-input px-4 py-3 text-sm"
          />
          <button className="w-full mxp-btn px-4 py-3 text-sm">Trier tout ça</button>
        </form>
      )}
    </main>
  );
}
