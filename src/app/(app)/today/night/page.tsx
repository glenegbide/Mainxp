import Link from "next/link";
import { IconCheck } from "../../../components/icons";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/mainxp/day";
import { addRoutineItem, archiveRoutineItem, saveNight } from "../day-actions";
import { toggleRoutineStepRewarded } from "../feedback-actions";
import { CheckAction } from "../../../components/CheckAction";
import { GratitudeRitual } from "../../../components/GratitudeRitual";
import { loadGratitude } from "@/lib/mainxp/gratitude";

export default async function NightPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);

  const [tasks, nns, nnLogs, plan, routineItems, routineLogs] = await Promise.all([
    prisma.mxTask.findMany({ where: { userId: user.id, dayKey: today } }),
    prisma.mxNonNegotiable.findMany({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
    prisma.mxNonNegotiableLog.findMany({
      where: { userId: user.id, periodKey: today, completed: true },
    }),
    prisma.mxDayPlan.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey: today } } }),
    prisma.mxRoutineItem.findMany({
      where: { userId: user.id, active: true, timeOfDay: "evening" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    prisma.mxRoutineLog.findMany({ where: { userId: user.id, dayKey: today } }),
  ]);
  const nightGratitude = await loadGratitude(user.id, today, "night");
  const routineDone = new Map(routineLogs.map((l) => [l.routineItemId, l.done]));

  const done = tasks.filter((t) => t.status === "DONE");
  const open = tasks.filter((t) => t.status === "OPEN");
  const mainQuest = tasks.find((t) => t.tier === "MAIN_QUEST");

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="mxp-meta">← Aujourd&apos;hui</Link>
      <h1 className="mt-3 mxp-display">Revue du soir</h1>
      <p className="text-sm text-mxp-muted">
        Comment s’est passée ta journée ? Raconte — et demain se prépare tout seul.
      </p>

      <section className="mt-4 mxp-card p-4">
        <p className="mxp-label text-mxp-blue">Le jour en chiffres</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-mxp-muted">Main Quest</dt>
          <dd className="text-right">
            {mainQuest ? (
              mainQuest.status === "DONE" ? (
                <>accomplie <IconCheck className="inline h-[13px] w-[13px] align-[-2px] text-mxp-green" /></>
              ) : (
                "non terminée"
              )
            ) : (
              "non définie"
            )}
          </dd>
          <dt className="text-mxp-muted">Actions accomplies</dt>
          <dd className="text-right tabular-nums">{done.length}</dd>
          <dt className="text-mxp-muted">Restées ouvertes</dt>
          <dd className="text-right tabular-nums">{open.length}</dd>
          <dt className="text-mxp-muted">Non-négociables</dt>
          <dd className="text-right tabular-nums">{nnLogs.length}/{nns.length}</dd>
        </dl>
      </section>

      {/* ── Demain se décide, il ne se subit pas : chaque action ouverte est
          classée délibérément. Reporter sans y penser est exactement comme ça
          qu'une liste devient un cimetière. ── */}
      {open.length > 0 && (
        <section className="mt-4 mxp-card p-4">
          <p className="mxp-label text-mxp-orange">Ce qui reste ouvert — décide</p>
          <ul className="mt-2 space-y-3">
            {open.map((t) => (
              <li key={t.id}>
                <p className="mxp-body font-medium">
                  {t.title}
                  {t.postponeCount > 0 && (
                    <span className="mxp-meta"> · déjà reporté {t.postponeCount}×</span>
                  )}
                </p>
                <div className="mt-1.5 flex gap-1.5" role="radiogroup" aria-label={`Demain : ${t.title}`}>
                  {([
                    ["carry", "Demain"],
                    ["backlog", "Plus tard"],
                    ["cancel", "Abandonner"],
                  ] as const).map(([value, label], i) => (
                    <label key={value} className="flex-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`tomorrow_${t.id}`}
                        value={value}
                        defaultChecked={i === 0}
                        form="night-form"
                        className="peer sr-only"
                      />
                      <span className="block rounded-lg border border-mxp-line px-2 py-1.5 text-center text-xs font-medium text-mxp-muted transition peer-checked:border-mxp-purple peer-checked:bg-mxp-purple-soft/60 peer-checked:text-mxp-purple-deep">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p className="mxp-meta mt-2.5">
            Abandonner n&apos;est pas un échec — c&apos;est décider que ça ne vaut plus ta
            journée de demain.
          </p>
        </section>
      )}

      {/* ── Routine du soir — même moteur que le matin, cochée hors formulaire.
          Structure, pas mérite : 0 XP. ── */}
      <section className="mt-4 mxp-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="mxp-label text-mxp-teal">Routine du soir</p>
          <span className="text-xs tabular-nums text-mxp-muted">
            {routineItems.filter((r) => routineDone.get(r.id)).length}/{routineItems.length}
          </span>
        </div>
        {routineItems.length === 0 && (
          <p className="mt-2 text-sm text-mxp-muted">
            Ton rituel de clôture : téléphone en charge hors chambre, préparer demain,
            lecture… Les étapes qui terminent bien une journée.
          </p>
        )}
        <ul className="mt-2 space-y-2.5">
          {routineItems.map((item) => {
            const itemDone = routineDone.get(item.id) ?? false;
            return (
              <li key={item.id} className="flex items-start gap-3">
                <CheckAction
                  id={item.id}
                  done={itemDone}
                  label={item.title}
                  act={toggleRoutineStepRewarded}
                />
                <div className="min-w-0 flex-1">
                  <p className={`mxp-body ${itemDone ? "text-mxp-muted line-through" : "font-medium"}`}>
                    {item.title}
                  </p>
                  {item.note && <p className="mxp-meta">{item.note}</p>}
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
            <input type="hidden" name="timeOfDay" value="evening" />
            <input
              type="text"
              name="title"
              required
              maxLength={200}
              placeholder="Ajouter une étape du soir…"
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

      <form id="night-form" action={saveNight} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Qu&apos;est-ce qui a bien marché ?</span>
          <textarea
            name="wentWell"
            rows={2}
            defaultValue={plan?.reviewWentWell ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Qu&apos;est-ce qui a été manqué — et pourquoi ?</span>
          <span className="block text-xs text-mxp-muted">
            Sans honte : trop gros ? flou ? pas le temps ? énergie basse ?
          </span>
          <textarea
            name="missedWhy"
            rows={2}
            defaultValue={plan?.reviewMissedWhy ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Qu&apos;as-tu ressenti aujourd&apos;hui ?</span>
          <span className="block text-xs text-mxp-muted">
            L&apos;émotion dominante — fierté, frustration, calme, tension… et d&apos;où elle venait.
          </span>
          <textarea
            name="feelings"
            rows={2}
            defaultValue={plan?.reviewFeelings ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Qu&apos;as-tu appris ?</span>
          <textarea
            name="lesson"
            rows={2}
            defaultValue={plan?.reviewLesson ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">
            Cette journée t&apos;a-t-elle rapproché de ta mission ?
          </span>
          <span className="block text-xs text-mxp-muted">
            La question qui aligne : oui/non, et qu&apos;est-ce qui l&apos;aurait rendue plus alignée ?
          </span>
          <textarea
            name="alignment"
            rows={2}
            defaultValue={plan?.reviewAlignment ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <GratitudeRitual period="night" initial={nightGratitude} />
        <label className="block">
          <span className="text-sm font-medium">La Grande Chose de demain</span>
          <span className="block text-xs text-mxp-muted">
            Elle deviendra la Main Quest proposée demain matin.
          </span>
          <input
            type="text"
            name="tomorrowBigThing"
            maxLength={300}
            defaultValue={plan?.tomorrowBigThing ?? ""}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <button className="w-full mxp-btn mxp-btn-teal px-4 py-3 text-sm">
          Clore la journée &amp; préparer demain
        </button>
      </form>
    </main>
  );
}
