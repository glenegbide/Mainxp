import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { abandonBook, addBook, finishBook, saveBookNotes, startBook } from "./actions";

// La Bibliothèque : les livres + ce que TU en retiens. Lire nourrit le Sage —
// finir un livre est un vrai accomplissement (récompense découverte, jamais
// annoncée). Les notes sont lues par le coach.
export default async function LibraryPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");

  const books = await prisma.mxBook.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 60,
  });
  const reading = books.filter((b) => b.status === "reading");
  const toRead = books.filter((b) => b.status === "to_read");
  const finished = books.filter((b) => b.status === "finished");

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/me" className="text-xs text-mxp-muted">← Moi</Link>
      <h1 className="mt-2 text-xl font-semibold">Bibliothèque</h1>
      <p className="text-sm text-mxp-muted">
        Les livres, et surtout ce que tu en retiens — ton coach lit tes notes.
      </p>

      {/* ── En cours : le livre + tes notes, éditables en lisant ── */}
      {reading.map((b) => (
        <section key={b.id} className="mxp-card mxp-bluec mt-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mxp-label text-mxp-blue">En cours</p>
              <p className="mt-1 text-sm font-semibold">{b.title}</p>
              {b.author && <p className="text-xs text-mxp-muted">{b.author}</p>}
            </div>
            <form action={finishBook}>
              <input type="hidden" name="id" value={b.id} />
              <button className="mxp-btn mxp-btn-blue px-3 py-2 text-xs">Terminé 📖</button>
            </form>
          </div>
          <form action={saveBookNotes} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={b.id} />
            <textarea
              name="notes"
              rows={3}
              maxLength={4000}
              defaultValue={b.notes}
              placeholder="Ce que tu retiens en lisant — idées, passages, déclics…"
              className="w-full mxp-input px-3 py-2 text-sm"
            />
            <textarea
              name="lessons"
              rows={2}
              maxLength={2000}
              defaultValue={b.lessons}
              placeholder="Ce que tu APPLIQUES — la leçon transformée en action concrète…"
              className="w-full mxp-input px-3 py-2 text-sm"
            />
            <button className="w-full mxp-btn-ghost px-3 py-2 text-xs">Sauver mes notes</button>
          </form>
          <form action={abandonBook} className="mt-2 text-right">
            <input type="hidden" name="id" value={b.id} />
            <button className="mxp-quiet !w-auto text-xs">Abandonner ce livre (sans honte)</button>
          </form>
        </section>
      ))}

      {/* ── Ajouter ── */}
      <section className="mxp-card mt-4 p-4">
        <p className="mxp-label text-mxp-purple">Ajouter un livre</p>
        <form action={addBook} className="mt-2 space-y-2">
          <input
            type="text"
            name="title"
            required
            maxLength={300}
            placeholder="Titre…"
            className="w-full mxp-input px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="text"
              name="author"
              maxLength={200}
              placeholder="Auteur (optionnel)"
              className="min-w-0 flex-1 mxp-input px-3 py-2 text-sm"
            />
            <select name="status" className="mxp-input px-2 py-2 text-xs">
              <option value="reading">Je le lis</option>
              <option value="to_read">À lire</option>
            </select>
            <button className="mxp-btn px-3 py-2 text-xs">+</button>
          </div>
        </form>
      </section>

      {/* ── À lire ── */}
      {toRead.length > 0 && (
        <section className="mxp-card mt-4 p-4">
          <p className="mxp-label text-mxp-muted">À lire</p>
          <ul className="mt-2 space-y-2">
            {toRead.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm">
                  {b.title}
                  {b.author && <span className="text-xs text-mxp-muted"> — {b.author}</span>}
                </span>
                <form action={startBook}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="mxp-btn-ghost px-3 py-1.5 text-xs">Commencer</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Terminés : le palmarès du Sage ── */}
      {finished.length > 0 && (
        <section className="mxp-card mxp-goldc mt-4 p-4">
          <p className="mxp-label text-mxp-gold">Terminés · {finished.length}</p>
          <ul className="mt-2 space-y-3">
            {finished.map((b) => (
              <li key={b.id}>
                <p className="text-sm font-medium">
                  📖 {b.title}
                  {b.author && <span className="text-xs font-normal text-mxp-muted"> — {b.author}</span>}
                </p>
                {b.lessons && (
                  <p className="mt-0.5 text-xs text-mxp-muted">Appliqué : {b.lessons}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {books.length === 0 && (
        <p className="mt-6 text-center text-sm text-mxp-muted">
          Ajoute le livre que tu lis en ce moment — celui du défi « 1 livre cette semaine » ?
        </p>
      )}
    </main>
  );
}
