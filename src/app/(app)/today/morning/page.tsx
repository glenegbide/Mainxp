import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { addRoutineItem, archiveRoutineItem, saveMorning, toggleRoutineItem } from "../day-actions";

function Scale({ name, label }: { name: string; label: string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-mxp-muted">1–10</span>
      </div>
      <input
        type="range"
        name={name}
        min={1}
        max={10}
        defaultValue={6}
        className="mt-1 w-full accent-[#7c3aed]"
      />
    </label>
  );
}

export default async function MorningPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);
  const yesterday = addDays(today, -1);

  const [northStar, mainQuest, yesterdayPlan, goals, todayPlan, routineItems, routineLogs] =
    await Promise.all([
      prisma.mxNorthStar.findUnique({ where: { userId: user.id } }),
      prisma.mxTask.findFirst({ where: { userId: user.id, dayKey: today, tier: "MAIN_QUEST" } }),
      prisma.mxDayPlan.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey: yesterday } } }),
      prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { priority: "asc" }, take: 3 }),
      prisma.mxDayPlan.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey: today } } }),
      prisma.mxRoutineItem.findMany({
        where: { userId: user.id, active: true, timeOfDay: "morning" },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      prisma.mxRoutineLog.findMany({ where: { userId: user.id, dayKey: today } }),
    ]);
  const routineDone = new Map(routineLogs.map((l) => [l.routineItemId, l.done]));

  const proposal =
    mainQuest?.title ?? yesterdayPlan?.tomorrowBigThing ?? "";

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="text-xs text-mxp-muted">← Aujourd&apos;hui</Link>
      <h1 className="mt-2 text-xl font-semibold">Morning Start</h1>
      <p className="text-sm text-mxp-muted">2 minutes pour lancer la journée. +10 XP · Esprit.</p>

      {/* ── Routine du matin — hors du formulaire principal : chaque coche est
          sauvegardée immédiatement. Structure, pas mérite : 0 XP. ── */}
      <section className="mt-5 mxp-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="mxp-label text-mxp-teal">Routine du matin</p>
          <span className="text-xs tabular-nums text-mxp-muted">
            {routineItems.filter((r) => routineDone.get(r.id)).length}/{routineItems.length}
          </span>
        </div>
        {routineItems.length === 0 && (
          <p className="mt-2 text-sm text-mxp-muted">
            Construis ton rituel : eau, lumière, mouvement, lecture… Les étapes que tu
            traverses chaque matin, dans ton ordre à toi.
          </p>
        )}
        <ul className="mt-2 space-y-2.5">
          {routineItems.map((item) => {
            const done = routineDone.get(item.id) ?? false;
            return (
              <li key={item.id} className="flex items-start gap-3">
                <form action={toggleRoutineItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <button aria-pressed={done} className={`mxp-check ${done ? "on" : ""}`}>
                    ✓
                  </button>
                </form>
                <div className="min-w-0 flex-1 pt-1">
                  <p className={`text-sm ${done ? "text-mxp-muted line-through" : "font-medium"}`}>
                    {item.title}
                  </p>
                  {item.note && <p className="mt-0.5 text-xs text-mxp-muted">{item.note}</p>}
                </div>
                <form action={archiveRoutineItem} className="pt-1">
                  <input type="hidden" name="id" value={item.id} />
                  <button aria-label={`Retirer ${item.title}`} className="text-xs text-mxp-muted hover:text-mxp-red">
                    ✕
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
        {routineItems.length < 10 && (
          <form action={addRoutineItem} className="mt-3 space-y-2">
            <input
              type="text"
              name="title"
              required
              maxLength={200}
              placeholder="Ajouter une étape (ex. 10 min de lecture)…"
              className="w-full mxp-input px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                name="note"
                maxLength={500}
                placeholder="Une note ? (pourquoi, comment…)"
                className="min-w-0 flex-1 mxp-input px-3 py-2 text-xs"
              />
              <button className="mxp-btn-ghost px-3 py-2 text-xs">+</button>
            </div>
          </form>
        )}
      </section>

      <form action={saveMorning} className="mt-5 space-y-5">
        <section className="mxp-card p-4 space-y-4">
          <p className="mxp-label text-mxp-teal">1 · Ton état</p>
          <Scale name="mood" label="Humeur" />
          <Scale name="energy" label="Énergie" />
          <Scale name="stress" label="Stress" />
          <Scale name="focus" label="Clarté" />
        </section>

        {(northStar?.why || northStar?.season) && (
          <section className="mxp-card p-4">
            <p className="mxp-label text-mxp-purple">
              2 · Rappelle-toi pourquoi
            </p>
            {northStar.why && <p className="mt-2 text-sm">{northStar.why}</p>}
            {northStar.season && (
              <p className="mt-1 text-xs text-mxp-muted">Saison : {northStar.season}</p>
            )}
          </section>
        )}

        {goals.length > 0 && (
          <section className="mxp-card p-4">
            <p className="mxp-label text-mxp-blue">
              3 · Où tu en es
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {goals.map((g) => (
                <li key={g.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{g.title}</span>
                  {g.targetValue && (
                    <span className="shrink-0 tabular-nums text-mxp-muted">
                      {g.currentValue}/{g.targetValue}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mxp-card mxp-quest p-4">
          <p className="mxp-label text-mxp-purple">
            4 · Ta Main Quest du jour
          </p>
          {mainQuest ? (
            <p className="mt-2 text-sm font-medium">{mainQuest.title}</p>
          ) : (
            <>
              <input
                type="text"
                name="mainQuest"
                maxLength={300}
                defaultValue={proposal}
                placeholder="Le résultat le plus important du jour…"
                className="mt-2 w-full mxp-input px-3 py-2.5 text-sm"
              />
              {yesterdayPlan?.tomorrowBigThing && (
                <p className="mt-1.5 text-xs text-mxp-muted">
                  Proposé depuis ta revue d&apos;hier : « {yesterdayPlan.tomorrowBigThing} »
                </p>
              )}
            </>
          )}
        </section>

        {/* Écriture libre du matin — l'endroit où poser ce qu'on a en tête */}
        <section className="mxp-card p-4">
          <p className="mxp-label text-mxp-teal">
            5 · Ton intention, tes pensées
          </p>
          <textarea
            name="intention"
            rows={4}
            maxLength={2000}
            defaultValue={todayPlan?.morningIntention ?? ""}
            placeholder="Écris librement : ton intention du jour, ce qui tourne dans ta tête, ce que tu veux te dire ce matin…"
            className="mt-2 w-full mxp-input px-3 py-2.5 text-sm"
          />
          <p className="mt-1 text-xs text-mxp-muted">
            Sauvegardé avec ta journée — ton coach le lit, personne d&apos;autre.
          </p>
        </section>

        <button className="w-full mxp-btn px-4 py-3 text-sm">
          DÉMARRER LA JOURNÉE
        </button>
      </form>
    </main>
  );
}
