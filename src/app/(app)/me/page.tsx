import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { levelProgress } from "@/lib/mainxp/xp/curve";
import { earnedTitles, ROMAN } from "@/lib/mainxp/titles";
import { GEAR_CATALOG } from "@/lib/mainxp/gear";
import { PixelHero } from "../../components/PixelHero";
import { buyGear, logout, toggleGear, toggleRestMode } from "./actions";

export default async function MePage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const [totals, titles, gearOwned] = await Promise.all([
    xpTotals(user.id),
    earnedTitles(user.id),
    prisma.mxGearOwned.findMany({ where: { userId: user.id } }),
  ]);
  const lp = levelProgress(totals.main);
  const equipped = gearOwned.filter((g) => g.equipped).map((g) => g.gearId);
  const ownedIds = new Set(gearOwned.map((g) => g.gearId));
  const earned = titles.filter((t) => t.tier > 0);

  return (
    <main className="px-4 pt-5 pb-8">
      <h1 className="text-xl font-semibold">Moi</h1>

      <section className="mxp-hero mt-4 p-5 text-white">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-[86px] w-20 flex-none items-end justify-center rounded-2xl bg-white/12 pb-1 ring-1 ring-white/25">
            <PixelHero level={lp.level} size={60} gear={equipped} />
          </div>
          <div className="min-w-0">
            <p className="font-displaymx text-xl font-bold">{user.name}</p>
            {earned.length > 0 && (
              <p className="mt-0.5 text-xs font-semibold text-amber-200">
                {earned.map((t) => `${t.def.name} ${ROMAN[t.tier]}`).join(" · ")}
              </p>
            )}
            <p className="mt-0.5 text-sm text-white/85">
              Niveau {lp.level} · {totals.main === 0 ? "Novice" : `${totals.main} XP`} · 🪙{" "}
              {totals.coins}
            </p>
            {user.restMode && (
              <p className="mt-1 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
                🌙 Mode récupération
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Earned titles (never chosen, never bought) ── */}
      <section className="mxp-card mt-4 p-4">
        <p className="mxp-label text-mxp-purple">Titres — ils se gagnent</p>
        <ul className="mt-2 space-y-2.5">
          {titles.map((t) => (
            <li key={t.def.id}>
              <div className="flex items-baseline justify-between text-sm">
                <span className={t.tier > 0 ? "font-semibold" : "text-mxp-muted"}>
                  {t.tier > 0 ? `${t.def.name} ${ROMAN[t.tier]}` : t.def.name}
                  {t.tier === 0 && " 🔒"}
                </span>
                <span className="text-xs tabular-nums text-mxp-muted">
                  {t.count}
                  {t.next !== null && `/${t.next}`}
                </span>
              </div>
              <p className="text-xs text-mxp-muted">{t.def.metric}</p>
              {t.next !== null && (
                <div className="mxp-rail mt-1">
                  <div
                    className="h-full rounded-full bg-mxp-purple"
                    style={{ width: `${Math.min(100, Math.round((t.count / t.next) * 100))}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-mxp-muted">
          D&apos;autres archétypes (Le Titan, Le Sage…) arrivent avec le sport et la lecture.
          Certains titres secrets ne se révèlent qu&apos;une fois gagnés.
        </p>
      </section>

      {/* ── Gear shop: cosmetics only, bought with earned Coins ── */}
      <section className="mxp-card mxp-goldc mt-4 p-4">
        <p className="mxp-label text-mxp-gold">Équipement · 🪙 {totals.coins}</p>
        <p className="mt-1 text-xs text-mxp-muted">
          Cosmétique uniquement — l&apos;XP, les niveaux et les titres ne s&apos;achètent
          jamais.
        </p>
        <ul className="mt-3 space-y-2.5">
          {GEAR_CATALOG.map((g) => {
            const owned = ownedIds.has(g.id);
            const isEquipped = equipped.includes(g.id);
            const affordable = totals.coins >= g.costCoins;
            return (
              <li key={g.id} className="flex items-center gap-3">
                <span className="flex h-11 w-10 flex-none items-end justify-center rounded-xl bg-mxp-bg pb-0.5">
                  <PixelHero level={lp.level} size={30} gear={[g.id]} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{g.name}</span>
                  <span className="block text-xs text-mxp-muted">
                    {owned ? g.description : `🪙 ${g.costCoins}`}
                  </span>
                </span>
                {owned ? (
                  <form action={toggleGear}>
                    <input type="hidden" name="gearId" value={g.id} />
                    <button className="mxp-btn-ghost px-3 py-1.5 text-xs">
                      {isEquipped ? "Retirer" : "Porter"}
                    </button>
                  </form>
                ) : (
                  <form action={buyGear}>
                    <input type="hidden" name="gearId" value={g.id} />
                    <button
                      disabled={!affordable}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        affordable
                          ? "bg-mxp-gold text-white hover:opacity-90"
                          : "cursor-not-allowed bg-mxp-bg text-mxp-muted"
                      }`}
                    >
                      {affordable ? "Acheter" : `Encore ${g.costCoins - totals.coins}`}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Recovery mode ── */}
      <section className="mxp-card mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Mode récupération</p>
            <p className="mt-0.5 text-xs text-mxp-muted">
              Maladie, vacances, semaine difficile : ton Élan ne baisse pas pendant le
              repos. Récupérer fait partie du jeu.
            </p>
          </div>
          <form action={toggleRestMode}>
            <button
              aria-pressed={user.restMode}
              aria-label="Basculer le mode récupération"
              className={`h-8 w-14 flex-none rounded-full p-1 transition ${
                user.restMode ? "bg-mxp-teal" : "bg-mxp-line"
              }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  user.restMode ? "translate-x-6" : ""
                }`}
              />
            </button>
          </form>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/me/north-star" className="mxp-card p-4 text-sm font-semibold">
          🧭 North Star
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">
            pourquoi, saison, règles
          </span>
        </Link>
        <Link href="/me/rewards" className="mxp-card p-4 text-sm font-semibold">
          🪙 Récompenses
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">
            vraies, payées en pièces
          </span>
        </Link>
      </div>

      <section className="mxp-card mt-4 p-4 text-sm">
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-mxp-muted">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mxp-muted">Fuseau horaire</dt>
            <dd>{user.timezone}</dd>
          </div>
        </dl>
      </section>

      <form action={logout} className="mt-6 mb-6">
        <button className="w-full mxp-btn-ghost px-4 py-3 text-sm text-mxp-red hover:bg-red-50">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
