import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { keepRate } from "@/lib/mainxp/insight";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { ATTRIBUTE_LABEL, dominantAttribute } from "@/lib/mainxp/xp/dominant";
import { saveIdentity } from "./actions";

// IDENTITÉ — the three layers, in the order they actually work:
//
//   SELF-CONCEPT (croyance · conscient · histoire) — the story you tell about
//   yourself. It lives in the mind, so it can be examined and rewritten.
//
//   IDENTITÉ (comportement · subconscient · réalité) — the lived expression:
//   what you repeat until it is wired in. MAINXP never asks you to declare it;
//   it SHOWS you what your last 30 days already said.
//
//   ESPRIT & CŒUR (alignement) — the two only sync when the heart feels what
//   the mind believes. Until then, the older program governs. The bridge is
//   not affirmation but action: live from the new self until the nervous
//   system accepts it as home.
//
// No XP anywhere on this page: identity pays in alignment, not in points.

export default async function IdentityPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const now = new Date();
  const today = dayKey(now, user.timezone);
  const since = addDays(today, -29);

  const [northStar, totals, nnActive, nnKept, missionsDone, focusSessions, habitTaps, booksFinished, gratitudeDays] =
    await Promise.all([
      prisma.mxNorthStar.findUnique({ where: { userId: user.id } }),
      xpTotals(user.id),
      prisma.mxNonNegotiable.count({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
      prisma.mxNonNegotiableLog.count({
        where: { userId: user.id, completed: true, periodKey: { gte: since } },
      }),
      prisma.mxTask.count({
        where: { userId: user.id, status: "DONE", dayKey: { gte: since, lte: today } },
      }),
      prisma.mxFocusSession.findMany({
        where: { userId: user.id, endedAt: { not: null }, startedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } },
        select: { startedAt: true, endedAt: true },
      }),
      prisma.mxHabitLog.count({
        where: { userId: user.id, value: { gt: 0 }, periodKey: { gte: since } },
      }),
      prisma.mxBook.count({ where: { userId: user.id, status: "finished" } }),
      prisma.mxGratitudeEntry.groupBy({
        by: ["dayKey"],
        where: { userId: user.id, dayKey: { gte: since } },
      }),
    ]);

  const focusMin = focusSessions.reduce(
    (s, f) => s + Math.round((f.endedAt!.getTime() - f.startedAt.getTime()) / 60_000),
    0
  );
  const rate = keepRate(nnKept, nnActive * 30);
  const dominant = dominantAttribute(totals.attributes);
  const felt = northStar?.identityFelt ?? null;

  // The lived evidence — each line is a fact the last 30 days actually wrote.
  const evidence: string[] = [];
  if (rate !== null) evidence.push(`Tu tiens tes engagements ${rate} % du temps.`);
  if (missionsDone > 0) evidence.push(`Tu as accompli ${missionsDone} action${missionsDone > 1 ? "s" : ""} que tu avais choisies.`);
  if (focusMin > 0) evidence.push(`Tu as travaillé ${Math.round(focusMin / 60)} h ${focusMin % 60} min en profondeur, chronométrées.`);
  if (habitTaps > 0) evidence.push(`Tu as répété tes habitudes ${habitTaps} fois.`);
  if (booksFinished > 0) evidence.push(`Tu as terminé ${booksFinished} livre${booksFinished > 1 ? "s" : ""}.`);
  if (gratitudeDays.length > 0) evidence.push(`Tu as pratiqué la gratitude ${gratitudeDays.length} jour${gratitudeDays.length > 1 ? "s" : ""} sur 30.`);
  evidence.push(`Ta voie dominante — celle que tes actes nourrissent le plus — est ${ATTRIBUTE_LABEL[dominant]}.`);

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/me" className="mxp-meta">← Moi</Link>
      <h1 className="mt-3 mxp-display">Identité</h1>
      <p className="mxp-meta mt-1">
        L&apos;histoire que tu racontes, la vie que tu répètes, et l&apos;accord entre les
        deux.
      </p>

      {/* ── 1 · SELF-CONCEPT : the story, examinable and rewritable ── */}
      <form action={saveIdentity}>
        <section className="mt-5 mxp-anchor">
          <p className="mxp-idlayer">
            <span>croyance</span>
            <span>conscient</span>
            <span>histoire</span>
          </p>
          <p className="mxp-label mt-3 text-mxp-purple">Self-concept — l&apos;histoire</p>
          <p className="mxp-meta mt-1.5">
            L&apos;inventaire de ce que tu crois être : ta valeur, tes capacités, ta place.
            Formé tôt, tenu par habitude — et réécrivable, parce qu&apos;il vit dans la
            pensée. Écris-le au présent, comme la personne que tu deviens.
          </p>
          <textarea
            name="selfConcept"
            rows={5}
            maxLength={4000}
            defaultValue={northStar?.selfConcept ?? ""}
            placeholder="Je suis quelqu'un qui… (au présent : « je tiens ma parole », « je décroche le téléphone », « je construis un patrimoine »)"
            className="mt-3 w-full mxp-input px-4 py-3 text-sm"
          />

          {/* ── 3 · ESPRIT & CŒUR : the felt-sense verdict on the story ── */}
          <p className="mxp-label mt-5 text-mxp-teal">Esprit &amp; cœur — l&apos;accord</p>
          <p className="mxp-meta mt-1.5">
            Relis ce que tu viens d&apos;écrire. À quel point ton corps le sent-il vrai —
            pas ta tête, ton corps ? La transformation commence quand le ressenti rejoint
            la déclaration.
          </p>
          <div className="mt-3 flex items-center justify-between gap-1" role="radiogroup" aria-label="À quel point ça te semble vrai">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <label key={n} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="identityFelt"
                  value={n}
                  defaultChecked={felt === n}
                  className="peer sr-only"
                />
                <span className="block rounded-lg border border-mxp-line py-2 text-center text-xs font-semibold tabular-nums text-mxp-muted transition peer-checked:border-mxp-teal peer-checked:bg-mxp-teal/10 peer-checked:text-mxp-teal">
                  {n}
                </span>
              </label>
            ))}
          </div>
          <p className="mxp-meta mt-2">
            1 = « ma tête le dit, mon cœur n&apos;y croit pas » · 10 = « c&apos;est chez moi ».
            Un score bas n&apos;est pas un échec : c&apos;est la distance qu&apos;il reste à
            vivre.
          </p>

          <button className="mxp-btn mt-4 w-full py-3 text-[15px]">Enregistrer</button>
        </section>
      </form>

      {/* ── 2 · IDENTITÉ : the lived expression — shown, never declared ── */}
      <section className="mxp-card mt-4 p-4">
        <p className="mxp-idlayer">
          <span>comportement</span>
          <span>subconscient</span>
          <span>réalité</span>
        </p>
        <p className="mxp-label mt-3 text-mxp-gold">Identité — la preuve vécue</p>
        <p className="mxp-meta mt-1.5">
          L&apos;identité opère sous la pensée : elle est câblée par ce que tu répètes.
          MAINXP ne te demande pas de la déclarer — voici ce que tes 30 derniers jours ont
          déjà écrit :
        </p>
        <ul className="mt-3 space-y-1.5">
          {evidence.map((line) => (
            <li key={line} className="mxp-body flex gap-2">
              <span aria-hidden className="text-mxp-gold">▸</span>
              {line}
            </li>
          ))}
        </ul>
        {felt !== null && felt <= 5 && northStar?.selfConcept && (
          <p className="mxp-meta mt-3 rounded-xl bg-mxp-teal/8 px-3 py-2.5">
            L&apos;écart entre ton histoire et ton ressenti ne se comble pas en y pensant
            plus fort : il se comble en agissant depuis le nouveau soi — une Main Quest,
            un engagement tenu, un matin à la fois — jusqu&apos;à ce que ton système nerveux
            l&apos;accepte comme chez lui, et que le monde te le confirme.
          </p>
        )}
      </section>

      <p className="mxp-meta mt-4 px-1">
        Ton coach lit ton self-concept et le confronte doucement à tes actes — jamais pour
        te juger, toujours pour réduire l&apos;écart. Inspiré du Jeu de la vie (F. Scovel
        Shinn, 1925) et des principes du guerrier pacifique — dans la Bibliothèque.
      </p>
    </main>
  );
}
