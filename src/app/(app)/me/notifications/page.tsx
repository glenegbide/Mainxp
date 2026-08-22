import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { MODE_POLICY, asMode } from "@/lib/mainxp/notify/policy";
import { typeEffectiveness } from "@/lib/mainxp/notify/engine";
import { PushSetup } from "../../../components/PushSetup";
import { saveNotificationPrefs } from "./actions";

// Notifications — ONE purpose: decide how much MAINXP is allowed to interrupt
// your life. The anchor is the switch itself; the modes and quiet hours are
// the supporting controls; what it already sent is the proof it behaves.

const MODES = [
  ["quiet", "Silence", "Seulement la revue du soir. Une par jour maximum."],
  ["normal", "Normal", "Ce qui compte vraiment. Deux par jour maximum."],
  ["coach_me", "Coache-moi", "Objectifs en retard et défis à risque inclus. Quatre par jour."],
  ["beast", "Beast", "Tout ce qui est pertinent. Six par jour — les heures de sommeil restent protégées."],
] as const;

const TYPE_LABEL: Record<string, string> = {
  main_quest_stale: "Main Quest ouverte",
  commitment_open: "Non-négociables",
  night_review: "Revue du soir",
  goal_pace_behind: "Objectif en retard",
  challenge_tick: "Défi à risque",
};

export default async function NotificationsPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");

  const [subs, recent, effectiveness] = await Promise.all([
    prisma.mxPushSubscription.count({ where: { userId: user.id, disabledAt: null } }),
    prisma.mxNotification.findMany({
      where: { userId: user.id, status: "SENT" },
      orderBy: { sentAt: "desc" },
      take: 8,
    }),
    typeEffectiveness(user.id),
  ]);
  const mode = asMode(user.notificationMode);
  const policy = MODE_POLICY[mode];
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/me" className="mxp-meta">← Moi</Link>
      <h1 className="mt-3 mxp-display">Notifications</h1>
      <p className="mxp-meta mt-1">
        MAINXP vient à toi seulement quand c&apos;est utile — jamais pour te faire revenir.
      </p>

      <section className="mt-5 mxp-anchor">
        <p className="mxp-label text-mxp-purple">Sur cet appareil</p>
        {vapid ? (
          <PushSetup vapidPublicKey={vapid} active={subs > 0} />
        ) : (
          <p className="mxp-body mt-3 text-mxp-muted">
            Les notifications ne sont pas encore configurées côté serveur.
          </p>
        )}
      </section>

      <form action={saveNotificationPrefs} className="mt-6 space-y-5">
        <div>
          <p className="mxp-label text-mxp-muted">Combien MAINXP peut te parler</p>
          <div className="mt-3 space-y-2">
            {MODES.map(([value, label, help]) => (
              <label key={value} className="block cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  defaultChecked={mode === value}
                  className="peer sr-only"
                />
                <span className="block rounded-2xl border border-mxp-line bg-mxp-card px-4 py-3 transition peer-checked:border-mxp-purple peer-checked:bg-mxp-purple-soft/50">
                  <span className="mxp-body font-semibold">{label}</span>
                  <span className="mxp-meta block">{help}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mxp-label text-mxp-muted">Heures de silence</p>
          <p className="mxp-meta mt-1">
            Aucune notification pendant cette plage — même en mode Beast. Le sommeil ne se
            négocie pas.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex-1">
              <span className="mxp-meta">De</span>
              <input
                type="number"
                name="quietStart"
                min={0}
                max={23}
                defaultValue={user.quietHoursStart ?? 22}
                className="mt-1 w-full mxp-input px-4"
              />
            </label>
            <label className="flex-1">
              <span className="mxp-meta">À</span>
              <input
                type="number"
                name="quietEnd"
                min={0}
                max={23}
                defaultValue={user.quietHoursEnd ?? 7}
                className="mt-1 w-full mxp-input px-4"
              />
            </label>
          </div>
        </div>

        <button className="mxp-btn w-full py-3 text-[15px]">Enregistrer</button>
      </form>

      <p className="mxp-meta mt-4">
        Mode actuel : {policy.dailyCap} par jour maximum, au moins{" "}
        {Math.round(policy.minGapMin / 60)} h entre deux.
      </p>

      {recent.length > 0 && (
        <section className="mt-6">
          <p className="mxp-label text-mxp-muted">Envoyées récemment</p>
          <ul className="mt-2 divide-y divide-mxp-line">
            {recent.map((n) => (
              <li key={n.id} className="py-3">
                <p className="mxp-body font-medium">{n.title}</p>
                <p className="mxp-meta">{n.body}</p>
              </li>
            ))}
          </ul>
          {Object.keys(effectiveness).length > 0 && (
            <p className="mxp-meta mt-3">
              Ce que tu ouvres :{" "}
              {Object.entries(effectiveness)
                .map(([type, e]) => `${TYPE_LABEL[type] ?? type} ${e.rate ?? 0} %`)
                .join(" · ")}
              . MAINXP se tait davantage sur ce que tu ignores.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
