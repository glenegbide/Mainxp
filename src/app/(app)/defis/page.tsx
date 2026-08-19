import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/mainxp/day";
import { STARTER_CHALLENGES } from "@/lib/mainxp/challenges";
import {
  abandonChallenge,
  acceptProposedChallenge,
  acceptStarterChallenge,
  declineChallenge,
  tickChallengeToday,
} from "../today/challenge-actions";

// Les défis vivent ici — pas sur Aujourd'hui, qui appartient à la quête du
// jour. Un défi actif remonte sur Aujourd'hui en une ligne ; le catalogue et
// les propositions du coach s'acceptent depuis cette page.
export default async function DefisPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);

  const [challenges, todayLogs] = await Promise.all([
    prisma.mxChallenge.findMany({
      where: { userId: user.id },
      include: { logs: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.mxChallengeLog.findMany({ where: { userId: user.id, dayKey: today } }),
  ]);
  const ticked = new Set(todayLogs.map((l) => l.challengeId));
  const proposed = challenges.filter((c) => c.status === "proposed");
  const active = challenges.filter((c) => c.status === "active");
  const done = challenges.filter((c) => c.status === "completed");
  const alive = proposed.length + active.length;

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="mxp-meta">← Aujourd&apos;hui</Link>
      <h1 className="mt-3 mxp-display">Défis</h1>
      <p className="mxp-meta mt-1">
        Des engagements courts, choisis. Tu acceptes — ou pas. Trois au maximum en même
        temps.
      </p>

      {/* Propositions du coach — l'ancre de cette page quand il y en a */}
      {proposed.map((c) => (
        <section key={c.id} className="mt-5 mxp-anchor">
          <p className="mxp-label text-mxp-purple">Le coach te propose</p>
          <p className="mt-2 mxp-title">
            {user.name}, tu acceptes ? {c.title}
          </p>
          {c.description && <p className="mt-2 mxp-body text-mxp-muted">{c.description}</p>}
          <p className="mxp-meta mt-2">
            {c.targetCount} {c.unitLabel} · {c.durationDays} jours
          </p>
          <form action={acceptProposedChallenge} className="mt-5">
            <input type="hidden" name="id" value={c.id} />
            <button className="mxp-btn w-full py-3.5 text-[15px]">J&apos;accepte</button>
          </form>
          <form action={declineChallenge} className="mt-2">
            <input type="hidden" name="id" value={c.id} />
            <button className="mxp-quiet">Pas maintenant</button>
          </form>
        </section>
      ))}

      {/* En cours */}
      {active.length > 0 && (
        <section className="mt-6">
          <p className="mxp-label text-mxp-muted">En cours</p>
          <ul className="mt-3 space-y-4">
            {active.map((c) => {
              const ticks = c.logs.length;
              const ratio = Math.min(100, Math.round((ticks / c.targetCount) * 100));
              const isTicked = ticked.has(c.id);
              return (
                <li key={c.id} className="mxp-card p-4">
                  <p className="mxp-body font-semibold">{c.title}</p>
                  <div className="mxp-rail mt-2.5">
                    <i className="bg-mxp-purple" style={{ width: `${ratio}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="mxp-meta tabular-nums">
                      {ticks}/{c.targetCount} {c.unitLabel}
                    </span>
                    <form action={tickChallengeToday}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        disabled={isTicked}
                        className={
                          isTicked
                            ? "mxp-btn-ghost px-4 text-xs text-mxp-muted"
                            : "mxp-btn px-5 text-xs"
                        }
                      >
                        {isTicked ? "Fait aujourd'hui" : "Marquer aujourd'hui"}
                      </button>
                    </form>
                  </div>
                  <form action={abandonChallenge} className="mt-1">
                    <input type="hidden" name="id" value={c.id} />
                    <button className="mxp-quiet">Arrêter ce défi (sans honte)</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Catalogue — seulement s'il reste de la place */}
      {alive < 3 && (
        <section className="mt-7">
          <p className="mxp-label text-mxp-muted">À relever</p>
          <ul className="mt-3 divide-y divide-mxp-line">
            {STARTER_CHALLENGES.map((sc) => (
              <li key={sc.key} className="flex items-center gap-3 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="mxp-body font-medium">{sc.title}</p>
                  <p className="mxp-meta">{sc.description}</p>
                </div>
                <form action={acceptStarterChallenge}>
                  <input type="hidden" name="key" value={sc.key} />
                  <button className="mxp-btn-ghost shrink-0 px-4 text-xs">
                    J&apos;accepte
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mxp-meta mt-3">
            Ton coach peut aussi t&apos;en proposer un sur mesure — demande-lui.
          </p>
        </section>
      )}

      {done.length > 0 && (
        <section className="mt-7">
          <p className="mxp-label text-mxp-gold">Relevés · {done.length}</p>
          <ul className="mt-2 divide-y divide-mxp-line">
            {done.map((c) => (
              <li key={c.id} className="py-2.5 mxp-body">
                {c.title}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
