import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { DISCIPLINES, GRADES, GRADE_COLOR, GRADE_LABEL, MAX_FOCUS_ACTIVE } from "@/lib/mainxp/dojo";
import { IconCheck } from "../../components/icons";
import { NoteAction } from "../../components/NoteAction";
import { addFocus, logTraining, masterFocus, noteOnFocus, reopenFocus, saveSportProfile } from "./actions";

// LE DOJO — the body's floor of the game. BJJ first: sessions are logged in
// one gesture, "ce que je travaille" holds the craft, the belt hangs at the
// top. No shame anywhere: a light week is a number, never a verdict.

export default async function DojoPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const now = new Date();
  const today = dayKey(now, user.timezone);
  const [y, m, d] = today.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
  const monday = addDays(today, -weekday);

  const [profile, weekSessions, focusItems, recent] = await Promise.all([
    prisma.mxSportProfile.findUnique({ where: { userId: user.id } }),
    prisma.mxTrainingSession.findMany({
      where: { userId: user.id, dayKey: { gte: monday, lte: today } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.mxTrainingFocus.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.mxTrainingSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const grade = profile?.grade ?? "blanche";
  const stripes = profile?.stripes ?? 0;
  const target = profile?.weeklyTarget ?? 3;
  const discipline = profile?.discipline ?? "Jiu-jitsu brésilien";

  const weekCount = weekSessions.length;
  const weekMin = weekSessions.reduce((s, x) => s + x.minutes, 0);
  const weekRounds = weekSessions.reduce((s, x) => s + x.rounds, 0);
  const discs = Math.max(target, weekCount);

  const working = focusItems.filter((f) => f.status === "working");
  const solid = focusItems.filter((f) => f.status === "solid");

  const sessionLabel = (s: (typeof recent)[number]) =>
    s.discipline === "bjj"
      ? `BJJ${s.style ? (s.style === "gi" ? " · gi" : " · no-gi") : ""}`
      : (DISCIPLINES[s.discipline] ?? s.discipline);

  const dayLabel = (key: string) =>
    key === today
      ? "Aujourd'hui"
      : new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-CH", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });

  return (
    <main className="px-4 pt-5 pb-8">
      <h1 className="mxp-display">Le Dojo</h1>
      <p className="mxp-meta mt-1">
        {discipline} · {GRADE_LABEL[grade] ?? grade}
        {stripes > 0 && ` · ${stripes} barrette${stripes > 1 ? "s" : ""}`}
      </p>

      {/* The belt on the wall — earned outside, worn here. */}
      <div
        aria-hidden
        className="mxp-belt mt-3"
        style={{ background: GRADE_COLOR[grade] ?? GRADE_COLOR.blanche }}
      >
        <span className="mxp-belt-rank" style={grade === "noire" ? { background: "#a02020" } : undefined}>
          {Array.from({ length: stripes }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      </div>

      {/* ── THE ANCHOR: this week on the mat, and the one-gesture log ── */}
      <section className="mt-5 mxp-anchor">
        <p className="mxp-label text-mxp-purple">Cette semaine</p>
        <div className="mt-3 flex items-center gap-2" role="img" aria-label={`${weekCount} séance${weekCount > 1 ? "s" : ""} sur ${target} visées cette semaine`}>
          {Array.from({ length: discs }, (_, i) => (
            <span key={i} aria-hidden className={`mxp-dojo-disc ${i < weekCount ? "on" : ""}`}>
              <IconCheck />
            </span>
          ))}
          <span className="mxp-meta ml-1 tabular-nums">
            {weekCount}/{target}
          </span>
        </div>
        {(weekMin > 0 || weekRounds > 0) && (
          <p className="mxp-meta mt-2 tabular-nums">
            {weekMin} min sur le tapis{weekRounds > 0 && ` · ${weekRounds} rounds de sparring`}
          </p>
        )}

        <form action={logTraining} className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Discipline">
            {Object.entries(DISCIPLINES).map(([key, label], i) => (
              <label key={key} className="cursor-pointer">
                <input type="radio" name="discipline" value={key} defaultChecked={i === 0} className="peer sr-only" />
                <span className="mxp-chip border border-mxp-line bg-white text-mxp-muted transition peer-checked:border-mxp-purple peer-checked:bg-mxp-purple-soft peer-checked:text-mxp-purple-deep">
                  {label}
                </span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Tenue (BJJ)">
            {[
              ["gi", "Gi"],
              ["nogi", "No-gi"],
            ].map(([v, label], i) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" name="style" value={v} defaultChecked={i === 0} className="peer sr-only" />
                <span className="mxp-chip border border-mxp-line bg-white text-mxp-muted transition peer-checked:border-mxp-teal peer-checked:bg-mxp-teal/10 peer-checked:text-mxp-teal">
                  {label}
                </span>
              </label>
            ))}
            <span className="mx-1 h-4 w-px bg-mxp-line" aria-hidden />
            {[30, 45, 60, 90, 120].map((min) => (
              <label key={min} className="cursor-pointer">
                <input type="radio" name="minutes" value={min} defaultChecked={min === 90} className="peer sr-only" />
                <span className="mxp-chip border border-mxp-line bg-white tabular-nums text-mxp-muted transition peer-checked:border-mxp-purple peer-checked:bg-mxp-purple-soft peer-checked:text-mxp-purple-deep">
                  {min}&nbsp;min
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="mxp-meta flex items-center gap-2">
              Rounds
              <input
                type="number"
                name="rounds"
                min={0}
                max={30}
                defaultValue={0}
                className="mxp-input w-16 px-2 py-1.5 text-center text-sm tabular-nums"
              />
            </label>
            <input
              type="text"
              name="note"
              maxLength={2000}
              placeholder="Ce qui a marché, ce qui t'a fait prendre…"
              className="mxp-input min-w-0 flex-1 px-3 py-1.5 text-sm"
            />
          </div>

          <button className="mxp-btn w-full py-3 text-[15px]">Séance faite</button>
        </form>
      </section>

      {/* ── The craft: what I am working on right now ── */}
      <section className="mxp-card mt-4 p-4">
        <p className="mxp-label text-mxp-teal">Ce que je travaille</p>
        <p className="mxp-meta mt-1">
          Cinq chantiers maximum — un art se construit une technique à la fois.
        </p>

        {working.length > 0 && (
          <ul className="mt-3 space-y-3">
            {working.map((f) => (
              <li key={f.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="mxp-body min-w-0 flex-1 font-medium">{f.title}</p>
                  <form action={masterFocus} className="flex-none">
                    <input type="hidden" name="id" value={f.id} />
                    <button className="mxp-btn-ghost px-3 py-1.5 text-xs">Acquise</button>
                  </form>
                </div>
                <NoteAction
                  id={f.id}
                  note={f.note}
                  label={f.title}
                  placeholder="Détails, repères, ce qui échoue encore…"
                  save={noteOnFocus}
                />
              </li>
            ))}
          </ul>
        )}

        {working.length < MAX_FOCUS_ACTIVE ? (
          <form action={addFocus} className="mt-4 flex gap-2">
            <input
              type="text"
              name="title"
              maxLength={120}
              required
              placeholder="Ex. Passage de garde — knee cut"
              className="mxp-input min-w-0 flex-1 px-3 py-2 text-sm"
            />
            <button className="mxp-btn flex-none px-4 py-2 text-sm">Travailler</button>
          </form>
        ) : (
          <p className="mxp-meta mt-3">
            Chantiers pleins — déclare une technique acquise pour en ouvrir un autre.
          </p>
        )}

        {solid.length > 0 && (
          <details className="mt-4 border-t border-mxp-line pt-3">
            <summary className="mxp-meta cursor-pointer list-none">
              Techniques acquises ({solid.length}) →
            </summary>
            <ul className="mt-2 space-y-2">
              {solid.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3">
                  <p className="mxp-body min-w-0 flex-1">
                    <IconCheck className="mr-1 inline h-[13px] w-[13px] align-[-2px] text-mxp-green" />
                    {f.title}
                  </p>
                  <form action={reopenFocus} className="flex-none">
                    <input type="hidden" name="id" value={f.id} />
                    <button className="mxp-btn-ghost px-3 py-1 text-xs">Retravailler</button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ── The log: recent sessions, facts only ── */}
      {recent.length > 0 && (
        <section className="mt-6">
          <p className="mxp-label text-mxp-muted">Dernières séances</p>
          <ul className="mt-2 divide-y divide-mxp-line">
            {recent.map((s) => (
              <li key={s.id} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="mxp-body min-w-0 flex-1 truncate font-medium">{sessionLabel(s)}</p>
                  <p className="mxp-meta flex-none tabular-nums">
                    {dayLabel(s.dayKey)} · {s.minutes} min{s.rounds > 0 && ` · ${s.rounds} rd`}
                  </p>
                </div>
                {s.note && <p className="mxp-meta mt-0.5">{s.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── The belt & the ambition — quiet settings, folded away ── */}
      <details className="mxp-card mt-6 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="mxp-body font-medium">Ceinture &amp; objectif</span>
          <span aria-hidden className="mxp-meta">
            Régler →
          </span>
        </summary>
        <form action={saveSportProfile} className="mt-4 space-y-3">
          <label className="block">
            <span className="mxp-meta">Discipline</span>
            <input
              type="text"
              name="discipline"
              maxLength={40}
              defaultValue={discipline}
              className="mxp-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="mxp-meta">Ceinture</span>
              <select name="grade" defaultValue={grade} className="mxp-input mt-1 w-full px-2 py-2 text-sm">
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mxp-meta">Barrettes</span>
              <select name="stripes" defaultValue={stripes} className="mxp-input mt-1 w-full px-2 py-2 text-sm">
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mxp-meta">Séances/sem.</span>
              <select name="weeklyTarget" defaultValue={target} className="mxp-input mt-1 w-full px-2 py-2 text-sm">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="mxp-btn w-full py-2.5 text-sm">Enregistrer</button>
        </form>
      </details>

      <p className="mxp-meta mt-6 px-1">
        Chaque séance nourrit ta Force (l&apos;Endurance pour le cardio) — et garde ta
        flamme allumée. Le grade, lui, se gagne sur le tapis : ici on ne fait que
        l&apos;accrocher au mur.
      </p>
    </main>
  );
}
