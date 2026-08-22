import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { levelProgress } from "@/lib/mainxp/xp/curve";
import { birdsEyeView } from "@/lib/mainxp/insight";
import { IconGem } from "../../components/icons";

// PROGRESSION — one question, answered in two seconds:
// "Am I actually moving, and who am I becoming?"
// Not a dashboard: one anchor (the week's real movement), then the character
// forming, then the audit trail folded away.

const ATTRIBUTES: Array<{ key: string; label: string; color: string; path: string }> = [
  { key: "STRENGTH", label: "Force", color: "bg-mxp-green", path: "celui qui construit son corps" },
  { key: "ENDURANCE", label: "Endurance", color: "bg-mxp-green", path: "celui qui tient la distance" },
  { key: "FOCUS", label: "Focus", color: "bg-mxp-blue", path: "celui qui va au fond des choses" },
  { key: "DISCIPLINE", label: "Discipline", color: "bg-mxp-purple", path: "celui qui tient parole" },
  { key: "KNOWLEDGE", label: "Connaissance", color: "bg-mxp-blue", path: "celui qui apprend sans arrêt" },
  { key: "STRATEGY", label: "Stratégie", color: "bg-mxp-orange", path: "celui qui joue les bons coups" },
  { key: "WEALTH", label: "Richesse", color: "bg-mxp-gold", path: "celui qui bâtit sa liberté" },
  { key: "MIND", label: "Esprit", color: "bg-mxp-teal", path: "celui qui garde la tête claire" },
  { key: "SOCIAL", label: "Social", color: "bg-mxp-coral", path: "celui qui compte pour les siens" },
];

const DAY_INITIALS = ["D", "L", "M", "M", "J", "V", "S"];

export default async function ProgressPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");

  const [totals, recent, view] = await Promise.all([
    xpTotals(user.id),
    prisma.mxXpTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    birdsEyeView(user),
  ]);
  const lp = levelProgress(totals.main);

  const week = view.trend.thisWeekXp;
  const peak = Math.max(1, ...view.last7.map((d) => d.xp));
  const activeDays = view.last7.filter((d) => d.xp > 0).length;

  // The week in one honest sentence — numbers, never judgment.
  const story =
    view.trend.verdict === "new"
      ? `Première semaine : ${week} MAINXP sur ${activeDays} jour${activeDays > 1 ? "s" : ""} d'action.`
      : view.trend.verdict === "up"
        ? `${week} MAINXP cette semaine — ${Math.round((view.trend.delta ?? 0) * 100)} % de plus que la semaine dernière.`
        : view.trend.verdict === "down"
          ? `${week} MAINXP cette semaine, contre ${view.trend.lastWeekXp} la semaine dernière.`
          : `${week} MAINXP cette semaine — un rythme stable.`;

  const earned = ATTRIBUTES.map((a) => ({
    ...a,
    value: totals.attributes[a.key as keyof typeof totals.attributes] ?? 0,
  }))
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);
  const dominant = earned[0];
  const maxAttr = Math.max(1, ...earned.map((a) => a.value));

  return (
    <main className="px-4 pt-5 pb-8">
      <h1 className="mxp-display">Progression</h1>
      <p className="mxp-meta mt-1">Ce que tes actions réelles ont construit.</p>

      {/* ── THE ANCHOR: the week's real movement ── */}
      <section className="mt-5 mxp-anchor">
        <p className="mxp-label text-mxp-purple">Ces 7 jours</p>
        <p className="mt-2 mxp-title">{story}</p>

        <div className="mt-5 flex items-end justify-between gap-1.5" aria-hidden>
          {view.last7.map((d) => {
            const h = d.xp === 0 ? 4 : Math.max(8, Math.round((d.xp / peak) * 76));
            const weekday = new Date(`${d.day}T12:00:00Z`).getUTCDay();
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={`w-full rounded-md transition-all duration-500 ${
                    d.xp > 0 ? "bg-mxp-purple" : "bg-mxp-line"
                  }`}
                  style={{ height: `${h}px` }}
                />
                <span className="text-[10px] font-semibold text-mxp-muted">
                  {DAY_INITIALS[weekday]}
                </span>
              </div>
            );
          })}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-mxp-line pt-4">
          <div>
            <dt className="mxp-meta">Main Quest</dt>
            <dd className="font-displaymx text-[19px] tabular-nums">{view.mainQuestDays7}/7</dd>
          </div>
          <div>
            <dt className="mxp-meta">Engagements</dt>
            <dd className="font-displaymx text-[19px] tabular-nums">
              {view.nnKeepRate7 === null ? "—" : `${view.nnKeepRate7} %`}
            </dd>
          </div>
          <div>
            <dt className="mxp-meta">Focus</dt>
            <dd className="font-displaymx text-[19px] tabular-nums">
              {Math.round(view.focusMin7 / 6) / 10} h
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Who you are becoming ── */}
      <section className="mt-6">
        <p className="mxp-label text-mxp-muted">Ton personnage</p>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-displaymx text-[26px] leading-none tabular-nums">
            Niv. {lp.level}
          </span>
          <span className="mxp-meta tabular-nums">
            {lp.intoLevel}/{lp.neededForNext} vers le niveau {lp.level + 1}
          </span>
        </div>
        <div className="mxp-rail mt-2.5">
          <i className="bg-mxp-purple" style={{ width: `${Math.round(lp.ratio * 100)}%` }} />
        </div>

        {dominant ? (
          <>
            <p className="mxp-body mt-4">
              Ta voie dominante : <strong>{dominant.label}</strong> — {dominant.path}.
            </p>
            <ul className="mt-4 space-y-3">
              {earned.map((attr) => (
                <li key={attr.key}>
                  <div className="flex justify-between mxp-meta">
                    <span className="text-mxp-ink">{attr.label}</span>
                    <span className="tabular-nums">{attr.value}</span>
                  </div>
                  <div className="mxp-rail mt-1">
                    <i
                      className={attr.color}
                      style={{ width: `${Math.round((attr.value / maxAttr) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mxp-body mt-4 text-mxp-muted">
            Aucun attribut nourri pour l&apos;instant. Tes actions choisiront ta voie —
            personne ne la sélectionne.
          </p>
        )}
      </section>

      {/* ── Where the details live (quiet, never competing) ── */}
      <nav className="mt-6 divide-y divide-mxp-line border-y border-mxp-line">
        {[
          ["/progress/week", "Revue hebdomadaire", "la semaine en chiffres, 3 questions"],
          ["/goals", "Objectifs", "rythme et échéances"],
          ["/projects", "Projets", "jalons et moteurs"],
        ].map(([href, title, sub]) => (
          <Link key={href} href={href} className="flex items-center justify-between gap-3 py-3.5">
            <span>
              <span className="mxp-body font-medium">{title}</span>
              <span className="mxp-meta block">{sub}</span>
            </span>
            <span aria-hidden className="mxp-meta">→</span>
          </Link>
        ))}
      </nav>

      {/* ── The audit trail: available, never the headline ── */}
      <details className="mt-6">
        <summary className="mxp-quiet cursor-pointer list-none">
          Registre XP — chaque point, sa raison
        </summary>
        {recent.length === 0 ? (
          <p className="mxp-meta mt-3">
            Tout le monde commence à zéro — chaque action réelle s&apos;inscrira ici.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-mxp-line">
            {recent.map((tx) => (
              <li key={tx.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="min-w-0 flex-1 mxp-meta text-mxp-ink">{tx.reason}</span>
                <span
                  className={`shrink-0 text-[13px] font-semibold tabular-nums ${
                    tx.mainDelta >= 0 ? "text-mxp-green" : "text-mxp-muted"
                  }`}
                >
                  {tx.mainDelta >= 0 ? "+" : ""}
                  {tx.mainDelta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>

      <p className="mxp-meta mt-6 flex items-center justify-center gap-2">
        <IconGem className="h-4 w-4 text-mxp-gold" />
        {totals.coins} pièces gagnées
      </p>
    </main>
  );
}
