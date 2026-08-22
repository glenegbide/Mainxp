import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { addDays, dayKey } from "@/lib/mainxp/day";
import { JOURNAL_MOODS, MOOD_LABEL, type JournalMood } from "@/lib/mainxp/journal";
import { NoteAction } from "../../components/NoteAction";
import { noteOnGratitude } from "../note-actions";
import { addJournalEntry } from "./actions";

// JOURNAL — ONE purpose: write what you're living, right now. The blank page
// IS the anchor; everything already written falls back into a quiet timeline.
export default async function JournalPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);
  const since = addDays(today, -13);

  const [entries, gratitude] = await Promise.all([
    prisma.mxJournalEntry.findMany({
      where: { userId: user.id, dayKey: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    // Gratitude was written at night and then never seen again — it belongs in
    // the same timeline, where re-reading it is what gives it its second life.
    prisma.mxGratitudeEntry.findMany({
      where: { userId: user.id, dayKey: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  const dayLabel = (d: string) =>
    d === today
      ? "Aujourd'hui"
      : d === addDays(today, -1)
        ? "Hier"
        : new Intl.DateTimeFormat("fr-CH", { weekday: "long", day: "numeric", month: "long" }).format(
            new Date(`${d}T12:00:00Z`)
          );
  const byDay = new Map<string, typeof entries>();
  for (const e of entries) {
    byDay.set(e.dayKey, [...(byDay.get(e.dayKey) ?? []), e]);
  }
  const gratitudeByDay = new Map<string, typeof gratitude>();
  for (const g of gratitude) {
    gratitudeByDay.set(g.dayKey, [...(gratitudeByDay.get(g.dayKey) ?? []), g]);
  }
  const days = [...new Set([...byDay.keys(), ...gratitudeByDay.keys()])].sort().reverse();
  const todayCount = (byDay.get(today) ?? []).length;

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="mxp-meta">← Aujourd&apos;hui</Link>
      <h1 className="mt-3 mxp-display">Journal</h1>
      <p className="mxp-meta mt-1">
        Ton coach le lit pour comprendre tes vraies journées — personne d&apos;autre.
      </p>

      {/* ── The anchor: the blank page, ready ── */}
      <section className="mt-5 mxp-anchor">
        <p className="mxp-label text-mxp-purple">
          {todayCount === 0 ? "Là, maintenant" : `Aujourd'hui · ${todayCount}`}
        </p>
        <form action={addJournalEntry} className="mt-3 space-y-3">
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
                <span className="flex min-h-[38px] items-center rounded-full border border-mxp-line bg-mxp-card px-3.5 text-[13px] font-semibold text-mxp-muted transition peer-checked:border-mxp-purple peer-checked:bg-mxp-purple-soft peer-checked:text-mxp-purple-deep">
                  {MOOD_LABEL[m]}
                </span>
              </label>
            ))}
          </div>
          <textarea
            name="content"
            required
            rows={6}
            maxLength={4000}
            placeholder="Comment ça va, là ? Ce qui s'est passé, ce que tu ressens, ce que tu veux te rappeler…"
            className="w-full mxp-input px-4 py-3"
          />
          <button className="mxp-btn w-full py-3 text-[15px]">Écrire</button>
        </form>
      </section>

      {/* ── The timeline: quiet, chrome-less, the writing carries it ── */}
      {days.length === 0 ? (
        <p className="mxp-body mt-8 text-center text-mxp-muted">
          Première page blanche.
          <span className="mt-1 block mxp-meta">
            Trois lignes suffisent — ce qui compte, c&apos;est la sincérité, pas le volume.
          </span>
        </p>
      ) : (
        <div className="mt-7">
          {days.map((d) => (
            <section key={d} className="mt-6 first:mt-0">
              <p className="mxp-label text-mxp-muted">{dayLabel(d)}</p>
              <ul className="mt-2 divide-y divide-mxp-line">
                {(gratitudeByDay.get(d) ?? []).map((g) => (
                  <li key={g.id} className="py-4">
                    <p className="text-[13px] font-semibold text-mxp-gold">Gratitude</p>
                    <p className="mt-1.5 whitespace-pre-wrap mxp-body">{g.content}</p>
                    {g.whyItMatter && <p className="mxp-meta mt-1">{g.whyItMatter}</p>}
                    <NoteAction
                      id={g.id}
                      label={`gratitude — ${g.content.slice(0, 40)}`}
                      note={g.note}
                      placeholder="En relisant : qu'est-ce que ça te fait ?"
                      save={noteOnGratitude}
                    />
                  </li>
                ))}
                {(byDay.get(d) ?? []).map((e) => (
                  <li key={e.id} className="py-4">
                    <div className="flex items-baseline gap-2">
                      {e.mood && (
                        <span className="text-[13px] font-semibold text-mxp-purple-deep">
                          {MOOD_LABEL[e.mood as JournalMood] ?? e.mood}
                        </span>
                      )}
                      <span className="mxp-meta">
                        {new Intl.DateTimeFormat("fr-CH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: user.timezone,
                        }).format(e.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap mxp-body">{e.content}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
