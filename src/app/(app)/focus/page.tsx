import Link from "next/link";
import { IconCheck } from "../../components/icons";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/mainxp/day";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { levelProgress } from "@/lib/mainxp/xp/curve";
import { dominantAttribute } from "@/lib/mainxp/xp/dominant";
import { endFocus, rateFocus, startFocus } from "./actions";
import { FocusTimer } from "./FocusTimer";
import { InterruptionChips } from "./InterruptionChips";

export default async function FocusPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);

  const now = new Date();
  const [running, todayTasks, recentSessions, totals, gearEquipped] = await Promise.all([
    prisma.mxFocusSession.findFirst({ where: { userId: user.id, endedAt: null } }),
    prisma.mxTask.findMany({
      where: { userId: user.id, dayKey: today, status: "OPEN" },
      orderBy: { tier: "asc" },
    }),
    prisma.mxFocusSession.findMany({
      where: { userId: user.id, endedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { task: true },
    }),
    xpTotals(user.id),
    prisma.mxGearOwned.findMany({ where: { userId: user.id, equipped: true } }),
  ]);
  const level = levelProgress(totals.main).level;
  const equippedIds = gearEquipped.map((g) => g.gearId);
  const dominant = dominantAttribute(totals.attributes);

  // The session that just ended and hasn't spoken yet — one tap of quality,
  // one optional line, then it joins the log.
  const justEnded =
    !running &&
    recentSessions.find(
      (s) =>
        s.quality === null &&
        s.endedAt !== null &&
        now.getTime() - s.endedAt.getTime() < 15 * 60_000
    );
  const runningTask = running?.taskId ? todayTasks.find((t) => t.id === running.taskId) : undefined;

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="text-xs text-mxp-muted">← Aujourd&apos;hui</Link>
      <h1 className="mt-2 mxp-display">L&apos;Arène</h1>
      <p className="mxp-meta mt-1">Un bloc commencé est un bloc vérifié.</p>

      {running ? (
        <section className="mxp-arena mt-5 p-5">
          {runningTask && (
            <div className="mb-3 text-center">
              <p className="mxp-body font-medium">{runningTask.title}</p>
              {runningTask.nextAction && (
                <p className="mt-0.5 text-[13px] font-medium text-white/80">
                  → {runningTask.nextAction}
                </p>
              )}
            </div>
          )}
          <FocusTimer
            startedAtIso={running.startedAt.toISOString()}
            plannedMin={running.plannedMin}
            level={level}
            gear={equippedIds}
            dominant={dominant}
          />
          <form action={endFocus} className="mt-5 space-y-4">
            <input type="hidden" name="id" value={running.id} />
            <InterruptionChips />
            <button className="w-full mxp-btn mxp-btn-blue px-4 py-3 text-sm">
              Terminer la session
            </button>
          </form>
        </section>
      ) : justEnded ? (
        <section className="mt-5 mxp-anchor">
          <p className="mxp-label text-mxp-blue">Session terminée</p>
          <p className="mt-2 font-displaymx text-[28px] tabular-nums">
            {Math.round((justEnded.endedAt!.getTime() - justEnded.startedAt.getTime()) / 60_000)}{" "}
            <span className="text-[15px]">min</span>
          </p>
          {justEnded.task && (
            <p className="mxp-meta mt-1">Tu as fait avancer : {justEnded.task.title}</p>
          )}
          <form action={rateFocus} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={justEnded.id} />
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["deep", "Profond"],
                  ["good", "Bon"],
                  ["fragmented", "Fragmenté"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  name="quality"
                  value={v}
                  className="rounded-xl border border-mxp-line bg-white px-3 py-2.5 text-sm font-semibold text-mxp-ink transition active:scale-95"
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="text"
              name="note"
              maxLength={500}
              placeholder="Qu'est-ce qui a changé ? (facultatif)"
              className="mxp-input w-full px-3 py-2 text-sm"
            />
          </form>
        </section>
      ) : null}

      {!running && (
        <section className={`mt-5 mxp-card p-4 ${justEnded ? "mt-4" : ""}`}>
          <p className="mxp-label text-mxp-blue">
            Nouvelle session
          </p>
          <form action={startFocus} className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[25, 50, 90].map((minutes, i) => (
                <label key={minutes} className="cursor-pointer">
                  <input
                    type="radio"
                    name="minutes"
                    value={minutes}
                    defaultChecked={i === 0}
                    className="peer sr-only"
                  />
                  <span className="block rounded-xl border border-mxp-line bg-mxp-card px-3 py-3 text-center text-sm font-semibold peer-checked:border-mxp-blue peer-checked:bg-mxp-blue/10 peer-checked:text-mxp-blue">
                    {minutes}′
                  </span>
                </label>
              ))}
            </div>
            <input
              type="number"
              name="custom"
              min={10}
              max={240}
              placeholder="Ou durée personnalisée (10–240 min)"
              className="w-full mxp-input px-4 py-2.5 text-sm"
            />
            {todayTasks.length > 0 && (
              <label className="block text-xs text-mxp-muted">
                Sur quelle action ?
                <select
                  name="taskId"
                  className="mt-1 w-full mxp-input px-3 py-2.5 text-sm"
                >
                  <option value="">— libre —</option>
                  {todayTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tier === "MAIN_QUEST" ? "Quête · " : ""}
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="w-full mxp-btn mxp-btn-blue px-4 py-3 text-sm">
              Lancer le focus
            </button>
          </form>
        </section>
      )}
      {/* The just-ended card above never blocks the next block. */}

      {recentSessions.length > 0 && (
        <section className="mt-4 mxp-card p-4">
          <p className="mxp-label text-mxp-muted">
            Dernières sessions
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {recentSessions.map((sess) => {
              const min = sess.endedAt
                ? Math.round((sess.endedAt.getTime() - sess.startedAt.getTime()) / 60_000)
                : 0;
              return (
                <li key={sess.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-mxp-muted">
                    {sess.task?.title ?? "Session libre"}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {min} min{" "}
                    {sess.completed && (
                      <IconCheck className="inline h-[12px] w-[12px] align-[-1.5px] text-mxp-green" />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
