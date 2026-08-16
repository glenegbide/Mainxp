import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/mainxp/day";
import { endFocus, startFocus } from "./actions";
import { FocusTimer } from "./FocusTimer";

export default async function FocusPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);

  const [running, todayTasks, recentSessions] = await Promise.all([
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
  ]);

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="text-xs text-mxp-muted">← Aujourd&apos;hui</Link>
      <h1 className="mt-2 text-xl font-semibold">Focus</h1>
      <p className="text-sm text-mxp-muted">
        +15 XP · Focus par bloc de 25 minutes réellement écoulé — vérifié côté serveur,
        pas de triche possible.
      </p>

      {running ? (
        <section className="mt-5 rounded-2xl border-2 border-mxp-blue/50 bg-mxp-card p-6">
          {running.taskId && (
            <p className="mb-3 text-center text-sm text-mxp-muted">
              {todayTasks.find((t) => t.id === running.taskId)?.title ?? "Session en cours"}
            </p>
          )}
          <FocusTimer startedAtIso={running.startedAt.toISOString()} plannedMin={running.plannedMin} />
          <form action={endFocus} className="mt-5 space-y-3">
            <input type="hidden" name="id" value={running.id} />
            <label className="block text-xs text-mxp-muted">
              Interruptions
              <input
                type="number"
                name="interruptions"
                min={0}
                max={99}
                defaultValue={0}
                className="mt-1 w-full rounded-lg border border-mxp-line px-3 py-2 text-sm outline-none"
              />
            </label>
            <button className="w-full rounded-xl bg-mxp-blue px-4 py-3 text-sm font-semibold text-white hover:opacity-90">
              Terminer la session
            </button>
          </form>
        </section>
      ) : (
        <section className="mt-5 rounded-2xl border border-mxp-line bg-mxp-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-mxp-blue">
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
              className="w-full rounded-xl border border-mxp-line px-4 py-2.5 text-sm outline-none focus:border-mxp-blue"
            />
            {todayTasks.length > 0 && (
              <label className="block text-xs text-mxp-muted">
                Sur quelle action ?
                <select
                  name="taskId"
                  className="mt-1 w-full rounded-xl border border-mxp-line bg-mxp-card px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">— libre —</option>
                  {todayTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tier === "MAIN_QUEST" ? "⚡ " : ""}
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="w-full rounded-xl bg-mxp-blue px-4 py-3 text-sm font-semibold text-white hover:opacity-90">
              Lancer le focus
            </button>
          </form>
        </section>
      )}

      {recentSessions.length > 0 && (
        <section className="mt-4 rounded-2xl border border-mxp-line bg-mxp-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-mxp-muted">
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
                    {min} min {sess.completed ? "✅" : ""}
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
