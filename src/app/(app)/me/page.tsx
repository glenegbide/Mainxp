import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { levelProgress } from "@/lib/mainxp/xp/curve";
import { PixelHero } from "../../components/PixelHero";
import { logout } from "./actions";

export default async function MePage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const totals = await xpTotals(user.id);
  const lp = levelProgress(totals.main);

  return (
    <main className="px-4 pt-5">
      <h1 className="text-xl font-semibold">Moi</h1>

      <section className="mxp-hero mt-4 p-5 text-white">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-[86px] w-20 flex-none items-end justify-center rounded-2xl bg-white/12 pb-1 ring-1 ring-white/25">
            <PixelHero level={lp.level} size={60} />
          </div>
          <div className="min-w-0">
            <p className="font-displaymx text-xl font-bold">{user.name}</p>
            <p className="mt-0.5 text-sm text-white/85">
              Niveau {lp.level} · {totals.main === 0 ? "Novice" : `${totals.main} XP`} · 🪙{" "}
              {totals.coins}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">
              Ton personnage évolue avec tes actions réelles — bandeau d&apos;or au niveau
              10, cape au niveau 25, suites aux niveaux 50, 75 et 100.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 mxp-card p-4 text-sm">
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-mxp-muted">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mxp-muted">Fuseau horaire</dt>
            <dd>{user.timezone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mxp-muted">Titres & archétypes</dt>
            <dd className="text-mxp-muted">Aucun — ils se gagnent (Phase 2)</dd>
          </div>
        </dl>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/me/north-star"
          className="mxp-card p-4 text-sm font-semibold transition hover:border-mxp-purple/50"
        >
          🧭 North Star
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">pourquoi, saison, règles</span>
        </Link>
        <Link
          href="/me/rewards"
          className="mxp-card p-4 text-sm font-semibold transition hover:border-mxp-gold/60"
        >
          🪙 Récompenses
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">vraies, payées en pièces</span>
        </Link>
      </div>

      <section className="mt-4 mxp-card p-4 text-sm text-mxp-muted">
        Mémoire de l&apos;IA, préférences de notifications et export des données arrivent
        dans les prochaines itérations (voir docs/ROADMAP.md).
      </section>

      <form action={logout} className="mt-6 mb-6">
        <button className="w-full mxp-btn-ghost px-4 py-3 text-sm text-mxp-red hover:bg-red-50">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
