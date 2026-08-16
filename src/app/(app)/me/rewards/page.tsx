import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { archiveReward, createReward, redeemReward } from "./actions";

export default async function RewardsPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const [rewards, totals] = await Promise.all([
    prisma.mxReward.findMany({
      where: { userId: user.id, active: true },
      orderBy: { costCoins: "asc" },
    }),
    xpTotals(user.id),
  ]);

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/me" className="text-xs text-mxp-muted">← Moi</Link>
      <h1 className="mt-2 text-xl font-semibold">Récompenses</h1>
      <p className="text-sm text-mxp-muted">
        Définis de vraies récompenses et achète-les avec les pièces gagnées par tes
        actions. L&apos;XP, les rangs et les titres ne s&apos;achètent jamais.
      </p>

      <section className="mt-4 flex items-center justify-between mxp-card mxp-goldc px-5 py-3">
        <span className="text-sm text-mxp-muted">Mes pièces</span>
        <span className="text-lg font-bold tabular-nums text-mxp-gold">🪙 {totals.coins}</span>
      </section>

      {rewards.length === 0 && (
        <section className="mt-4 mxp-card p-4 text-sm text-mxp-muted">
          Aucune récompense définie. Exemple : « Nouvelles chaussures de course » pour 600
          pièces — environ 30 séances d&apos;entraînement tenues.
        </section>
      )}

      <ul className="mt-4 space-y-3">
        {rewards.map((r) => {
          const affordable = totals.coins >= r.costCoins;
          return (
            <li key={r.id} className="mxp-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-mxp-muted tabular-nums">
                    🪙 {r.costCoins}
                    {r.redeemedCount > 0 && ` · débloquée ${r.redeemedCount}×`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <form action={redeemReward}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      disabled={!affordable}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        affordable
                          ? "bg-mxp-gold text-white hover:opacity-90"
                          : "cursor-not-allowed bg-mxp-bg text-mxp-muted"
                      }`}
                    >
                      {affordable ? "Débloquer" : `Encore ${r.costCoins - totals.coins}`}
                    </button>
                  </form>
                  <form action={archiveReward}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      title="Retirer"
                      className="mxp-btn-ghost px-2 py-1.5 text-xs text-mxp-muted hover:text-mxp-red"
                    >
                      ×
                    </button>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="mt-6 mxp-card p-4">
        <p className="mxp-label text-mxp-gold">
          Nouvelle récompense réelle
        </p>
        <form action={createReward} className="mt-3 space-y-3">
          <input
            type="text"
            name="title"
            required
            maxLength={300}
            placeholder="Ex. Soirée resto sans culpabilité"
            className="w-full mxp-input px-4 py-2.5 text-sm"
          />
          <input
            type="number"
            name="costCoins"
            required
            min={1}
            max={100000}
            placeholder="Prix en pièces (ex. 300)"
            className="w-full mxp-input px-4 py-2.5 text-sm"
          />
          <button className="w-full rounded-xl bg-mxp-gold px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            Ajouter
          </button>
        </form>
      </section>
    </main>
  );
}
