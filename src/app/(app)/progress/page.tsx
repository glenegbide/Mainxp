import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { levelProgress } from "@/lib/mainxp/xp/curve";

const ATTRIBUTES: Array<{ key: string; label: string; color: string }> = [
  { key: "STRENGTH", label: "Force", color: "bg-mxp-green" },
  { key: "ENDURANCE", label: "Endurance", color: "bg-mxp-green" },
  { key: "FOCUS", label: "Focus", color: "bg-mxp-blue" },
  { key: "DISCIPLINE", label: "Discipline", color: "bg-mxp-purple" },
  { key: "KNOWLEDGE", label: "Connaissance", color: "bg-mxp-blue" },
  { key: "STRATEGY", label: "Stratégie", color: "bg-mxp-orange" },
  { key: "WEALTH", label: "Richesse", color: "bg-mxp-gold" },
  { key: "MIND", label: "Esprit", color: "bg-mxp-teal" },
  { key: "SOCIAL", label: "Social", color: "bg-mxp-coral" },
];

export default async function ProgressPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");

  const [totals, recent] = await Promise.all([
    xpTotals(user.id),
    prisma.mxXpTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const lp = levelProgress(totals.main);
  const maxAttr = Math.max(1, ...Object.values(totals.attributes));

  return (
    <main className="px-4 pt-5">
      <h1 className="text-xl font-semibold">Progression</h1>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/goals"
          className="mxp-card p-4 text-sm font-semibold transition hover:border-mxp-purple/50"
        >
          🎯 Objectifs
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">rythme &amp; échéances</span>
        </Link>
        <Link
          href="/projects"
          className="mxp-card p-4 text-sm font-semibold transition hover:border-mxp-orange/50"
        >
          🛠 Projets
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">jalons &amp; moteurs</span>
        </Link>
      </div>

      <section className="mt-4 mxp-card p-4">
        <p className="text-sm text-mxp-muted">MAINXP total</p>
        <p className="mt-1 text-3xl font-bold text-mxp-purple tabular-nums">
          {totals.main}
          <span className="ml-3 align-middle text-base font-semibold text-mxp-gold">🪙 {totals.coins}</span>
        </p>
        <p className="mt-1 text-sm text-mxp-muted">
          Niveau {lp.level} · {lp.intoLevel}/{lp.neededForNext} vers le niveau {lp.level + 1}
        </p>
        <div className="mt-2 mxp-rail">
          <div
            className="h-full rounded-full bg-mxp-purple"
            style={{ width: `${Math.round(lp.ratio * 100)}%` }}
          />
        </div>
      </section>

      <section className="mt-4 mxp-card p-4">
        <p className="mxp-label text-mxp-muted">Attributs</p>
        <ul className="mt-3 space-y-3">
          {ATTRIBUTES.map((attr) => {
            const value = totals.attributes[attr.key as keyof typeof totals.attributes] ?? 0;
            return (
              <li key={attr.key}>
                <div className="flex justify-between text-sm">
                  <span>{attr.label}</span>
                  <span className="tabular-nums text-mxp-muted">{value} XP</span>
                </div>
                <div className="mt-1 mxp-rail">
                  <div
                    className={`h-full rounded-full ${attr.color}`}
                    style={{ width: `${Math.round((value / maxAttr) * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-4 mb-6 mxp-card p-4">
        <p className="mxp-label text-mxp-muted">
          Registre XP (auditable)
        </p>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-mxp-muted">
            Aucune transaction. Tout le monde commence à zéro — chaque action réelle
            s&apos;inscrira ici.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-mxp-line">
            {recent.map((tx) => (
              <li key={tx.id} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{tx.reason}</span>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    tx.mainDelta >= 0 ? "text-mxp-green" : "text-mxp-red"
                  }`}
                >
                  {tx.mainDelta >= 0 ? "+" : ""}
                  {tx.mainDelta}
                </span>
              </li>
            ))}
          </ul>
        )}

      </section>
    </main>
  );
}
