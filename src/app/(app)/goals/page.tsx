import Link from "next/link";
import { IconCheck } from "../../components/icons";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey, daysBetween } from "@/lib/mainxp/day";
import { goalPace, missionHealth, type MissionStatus } from "@/lib/mainxp/goals";
import { LIFE_AREAS } from "@/lib/mainxp/attributes";
import { addNotNow, closeSeason, createGoal, createSeason, dropNotNow, promoteNotNow } from "./actions";

// DIRECTION — where am I going? One Season (the period's single cap), the
// goals that serve it, and «Pas maintenant» so new ideas stop costing the
// current priority anything.

const HEALTH: Record<MissionStatus, { label: string; cls: string }> = {
  on_track: { label: "En mouvement", cls: "bg-mxp-green/15 text-mxp-green" },
  at_risk: { label: "À risque", cls: "bg-mxp-orange/15 text-mxp-orange" },
  stalled: { label: "À l'arrêt", cls: "bg-mxp-red/10 text-mxp-red" },
};

export default async function GoalsPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const now = new Date();
  const today = dayKey(now, user.timezone);

  const [goals, season, notNow, lastTaskByGoal, lastFocusByGoal] = await Promise.all([
    prisma.mxGoal.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.mxSeason.findFirst({ where: { userId: user.id, status: "active" } }),
    prisma.mxNotNow.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.mxTask.groupBy({
      by: ["goalId"],
      where: { userId: user.id, status: "DONE", goalId: { not: null } },
      _max: { completedAt: true },
    }),
    prisma.mxFocusSession.groupBy({
      by: ["goalId"],
      where: { userId: user.id, endedAt: { not: null }, goalId: { not: null } },
      _max: { startedAt: true },
    }),
  ]);
  const active = goals.filter((g) => g.status === "ACTIVE");
  const done = goals.filter((g) => g.status === "COMPLETED");
  const primaryGoal = season?.primaryGoalId
    ? goals.find((g) => g.id === season.primaryGoalId)
    : undefined;

  const lastAction = new Map<string, number>();
  for (const r of lastTaskByGoal) {
    if (r.goalId && r._max.completedAt) lastAction.set(r.goalId, r._max.completedAt.getTime());
  }
  for (const r of lastFocusByGoal) {
    if (r.goalId && r._max.startedAt) {
      lastAction.set(r.goalId, Math.max(lastAction.get(r.goalId) ?? 0, r._max.startedAt.getTime()));
    }
  }

  const seasonDaysLeft = season ? daysBetween(today, season.endDay) : null;

  return (
    <main className="px-4 pt-5 pb-8">
      <h1 className="mxp-display">Direction</h1>
      <p className="mxp-meta mt-1">Une saison, un cap. Le reste attend son heure.</p>

      {/* ── THE SEASON — the anchor of this screen ── */}
      {season ? (
        <section className="mt-5 mxp-anchor">
          <p className="mxp-label text-mxp-purple">La saison</p>
          <p className="mt-2 font-displaymx text-[21px] leading-snug">{season.title}</p>
          <p className="mxp-meta mt-1 tabular-nums">
            {seasonDaysLeft !== null && seasonDaysLeft >= 0
              ? `${seasonDaysLeft} jour${seasonDaysLeft > 1 ? "s" : ""} restants`
              : "échéance passée — clos-la et regarde ce qu'elle a produit"}
            {primaryGoal && (
              <>
                {" · optimise pour "}
                <Link href={`/goals/${primaryGoal.id}`} className="font-medium text-mxp-purple">
                  {primaryGoal.title}
                </Link>
              </>
            )}
          </p>
          {season.supportNote && (
            <p className="mxp-meta mt-1.5">Reste vivant à côté : {season.supportNote}</p>
          )}
          <form action={closeSeason} className="mt-3">
            <input type="hidden" name="id" value={season.id} />
            <button className="mxp-btn-ghost px-3 py-1.5 text-xs">Clore la saison</button>
          </form>
        </section>
      ) : (
        <section className="mt-5 mxp-anchor">
          <p className="mxp-label text-mxp-purple">Ouvre une saison</p>
          <p className="mxp-meta mt-1.5">
            La question des 90 prochains jours : ils servent quoi ?
          </p>
          <form action={createSeason} className="mt-3 space-y-2.5">
            <input
              type="text"
              name="seasonTitle"
              required
              maxLength={120}
              placeholder="Ex. Revenus & Structure"
              className="mxp-input w-full px-4 py-2.5 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-mxp-muted">
                Jusqu&apos;au
                <input
                  type="date"
                  name="endDay"
                  required
                  className="mt-1 w-full mxp-input px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-xs text-mxp-muted">
                Optimise pour
                <select name="primaryGoalId" className="mt-1 w-full mxp-input px-2 py-2.5 text-sm">
                  <option value="">— à définir —</option>
                  {active.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <input
              type="text"
              name="supportNote"
              maxLength={300}
              placeholder="Ce qui reste vivant à côté (BJJ, famille…)"
              className="mxp-input w-full px-4 py-2.5 text-sm"
            />
            <button className="mxp-btn w-full py-2.5 text-sm">Ouvrir la saison</button>
          </form>
        </section>
      )}

      {/* ── The goals, each with its honest health ── */}
      <section className="mt-6 border-t border-mxp-line pt-4">
        <p className="mxp-label text-mxp-blue">Objectifs</p>
        {active.length === 0 && (
          <p className="mxp-meta mt-2">
            Aucun objectif actif — définis le premier plus bas.
          </p>
        )}
        <ul className="mt-2 space-y-3">
          {active.map((g) => {
            const pace =
              g.targetValue && g.deadline
                ? goalPace({
                    targetValue: g.targetValue,
                    currentValue: g.currentValue,
                    createdAt: g.createdAt,
                    deadline: g.deadline,
                  })
                : null;
            const last = lastAction.get(g.id);
            const health = missionHealth({
              paceVerdict: pace?.verdict ?? null,
              daysSinceAction: last ? Math.floor((now.getTime() - last) / 86_400_000) : null,
              ageDays: Math.floor((now.getTime() - g.createdAt.getTime()) / 86_400_000),
            });
            const ratio = g.targetValue ? Math.min(1, g.currentValue / g.targetValue) : null;
            return (
              <li key={g.id}>
                <Link
                  href={`/goals/${g.id}`}
                  className="block mxp-card p-4 transition hover:border-mxp-purple/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">
                      {g.title}
                      {season?.primaryGoalId === g.id && (
                        <span className="ml-2 rounded-full bg-mxp-purple-soft px-2 py-0.5 align-[1px] text-[10px] font-bold text-mxp-purple-deep">
                          saison
                        </span>
                      )}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${HEALTH[health.status].cls}`}
                    >
                      {HEALTH[health.status].label}
                    </span>
                  </div>
                  {health.reason && <p className="mxp-meta mt-1">{health.reason}</p>}
                  {g.bottleneck && (
                    <p className="mxp-meta mt-1">
                      <span className="font-semibold text-mxp-orange">Goulot :</span> {g.bottleneck}
                    </p>
                  )}
                  {ratio !== null && (
                    <>
                      <div className="mt-2 flex justify-between text-xs text-mxp-muted">
                        <span className="tabular-nums">
                          {g.currentValue}/{g.targetValue} {g.unit ?? ""}
                        </span>
                        {pace && (
                          <span className="tabular-nums">
                            requis : {pace.requiredWeeklyPace.toFixed(1)}/sem
                          </span>
                        )}
                      </div>
                      <div className="mt-1 mxp-rail">
                        <div
                          className="h-full rounded-full bg-mxp-purple"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Pas maintenant — ideas parked without guilt, priority intact ── */}
      <section className="mt-6 border-t border-mxp-line pt-4">
        <p className="mxp-label text-mxp-muted">Pas maintenant</p>
        <p className="mxp-meta mt-1">
          Toute nouvelle envie atterrit ici. Sauvée — et ta priorité n&apos;a pas bougé.
        </p>
        {notNow.length > 0 && (
          <ul className="mt-2 divide-y divide-mxp-line">
            {notNow.map((i) => (
              <li key={i.id} className="flex items-center gap-2 py-2.5">
                <span className="mxp-body min-w-0 flex-1">{i.title}</span>
                <form action={promoteNotNow} className="flex-none">
                  <input type="hidden" name="id" value={i.id} />
                  <button className="mxp-btn-ghost px-2.5 py-1 text-xs">C&apos;est l&apos;heure</button>
                </form>
                <form action={dropNotNow} className="flex-none">
                  <input type="hidden" name="id" value={i.id} />
                  <button className="mxp-quiet !w-auto px-2.5 py-1 text-xs">Lâcher</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addNotNow} className="mt-2.5 flex gap-2">
          <input
            type="text"
            name="notNowTitle"
            required
            maxLength={300}
            placeholder="Une idée, un projet, un livre…"
            className="mxp-input min-w-0 flex-1 px-3 py-2 text-sm"
          />
          <button className="mxp-btn-ghost flex-none px-3 py-2 text-xs">Poser</button>
        </form>
      </section>

      {done.length > 0 && (
        <section className="mt-6 border-t border-mxp-line pt-4">
          <p className="mxp-label text-mxp-muted">Atteints</p>
          <ul className="mt-2 space-y-1.5">
            {done.map((g) => (
              <li key={g.id} className="mxp-meta">
                <IconCheck className="inline h-[13px] w-[13px] align-[-2px] text-mxp-green" />{" "}
                {g.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── New goal — folded once a season carries the screen ── */}
      <details className="mt-6 border-t border-mxp-line pt-4" open={!season || active.length === 0}>
        <summary className="mxp-label cursor-pointer list-none text-mxp-purple">
          Nouvel objectif {season ? "· il sert la saison, ou il va dans « Pas maintenant »" : ""} →
        </summary>
        <form action={createGoal} className="mt-3 space-y-3">
          <input
            type="text"
            name="title"
            required
            maxLength={300}
            placeholder="Ex. Gagner CHF 20K/mois"
            className="w-full mxp-input px-4 py-2.5 text-sm"
          />
          <input
            type="text"
            name="why"
            maxLength={1000}
            placeholder="Pourquoi ça compte ?"
            className="w-full mxp-input px-4 py-2.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="targetValue"
              step="any"
              min="0"
              placeholder="Cible (ex. 20000)"
              className="mxp-input px-4 py-2.5 text-sm"
            />
            <input
              type="text"
              name="unit"
              maxLength={40}
              placeholder="Unité (CHF, km…)"
              className="mxp-input px-4 py-2.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-mxp-muted">
              Échéance
              <input
                type="date"
                name="deadline"
                className="mt-1 w-full mxp-input px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs text-mxp-muted">
              Domaine
              <select
                name="lifeArea"
                className="mt-1 w-full mxp-input px-3 py-2.5 text-sm"
              >
                {LIFE_AREAS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input
            type="text"
            name="reward"
            maxLength={300}
            placeholder="Récompense réelle si atteint (optionnel)"
            className="w-full mxp-input px-4 py-2.5 text-sm"
          />
          <button className="w-full mxp-btn px-4 py-2.5 text-sm">
            Créer l&apos;objectif
          </button>
        </form>
      </details>
    </main>
  );
}
