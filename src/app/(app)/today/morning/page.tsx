import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { saveMorning } from "../day-actions";

function Scale({ name, label }: { name: string; label: string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-mxp-muted">1–10</span>
      </div>
      <input
        type="range"
        name={name}
        min={1}
        max={10}
        defaultValue={6}
        className="mt-1 w-full accent-[#7c3aed]"
      />
    </label>
  );
}

export default async function MorningPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);
  const yesterday = addDays(today, -1);

  const [northStar, mainQuest, yesterdayPlan, goals] = await Promise.all([
    prisma.mxNorthStar.findUnique({ where: { userId: user.id } }),
    prisma.mxTask.findFirst({ where: { userId: user.id, dayKey: today, tier: "MAIN_QUEST" } }),
    prisma.mxDayPlan.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey: yesterday } } }),
    prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { priority: "asc" }, take: 3 }),
  ]);

  const proposal =
    mainQuest?.title ?? yesterdayPlan?.tomorrowBigThing ?? "";

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="text-xs text-mxp-muted">← Aujourd&apos;hui</Link>
      <h1 className="mt-2 text-xl font-semibold">Morning Start</h1>
      <p className="text-sm text-mxp-muted">2 minutes pour lancer la journée. +10 XP · Esprit.</p>

      <form action={saveMorning} className="mt-5 space-y-5">
        <section className="rounded-2xl border border-mxp-line bg-mxp-card p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-mxp-teal">1 · Ton état</p>
          <Scale name="mood" label="Humeur" />
          <Scale name="energy" label="Énergie" />
          <Scale name="stress" label="Stress" />
          <Scale name="focus" label="Clarté" />
        </section>

        {(northStar?.why || northStar?.season) && (
          <section className="rounded-2xl border border-mxp-line bg-mxp-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mxp-purple">
              2 · Rappelle-toi pourquoi
            </p>
            {northStar.why && <p className="mt-2 text-sm">{northStar.why}</p>}
            {northStar.season && (
              <p className="mt-1 text-xs text-mxp-muted">Saison : {northStar.season}</p>
            )}
          </section>
        )}

        {goals.length > 0 && (
          <section className="rounded-2xl border border-mxp-line bg-mxp-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mxp-blue">
              3 · Où tu en es
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {goals.map((g) => (
                <li key={g.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{g.title}</span>
                  {g.targetValue && (
                    <span className="shrink-0 tabular-nums text-mxp-muted">
                      {g.currentValue}/{g.targetValue}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border-2 border-mxp-purple/50 bg-mxp-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-mxp-purple">
            4 · Ta Main Quest du jour
          </p>
          {mainQuest ? (
            <p className="mt-2 text-sm font-medium">{mainQuest.title}</p>
          ) : (
            <>
              <input
                type="text"
                name="mainQuest"
                maxLength={300}
                defaultValue={proposal}
                placeholder="Le résultat le plus important du jour…"
                className="mt-2 w-full rounded-lg border border-mxp-line px-3 py-2.5 text-sm outline-none focus:border-mxp-purple"
              />
              {yesterdayPlan?.tomorrowBigThing && (
                <p className="mt-1.5 text-xs text-mxp-muted">
                  Proposé depuis ta revue d&apos;hier : « {yesterdayPlan.tomorrowBigThing} »
                </p>
              )}
            </>
          )}
        </section>

        <button className="w-full rounded-xl bg-mxp-purple px-4 py-3 text-sm font-semibold text-white hover:bg-mxp-purple-deep">
          DÉMARRER LA JOURNÉE
        </button>
      </form>
    </main>
  );
}
