import Link from "next/link";
import { IconCheck, IconCoin } from "../../../components/icons";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { addDays, dayKey, dayStartUtc, weekKey } from "@/lib/mainxp/day";
import { saveWeeklyReview } from "./actions";

export default async function WeeklyReviewPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const now = new Date();
  const week = weekKey(now, user.timezone);
  const today = dayKey(now, user.timezone);

  // The current ISO week's day keys (Monday-based), capped at today.
  const weekDays: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    if (weekKey(new Date(`${d}T12:00:00Z`), "UTC") === week) weekDays.push(d);
  }
  const weekStartUtc = dayStartUtc(new Date(`${weekDays[0]}T12:00:00Z`), user.timezone);

  const [txs, quests, nnLogs, nns, focusSessions, alreadyDone] = await Promise.all([
    prisma.mxXpTransaction.findMany({
      where: { userId: user.id, createdAt: { gte: weekStartUtc } },
      select: { mainDelta: true, coinsDelta: true },
    }),
    prisma.mxTask.count({
      where: { userId: user.id, tier: "MAIN_QUEST", status: "DONE", dayKey: { in: weekDays } },
    }),
    prisma.mxNonNegotiableLog.count({
      where: { userId: user.id, periodKey: { in: weekDays }, completed: true },
    }),
    prisma.mxNonNegotiable.count({
      where: { userId: user.id, active: true, cadence: "DAILY" },
    }),
    prisma.mxFocusSession.findMany({
      where: { userId: user.id, startedAt: { gte: weekStartUtc }, endedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    }),
    prisma.mxXpTransaction.findFirst({
      where: { idempotencyKey: `weekly:${user.id}:${week}` },
    }),
  ]);

  const xpWeek = txs.reduce((s, t) => s + t.mainDelta, 0);
  const coinsWeek = txs.reduce((s, t) => s + t.coinsDelta, 0);
  const focusMin = Math.round(
    focusSessions.reduce((s, f) => s + ((f.endedAt!.getTime() - f.startedAt.getTime()) / 60_000), 0)
  );
  const nnPossible = nns * weekDays.length;

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/progress" className="mxp-meta">← Progression</Link>
      <h1 className="mt-3 mxp-display">Revue hebdomadaire</h1>
      <p className="text-sm text-mxp-muted">Semaine {week} — prendre de la hauteur</p>

      <section className="mxp-card mt-4 p-4">
        <p className="mxp-label text-mxp-blue">La semaine en chiffres</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-mxp-muted">MAINXP gagnée</dt>
          <dd className="text-right tabular-nums">{xpWeek} XP</dd>
          <dt className="text-mxp-muted">Pièces gagnées</dt>
          <dd className="flex items-center justify-end gap-1 text-right tabular-nums"><IconCoin className="h-[13px] w-[13px] text-mxp-gold" /> {coinsWeek}</dd>
          <dt className="text-mxp-muted">Main Quests accomplies</dt>
          <dd className="text-right tabular-nums">{quests}/{weekDays.length}</dd>
          <dt className="text-mxp-muted">Non-négociables</dt>
          <dd className="text-right tabular-nums">
            {nnLogs}{nnPossible > 0 && `/${nnPossible}`}
          </dd>
          <dt className="text-mxp-muted">Minutes de focus</dt>
          <dd className="text-right tabular-nums">{focusMin} min</dd>
        </dl>
      </section>

      {alreadyDone ? (
        <section className="mxp-card mt-4 p-4 text-sm">
          <p className="font-medium">Revue de la semaine {week} déjà faite <IconCheck className="inline h-[14px] w-[14px] align-[-2px] text-mxp-green" /></p>
          <p className="mt-1 text-mxp-muted">
            Reviens en fin de semaine prochaine — ou relis tes revues dans le journal.
          </p>
        </section>
      ) : (
        <form action={saveWeeklyReview} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Plus grande victoire ?</span>
            <textarea name="win" rows={2} className="mt-1 w-full mxp-input px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Plus grand manque — et pourquoi ?</span>
            <textarea name="miss" rows={2} className="mt-1 w-full mxp-input px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">La priorité de la semaine prochaine ?</span>
            <input
              type="text"
              name="nextPriority"
              maxLength={300}
              className="mt-1 w-full mxp-input px-4 py-3 text-sm"
            />
          </label>
          <button className="w-full mxp-btn px-4 py-3 text-sm">
            Clore la semaine
          </button>
        </form>
      )}
    </main>
  );
}
