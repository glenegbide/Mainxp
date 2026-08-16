import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { levelProgress } from "@/lib/mainxp/xp/curve";
import {
  addNonNegotiable,
  addTask,
  completeTask,
  deleteTask,
  postponeTask,
  setMainQuest,
  toggleNonNegotiable,
} from "./actions";

export default async function TodayPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);

  const [tasks, nonNegotiables, nnLogs, totals, recentTx] = await Promise.all([
    prisma.mxTask.findMany({
      where: { userId: user.id, dayKey: today },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.mxNonNegotiable.findMany({
      where: { userId: user.id, active: true, cadence: "DAILY" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.mxNonNegotiableLog.findMany({ where: { userId: user.id, periodKey: today } }),
    xpTotals(user.id),
    prisma.mxXpTransaction.findMany({
      where: { userId: user.id, mainDelta: { gt: 0 } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const lp = levelProgress(totals.main);
  const mainQuest = tasks.find((t) => t.tier === "MAIN_QUEST");
  const missions = tasks.filter((t) => t.tier === "DAILY_MISSION");
  const sideQuests = tasks.filter((t) => t.tier === "SIDE_QUEST");
  const doneByNn = new Map(nnLogs.map((l) => [l.nonNegotiableId, l.completed]));

  // Streak: consecutive days (user timezone) with at least one positive XP event.
  const activeDays = new Set(recentTx.map((t) => dayKey(t.createdAt, user.timezone)));
  let streak = 0;
  let cursor = activeDays.has(today) ? today : addDays(today, -1);
  while (activeDays.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  // WHAT NOW? — Phase 0 deterministic heuristic (AI version arrives in Phase 1).
  const openMissions = missions.filter((t) => t.status === "OPEN");
  const unmetNn = nonNegotiables.filter((n) => !doneByNn.get(n.id));
  let whatNow: string;
  if (!mainQuest) whatNow = "Définis ta Main Quest : le résultat le plus important du jour.";
  else if (mainQuest.status === "OPEN")
    whatNow = `Ta Main Quest n'a pas bougé : « ${mainQuest.title} ». C'est l'action à plus fort impact.`;
  else if (openMissions.length > 0)
    whatNow = `Main Quest accomplie. Prochaine mission : « ${openMissions[0].title} ».`;
  else if (unmetNn.length > 0)
    whatNow = `Il te reste ${unmetNn.length} non-négociable${unmetNn.length > 1 ? "s" : ""} : « ${unmetNn[0].title} ».`;
  else whatNow = "Journée accomplie. Prépare demain ou récupère — c'est aussi du jeu.";

  const dateLabel = new Intl.DateTimeFormat(user.locale === "en" ? "en-GB" : "fr-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: user.timezone,
  }).format(new Date());

  return (
    <main className="px-4 pt-5">
      {/* ── Level header (purple hero, design ref 01_HOME_WHITE) ── */}
      <section className="rounded-2xl bg-mxp-purple p-5 text-white">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-2xl font-bold"
          >
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-white/80">
              Niveau {lp.level} · {lp.level === 1 && totals.main === 0 ? "Novice · 0 XP" : `${totals.main} XP`}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/80">
            <span>MAINXP</span>
            <span className="tabular-nums">
              {lp.intoLevel}/{lp.neededForNext} → Niv. {lp.level + 1}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${Math.round(lp.ratio * 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* ── Streak ── */}
      <section className="mt-3 flex items-center justify-between rounded-2xl border border-mxp-line bg-mxp-card px-5 py-3">
        <span className="text-sm text-mxp-muted">Série actuelle</span>
        <span className="text-sm font-semibold">
          {streak} jour{streak === 1 ? "" : "s"} 🔥
        </span>
      </section>

      <h1 className="mt-6 text-xl font-semibold">Aujourd&apos;hui</h1>
      <p className="text-sm capitalize text-mxp-muted">{dateLabel}</p>

      {/* ── WHAT NOW? ── */}
      <section className="mt-4 rounded-2xl border border-mxp-orange/40 bg-mxp-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mxp-orange">
          Et maintenant ?
        </p>
        <p className="mt-1 text-sm">{whatNow}</p>
      </section>

      {/* ── Main Quest ── */}
      <section className="mt-4 rounded-2xl border-2 border-mxp-purple/50 bg-mxp-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mxp-purple">
          Main Quest · +100 XP
        </p>
        {mainQuest ? (
          <div className="mt-2 flex items-start justify-between gap-3">
            <p
              className={`flex-1 text-sm font-medium ${
                mainQuest.status === "DONE" ? "text-mxp-muted line-through" : ""
              }`}
            >
              {mainQuest.title}
            </p>
            {mainQuest.status === "OPEN" ? (
              <form action={completeTask}>
                <input type="hidden" name="id" value={mainQuest.id} />
                <button className="rounded-lg bg-mxp-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-mxp-purple-deep">
                  Accompli
                </button>
              </form>
            ) : (
              <span className="text-lg" aria-label="accomplie">
                ✅
              </span>
            )}
          </div>
        ) : (
          <form action={setMainQuest} className="mt-2 flex gap-2">
            <input
              type="text"
              name="title"
              required
              maxLength={300}
              placeholder="Le résultat le plus important du jour…"
              className="min-w-0 flex-1 rounded-lg border border-mxp-line px-3 py-2 text-sm outline-none focus:border-mxp-purple"
            />
            <button className="rounded-lg bg-mxp-purple px-3 py-2 text-xs font-semibold text-white hover:bg-mxp-purple-deep">
              Définir
            </button>
          </form>
        )}
      </section>

      {/* ── Daily Missions ── */}
      <section className="mt-4 rounded-2xl border border-mxp-line bg-mxp-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mxp-blue">
          Missions du jour · 3–5 · +25 XP
        </p>
        <TaskList tasks={missions} empty="Aucune mission pour l'instant." />
        {missions.filter((t) => t.status === "OPEN").length < 5 && (
          <form action={addTask} className="mt-3 flex gap-2">
            <input type="hidden" name="tier" value="DAILY_MISSION" />
            <input
              type="text"
              name="title"
              required
              maxLength={300}
              placeholder="Ajouter une mission utile…"
              className="min-w-0 flex-1 rounded-lg border border-mxp-line px-3 py-2 text-sm outline-none focus:border-mxp-blue"
            />
            <button className="rounded-lg border border-mxp-line px-3 py-2 text-xs font-semibold hover:bg-mxp-bg">
              +
            </button>
          </form>
        )}
      </section>

      {/* ── Non-Negotiables ── */}
      <section className="mt-4 rounded-2xl border border-mxp-line bg-mxp-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mxp-green">
          Non-négociables · +20 XP · Discipline
        </p>
        {nonNegotiables.length === 0 && (
          <p className="mt-2 text-sm text-mxp-muted">
            3 à 7 engagements quotidiens que tu tiens quoi qu&apos;il arrive.
          </p>
        )}
        <ul className="mt-2 space-y-2">
          {nonNegotiables.map((nn) => {
            const done = doneByNn.get(nn.id) ?? false;
            return (
              <li key={nn.id} className="flex items-center justify-between gap-3">
                <span className={`text-sm ${done ? "text-mxp-muted line-through" : ""}`}>
                  {nn.title}
                </span>
                <form action={toggleNonNegotiable}>
                  <input type="hidden" name="id" value={nn.id} />
                  <button
                    aria-pressed={done}
                    className={`h-7 w-7 rounded-full border text-sm leading-none ${
                      done
                        ? "border-mxp-green bg-mxp-green text-white"
                        : "border-mxp-line bg-mxp-card text-transparent hover:border-mxp-green"
                    }`}
                  >
                    ✓
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
        {nonNegotiables.length < 7 && (
          <form action={addNonNegotiable} className="mt-3 flex gap-2">
            <input
              type="text"
              name="title"
              required
              maxLength={200}
              placeholder="Ex. 10 appels de prospection…"
              className="min-w-0 flex-1 rounded-lg border border-mxp-line px-3 py-2 text-sm outline-none focus:border-mxp-green"
            />
            <button className="rounded-lg border border-mxp-line px-3 py-2 text-xs font-semibold hover:bg-mxp-bg">
              +
            </button>
          </form>
        )}
      </section>

      {/* ── Side Quests ── */}
      <section className="mt-4 mb-6 rounded-2xl border border-mxp-line bg-mxp-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mxp-muted">
          Side quests · optionnel · +8 XP
        </p>
        <TaskList tasks={sideQuests} empty="Rien ici — c'est très bien ainsi." />
        <form action={addTask} className="mt-3 flex gap-2">
          <input type="hidden" name="tier" value="SIDE_QUEST" />
          <input
            type="text"
            name="title"
            required
            maxLength={300}
            placeholder="Petite action optionnelle…"
            className="min-w-0 flex-1 rounded-lg border border-mxp-line px-3 py-2 text-sm outline-none focus:border-mxp-purple"
          />
          <button className="rounded-lg border border-mxp-line px-3 py-2 text-xs font-semibold hover:bg-mxp-bg">
            +
          </button>
        </form>
      </section>
    </main>
  );
}

function TaskList({
  tasks,
  empty,
}: {
  tasks: Array<{ id: string; title: string; status: string; postponeCount: number }>;
  empty: string;
}) {
  if (tasks.length === 0) return <p className="mt-2 text-sm text-mxp-muted">{empty}</p>;
  return (
    <ul className="mt-2 space-y-2">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-2">
          <span
            className={`min-w-0 flex-1 text-sm ${
              t.status === "DONE" ? "text-mxp-muted line-through" : ""
            }`}
          >
            {t.title}
            {t.postponeCount >= 3 && t.status === "OPEN" && (
              <span className="ml-2 rounded bg-mxp-orange/15 px-1.5 py-0.5 text-[10px] font-semibold text-mxp-orange">
                mode difficile ×{t.postponeCount >= 6 ? 2 : 1.5}
              </span>
            )}
          </span>
          {t.status === "OPEN" ? (
            <span className="flex shrink-0 gap-1">
              <form action={completeTask}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  title="Accomplir"
                  className="rounded-lg border border-mxp-line px-2 py-1 text-xs hover:border-mxp-green hover:text-mxp-green"
                >
                  ✓
                </button>
              </form>
              <form action={postponeTask}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  title="Reporter à demain"
                  className="rounded-lg border border-mxp-line px-2 py-1 text-xs text-mxp-muted hover:text-mxp-ink"
                >
                  →
                </button>
              </form>
              <form action={deleteTask}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  title="Supprimer"
                  className="rounded-lg border border-mxp-line px-2 py-1 text-xs text-mxp-muted hover:text-mxp-red"
                >
                  ×
                </button>
              </form>
            </span>
          ) : (
            <span aria-label="accomplie">✅</span>
          )}
        </li>
      ))}
    </ul>
  );
}
