import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { dayKey } from "@/lib/mainxp/day";
import {
  addMonths,
  loadDayReplay,
  loadMonthJourney,
  monthDays,
  monthGridOffset,
  monthKeyOf,
} from "@/lib/mainxp/journey";
import { IconCheck } from "../../components/icons";

// MON PARCOURS — see what you actually did. One quiet mark per day; tap a
// date and the day replays itself from real records. Nothing here is ever
// invented, and an empty day is information, not an accusation.

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; d?: string }>;
}) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const { m, d } = await searchParams;
  const today = dayKey(new Date(), user.timezone);
  const monthKey = m && /^\d{4}-\d{2}$/.test(m) ? m : monthKeyOf(today);
  const selected =
    d && /^\d{4}-\d{2}-\d{2}$/.test(d) && monthKeyOf(d) === monthKey
      ? d
      : monthKey === monthKeyOf(today)
        ? today
        : null;

  const [journey, replay] = await Promise.all([
    loadMonthJourney(user, monthKey),
    selected && selected <= today ? loadDayReplay(user, selected) : Promise.resolve(null),
  ]);

  const offset = monthGridOffset(monthKey);
  const monthLabel = new Date(`${monthKey}-15T12:00:00Z`).toLocaleDateString("fr-CH", {
    month: "long",
    year: "numeric",
  });
  const dayLabel = selected
    ? new Date(`${selected}T12:00:00Z`).toLocaleDateString("fr-CH", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  const markFor = new Map(journey.days.map((x) => [x.day, x]));

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="mxp-meta">← Aujourd&apos;hui</Link>
      <h1 className="mt-3 mxp-display">Mon parcours</h1>
      <p className="mxp-meta mt-1">Ce que tu as réellement fait, jour après jour.</p>

      {/* ── Month header: quiet navigation, the month is the anchor ── */}
      <div className="mt-5 flex items-center justify-between">
        <Link
          href={`/journey?m=${addMonths(monthKey, -1)}`}
          aria-label="Mois précédent"
          className="rounded-full px-3 py-1.5 text-[17px] text-mxp-muted transition active:scale-90"
        >
          ‹
        </Link>
        <div className="text-center">
          <p className="font-displaymx text-[17px] capitalize">{monthLabel}</p>
          {(journey.activeDays > 0 || journey.restDays > 0) && (
            <p className="mxp-meta mt-0.5 tabular-nums">
              {`${journey.activeDays} jour${journey.activeDays > 1 ? "s" : ""} d'action`}
              {journey.questDays > 0 && ` · ${journey.questDays} quête${journey.questDays > 1 ? "s" : ""}`}
              {journey.restDays > 0 && ` · ${journey.restDays} récup.`}
            </p>
          )}
        </div>
        <Link
          href={`/journey?m=${addMonths(monthKey, 1)}`}
          aria-label="Mois suivant"
          className="rounded-full px-3 py-1.5 text-[17px] text-mxp-muted transition active:scale-90"
        >
          ›
        </Link>
      </div>
      {monthKey !== monthKeyOf(today) && (
        <p className="mt-1 text-center">
          <Link href="/journey" className="mxp-meta font-semibold text-mxp-purple">
            Revenir à aujourd&apos;hui
          </Link>
        </p>
      )}

      {/* ── The grid: generous cells, one mark, silence stays calm ── */}
      <div className="mt-3 grid grid-cols-7 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="pb-1 text-[10px] font-bold uppercase tracking-wide text-mxp-muted">
            {w}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`sp-${i}`} />
        ))}
        {monthDays(monthKey).map((day) => {
          const info = markFor.get(day);
          const isToday = day === today;
          const isSelected = day === selected;
          const isFuture = day > today;
          return (
            <Link
              key={day}
              href={`/journey?m=${monthKey}&d=${day}`}
              aria-label={`${day}${info?.mark === "quest" ? " — quête accomplie" : info?.mark === "active" ? " — journée active" : info?.mark === "rest" ? " — récupération" : ""}`}
              aria-current={isSelected ? "date" : undefined}
              className={`relative flex h-12 flex-col items-center justify-center gap-1 rounded-xl transition active:scale-90 ${
                isSelected ? "bg-mxp-purple-soft" : ""
              }`}
            >
              <span
                className={`text-[13px] leading-none tabular-nums ${
                  isToday
                    ? "font-bold text-mxp-purple"
                    : isFuture
                      ? "text-mxp-line"
                      : "font-medium text-mxp-ink"
                }`}
              >
                {Number(day.slice(8))}
              </span>
              <span aria-hidden className="flex h-2 items-center justify-center">
                {info?.mark === "quest" ? (
                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-mxp-purple to-mxp-purple-deep" />
                ) : info?.mark === "active" ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-mxp-ink/25" />
                ) : info?.mark === "rest" ? (
                  <span className="h-2 w-2 rounded-full border-[1.5px] border-mxp-teal" />
                ) : null}
              </span>
              {info?.gold && (
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rotate-45 bg-mxp-gold"
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* ── DAY REPLAY — only what was really recorded ── */}
      {selected && (
        <section className="mt-5 mxp-anchor">
          <p className="mxp-label text-mxp-purple capitalize">{dayLabel}</p>

          {!replay ? (
            <p className="mxp-body mt-2 text-mxp-muted">Ce jour n&apos;est pas encore écrit.</p>
          ) : replay.empty ? (
            <p className="mxp-body mt-2 text-mxp-muted">Aucune activité enregistrée ce jour-là.</p>
          ) : (
            <>
              {replay.quest && (
                <p className="mt-2 mxp-title">
                  {replay.quest.done && (
                    <IconCheck className="mr-1.5 inline h-[15px] w-[15px] align-[-2px] text-mxp-green" />
                  )}
                  {replay.quest.title}
                </p>
              )}

              {(replay.missionsDone > 0 ||
                replay.nnLogged > 0 ||
                replay.focusMin > 0 ||
                replay.trainings.length > 0 ||
                replay.challengeTicks > 0 ||
                replay.resets > 0) && (
                <div className="mt-3">
                  <p className="mxp-label text-mxp-muted">La preuve</p>
                  <ul className="mt-1.5 space-y-1 mxp-body tabular-nums">
                    {replay.missionsDone > 0 && (
                      <li>{replay.missionsDone} mission{replay.missionsDone > 1 ? "s" : ""} accomplie{replay.missionsDone > 1 ? "s" : ""}</li>
                    )}
                    {replay.nnLogged > 0 && (
                      <li>{replay.nnKept}/{replay.nnLogged} engagements tenus</li>
                    )}
                    {replay.focusMin > 0 && <li>{replay.focusMin} min de focus vérifiées</li>}
                    {replay.trainings.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                    {replay.challengeTicks > 0 && (
                      <li>{replay.challengeTicks} défi{replay.challengeTicks > 1 ? "s" : ""} coché{replay.challengeTicks > 1 ? "s" : ""}</li>
                    )}
                    {replay.resets > 0 && (
                      <li>{replay.resets} reset{replay.resets > 1 ? "s" : ""} — revenu à l&apos;action</li>
                    )}
                  </ul>
                </div>
              )}

              {(replay.gratitudeMorning ||
                replay.gratitudeNight ||
                replay.journalEntries > 0 ||
                replay.morningStarted ||
                replay.nightReviewed) && (
                <div className="mt-3">
                  <p className="mxp-label text-mxp-muted">L&apos;esprit</p>
                  <p className="mxp-body mt-1.5">
                    {[
                      replay.morningStarted && "matin lancé",
                      replay.gratitudeMorning && "gratitude du matin",
                      replay.gratitudeNight && "gratitude du soir",
                      replay.journalEntries > 0 &&
                        `${replay.journalEntries} page${replay.journalEntries > 1 ? "s" : ""} de journal`,
                      replay.nightReviewed && "revue du soir",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              )}

              {replay.earned.length > 0 && (
                <div className="mt-3">
                  <p className="mxp-label text-mxp-gold">Gagné ce jour-là</p>
                  <ul className="mt-1.5 space-y-1 mxp-body">
                    {replay.earned.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {replay.xpNet > 0 && (
                <p className="mxp-meta mt-4 border-t border-mxp-line pt-3 tabular-nums">
                  {replay.xpNet} MAINXP ce jour-là
                </p>
              )}
            </>
          )}
        </section>
      )}

      <p className="mxp-meta mt-6 px-1">
        Chaque marque vient d&apos;un fait enregistré — rien n&apos;est inventé, et un jour
        vide ne dit rien d&apos;autre que « rien d&apos;enregistré ».
      </p>
    </main>
  );
}
