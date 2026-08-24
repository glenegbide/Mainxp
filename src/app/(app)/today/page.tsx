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
import { BlockHero } from "../../components/BlockHero";
import { dominantAttribute } from "@/lib/mainxp/xp/dominant";
import { elanReport } from "@/lib/mainxp/elan";
import {
  addNonNegotiable,
  addTask,
  completeTask,
  deleteTask,
  postponeTask,
  setMainQuest,
} from "./actions";
import { CheckAction } from "../../components/CheckAction";
import { NoteAction } from "../../components/NoteAction";
import { noteOnCommitment, noteOnTask } from "../note-actions";
import { IconBolt, IconCoin } from "../../components/icons";
import { DayRing } from "../../components/DayRing";
import {
  completeTaskRewarded,
  toggleMinimumSlotRewarded,
  toggleNonNegotiableRewarded,
} from "./feedback-actions";
import { tapHabit } from "../habits/actions";
import { activateMinimumDay, submitComeback } from "./day-actions";
import {
  IconFlag,
  IconTomorrow,
  IconTrash,
  IconMoon,
  IconPen,
  IconSpark,
  IconSunrise,
  IconTimer,
} from "../../components/icons";

export default async function TodayPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const now = new Date();
  const today = dayKey(now, user.timezone);

  // ONE round trip's worth of waiting: every query the screen needs goes out
  // at the same time. Three sequential waves used to cost three latencies on a
  // remote database — invisible on localhost, very visible on a phone.
  const [
    tasks,
    nonNegotiables,
    nnLogs,
    totals,
    recentTx,
    activeGoals,
    dayPlan,
    challenges,
    elan,
    gearEquipped,
    goodHabits,
    lastEvent,
    comebackDoneToday,
    focusToday,
  ] = await Promise.all([
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
    prisma.mxChallenge.findMany({
      where: { userId: user.id, status: "active" },
      include: { logs: true },
      orderBy: { createdAt: "asc" },
    }),
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
    prisma.mxFocusSession.findMany({
      where: { userId: user.id, endedAt: { not: null }, startedAt: { gte: new Date(now.getTime() - 20 * 3600_000) } },
      select: { startedAt: true, endedAt: true },
    }),
  ]);
  const equippedIds = gearEquipped.map((g) => g.gearId);
  const focusMinToday = focusToday.reduce(
    (sum, f) => sum + Math.round((f.endedAt!.getTime() - f.startedAt.getTime()) / 60_000),
    0
  );
  // The sky follows the user's clock (Headspace taught everyone this feels
  // like care): dawn, day, dusk, night — same band, different light.
  const hourLocal = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: user.timezone }).format(new Date())
  );
  const sky =
    hourLocal >= 5 && hourLocal < 9
      ? "mxp-hero-dawn"
      : hourLocal >= 9 && hourLocal < 17
        ? ""
        : hourLocal >= 17 && hourLocal < 21
          ? "mxp-hero-dusk"
          : "mxp-hero-night";

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
  const noteByNn = new Map(nnLogs.map((l) => [l.nonNegotiableId, l.note]));

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
      {/* ── Status band. It used to eat half the first screen; the day's work
          has to be what you see first, so identity is now one compact row and
          two hairlines. ── */}
      <section className={`mxp-hero ${sky} px-3.5 py-3 text-white`}>
        <div className="relative z-10 flex items-center gap-3">
          <DayRing
            questDone={mainQuest?.status === "DONE"}
            nnKept={nnLogs.filter((l) => l.completed).length}
            nnTotal={nonNegotiables.length}
            focusMin={focusMinToday}
            size={56}
          >
            <BlockHero
              level={lp.level}
              size={34}
              gear={equippedIds}
              dominant={dominantAttribute(totals.attributes)}
            />
          </DayRing>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="font-displaymx text-[17px] leading-none">Niv. {lp.level}</span>
              <span className="truncate text-[13px] text-white/75">{user.name}</span>
            </span>
            <span className="mt-1 flex items-center gap-2 text-[11px] tabular-nums text-white/75">
              <span className="mxp-xpbar h-[5px] flex-1">
                <i style={{ width: `${Math.max(2, Math.round(lp.ratio * 100))}%` }} />
              </span>
              <span>{lp.intoLevel}/{lp.neededForNext}</span>
            </span>
          </span>
          <span className="flex flex-none flex-col items-end gap-0.5 text-[11px] tabular-nums text-white/80">
            <span>{elan.value === null ? "Récup." : `Élan ${elan.value}`}</span>
            {totals.coins > 0 && (
              <span className="flex items-center gap-1">
                {totals.coins} <IconCoin className="h-[12px] w-[12px]" />
              </span>
            )}
            {streak > 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-amber-200">
                <IconBolt className="h-[11px] w-[11px]" /> {streak} j
              </span>
            )}
          </span>
        </div>
      </section>

      {user.onboardingStage === "new" && (
        <Link
          href="/onboarding"
          className="mt-3 block rounded-2xl border-2 border-mxp-purple/50 bg-mxp-purple-soft px-5 py-3 text-sm font-medium text-mxp-purple-deep"
        >
          Apprends à me connaître — 5 questions pour que le coach comprenne ta vie →
        </Link>
      )}

      {goalAtRisk && (
        <Link
          href={`/goals/${goalAtRisk.id}`}
          className="mt-3 block mxp-card px-5 py-3 mxp-meta"
        >
          <span className="font-semibold text-mxp-orange">Objectif à risque : </span>
          {goalAtRisk.title} →
        </Link>
      )}

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <h1 className="mxp-display">Aujourd&apos;hui</h1>
        <p className="mxp-meta">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
      </div>

      {/* ── Comeback Quest ── */}
      {showComeback && (
        <section className="mxp-card mt-4 p-4">
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
            choses et appelle ça une journée de récupération réussie.
          </p>
          <ul className="mt-3 space-y-2.5">
            {(
              [
                ["body", "Corps — une action minimum (marcher, s'étirer, dormir tôt)", dayPlan?.minBodyDone],
                ["progress", "Progrès — une seule action qui compte vraiment", dayPlan?.minProgressDone],
                ["mind", "Esprit — une action de reset (respirer, écrire 3 lignes)", dayPlan?.minMindDone],
              ] as const
            ).map(([slot, label, done]) => (
              <li key={slot} className="flex items-start gap-3 py-1">
                <CheckAction
                  id={slot}
                  done={!!done}
                  label={label}
                  act={toggleMinimumSlotRewarded}
                />
                <span className={`mxp-body ${done ? "text-mxp-muted line-through" : ""}`}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* The won day: quest done + every commitment kept → the app says the
          quietly radical thing it was built to say. */}
      {mainQuest?.status === "DONE" &&
        nonNegotiables.length > 0 &&
        nnLogs.filter((l) => l.completed).length >= nonNegotiables.length && (
          <p className="mt-3 rounded-2xl bg-mxp-purple-soft/40 px-4 py-3 text-center mxp-body font-medium text-mxp-purple-deep">
            Journée pleine. Ferme l&apos;app, va vivre — c&apos;est exactement ça, gagner.
          </p>
        )}

      {/* ── L'ANCRE — la seule chose dominante de l'écran : ce qui compte
          maintenant, expliqué, avec UNE action pleine largeur. Quête
          principale et « et maintenant ? » ne font qu'un. ── */}
      <section
        className={`mt-5 mxp-anchor ${mainQuest?.status === "DONE" ? "mxp-anchor-victory" : ""}`}
      >
        {mainQuest?.status === "DONE" ? (
          <p className="mxp-victory-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" />
              <path d="M8 6H5.5c0 2.5 1.1 4 2.8 4.4M16 6h2.5c0 2.5-1.1 4-2.8 4.4M12 12.5V16M9 19h6M10.5 16h3" />
            </svg>
            Quête accomplie
          </p>
        ) : (
          <p className="mxp-label text-mxp-purple">
            {mainQuest ? "Quête principale" : "Et maintenant ?"}
          </p>
        )}

        {mainQuest ? (
          <>
            <p className="mt-2 mxp-title">{mainQuest.title}</p>
            {mainQuest.status === "OPEN" ? (
              <>
                <ul className="mt-3 space-y-1">
                  {recommendation.why.map((fact) => (
                    <li key={fact} className="mxp-meta">
                      {fact}
                    </li>
                  ))}
                </ul>
                <form action={completeTask} className="mt-5">
                  <input type="hidden" name="id" value={mainQuest.id} />
                  <button className="mxp-btn w-full py-3 text-[15px]">C&apos;est fait</button>
                </form>
              </>
            ) : (
              <>
                <p className="mt-2 mxp-body text-mxp-muted">{recommendation.action}</p>
                <NoteAction
                  id={mainQuest.id}
                  label={mainQuest.title}
                  note={mainQuest.notes}
                  placeholder="Ce que tu retiens de cette quête…"
                  save={noteOnTask}
                />
              </>
            )}
          </>
        ) : (
          <>
            <p className="mt-2 mxp-title">{recommendation.action}</p>
            <ul className="mt-3 space-y-1">
              {recommendation.why.map((fact) => (
                <li key={fact} className="mxp-meta">
                  {fact}
                </li>
              ))}
            </ul>
            <form action={setMainQuest} className="mt-5 space-y-2">
              <input
                type="text"
                name="title"
                required
                maxLength={300}
                placeholder="Le résultat le plus important du jour…"
                className="w-full mxp-input px-4"
              />
              <button className="mxp-btn w-full py-3 text-[15px]">
                Définir ma quête principale
              </button>
            </form>
          </>
        )}
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
          <Link href="/today/night" className="mt-6 block mxp-card p-4">
            <p className="mxp-label text-mxp-blue">C&apos;est l&apos;heure</p>
            <p className="mt-1 text-sm font-medium">
              Comment s&apos;est passée ta journée, {user.name} ?
            </p>
            <p className="mt-0.5 text-xs text-mxp-muted">
              Raconte-la — ton coach te répond, et demain se prépare tout seul.
            </p>
          </Link>
        )}

      {/* ── Un défi actif : une ligne, jamais un menu (les défis vivent sur /defis) ── */}
      {challenges
        .slice(0, 1)
        .map((c) => {
          const ticks = c.logs.length;
          return (
            <Link key={c.id} href="/defis" className="mt-6 block">
              <div className="flex items-baseline justify-between gap-3">
                <p className="mxp-body font-medium">{c.title}</p>
                <span className="mxp-meta tabular-nums">
                  {ticks}/{c.targetCount}
                </span>
              </div>
              <div className="mxp-rail mt-2">
                <i
                  className="bg-mxp-purple"
                  style={{ width: `${Math.min(100, Math.round((ticks / c.targetCount) * 100))}%` }}
                />
              </div>
            </Link>
          );
        })}

      {/* ── Daily Missions ── */}
      <section className="mt-4 mxp-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="mxp-label text-mxp-blue">Missions du jour</p>
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
            3 à 7 engagements que tu tiens quoi qu&apos;il arrive.
          </p>
        )}
        <ul className="mt-2 space-y-2">
          {nonNegotiables.map((nn) => {
            const done = doneByNn.get(nn.id) ?? false;
            return (
              <li key={nn.id} className="flex items-start gap-3 py-1">
                <span className="pt-0.5">
                  <CheckAction
                    id={nn.id}
                    done={done}
                    label={nn.title}
                    act={toggleNonNegotiableRewarded}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`mxp-body block ${done ? "text-mxp-muted line-through" : ""}`}>
                    {nn.title}
                  </span>
                  <NoteAction
                    id={nn.id}
                    label={nn.title}
                    note={noteByNn.get(nn.id) ?? ""}
                    placeholder="Ce que ça t'a coûté, ou ce qui l'a rendu facile…"
                    save={noteOnCommitment}
                  />
                </span>
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
      {/* ── Rituels & outils : une seule rangée calme, icônes premium (pas
          d'emoji), l'état se lit à la couleur — pas de bruit. ── */}
      <div className="mt-7 grid grid-cols-6 gap-1.5">
        {(
          [
            ["/today/morning", IconSunrise, "Matin", "text-mxp-orange bg-mxp-orange/10", !!dayPlan?.startedAt],
            ["/focus", IconTimer, "Arène", "text-mxp-blue bg-mxp-blue/10", false],
            ["/defis", IconFlag, "Défis", "text-mxp-gold bg-mxp-gold/10", false],
            ["/journal", IconPen, "Journal", "text-mxp-teal bg-mxp-teal/10", false],
            ["/dump", IconSpark, "Vide-tête", "text-mxp-purple bg-mxp-purple/10", false],
            ["/today/night", IconMoon, "Soir", "text-mxp-purple-deep bg-mxp-purple/10", !!dayPlan?.reviewedAt],
          ] as const
        ).map(([href, Icon, label, tint, done]) => (
          <Link
            key={href}
            href={href}
            aria-label={`${label}${done ? " — fait" : ""}`}
            className="group flex flex-col items-center gap-1 py-1 text-center"
          >
            <span
              aria-hidden
              className={`mxp-tile transition ${
                done ? "bg-mxp-bg text-mxp-muted" : tint
              } group-active:scale-95`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span
              className={`text-[11px] font-semibold leading-tight ${
                done ? "text-mxp-muted" : "text-mxp-ink"
              }`}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>


      {!minimum && (
        <form action={activateMinimumDay} className="mt-6 mb-2">
          <button className="mxp-quiet">
            Journée difficile ? → Passe en journée minimum
          </button>
        </form>
      )}

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
    <ul className="mt-1">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-start gap-3 py-1.5">
          <span className="pt-0.5">
            <CheckAction
              id={t.id}
              done={t.status === "DONE"}
              label={t.title}
              act={completeTaskRewarded}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`mxp-body block ${
                t.status === "DONE" ? "text-mxp-muted line-through" : ""
              }`}
            >
              {t.title}
            </span>
            {/* Writing is never gated behind finishing: the note lives on the
                row from the moment the task exists. */}
            <NoteAction
              id={t.id}
              label={t.title}
              note={t.notes}
              placeholder="Ce qui a marché, ce qui a bloqué…"
              save={noteOnTask}
            />
          </span>
          {t.status === "OPEN" ? (
            <span className="flex shrink-0 items-center">
              <form action={postponeTask}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  aria-label={`Reporter à demain : ${t.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-mxp-muted transition active:scale-90 hover:bg-mxp-bg hover:text-mxp-ink"
                >
                  <IconTomorrow className="h-[17px] w-[17px]" />
                </button>
              </form>
              <form action={deleteTask}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  aria-label={`Supprimer : ${t.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-mxp-muted/60 transition active:scale-90 hover:bg-mxp-bg hover:text-mxp-red"
                >
                  <IconTrash className="h-[16px] w-[16px]" />
                </button>
              </form>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
