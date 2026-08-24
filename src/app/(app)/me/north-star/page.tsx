import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { saveNorthStar } from "./actions";

function Field({
  name,
  label,
  hint,
  defaultValue,
  rows = 2,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-mxp-muted">{hint}</span>}
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="mt-1 w-full mxp-input px-4 py-3 text-sm"
      />
    </label>
  );
}

export default async function NorthStarPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const ns = await prisma.mxNorthStar.findUnique({ where: { userId: user.id } });
  const joined = (v: unknown) => (Array.isArray(v) ? v.join("\n") : "");

  return (
    <main className="px-4 pt-5 pb-8">
      <p className="mxp-label text-mxp-purple">Mon North Star</p>
      <h1 className="mt-1 mxp-display">Ce que je construis, et pourquoi.</h1>
      <p className="mt-1 text-sm text-mxp-muted">
        Le coach s&apos;appuie sur cette page pour prioriser. Une ligne par élément dans les listes.
      </p>

      <form action={saveNorthStar} className="mt-5 space-y-4">
        <Field name="why" label="Mon Pourquoi" defaultValue={ns?.why ?? ""} rows={3} />
        <Field
          name="values"
          label="Mes valeurs"
          hint="Une par ligne — ex. Parole tenue"
          defaultValue={joined(ns?.values)}
          rows={3}
        />
        <Field name="futureSelf" label="Mon futur moi" defaultValue={ns?.futureSelf ?? ""} rows={3} />
        <Field name="vision1Year" label="Ma vision à 1 an" defaultValue={ns?.vision1Year ?? ""} rows={3} />
        <label className="block">
          <span className="text-sm font-medium">Ma mission 90 jours</span>
          <input
            type="text"
            name="mission90Days"
            defaultValue={ns?.mission90Days ?? ""}
            maxLength={500}
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Ma saison actuelle</span>
          <input
            type="text"
            name="season"
            defaultValue={ns?.season ?? ""}
            maxLength={120}
            placeholder="Ex. Saison Revenus"
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <Field
          name="priorities"
          label="Mes priorités du moment"
          hint="Une par ligne, la plus importante d'abord"
          defaultValue={joined(ns?.priorities)}
          rows={3}
        />
        <Field
          name="personalRules"
          label="Mes règles personnelles"
          hint="Une par ligne — ex. Pas d'écran après 22h30"
          defaultValue={joined(ns?.personalRules)}
          rows={3}
        />
        <Field
          name="refusals"
          label="Ce que je refuse de devenir"
          defaultValue={ns?.refusals ?? ""}
        />
        <button className="w-full mxp-btn px-4 py-3 text-sm">
          Enregistrer
        </button>
      </form>
    </main>
  );
}
