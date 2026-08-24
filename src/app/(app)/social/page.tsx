import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { loadCircle, MAX_PARTNERS, receivedSupport } from "@/lib/mainxp/circle/service";
import { shareSummary } from "@/lib/mainxp/circle/visibility";
import { FLAGS } from "@/lib/mainxp/flags";
import { InviteLink } from "../../components/InviteLink";
import { IconCheck } from "../../components/icons";
import { SupportAction } from "../../components/SupportAction";
import { blockPerson, cancelInvite, leaveCircle, newInvite, saveSharing, sendSupport, togglePause } from "./actions";

// LE CERCLE — accountability, not an audience. No feed, no followers, no
// counts, no discovery: you cannot be found here, only invited. Everything a
// partner sees passes through visibility.ts, and every switch starts closed.
export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenue?: string }>;
}) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const { bienvenue } = await searchParams;

  if (!FLAGS.CIRCLE) {
    return (
      <main className="px-4 pt-5">
        <h1 className="mxp-display">Le Cercle</h1>
        <p className="mxp-body mt-4">Désactivé pour le moment.</p>
      </main>
    );
  }

  const [partners, support, invites, goals, challenges] = await Promise.all([
    loadCircle(user),
    receivedSupport(user),
    prisma.mxCircleInvite.findMany({
      where: { inviterId: user.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" }, select: { id: true, title: true } }),
    prisma.mxChallenge.findMany({
      where: { userId: user.id, status: "active" },
      select: { id: true, title: true },
    }),
  ]);

  const supportByName = new Map<string, number>();
  for (const s of support) supportByName.set(s.name, (supportByName.get(s.name) ?? 0) + 1);

  return (
    <main className="px-4 pt-5 pb-8">
      <h1 className="mxp-display">Le Cercle</h1>
      <p className="mxp-meta mt-1">
        Une ou deux personnes qui savent ce que tu vises. Pas un public.
      </p>

      {bienvenue && (
        <p className="mxp-body mt-4 rounded-2xl bg-mxp-purple-soft/50 px-4 py-3">
          Vous êtes liés. Pour l&apos;instant, chacun ne voit que le prénom de l&apos;autre —
          choisis plus bas ce que tu veux montrer.
        </p>
      )}

      {partners.length === 0 ? (
        /* ── The whole screen has one job when the circle is empty ── */
        <section className="mt-5 mxp-anchor">
          <p className="mxp-label text-mxp-purple">Inviter quelqu&apos;un</p>
          <p className="mxp-body mt-2">
            Envoie un lien à une personne qui compte. Elle ne verra rien tant que tu
            n&apos;auras pas ouvert quelque chose — et jamais ton journal, ton argent ni tes
            conversations avec le coach.
          </p>
          <InviteLink create={newInvite} />
        </section>
      ) : (
        <section className="mt-5 mxp-anchor">
          <p className="mxp-label text-mxp-purple">Ton cercle aujourd&apos;hui</p>
          <ul className="mt-3 space-y-5">
            {partners.map((p) => {
              const c = p.card;
              const supported = supportByName.get(c.name) ?? 0;
              return (
                <li key={p.partnerId}>
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="mxp-party-disc">
                      {c.name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <p className="min-w-0 flex-1 truncate mxp-title">{c.name}</p>
                    {c.level !== null && <p className="mxp-meta flex-none tabular-nums">Niveau {c.level}</p>}
                  </div>

                  {c.paused ? (
                    <p className="mxp-meta mt-1">A mis le partage en pause.</p>
                  ) : (
                    <>
                      {c.mainQuest && (
                        <p className="mxp-body mt-1">
                          {c.mainQuest.done && (
                            <IconCheck className="mr-1 inline h-[13px] w-[13px] align-[-2px] text-mxp-green" />
                          )}
                          {c.mainQuest.title}
                          {c.mainQuest.goalTitle && (
                            <span className="mxp-meta"> · {c.mainQuest.goalTitle}</span>
                          )}
                        </p>
                      )}
                      {c.elan && (
                        <p className="mxp-meta mt-1 tabular-nums">
                          {c.elan.value !== null ? `Élan ${c.elan.value}` : "En récupération"}
                          {c.elan.keepRate7 !== null && ` · engagements tenus ${c.elan.keepRate7} %`}
                        </p>
                      )}
                      {c.challenges.map((ch) => (
                        <p key={ch.title} className="mxp-meta mt-1 tabular-nums">
                          {ch.title} — {ch.ticks}/{ch.targetCount}
                        </p>
                      ))}
                      {/* A week of zeros is not information, it is an
                          accusation — a quiet week simply says nothing. */}
                      {c.week &&
                        (c.week.missionsDone > 0 || c.week.focusMin > 0 || c.week.daysKept > 0) && (
                          <p className="mxp-meta mt-1 tabular-nums">
                            Cette semaine : {c.week.missionsDone} missions · {c.week.focusMin} min de
                            focus · {c.week.daysKept} jours tenus
                          </p>
                        )}
                      {!c.mainQuest && !c.elan && c.challenges.length === 0 && !c.week && (
                        <p className="mxp-meta mt-1">
                          Ne partage rien pour l&apos;instant — c&apos;est son droit.
                        </p>
                      )}
                    </>
                  )}

                  {supported > 0 && (
                    <p className="mxp-meta mt-2">
                      T&apos;a soutenu {supported === 1 ? "une fois" : `${supported} fois`} cette
                      semaine.
                    </p>
                  )}

                  <SupportAction
                    partnerId={p.partnerId}
                    name={c.name}
                    sent={p.supportedToday}
                    act={sendSupport}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── What I show, per person. Closed by default, in every sense. ── */}
      {partners.length > 0 && (
        <section className="mt-6">
          <p className="mxp-label text-mxp-muted">Ce que tu partages</p>
          <div className="mt-2 space-y-2">
            {partners.map((p) => {
              const summary = shareSummary(p.mine);
              return (
                <details key={p.partnerId} className="mxp-card p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="mxp-body block font-medium">{p.card.name}</span>
                      <span className="mxp-meta block">
                        {summary.length === 0
                          ? "tu ne partages rien"
                          : `tu partages ${summary.join(", ")}`}
                      </span>
                    </span>
                    <span aria-hidden className="mxp-meta flex-none">
                      Choisir →
                    </span>
                  </summary>

                  <form action={saveSharing} className="mt-4 space-y-3">
                    <input type="hidden" name="partnerId" value={p.partnerId} />
                    {/* A switch that can grant nothing is not offered: the
                        challenges toggle appears once there are challenges. */}
                    {[
                      ["shareElan", "Mon élan et mon niveau", p.mine.shareElan],
                      ["shareMainQuest", "Ma Main Quest du jour", p.mine.shareMainQuest],
                      ["shareWeekly", "La forme de ma semaine", p.mine.shareWeekly],
                      ...(challenges.length > 0
                        ? [["shareChallenges", "Mes défis choisis", p.mine.shareChallenges] as const]
                        : []),
                    ].map(([name, label, checked]) => (
                      <label key={String(name)} className="flex items-center justify-between gap-3">
                        <span className="mxp-body">{label as string}</span>
                        <input
                          type="checkbox"
                          name={String(name)}
                          defaultChecked={Boolean(checked)}
                          className="h-6 w-6 flex-none accent-[var(--mxp-purple)]"
                        />
                      </label>
                    ))}

                    {challenges.length > 0 && (
                      <fieldset>
                        <legend className="mxp-meta">Défis visibles (un par un)</legend>
                        <div className="mt-1 space-y-1.5">
                          {challenges.map((ch) => (
                            <label key={ch.id} className="flex items-center justify-between gap-3">
                              <span className="mxp-meta">{ch.title}</span>
                              <input
                                type="checkbox"
                                name="challengeIds"
                                value={ch.id}
                                defaultChecked={p.mine.challengeIds.includes(ch.id)}
                                className="h-5 w-5 flex-none accent-[var(--mxp-purple)]"
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}

                    {goals.length > 0 && (
                      <fieldset>
                        <legend className="mxp-meta">
                          Objectifs dont le nom peut apparaître
                        </legend>
                        <div className="mt-1 space-y-1.5">
                          {goals.map((g) => (
                            <label key={g.id} className="flex items-center justify-between gap-3">
                              <span className="mxp-meta">{g.title}</span>
                              <input
                                type="checkbox"
                                name="goalIds"
                                value={g.id}
                                defaultChecked={p.mine.goalIds.includes(g.id)}
                                className="h-5 w-5 flex-none accent-[var(--mxp-purple)]"
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}

                    <button className="mxp-btn w-full py-3 text-sm">Enregistrer</button>
                  </form>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form action={togglePause}>
                      <input type="hidden" name="partnerId" value={p.partnerId} />
                      <input type="hidden" name="paused" value={p.mine.status === "paused" ? "1" : "0"} />
                      <button className="mxp-btn-ghost px-3 py-1.5 text-xs">
                        {p.mine.status === "paused" ? "Reprendre le partage" : "Mettre en pause"}
                      </button>
                    </form>
                    <form action={leaveCircle}>
                      <input type="hidden" name="partnerId" value={p.partnerId} />
                      <button className="mxp-btn-ghost px-3 py-1.5 text-xs">Quitter ce lien</button>
                    </form>
                    <form action={blockPerson}>
                      <input type="hidden" name="partnerId" value={p.partnerId} />
                      <button className="mxp-quiet !w-auto px-3 py-1.5 text-xs text-mxp-red">
                        Bloquer
                      </button>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Invitations already sent ── */}
      {invites.length > 0 && (
        <section className="mt-6">
          <p className="mxp-label text-mxp-muted">Invitations en attente</p>
          <ul className="mt-2 divide-y divide-mxp-line">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="mxp-body block truncate">{i.label || "Sans nom"}</span>
                  <span className="mxp-meta">
                    expire le {i.expiresAt.toLocaleDateString("fr-CH")}
                  </span>
                </span>
                <form action={cancelInvite}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="mxp-btn-ghost px-3 py-1.5 text-xs">Annuler</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {partners.length > 0 && partners.length < MAX_PARTNERS && (
        <section className="mt-6">
          <p className="mxp-label text-mxp-muted">Inviter quelqu&apos;un d&apos;autre</p>
          <InviteLink create={newInvite} />
        </section>
      )}

      <p className="mxp-meta mt-8">
        Ton journal, ta gratitude, tes notes, ton argent et tes conversations avec le coach
        ne sont partageables par aucun réglage : ils n&apos;existent pas dans ce que le
        Cercle sait lire. Le partage se coupe des deux côtés, immédiatement.
      </p>
    </main>
  );
}
