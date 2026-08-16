import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { createProject } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  IDEA: "Idée",
  PLANNING: "Planification",
  ACTIVE: "Actif",
  WAITING: "En attente",
  BLOCKED: "Bloqué",
  AT_RISK: "À risque",
  PAUSED: "En pause",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export default async function ProjectsPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const [projects, goals] = await Promise.all([
    prisma.mxProject.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.mxGoal.findMany({ where: { userId: user.id, status: "ACTIVE" } }),
  ]);
  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;

  return (
    <main className="px-4 pt-5 pb-8">
      <h1 className="text-xl font-semibold">Projets</h1>
      <p className="text-sm text-mxp-muted">
        Un projet est le moteur d&apos;un objectif : un résultat, des jalons, une prochaine action.
      </p>

      {activeCount > 3 && (
        <section className="mt-3 mxp-card mxp-alert p-4 text-sm">
          <p className="font-semibold text-mxp-orange">Anti-dérive</p>
          <p className="mt-1 text-mxp-muted">
            {activeCount} projets actifs en parallèle. La dispersion est une side quest déguisée —
            envisage d&apos;en mettre en pause.
          </p>
        </section>
      )}

      {projects.length === 0 && (
        <section className="mt-4 mxp-card p-4 text-sm text-mxp-muted">
          Aucun projet. Crée le moteur de ton objectif le plus important ci-dessous.
        </section>
      )}

      <ul className="mt-4 space-y-3">
        {projects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              className="block mxp-card p-4 transition hover:border-mxp-purple/50"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{p.title}</p>
                <span className="shrink-0 rounded-full bg-mxp-bg px-2 py-0.5 text-[10px] font-semibold text-mxp-muted">
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              {p.nextAction && (
                <p className="mt-1.5 text-xs text-mxp-muted">→ Prochaine action : {p.nextAction}</p>
              )}
              <div className="mt-2 mxp-rail">
                <div
                  className="h-full rounded-full bg-mxp-orange"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-6 mxp-card p-4">
        <p className="mxp-label text-mxp-orange">Nouveau projet</p>
        <form action={createProject} className="mt-3 space-y-3">
          <input
            type="text"
            name="title"
            required
            maxLength={300}
            placeholder="Ex. Système de prospection propriétaires"
            className="w-full mxp-input px-4 py-2.5 text-sm"
          />
          <input
            type="text"
            name="desiredOutcome"
            maxLength={1000}
            placeholder="Résultat visé (mesurable si possible)"
            className="w-full mxp-input px-4 py-2.5 text-sm"
          />
          <input
            type="text"
            name="nextAction"
            maxLength={300}
            placeholder="Prochaine action concrète"
            className="w-full mxp-input px-4 py-2.5 text-sm"
          />
          {goals.length > 0 && (
            <label className="block text-xs text-mxp-muted">
              Objectif moteur
              <select
                name="goalId"
                className="mt-1 w-full mxp-input px-3 py-2.5 text-sm"
              >
                <option value="">— aucun —</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="w-full mxp-btn mxp-btn-orange px-4 py-2.5 text-sm">
            Créer le projet
          </button>
        </form>
      </section>
    </main>
  );
}
