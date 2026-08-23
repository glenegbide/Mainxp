import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { levelProgress } from "@/lib/mainxp/xp/curve";
import { ATTRIBUTE_LABEL, dominantAttribute } from "@/lib/mainxp/xp/dominant";
import { earnedTitles, ROMAN } from "@/lib/mainxp/titles";
import { GEAR_CATALOG } from "@/lib/mainxp/gear";
import { BlockHero } from "../../components/BlockHero";
import { providerNameForKey } from "@/lib/mainxp/ai/provider";
import { IconCoin, IconLock } from "../../components/icons";
import { buyGear, logout, removeAiKey, saveAiKey, toggleGear, toggleRestMode } from "./actions";

// MOI — who you are BECOMING, then what you own, then where you're going.
// Settings are real but quiet: identity is the anchor, administration is not
// (SCREEN_PRIORITY_MATRIX: character stage → path/titles → relics → journey →
// quiet rows). Nothing here advertises an XP amount, ever.

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ ai?: string }>;
}) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const { ai } = await searchParams;
  const [totals, titles, gearOwned] = await Promise.all([
    xpTotals(user.id),
    earnedTitles(user.id),
    prisma.mxGearOwned.findMany({ where: { userId: user.id } }),
  ]);
  const lp = levelProgress(totals.main);
  const equipped = gearOwned.filter((g) => g.equipped).map((g) => g.gearId);
  const ownedIds = new Set(gearOwned.map((g) => g.gearId));
  const earned = titles.filter((t) => t.tier > 0);
  const dominant = dominantAttribute(totals.attributes);
  const nextTitle = titles.find((t) => t.next !== null);

  return (
    <main className="px-4 pt-5 pb-8">
      <h1 className="mxp-display">Moi</h1>
      <p className="mxp-meta mt-1">Qui tu deviens — construit par ce que tu fais.</p>

      {/* ── The character stage: the anchor. Everything on it was earned. ── */}
      <section className="mxp-stage mt-4">
        <div className="relative z-10 flex flex-col items-center px-5 pt-6 pb-5 text-center">
          <BlockHero level={lp.level} size={128} gear={equipped} dominant={dominant} />
          <p className="mt-3 font-displaymx text-[21px] leading-tight">{user.name}</p>
          <p className="mxp-meta mt-0.5">
            Niveau {lp.level} · Voie {ATTRIBUTE_LABEL[dominant]}
          </p>
          {earned.length > 0 && (
            <p className="mt-2 flex flex-wrap justify-center gap-1.5">
              {earned.map((t) => (
                <span key={t.def.id} className="mxp-relic">
                  {t.def.name} {ROMAN[t.tier]}
                </span>
              ))}
            </p>
          )}
          <div className="mt-4 w-full max-w-[260px]">
            <div className="mxp-rail">
              <i className="bg-mxp-purple" style={{ width: `${Math.max(2, Math.round(lp.ratio * 100))}%` }} />
            </div>
            <p className="mxp-meta mt-1.5 tabular-nums">
              {lp.intoLevel}/{lp.neededForNext} vers le niveau {lp.level + 1}
            </p>
          </div>
          {user.restMode && (
            <p className="mt-2 rounded-full bg-mxp-teal/10 px-3 py-1 text-[11px] font-semibold text-mxp-teal">
              Mode récupération — l&apos;Élan est en pause, pas toi
            </p>
          )}
        </div>
      </section>

      {/* What the next evolution asks for — stated as a deed, never a number. */}
      {nextTitle && (
        <p className="mxp-meta mt-3 px-1">
          Prochaine marche : <strong>{nextTitle.def.name}</strong>
          {nextTitle.tier > 0 && ` ${ROMAN[nextTitle.tier + 1]}`} — {nextTitle.def.metric} (
          {nextTitle.count}/{nextTitle.next}).
        </p>
      )}

      {/* ── Titles: they are earned, never chosen, never bought ── */}
      <section className="mxp-card mt-4 p-4">
        <p className="mxp-label text-mxp-purple">Titres — ils se gagnent</p>
        <ul className="mt-2 space-y-2.5">
          {titles.map((t) => (
            <li key={t.def.id}>
              <div className="flex items-baseline justify-between text-sm">
                <span className={t.tier > 0 ? "font-semibold" : "text-mxp-muted"}>
                  {t.tier > 0 ? `${t.def.name} ${ROMAN[t.tier]}` : t.def.name}
                  {t.tier === 0 && (
                    <IconLock className="ml-1 inline h-[13px] w-[13px] align-[-1px] text-mxp-muted/70" />
                  )}
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
          D&apos;autres archétypes arrivent avec le sport et la lecture. Certains titres
          secrets ne se révèlent qu&apos;une fois gagnés.
        </p>
      </section>

      {/* ── Gear: cosmetics bought with earned coins — the character wears them ── */}
      <section className="mxp-card mxp-goldc mt-4 p-4">
        <p className="mxp-label flex items-center gap-1.5 text-mxp-gold">
          Équipement ·
          <IconCoin className="h-[14px] w-[14px]" /> {totals.coins}
        </p>
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
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-mxp-bg">
                  <BlockHero level={lp.level} size={38} gear={[g.id]} dominant={dominant} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{g.name}</span>
                  <span className="block text-xs text-mxp-muted">
                    {owned ? (
                      g.description
                    ) : (
                      <>
                        <IconCoin className="mr-0.5 inline h-[12px] w-[12px] align-[-1.5px]" /> {g.costCoins}
                      </>
                    )}
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
                          ? "mxp-btn mxp-btn-gold"
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

      {/* ── The journey: where this character's story continues ── */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/me/identite" className="mxp-card p-4 text-sm font-semibold">
          Identité
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">
            l&apos;histoire, la preuve, l&apos;accord
          </span>
        </Link>
        <Link href="/progress" className="mxp-card p-4 text-sm font-semibold">
          Le chemin
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">
            ta semaine, tes preuves
          </span>
        </Link>
        <Link href="/me/north-star" className="mxp-card p-4 text-sm font-semibold">
          North Star
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">
            pourquoi, saison, règles
          </span>
        </Link>
        <Link href="/me/rewards" className="mxp-card p-4 text-sm font-semibold">
          Récompenses
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">
            vraies, payées en pièces
          </span>
        </Link>
        <Link href="/library" className="mxp-card p-4 text-sm font-semibold">
          Bibliothèque
          <span className="mt-0.5 block text-xs font-normal text-mxp-muted">
            livres, notes, leçons
          </span>
        </Link>
      </div>

      {/* ── Coach IA: the one setting that changes what the product can do ── */}
      <section id="coach-ia" className="mxp-card mt-4 p-4">
        <p className="mxp-label text-mxp-purple">Coach IA</p>
        {user.aiKey ? (
          <>
            <p className="mt-2 text-sm font-medium">
              ✓ Coach actif — {providerNameForKey(user.aiKey)}
            </p>
            <p className="mt-1 text-xs text-mxp-muted">
              Clé …{user.aiKey.slice(-4)} vérifiée et stockée côté serveur. Ta mémoire vit
              dans ta base de données — changer de clé ou de fournisseur ne perd rien.
            </p>
            {ai === "ok" && (
              <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-mxp-green">
                Clé testée et enregistrée — le coach est en ligne.
              </p>
            )}
            <form action={removeAiKey} className="mt-3">
              <button className="mxp-btn-ghost px-3 py-1.5 text-xs">Retirer la clé</button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-mxp-muted">
              Colle une clé Gemini (gratuite — aistudio.google.com) ou Claude
              (console.anthropic.com). Elle est testée en direct avant d&apos;être
              enregistrée, côté serveur uniquement — jamais visible dans l&apos;app.
            </p>
            {ai === "invalid" && (
              <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-mxp-red">
                Cette clé n&apos;a pas fonctionné chez le fournisseur — vérifie-la et
                réessaie.
              </p>
            )}
            <form action={saveAiKey} className="mt-3 flex gap-2">
              <input
                type="password"
                name="aiKey"
                required
                autoComplete="off"
                placeholder="AIza… / AQ.… / sk-ant-…"
                className="min-w-0 flex-1 mxp-input px-3 py-2.5 text-sm"
              />
              <button className="mxp-btn px-4 py-2.5 text-sm">Tester &amp; activer</button>
            </form>
          </>
        )}
      </section>

      {/* ── Quiet rows: real settings, deliberately unspectacular ── */}
      <section className="mxp-card mt-4 divide-y divide-mxp-line">
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Mode récupération</p>
            <p className="mt-0.5 text-xs text-mxp-muted">
              Maladie, vacances, semaine difficile : l&apos;Élan ne baisse pas pendant le
              repos.
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
        {(
          [
            ["/me/knowledge", "Connaissance", "ce que ton coach sait de toi"],
            ["/me/notifications", "Notifications", "quand MAINXP peut te parler"],
            ["/me/compte", "Compte", `${user.email} · mot de passe, appareils`],
          ] as const
        ).map(([href, label, sub]) => (
          <Link key={href} href={href} className="flex items-center justify-between gap-3 p-4">
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="mt-0.5 block text-xs text-mxp-muted">{sub}</span>
            </span>
            <span aria-hidden className="text-mxp-muted">
              →
            </span>
          </Link>
        ))}
      </section>

      <form action={logout} className="mt-6 mb-6">
        <button className="w-full mxp-btn-ghost px-4 py-3 text-sm text-mxp-red hover:bg-red-50">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
