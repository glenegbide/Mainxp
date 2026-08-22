import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/mainxp/day";
import { NoteAction } from "../../components/NoteAction";
import { TapAction } from "../../components/TapAction";
import { noteOnHabit } from "../note-actions";
import { tapHabitRewarded } from "../today/feedback-actions";
import { archiveHabit, createHabit } from "./actions";
import { IconTrash } from "../../components/icons";

const ATTR_OPTIONS = [
  ["", "— attribut nourri —"],
  ["STRENGTH", "Force"],
  ["ENDURANCE", "Endurance"],
  ["FOCUS", "Focus"],
  ["DISCIPLINE", "Discipline"],
  ["KNOWLEDGE", "Connaissance"],
  ["STRATEGY", "Stratégie"],
  ["WEALTH", "Richesse"],
  ["MIND", "Esprit"],
  ["SOCIAL", "Social"],
] as const;

// Habitudes — ONE purpose: tap what you did today. The anchor is today's
// tally; everything else (adding, reducing, archiving) is quieter.
export default async function HabitsPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);
  const habits = await prisma.mxHabit.findMany({
    where: { userId: user.id, active: true },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    include: { logs: { where: { periodKey: today } } },
  });
  const good = habits.filter((h) => h.kind === "good");
  const bad = habits.filter((h) => h.kind === "bad");
  const tappedToday = good.filter((h) => (h.logs[0]?.value ?? 0) > 0).length;

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="mxp-meta">← Aujourd&apos;hui</Link>
      <h1 className="mt-3 mxp-display">Habitudes</h1>
      <p className="mxp-meta mt-1">
        Ce que tu répètes construit ton personnage. Tape quand c&apos;est fait.
      </p>

      {/* ── The anchor: today's tally + the taps themselves ── */}
      {good.length > 0 ? (
        <section className="mt-5 mxp-anchor">
          <div className="flex items-baseline justify-between">
            <p className="mxp-label text-mxp-purple">Aujourd&apos;hui</p>
            <span className="font-displaymx text-[22px] leading-none tabular-nums">
              {tappedToday}/{good.length}
            </span>
          </div>
          <ul className="mt-4 divide-y divide-mxp-line">
            {good.map((h) => (
              <li key={h.id} className="flex items-start gap-3 py-2.5">
                <TapAction
                  id={h.id}
                  label={h.title}
                  count={h.logs[0]?.value ?? 0}
                  act={tapHabitRewarded}
                />
                <div className="min-w-0 flex-1">
                  <p className="mxp-body font-medium">{h.title}</p>
                  {h.description && <p className="mxp-meta">{h.description}</p>}
                  <NoteAction
                    id={h.id}
                    label={h.title}
                    note={h.logs[0]?.note ?? ""}
                    placeholder="Comment c'était aujourd'hui ?"
                    save={noteOnHabit}
                  />
                </div>
                <form action={archiveHabit}>
                  <input type="hidden" name="id" value={h.id} />
                  <button
                    aria-label={`Archiver : ${h.title}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-mxp-muted/60 transition active:scale-90 hover:bg-mxp-bg hover:text-mxp-red"
                  >
                    <IconTrash className="h-[17px] w-[17px]" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="mt-5 mxp-anchor">
          <p className="mxp-label text-mxp-purple">Commence par une</p>
          <p className="mt-2 mxp-title">Une seule habitude, tenue vraiment.</p>
          <p className="mt-2 mxp-body text-mxp-muted">
            Lire 10 pages. Marcher 20 minutes. Un appel de prospection avant midi.
            Choisis-en une ci-dessous — les autres viendront quand celle-là tient.
          </p>
        </section>
      )}

      {/* ── À réduire — recorded honestly, never punished with XP ── */}
      {bad.length > 0 && (
        <section className="mt-6">
          <p className="mxp-label text-mxp-muted">À réduire</p>
          <ul className="mt-2 divide-y divide-mxp-line">
            {bad.map((h) => (
              <li key={h.id} className="flex items-start gap-3 py-2.5">
                <TapAction
                  id={h.id}
                  label={h.title}
                  count={h.logs[0]?.value ?? 0}
                  tone="bad"
                  act={tapHabitRewarded}
                />
                <div className="min-w-0 flex-1">
                  <p className="mxp-body">{h.title}</p>
                  {h.description && <p className="mxp-meta">{h.description}</p>}
                </div>
                <form action={archiveHabit}>
                  <input type="hidden" name="id" value={h.id} />
                  <button
                    aria-label={`Archiver : ${h.title}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-mxp-muted/60 transition active:scale-90 hover:bg-mxp-bg hover:text-mxp-red"
                  >
                    <IconTrash className="h-[17px] w-[17px]" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mxp-meta mt-2">
            Noter un écart ne retire jamais d&apos;XP — c&apos;est ton Élan qui le sait.
          </p>
        </section>
      )}

      {/* ── Adding is quiet: it is organizing, not achieving ── */}
      {habits.length < 15 && (
        <details className="mt-6">
          <summary className="mxp-quiet cursor-pointer list-none">
            + Nouvelle habitude
          </summary>
          <form action={createHabit} className="mt-3 space-y-2.5">
            <input
              type="text"
              name="title"
              required
              maxLength={300}
              placeholder="Ex. Lire 10 pages"
              className="w-full mxp-input px-4"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer">
                <input type="radio" name="kind" value="good" defaultChecked className="peer sr-only" />
                <span className="flex min-h-[44px] items-center justify-center rounded-xl border border-mxp-line bg-mxp-card px-3 text-center text-xs font-semibold peer-checked:border-mxp-green peer-checked:bg-mxp-green/10 peer-checked:text-mxp-green">
                  À construire
                </span>
              </label>
              <label className="cursor-pointer">
                <input type="radio" name="kind" value="bad" className="peer sr-only" />
                <span className="flex min-h-[44px] items-center justify-center rounded-xl border border-mxp-line bg-mxp-card px-3 text-center text-xs font-semibold peer-checked:border-mxp-orange peer-checked:bg-mxp-orange/10 peer-checked:text-mxp-orange">
                  À réduire
                </span>
              </label>
            </div>
            <select name="attribute" className="w-full mxp-input px-3">
              {ATTR_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <textarea
              name="description"
              rows={2}
              maxLength={500}
              placeholder="Pourquoi cette habitude, comment tu t'y prends, ton déclencheur…"
              className="w-full mxp-input px-3 py-2.5"
            />
            <button className="mxp-btn w-full py-3 text-[15px]">Créer l&apos;habitude</button>
          </form>
        </details>
      )}
    </main>
  );
}
