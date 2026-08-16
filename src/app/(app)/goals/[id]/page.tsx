import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey, daysBetween } from "@/lib/mainxp/day";
import { goalPace, isGoalAtRisk } from "@/lib/mainxp/goals";
import { addGoalTask, completeGoal, logGoalProgress } from "../actions";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const goal = await prisma.mxGoal.findFirst({
    where: { id, userId: user.id },
    include: {
      projects: true,
      tasks: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!goal) notFound();

  const today = dayKey(new Date(), user.timezone);
  const pace =
    goal.targetValue && goal.deadline
      ? goalPace({
          targetValue: goal.targetValue,
          currentValue: goal.currentValue,
          createdAt: goal.createdAt,
          deadline: goal.deadline,
        })
      : null;
  const daysLeft = goal.deadline ? daysBetween(today, dayKey(goal.deadline, user.timezone)) : null;
  const atRisk = pace && daysLeft !== null && isGoalAtRisk(pace, daysLeft);

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/goals" className="text-xs text-mxp-muted">
        ← Objectifs
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{goal.title}</h1>
      {goal.why && <p className="mt-1 text-sm text-mxp-muted">Pourquoi : {goal.why}</p>}
      {goal.status === "COMPLETED" && (
        <p className="mt-2 inline-block rounded-full bg-mxp-green/15 px-3 py-1 text-xs font-semibold text-mxp-green">
          Objectif atteint ✅
        </p>
      )}

      {atRisk && (
        <section className="mt-4 rounded-2xl border border-mxp-orange/50 bg-mxp-card p-4 text-sm">
          <p className="font-semibold text-mxp-orange">Objectif à risque</p>
          <p className="mt-1 text-mxp-muted">
            En retard sur le rythme, avec {daysLeft} jour{daysLeft === 1 ? "" : "s"} restants.
            Rythme requis : {pace!.requiredWeeklyPace.toFixed(1)} {goal.unit ?? ""}/semaine.
          </p>
        </section>
      )}

      {pace && goal.status === "ACTIVE" && (
        <section className="mt-4 rounded-2xl border border-mxp-line bg-mxp-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-mxp-purple">Rythme</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-mxp-muted">Progression</dt>
            <dd className="text-right tabular-nums">
              {goal.currentValue}/{goal.targetValue} {goal.unit ?? ""}
            </dd>
            <dt className="text-mxp-muted">Rythme cible</dt>
            <dd className="text-right tabular-nums">{pace.targetPace.toFixed(1)}/sem</dd>
            <dt className="text-mxp-muted">Rythme réel</dt>
            <dd className="text-right tabular-nums">{pace.actualPace.toFixed(1)}/sem</dd>
            <dt className="text-mxp-muted">Requis désormais</dt>
            <dd className="text-right tabular-nums">{pace.requiredWeeklyPace.toFixed(1)}/sem</dd>
            <dt className="text-mxp-muted">Projection</dt>
            <dd className="text-right tabular-nums">
              {pace.projection.toFixed(0)} {goal.unit ?? ""}
            </dd>
            {daysLeft !== null && (
              <>
                <dt className="text-mxp-muted">Échéance</dt>
                <dd className="text-right tabular-nums">dans {daysLeft} j</dd>
              </>
            )}
          </dl>
          <form action={logGoalProgress} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={goal.id} />
            <input
              type="number"
              name="value"
              step="any"
              required
              placeholder={`+ progression (${goal.unit ?? "unités"})`}
              className="min-w-0 flex-1 rounded-lg border border-mxp-line px-3 py-2 text-sm outline-none focus:border-mxp-purple"
            />
            <button className="rounded-lg bg-mxp-purple px-3 py-2 text-xs font-semibold text-white hover:bg-mxp-purple-deep">
              Ajouter
            </button>
          </form>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-mxp-line bg-mxp-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mxp-orange">Projets moteurs</p>
        {goal.projects.length === 0 ? (
          <p className="mt-2 text-sm text-mxp-muted">
            Aucun projet ne pousse cet objectif. Un objectif sans moteur reste un vœu —
            crée le premier dans l&apos;onglet Projets.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {goal.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="text-sm text-mxp-purple">
                  {p.title} — {p.progress}%
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-mxp-line bg-mxp-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mxp-blue">
          Actions liées (10 dernières)
        </p>
        {goal.tasks.length === 0 ? (
          <p className="mt-2 text-sm text-mxp-muted">Aucune action encore.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {goal.tasks.map((t) => (
              <li key={t.id} className={t.status === "DONE" ? "text-mxp-muted line-through" : ""}>
                {t.title}
              </li>
            ))}
          </ul>
        )}
        {goal.status === "ACTIVE" && (
          <form action={addGoalTask} className="mt-3 flex gap-2">
            <input type="hidden" name="goalId" value={goal.id} />
            <input
              type="text"
              name="title"
              required
              maxLength={300}
              placeholder="Mission d'aujourd'hui pour cet objectif…"
              className="min-w-0 flex-1 rounded-lg border border-mxp-line px-3 py-2 text-sm outline-none focus:border-mxp-blue"
            />
            <button className="rounded-lg border border-mxp-line px-3 py-2 text-xs font-semibold hover:bg-mxp-bg">
              +
            </button>
          </form>
        )}
      </section>

      {goal.reward && (
        <section className="mt-4 rounded-2xl border border-mxp-gold/40 bg-mxp-card p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-mxp-gold">Récompense réelle</p>
          <p className="mt-1">{goal.reward}</p>
        </section>
      )}

      {goal.status === "ACTIVE" && (
        <form action={completeGoal} className="mt-5">
          <input type="hidden" name="id" value={goal.id} />
          <button className="w-full rounded-xl border border-mxp-green bg-mxp-card px-4 py-3 text-sm font-semibold text-mxp-green hover:bg-mxp-green hover:text-white">
            Objectif atteint · +150 XP · +100 pièces
          </button>
        </form>
      )}
    </main>
  );
}
