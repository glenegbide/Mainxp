import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/mainxp/day";
import { saveNight } from "../day-actions";

export default async function NightPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);

  const [tasks, nns, nnLogs, plan] = await Promise.all([
    prisma.mxTask.findMany({ where: { userId: user.id, dayKey: today } }),
    prisma.mxNonNegotiable.findMany({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
    prisma.mxNonNegotiableLog.findMany({
      where: { userId: user.id, periodKey: today, completed: true },
    }),
    prisma.mxDayPlan.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey: today } } }),
  ]);

  const done = tasks.filter((t) => t.status === "DONE");
  const open = tasks.filter((t) => t.status === "OPEN");
  const mainQuest = tasks.find((t) => t.tier === "MAIN_QUEST");

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="text-xs text-mxp-muted">← Aujourd&apos;hui</Link>
      <h1 className="mt-2 text-xl font-semibold">Revue du soir</h1>
      <p className="text-sm text-mxp-muted">
        2–4 minutes. +15 XP · Esprit — et demain se prépare tout seul.
      </p>

      <section className="mt-4 mxp-card p-4">
        <p className="mxp-label text-mxp-blue">Le jour en chiffres</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-mxp-muted">Main Quest</dt>
          <dd className="text-right">
            {mainQuest ? (mainQuest.status === "DONE" ? "accomplie ✅" : "non terminée") : "non définie"}
          </dd>
          <dt className="text-mxp-muted">Actions accomplies</dt>
          <dd className="text-right tabular-nums">{done.length}</dd>
          <dt className="text-mxp-muted">Restées ouvertes</dt>
          <dd className="text-right tabular-nums">{open.length}</dd>
          <dt className="text-mxp-muted">Non-négociables</dt>
          <dd className="text-right tabular-nums">{nnLogs.length}/{nns.length}</dd>
        </dl>
        {open.length > 0 && (
          <p className="mt-2 text-xs text-mxp-muted">
            Les actions ouvertes passeront automatiquement à demain.
          </p>
        )}
      </section>

      <form action={saveNight} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Qu&apos;est-ce qui a bien marché ?</span>
          <textarea
            name="wentWell"
            rows={2}
            defaultValue={plan?.reviewWentWell ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Qu&apos;est-ce qui a été manqué — et pourquoi ?</span>
          <span className="block text-xs text-mxp-muted">
            Sans honte : trop gros ? flou ? pas le temps ? énergie basse ?
          </span>
          <textarea
            name="missedWhy"
            rows={2}
            defaultValue={plan?.reviewMissedWhy ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Qu&apos;as-tu appris ?</span>
          <textarea
            name="lesson"
            rows={2}
            defaultValue={plan?.reviewLesson ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Gratitude — qu&apos;est-ce qui a compté aujourd&apos;hui ?</span>
          <textarea
            name="gratitude"
            rows={2}
            placeholder="Optionnel · +10 XP Esprit"
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">La Grande Chose de demain</span>
          <span className="block text-xs text-mxp-muted">
            Elle deviendra la Main Quest proposée demain matin.
          </span>
          <input
            type="text"
            name="tomorrowBigThing"
            maxLength={300}
            defaultValue={plan?.tomorrowBigThing ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <button className="w-full rounded-xl bg-mxp-teal px-4 py-3 text-sm font-semibold text-white hover:opacity-90">
          Clore la journée &amp; préparer demain
        </button>
      </form>
    </main>
  );
}
