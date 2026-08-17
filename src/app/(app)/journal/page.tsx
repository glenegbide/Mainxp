import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { JOURNAL_MOODS, MOOD_LABEL, type JournalMood } from "@/lib/mainxp/journal";
import { addJournalEntry } from "./actions";

// Le journal : l'endroit où écrire ce qu'on vit, là, maintenant. Le coach le
// lit pour comprendre les vraies journées — pas seulement les cases cochées.
export default async function JournalPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);
  const since = addDays(today, -6);

  const entries = await prisma.mxJournalEntry.findMany({
    where: { userId: user.id, dayKey: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const dayLabel = (d: string) =>
    d === today
      ? "Aujourd'hui"
      : new Intl.DateTimeFormat("fr-CH", { weekday: "long", day: "numeric", month: "long" }).format(
          new Date(`${d}T12:00:00Z`)
        );
  const byDay = new Map<string, typeof entries>();
  for (const e of entries) {
    byDay.set(e.dayKey, [...(byDay.get(e.dayKey) ?? []), e]);
  }

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="text-xs text-mxp-muted">← Aujourd&apos;hui</Link>
      <div className="mt-2 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Journal</h1>
        <span className="mxp-chip bg-mxp-teal/10 text-mxp-teal">+10 XP · Esprit</span>
      </div>
      <p className="text-sm text-mxp-muted">
        Pose ce que tu vis, là, maintenant. Ton coach le lit — personne d&apos;autre.
      </p>

      <section className="mxp-card mt-4 p-4">
        <form action={addJournalEntry} className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {JOURNAL_MOODS.map((m, i) => (
              <label key={m} className="cursor-pointer">
                <input
                  type="radio"
                  name="mood"
                  value={m}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span className="mxp-chip border border-mxp-line bg-mxp-card text-mxp-muted peer-checked:border-mxp-teal peer-checked:bg-mxp-teal/10 peer-checked:text-mxp-teal">
                  {MOOD_LABEL[m]}
                </span>
              </label>
            ))}
          </div>
          <textarea
            name="content"
            required
            rows={5}
            maxLength={4000}
            placeholder="Comment ça va, là ? Ce qui s'est passé, ce que tu ressens, ce que tu veux te rappeler…"
            className="w-full mxp-input px-3 py-2.5 text-sm"
          />
          <button className="w-full mxp-btn mxp-btn-teal px-4 py-2.5 text-sm">Écrire</button>
        </form>
        <p className="mt-2 text-xs text-mxp-muted">
          L&apos;XP du journal diminue au fil des entrées du jour — la sincérité compte, pas le
          volume.
        </p>
      </section>

      {[...byDay.entries()].map(([d, dayEntries]) => (
        <section key={d} className="mt-4">
          <p className="mxp-label text-mxp-muted">{dayLabel(d)}</p>
          <div className="mt-2 space-y-2">
            {dayEntries.map((e) => (
              <article key={e.id} className="mxp-card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  {e.mood && (
                    <span className="text-xs font-semibold text-mxp-teal">
                      {MOOD_LABEL[e.mood as JournalMood] ?? e.mood}
                    </span>
                  )}
                  <span className="text-[11px] text-mxp-muted">
                    {new Intl.DateTimeFormat("fr-CH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: user.timezone,
                    }).format(e.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm">{e.content}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
      {entries.length === 0 && (
        <p className="mt-6 text-center text-sm text-mxp-muted">
          Première page blanche — écris ce que tu as en tête.
        </p>
      )}
    </main>
  );
}
