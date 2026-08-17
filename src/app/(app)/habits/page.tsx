import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/mainxp/day";
import { archiveHabit, createHabit, tapHabit } from "./actions";

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

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="text-xs text-mxp-muted">← Aujourd&apos;hui</Link>
      <h1 className="mt-2 text-xl font-semibold">Habitudes</h1>
      <p className="text-sm text-mxp-muted">
        Tape ➕ quand c&apos;est fait. La régularité paie (rendement
        décroissant le même jour) ; suivre une mauvaise habitude n&apos;enlève jamais
        d&apos;XP — elle pèse seulement sur ton Élan.
      </p>

      <section className="mxp-card mt-4 p-4">
        <p className="mxp-label text-mxp-green">Bonnes habitudes</p>
        {good.length === 0 && (
          <p className="mt-2 text-sm text-mxp-muted">Ex. lire 10 pages, marcher, appeler un client…</p>
        )}
        <ul className="mt-2 space-y-2.5">
          {good.map((h) => {
            const taps = h.logs[0]?.value ?? 0;
            return (
              <li key={h.id} className="flex items-center gap-3">
                <form action={tapHabit}>
                  <input type="hidden" name="id" value={h.id} />
                  <button
                    title="Fait !"
                    className="mxp-btn h-9 w-9 rounded-full p-0 text-base leading-none"
                  >
                    +
                  </button>
                </form>
                <span className="min-w-0 flex-1 text-sm">
                  {h.title}
                  {taps > 0 && (
                    <span className="ml-2 rounded-full bg-mxp-green/12 px-2 py-0.5 text-[10px] font-bold text-mxp-green tabular-nums">
                      ×{taps} aujourd&apos;hui
                    </span>
                  )}
                  {h.description && (
                    <span className="mt-0.5 block text-xs font-normal text-mxp-muted">
                      {h.description}
                    </span>
                  )}
                </span>
                <form action={archiveHabit}>
                  <input type="hidden" name="id" value={h.id} />
                  <button title="Archiver" className="mxp-btn-ghost px-2 py-1 text-xs text-mxp-muted">×</button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mxp-card mxp-alert mt-4 p-4">
        <p className="mxp-label text-mxp-orange">À réduire · pèse sur l&apos;Élan</p>
        {bad.length === 0 && (
          <p className="mt-2 text-sm text-mxp-muted">
            Ex. scroller au lit, grignotage, achat impulsif… Noter honnêtement, sans se juger.
          </p>
        )}
        <ul className="mt-2 space-y-2.5">
          {bad.map((h) => {
            const taps = h.logs[0]?.value ?? 0;
            return (
              <li key={h.id} className="flex items-center gap-3">
                <form action={tapHabit}>
                  <input type="hidden" name="id" value={h.id} />
                  <button
                    title="C'est arrivé"
                    className="h-9 w-9 rounded-full border-2 border-mxp-orange/50 bg-mxp-card text-base font-bold leading-none text-mxp-orange transition active:scale-90"
                  >
                    −
                  </button>
                </form>
                <span className="min-w-0 flex-1 text-sm">
                  {h.title}
                  {taps > 0 && (
                    <span className="ml-2 rounded-full bg-mxp-orange/12 px-2 py-0.5 text-[10px] font-bold text-mxp-orange tabular-nums">
                      ×{taps} aujourd&apos;hui
                    </span>
                  )}
                  {h.description && (
                    <span className="mt-0.5 block text-xs font-normal text-mxp-muted">
                      {h.description}
                    </span>
                  )}
                </span>
                <form action={archiveHabit}>
                  <input type="hidden" name="id" value={h.id} />
                  <button title="Archiver" className="mxp-btn-ghost px-2 py-1 text-xs text-mxp-muted">×</button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mxp-card mt-5 p-4">
        <p className="mxp-label text-mxp-purple">Nouvelle habitude</p>
        <form action={createHabit} className="mt-3 space-y-3">
          <input
            type="text"
            name="title"
            required
            maxLength={300}
            placeholder="Ex. Lire 10 pages"
            className="w-full mxp-input px-4 py-2.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="cursor-pointer">
              <input type="radio" name="kind" value="good" defaultChecked className="peer sr-only" />
              <span className="block rounded-xl border border-mxp-line bg-mxp-card px-3 py-2.5 text-center text-xs font-semibold peer-checked:border-mxp-green peer-checked:bg-mxp-green/10 peer-checked:text-mxp-green">
                ➕ Bonne habitude
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="kind" value="bad" className="peer sr-only" />
              <span className="block rounded-xl border border-mxp-line bg-mxp-card px-3 py-2.5 text-center text-xs font-semibold peer-checked:border-mxp-orange peer-checked:bg-mxp-orange/10 peer-checked:text-mxp-orange">
                ➖ À réduire
              </span>
            </label>
          </div>
          <select name="attribute" className="w-full mxp-input px-3 py-2.5 text-sm">
            {ATTR_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <textarea
            name="description"
            rows={2}
            maxLength={500}
            placeholder="Écris ce que tu veux : pourquoi cette habitude, comment tu t'y prends, ton déclencheur…"
            className="w-full mxp-input px-3 py-2.5 text-sm"
          />
          <button className="w-full mxp-btn px-4 py-2.5 text-sm">Créer l&apos;habitude</button>
        </form>
      </section>
    </main>
  );
}
