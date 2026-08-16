import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { addMilestone, setProjectStatus, toggleMilestone, updateNextAction } from "../actions";

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

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const project = await prisma.mxProject.findFirst({
    where: { id, userId: user.id },
    include: { milestones: { orderBy: { order: "asc" } }, goal: true },
  });
  if (!project) notFound();

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/projects" className="text-xs text-mxp-muted">
        ← Projets
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{project.title}</h1>
      {project.desiredOutcome && (
        <p className="mt-1 text-sm text-mxp-muted">Résultat visé : {project.desiredOutcome}</p>
      )}
      {project.goal && (
        <p className="mt-1 text-xs text-mxp-muted">
          Moteur de :{" "}
          <Link href={`/goals/${project.goal.id}`} className="text-mxp-purple">
            {project.goal.title}
          </Link>
        </p>
      )}

      <section className="mt-4 rounded-2xl border border-mxp-line bg-mxp-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-mxp-orange">
            Avancement · {project.progress}%
          </p>
          <form action={setProjectStatus} className="flex items-center gap-1.5">
            <input type="hidden" name="id" value={project.id} />
            <select
              name="status"
              defaultValue={project.status}
              className="rounded-lg border border-mxp-line bg-mxp-card px-2 py-1 text-xs outline-none"
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="rounded-lg border border-mxp-line px-2 py-1 text-xs font-semibold hover:bg-mxp-bg">
              OK
            </button>
          </form>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-mxp-bg">
          <div className="h-full rounded-full bg-mxp-orange" style={{ width: `${project.progress}%` }} />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border-2 border-mxp-purple/40 bg-mxp-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mxp-purple">
          Prochaine action
        </p>
        <form action={updateNextAction} className="mt-2 flex gap-2">
          <input type="hidden" name="id" value={project.id} />
          <input
            type="text"
            name="nextAction"
            defaultValue={project.nextAction}
            maxLength={300}
            placeholder="La toute prochaine action concrète…"
            className="min-w-0 flex-1 rounded-lg border border-mxp-line px-3 py-2 text-sm outline-none focus:border-mxp-purple"
          />
          <button className="rounded-lg border border-mxp-line px-3 py-2 text-xs font-semibold hover:bg-mxp-bg">
            OK
          </button>
        </form>
        <p className="mt-2 text-xs text-mxp-muted">
          Un projet actif sans prochaine action est un projet à l&apos;arrêt.
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-mxp-line bg-mxp-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mxp-blue">
          Jalons · +40 XP · Stratégie
        </p>
        {project.milestones.length === 0 && (
          <p className="mt-2 text-sm text-mxp-muted">
            3 à 6 jalons suffisent — pas 60 tâches (le plan démarre par des jalons + une
            prochaine action).
          </p>
        )}
        <ul className="mt-2 space-y-2">
          {project.milestones.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3">
              <span className={`text-sm ${m.done ? "text-mxp-muted line-through" : ""}`}>
                {m.title}
              </span>
              <form action={toggleMilestone}>
                <input type="hidden" name="id" value={m.id} />
                <button
                  aria-pressed={m.done}
                  className={`h-7 w-7 rounded-full border text-sm leading-none ${
                    m.done
                      ? "border-mxp-blue bg-mxp-blue text-white"
                      : "border-mxp-line bg-mxp-card text-transparent hover:border-mxp-blue"
                  }`}
                >
                  ✓
                </button>
              </form>
            </li>
          ))}
        </ul>
        {project.milestones.length < 12 && (
          <form action={addMilestone} className="mt-3 flex gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <input
              type="text"
              name="title"
              required
              maxLength={300}
              placeholder="Ajouter un jalon…"
              className="min-w-0 flex-1 rounded-lg border border-mxp-line px-3 py-2 text-sm outline-none focus:border-mxp-blue"
            />
            <button className="rounded-lg border border-mxp-line px-3 py-2 text-xs font-semibold hover:bg-mxp-bg">
              +
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
