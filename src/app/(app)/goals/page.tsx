import Link from "next/link";
import { IconCheck } from "../../components/icons";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { goalPace, type PaceVerdict } from "@/lib/mainxp/goals";
import { LIFE_AREAS } from "@/lib/mainxp/attributes";
import { createGoal } from "./actions";

const VERDICT: Record<PaceVerdict, { label: string; cls: string }> = {
  ahead: { label: "En avance", cls: "bg-mxp-green/15 text-mxp-green" },
  on_track: { label: "Sur la bonne voie", cls: "bg-mxp-blue/15 text-mxp-blue" },
  behind: { label: "En retard", cls: "bg-mxp-orange/15 text-mxp-orange" },
};

export default async function GoalsPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const goals = await prisma.mxGoal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
  });
  const active = goals.filter((g) => g.status === "ACTIVE");
  const done = goals.filter((g) => g.status === "COMPLETED");

  return (
    <main className="px-4 pt-5 pb-8">
      <h1 className="mxp-display">Objectifs</h1>
      <p className="text-sm text-mxp-muted">
        Un objectif mesurable, avec un pourquoi et une échéance — le jeu fait le reste.
      </p>

      {active.length === 0 && (
        <section className="mt-4 mxp-card p-4 text-sm text-mxp-muted">
          Aucun objectif actif. Définis le premier ci-dessous — par exemple la mission 90 jours
          de ton North Star, rendue mesurable.
        </section>
      )}

      <ul className="mt-4 space-y-3">
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
          const ratio = g.targetValue ? Math.min(1, g.currentValue / g.targetValue) : null;
          return (
            <li key={g.id}>
              <Link
                href={`/goals/${g.id}`}
                className="block mxp-card p-4 transition hover:border-mxp-purple/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{g.title}</p>
                  {pace && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${VERDICT[pace.verdict].cls}`}>
                      {VERDICT[pace.verdict].label}
                    </span>
                  )}
                </div>
                {ratio !== null && (
                  <>
                    <div className="mt-2 flex justify-between text-xs text-mxp-muted">
                      <span className="tabular-nums">
                        {g.currentValue}/{g.targetValue} {g.unit ?? ""}
                      </span>
                      {pace && (
                        <span className="tabular-nums">
                          rythme requis : {pace.requiredWeeklyPace.toFixed(1)}/sem
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

      {done.length > 0 && (
        <section className="mt-5">
          <p className="mxp-label text-mxp-muted">Atteints</p>
          <ul className="mt-2 space-y-2">
            {done.map((g) => (
              <li key={g.id} className="mxp-card px-4 py-2.5 text-sm text-mxp-muted">
                <IconCheck className="inline h-[14px] w-[14px] align-[-2px] text-mxp-green" /> {g.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 mxp-card p-4">
        <p className="mxp-label text-mxp-purple">Nouvel objectif</p>
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
      </section>
    </main>
  );
}
