import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { saveOnboarding } from "./actions";

const SEASONS = [
  "Saison Revenus",
  "Saison Forme physique",
  "Saison Réduction de dettes",
  "Saison Famille",
  "Saison Lancement business",
  "Saison Apprentissage",
  "Saison Récupération",
];

export default async function OnboardingPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const northStar = await prisma.mxNorthStar.findUnique({ where: { userId: user.id } });

  return (
    <main className="px-4 pt-6 pb-8">
      <p className="mxp-label text-mxp-purple">
        Apprends à me connaître
      </p>
      <h1 className="mt-1 text-xl font-semibold">Quelques repères, {user.name}.</h1>
      <p className="mt-1 text-sm text-mxp-muted">
        5 questions, pas 80. Le coach apprendra le reste naturellement, avec le temps.
        Ta bio aide l&apos;IA à comprendre ta vie — elle ne donne jamais d&apos;XP.
      </p>

      <form action={saveOnboarding} className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Que fais-tu dans la vie ?</span>
          <input
            type="text"
            name="occupation"
            defaultValue={user.occupation}
            maxLength={200}
            placeholder="Ex. agent immobilier indépendant à Genève"
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Ton Pourquoi — qu&apos;est-ce que tu construis, et pour qui ?</span>
          <textarea
            name="why"
            rows={3}
            defaultValue={northStar?.why ?? ""}
            maxLength={1000}
            placeholder="Ex. la liberté financière pour ma famille, et devenir quelqu'un que je respecte."
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>

        <div>
          <span className="text-sm font-medium">Ta saison actuelle</span>
          <p className="text-xs text-mxp-muted">La priorité qui gouverne tes prochaines semaines.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEASONS.map((season) => (
              <label key={season} className="cursor-pointer">
                <input
                  type="radio"
                  name="season"
                  value={season}
                  defaultChecked={northStar?.season === season}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-mxp-line bg-mxp-card px-3 py-1.5 text-xs peer-checked:border-mxp-purple peer-checked:bg-mxp-purple-soft peer-checked:text-mxp-purple-deep">
                  {season}
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Ta mission des 90 prochains jours</span>
          <input
            type="text"
            name="mission90"
            defaultValue={northStar?.mission90Days ?? ""}
            maxLength={500}
            placeholder="Ex. signer 6 mandats exclusifs"
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>

        <div>
          <span className="text-sm font-medium">Ton coach doit être…</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              ["soft", "Bienveillant"],
              ["balanced", "Équilibré"],
              ["demanding", "Exigeant"],
            ].map(([value, label]) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="coachTone"
                  value={value}
                  defaultChecked={(user.coachTone || "balanced") === value}
                  className="peer sr-only"
                />
                <span className="block rounded-xl border border-mxp-line bg-mxp-card px-3 py-2.5 text-center text-xs peer-checked:border-mxp-purple peer-checked:bg-mxp-purple-soft peer-checked:text-mxp-purple-deep">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <button className="w-full mxp-btn px-4 py-3 text-sm">
          C&apos;est parti — vers ma journée
        </button>
        <p className="text-center text-xs text-mxp-muted">
          Tout est modifiable plus tard dans Moi → North Star.
        </p>
      </form>
    </main>
  );
}
