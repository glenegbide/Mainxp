import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { addDays, dayKey, daysBetween } from "@/lib/mainxp/day";
import { goalPace, isGoalAtRisk } from "@/lib/mainxp/goals";
import { whatNow } from "@/lib/mainxp/priority";
import { contextFromRows } from "@/lib/mainxp/priority-context";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { levelProgress } from "@/lib/mainxp/xp/curve";
import { PixelHero } from "../../components/PixelHero";
import { elanReport } from "@/lib/mainxp/elan";
import {
  addNonNegotiable,
  addTask,
  completeTask,
  deleteTask,
  postponeTask,
  setMainQuest,
  toggleNonNegotiable,
} from "./actions";
import { addTaskNote } from "./actions";
import { tapHabit } from "../habits/actions";
import { activateMinimumDay, submitComeback, toggleMinimumSlot } from "./day-actions";
import {
  acceptProposedChallenge,
  acceptStarterChallenge,
  declineChallenge,
  tickChallengeToday,
} from "./challenge-actions";
import { STARTER_CHALLENGES } from "@/lib/mainxp/challenges";

export default async function TodayPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);

  const [tasks, nonNegotiables, nnLogs, totals, recentTx, activeGoals, dayPlan] = await Promise.all([
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
    prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.mxDayPlan.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey: today } } }),
  ]);
  const [challenges, challengeLogs] = await Promise.all([
    prisma.mxChallenge.findMany({
      where: { userId: user.id, status: { in: ["proposed", "active"] } },
      include: { logs: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.mxChallengeLog.findMany({ where: { userId: user.id, dayKey: today } }),
  ]);
  const tickedToday = new Set(challengeLogs.map((l) => l.challengeId));
  const [elan, gearEquipped, goodHabits, lastEvent, comebackDoneToday] = await Promise.all([
    elanReport(user.id, user.timezone, user.restMode),
    prisma.mxGearOwned.findMany({ where: { userId: user.id, equipped: true } }),
    prisma.mxHabit.findMany({
      where: { userId: user.id, active: true, kind: "good" },
      include: { logs: { where: { periodKey: today } } },
      take: 4,
      orderBy: { createdAt: "asc" },
    }),
    prisma.mxEvent.findFirst({
      where: { userId: user.id, type: { not: "comeback_completed" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.mxEvent.findFirst({
      where: { userId: user.id, type: "comeback_completed", dayKey: today },
    }),
  ]);
  const equippedIds = gearEquipped.map((g) => g.gearId);

  // Comeback Quest (addendum #8): away ≥ 4 days → welcome back, no guilt.
  const awayDays = lastEvent
    ? daysBetween(dayKey(lastEvent.createdAt, user.timezone), today)
    : 0;
  const showComeback = awayDays >= 4 && !comebackDoneToday;
  const minimum = dayPlan?.minimumDay ?? false;

  // Goal at risk (behind pace, deadline near) — surfaces here and in coach context.
  const goalAtRisk = activeGoals.find((g) => {
    if (!g.targetValue || !g.deadline) return false;
    const report = goalPace({
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      createdAt: g.createdAt,
      deadline: g.deadline,
    });
    return isGoalAtRisk(report, daysBetween(today, dayKey(g.deadline, user.timezone)));
  });

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

  // WHAT NOW? — the Priority Engine (audit P2): one action + concrete WHY,
  // same computation the coach's get_priorities tool sees.
  const recommendation = whatNow(
    contextFromRows({
      tasks,
      goals: activeGoals,
      nonNegotiables,
      nnLogs,
      dayPlan,
      restMode: user.restMode,
      timezone: user.timezone,
    })
  );

  const dateLabel = new Intl.DateTimeFormat(user.locale === "en" ? "en-GB" : "fr-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: user.timezone,
  }).format(new Date());

  return (
    <main className="px-4 pt-5">
      {/* ── Level header (purple hero, design ref 01_HOME_WHITE + game refs) ── */}
      <section className="mxp-hero p-5 text-white">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-[68px] w-16 flex-none items-end justify-center rounded-2xl bg-white/12 pb-1 ring-1 ring-white/25">
            <PixelHero level={lp.level} size={46} gear={equippedIds} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-displaymx text-xl font-bold">{user.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="mxp-chip bg-white/16">
                Niv. {lp.level}
                {totals.main === 0 ? " · Novice" : ""}
              </span>
              <span className="mxp-chip bg-white/16 tabular-nums">🪙 {totals.coins}</span>
              <span className="mxp-chip bg-white/16 tabular-nums">
                🔥 {streak} jour{streak === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-4">
          <div className="flex justify-between text-[11px] font-medium text-white/85">
            <span className="tracking-wide">MAINXP</span>
            <span className="tabular-nums">
              {lp.intoLevel}/{lp.neededForNext} → niv. {lp.level + 1}
            </span>
          </div>
          <div className="mxp-xpbar mt-1.5">
            <i style={{ width: `${Math.max(2, Math.round(lp.ratio * 100))}%` }} />
          </div>
          <div className="mt-2.5 flex justify-between text-[11px] font-medium text-white/85">
            <span className="tracking-wide">ÉLAN</span>
            <span className="tabular-nums">
              {elan.value === null
                ? "🌙 récupération"
                : `${elan.value}/100${elan.missedDays > 0 ? ` · ${elan.missedDays} j manqué${elan.missedDays > 1 ? "s" : ""}` : ""}`}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${elan.value ?? 100}%`,
                background:
                  elan.value === null
                    ? "rgba(255,255,255,.45)"
                    : elan.value >= 70
                      ? "linear-gradient(90deg,#6ee7b7,#34d399)"
                      : elan.value >= 40
                        ? "linear-gradient(90deg,#fdba74,#fb923c)"
                        : "linear-gradient(90deg,#fda4af,#f87171)",
              }}
            />
          </div>
        </div>
      </section>

      {user.onboardingStage === "new" && (
        <Link
          href="/onboarding"
          className="mt-3 block rounded-2xl border-2 border-mxp-purple/50 bg-mxp-purple-soft px-5 py-3 text-sm font-medium text-mxp-purple-deep"
        >
          ✦ Apprends à me connaître — 5 questions pour que le coach comprenne ta vie →
        </Link>
      )}

      {/* ── Quick actions: one quiet row, state shown by a check ── */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {(
          [
            ["/today/morning", "☀️", "Matin", !!dayPlan?.startedAt],
            ["/focus", "⏱️", "Focus", false],
            ["/habits", "✚", "Habitudes", false],
            ["/today/night", "🌙", "Soir", !!dayPlan?.reviewedAt],
          ] as const
        ).map(([href, icon, label, done]) => (
          <Link
            key={href}
            href={href}
            className={`mxp-card flex flex-col items-center gap-0.5 px-2 py-2.5 text-center text-[11px] font-semibold transition ${
              done ? "text-mxp-muted" : "text-mxp-ink"
            }`}
          >
            <span aria-hidden className={`text-base leading-none ${done ? "grayscale opacity-60" : ""}`}>
              {icon}
            </span>
            {label}
            {done ? " ✓" : ""}
          </Link>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link
          href="/dump"
          className="block rounded-xl border border-dashed border-mxp-purple/40 px-3 py-2 text-center text-xs font-semibold text-mxp-purple transition hover:border-solid hover:bg-mxp-card"
        >
          🧠 Vide-tête — je range
        </Link>
        <Link
          href="/journal"
          className="block rounded-xl border border-dashed border-mxp-teal/50 px-3 py-2 text-center text-xs font-semibold text-mxp-teal transition hover:border-solid hover:bg-mxp-card"
        >
          📓 Journal — là, maintenant
        </Link>
      </div>

      {goalAtRisk && (
        <Link
          href={`/goals/${goalAtRisk.id}`}
          className="mt-3 block mxp-card mxp-alert px-5 py-3 text-sm"
        >
          <span className="font-semibold text-mxp-orange">Objectif à risque : </span>
          {goalAtRisk.title} →
        </Link>
      )}

      <h1 className="mt-6 text-xl font-semibold">Aujourd&apos;hui</h1>
      <p className="text-sm text-mxp-muted">
        {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
      </p>

      {/* ── Comeback Quest ── */}
      {showComeback && (
        <section className="mxp-card mxp-quest mt-4 p-4">
          <div className="flex items-baseline justify-between">
            <p className="mxp-label text-mxp-purple">Quête de retour</p>
          </div>
          <p className="mt-1 text-sm">
            {awayDays} jours sans MAINXP. <strong>Aucune culpabilité</strong> — on
            reconstruit, c&apos;est dans le jeu.
          </p>
          <form action={submitComeback} className="mt-3 space-y-2.5">
            <input
              type="text"
              name="whatChanged"
              maxLength={500}
              placeholder="1 · Qu'est-ce qui a changé pendant ton absence ?"
              className="w-full mxp-input px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              name="priority"
              maxLength={300}
              placeholder="2 · Une seule priorité pour reprendre"
              className="w-full mxp-input px-3 py-2.5 text-sm"
            />
            <button className="w-full mxp-btn px-4 py-2.5 text-sm">
              Reprendre — mission 3 : une Main Quest
            </button>
          </form>
        </section>
      )}

      {/* ── Minimum Day ── */}
      {minimum ? (
        <section className="mxp-card mt-4 border-mxp-teal/50 p-4">
          <p className="mxp-label text-mxp-teal">Journée minimum</p>
          <p className="mt-1 text-sm text-mxp-muted">
            Aujourd&apos;hui n&apos;a pas besoin d&apos;être parfait. Protège ces trois
            choses et appelle ça une journée de récupération réussie —
            +15 si les trois.
          </p>
          <ul className="mt-3 space-y-2.5">
            {(
              [
                ["body", "Corps — une action minimum (marcher, s'étirer, dormir tôt)", dayPlan?.minBodyDone],
                ["progress", "Progrès — une seule action qui compte vraiment", dayPlan?.minProgressDone],
                ["mind", "Esprit — une action de reset (respirer, écrire 3 lignes)", dayPlan?.minMindDone],
              ] as const
            ).map(([slot, label, done]) => (
              <li key={slot} className="flex items-center justify-between gap-3">
                <span className={`text-sm ${done ? "text-mxp-muted line-through" : ""}`}>
                  {label}
                </span>
                <form action={toggleMinimumSlot}>
                  <input type="hidden" name="slot" value={slot} />
                  <button aria-pressed={!!done} className={`mxp-check ${done ? "on" : ""}`}>
                    ✓
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <form action={activateMinimumDay} className="mt-2">
          <button className="mxp-quiet">
            Journée difficile ? → Passe en journée minimum
          </button>
        </form>
      )}

      {/* ── WHAT NOW? — one action, explained (never a list of orders) ── */}
      <section className="mt-4 mxp-card mxp-alert p-4">
        <p className="mxp-label text-mxp-orange">
          Et maintenant ?
        </p>
        <p className="mt-1 text-sm font-medium">{recommendation.action}</p>
        <ul className="mt-1.5 space-y-0.5">
          {recommendation.why.map((fact) => (
            <li key={fact} className="text-xs text-mxp-muted">
              · {fact}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Evening nudge: the app comes to you — « comment s'est passée ta
          journée ? » once the evening is here and the review isn't done ── */}
      {!dayPlan?.reviewedAt &&
        Number(
          new Intl.DateTimeFormat("en-GB", {
            hour: "numeric",
            hour12: false,
            timeZone: user.timezone,
          }).format(new Date())
        ) >= 20 && (
          <Link href="/today/night" className="mt-4 block mxp-card mxp-bluec p-4">
            <p className="mxp-label text-mxp-blue">🌙 C&apos;est l&apos;heure</p>
            <p className="mt-1 text-sm font-medium">
              Comment s&apos;est passée ta journée, {user.name} ?
            </p>
            <p className="mt-0.5 text-xs text-mxp-muted">
              Raconte-la — ton coach te répond, et demain se prépare tout seul.
            </p>
          </Link>
        )}

      {/* ── Défis — « tu acceptes ? » : proposed dares + active progress ── */}
      {challenges.length > 0 && (
        <section className="mt-4 mxp-card mxp-goldc p-4">
          <p className="mxp-label text-mxp-gold">Défis</p>
          <ul className="mt-2 space-y-3">
            {challenges.map((c) => {
              const ticks = c.logs.length;
              const ratio = Math.min(100, Math.round((ticks / c.targetCount) * 100));
              return (
                <li key={c.id}>
                  {c.status === "proposed" ? (
                    <div>
                      <p className="text-sm font-medium">
                        {user.name}, tu acceptes ? — {c.title}
                      </p>
                      {c.description && (
                        <p className="mt-0.5 text-xs text-mxp-muted">{c.description}</p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <form action={acceptProposedChallenge} className="flex-1">
                          <input type="hidden" name="id" value={c.id} />
                          <button className="w-full mxp-btn mxp-btn-gold px-3 py-2 text-xs">
                            J&apos;accepte le défi
                          </button>
                        </form>
                        <form action={declineChallenge}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="mxp-btn-ghost px-3 py-2 text-xs">Pas maintenant</button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <form action={tickChallengeToday}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          aria-pressed={tickedToday.has(c.id)}
                          disabled={tickedToday.has(c.id)}
                          className={`mxp-check ${tickedToday.has(c.id) ? "on" : ""}`}
                        >
                          ✓
                        </button>
                      </form>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.title}</p>
                        <div className="mxp-rail mt-1.5">
                          <div
                            className="h-full rounded-full bg-mxp-gold"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs tabular-nums text-mxp-muted">
                          {ticks}/{c.targetCount} {c.unitLabel}
                        </p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {challenges.length === 0 && (
        <section className="mt-4 mxp-card p-4">
          <p className="mxp-label text-mxp-gold">Un défi, {user.name} ?</p>
          <ul className="mt-2 space-y-2">
            {STARTER_CHALLENGES.map((sc) => (
              <li key={sc.key} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{sc.title}</p>
                  <p className="text-xs text-mxp-muted">{sc.description}</p>
                </div>
                <form action={acceptStarterChallenge}>
                  <input type="hidden" name="key" value={sc.key} />
                  <button className="mxp-btn-ghost px-3 py-1.5 text-xs">J&apos;accepte</button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-mxp-muted">
            Ton coach peut aussi t&apos;en proposer sur mesure — demande-lui.
          </p>
        </section>
      )}

      {/* ── Main Quest ── */}
      <section className="mt-4 mxp-card mxp-quest p-4">
        <div className="flex items-baseline justify-between">
          <p className="mxp-label text-mxp-purple">⚡ Main Quest</p>
        </div>
        {mainQuest ? (
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <p
              className={`min-w-0 flex-1 text-sm font-medium ${
                mainQuest.status === "DONE" ? "text-mxp-muted line-through" : ""
              }`}
            >
              {mainQuest.title}
            </p>
            {mainQuest.status === "OPEN" ? (
              <form action={completeTask}>
                <input type="hidden" name="id" value={mainQuest.id} />
                <button className="mxp-btn px-3 py-1.5 text-xs">
                  Accompli
                </button>
              </form>
            ) : (
              <span className="text-lg" aria-label="accomplie">
                ✅
              </span>
            )}
            {mainQuest.status === "DONE" &&
              (mainQuest.notes ? (
                <p className="w-full rounded-lg bg-mxp-bg px-3 py-1.5 text-xs italic text-mxp-muted">
                  📝 {mainQuest.notes}
                </p>
              ) : (
                <form action={addTaskNote} className="flex w-full gap-1.5">
                  <input type="hidden" name="id" value={mainQuest.id} />
                  <input
                    type="text"
                    name="note"
                    maxLength={500}
                    placeholder="Une note ? (ce qui a marché, ce que tu retiens…)"
                    className="min-w-0 flex-1 mxp-input px-3 py-1.5 text-xs"
                  />
                  <button className="mxp-btn-ghost px-2.5 py-1.5 text-xs" title="Enregistrer la note">
                    📝
                  </button>
                </form>
              ))}
          </div>
        ) : (
          <form action={setMainQuest} className="mt-2 flex gap-2">
            <input
              type="text"
              name="title"
              required
              maxLength={300}
              placeholder="Le résultat le plus important du jour…"
              className="min-w-0 flex-1 mxp-input px-3 py-2 text-sm"
            />
            <button className="mxp-btn px-3 py-2 text-xs">
              Définir
            </button>
          </form>
        )}
      </section>

      {/* ── Daily Missions ── */}
      <section className="mt-4 mxp-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="mxp-label text-mxp-blue">Missions du jour · 3–5</p>
        </div>
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
              className="min-w-0 flex-1 mxp-input px-3 py-2 text-sm"
            />
            <button className="mxp-btn-ghost px-3 py-2 text-xs">
              +
            </button>
          </form>
        )}
      </section>

      {/* ── Non-Negotiables ── */}
      <section className="mt-4 mxp-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="mxp-label text-mxp-green">Non-négociables</p>
        </div>
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
                  <button aria-pressed={done} className={`mxp-check ${done ? "on" : ""}`}>
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
              className="min-w-0 flex-1 mxp-input px-3 py-2 text-sm"
            />
            <button className="mxp-btn-ghost px-3 py-2 text-xs">
              +
            </button>
          </form>
        )}
      </section>

      {/* ── Habit quick taps ── */}
      {goodHabits.length > 0 && (
        <section className="mxp-card mt-4 p-4">
          <div className="flex items-baseline justify-between">
            <p className="mxp-label text-mxp-green">Habitudes</p>
            <Link href="/habits" className="text-xs font-medium text-mxp-green">
              Gérer →
            </Link>
          </div>
          <ul className="mt-2 space-y-2.5">
            {goodHabits.map((h) => {
              const taps = h.logs[0]?.value ?? 0;
              return (
                <li key={h.id} className="flex items-center gap-3">
                  <form action={tapHabit}>
                    <input type="hidden" name="id" value={h.id} />
                    <button
                      title="Fait !"
                      className="mxp-btn h-8 w-8 rounded-full p-0 text-sm leading-none"
                    >
                      +
                    </button>
                  </form>
                  <span className="min-w-0 flex-1 text-sm">
                    {h.title}
                    {taps > 0 && (
                      <span className="ml-2 rounded-full bg-mxp-green/12 px-2 py-0.5 text-[10px] font-bold text-mxp-green tabular-nums">
                        ×{taps}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Side Quests ── */}
      <section className="mt-4 mb-6 mxp-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="mxp-label text-mxp-muted">Side quests · optionnel</p>
        </div>
        <TaskList tasks={sideQuests} empty="Rien ici — c'est très bien ainsi." />
        <form action={addTask} className="mt-3 flex gap-2">
          <input type="hidden" name="tier" value="SIDE_QUEST" />
          <input
            type="text"
            name="title"
            required
            maxLength={300}
            placeholder="Petite action optionnelle…"
            className="min-w-0 flex-1 mxp-input px-3 py-2 text-sm"
          />
          <button className="mxp-btn-ghost px-3 py-2 text-xs">
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
  tasks: Array<{ id: string; title: string; status: string; postponeCount: number; notes: string }>;
  empty: string;
}) {
  if (tasks.length === 0) return <p className="mt-2 text-sm text-mxp-muted">{empty}</p>;
  return (
    <ul className="mt-2 space-y-2">
      {tasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2">
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
                  className="mxp-btn-ghost px-2 py-1 text-xs hover:text-mxp-green"
                >
                  ✓
                </button>
              </form>
              <form action={postponeTask}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  title="Reporter à demain"
                  className="mxp-input px-2 py-1 text-xs text-mxp-muted hover:text-mxp-ink"
                >
                  →
                </button>
              </form>
              <form action={deleteTask}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  title="Supprimer"
                  className="mxp-input px-2 py-1 text-xs text-mxp-muted hover:text-mxp-red"
                >
                  ×
                </button>
              </form>
            </span>
          ) : (
            <span aria-label="accomplie">✅</span>
          )}
          {t.status === "DONE" &&
            (t.notes ? (
              <p className="w-full rounded-lg bg-mxp-bg px-3 py-1.5 text-xs italic text-mxp-muted no-underline">
                📝 {t.notes}
              </p>
            ) : (
              <form action={addTaskNote} className="flex w-full gap-1.5">
                <input type="hidden" name="id" value={t.id} />
                <input
                  type="text"
                  name="note"
                  maxLength={500}
                  placeholder="Une note ? (ce qui a marché, ce que tu retiens…)"
                  className="min-w-0 flex-1 mxp-input px-3 py-1.5 text-xs"
                />
                <button className="mxp-btn-ghost px-2.5 py-1.5 text-xs" title="Enregistrer la note">
                  📝
                </button>
              </form>
            ))}
        </li>
      ))}
    </ul>
  );
}
