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
      <Link href="/me" className="mxp-meta">← Moi</Link>
      <h1 className="mt-3 mxp-display">Bibliothèque</h1>
      <p className="mxp-meta mt-1">
        Les livres, et surtout ce que tu en retiens — ton coach lit tes notes.
      </p>

      {/* ── En cours : le livre + tes notes, éditables en lisant ── */}
      {reading.map((b) => (
        <section key={b.id} className="mt-5 mxp-anchor">
          <p className="mxp-label text-mxp-purple">En cours</p>
          <p className="mt-2 mxp-title">{b.title}</p>
          {b.author && <p className="mxp-meta mt-0.5">{b.author}</p>}
          <form action={saveBookNotes} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={b.id} />
            <textarea
              name="notes"
              rows={3}
              maxLength={4000}
              defaultValue={b.notes}
              placeholder="Ce que tu retiens en lisant — idées, passages, déclics…"
              className="w-full mxp-input px-4"
            />
            <textarea
              name="lessons"
              rows={2}
              maxLength={2000}
              defaultValue={b.lessons}
              placeholder="Ce que tu APPLIQUES — la leçon transformée en action concrète…"
              className="w-full mxp-input px-4"
            />
            <button className="w-full mxp-btn-ghost text-xs">Sauver mes notes</button>
          </form>
          <form action={finishBook} className="mt-3">
            <input type="hidden" name="id" value={b.id} />
            <button className="mxp-btn w-full py-3 text-[15px]">J&apos;ai fini ce livre</button>
          </form>
          <form action={abandonBook} className="mt-2 text-right">
            <input type="hidden" name="id" value={b.id} />
            <button className="mxp-quiet !w-auto text-xs">Abandonner ce livre (sans honte)</button>
          </form>
        </section>
      ))}

      {/* ── Les livres fondateurs de MAINXP — un geste pour les rejoindre.
          Le premier est dans le domaine public (1925) ; l'app en cite des
          passages au matin. Du second, elle ne reprend que les idées, dans
          nos propres mots — jamais le texte (docs/ASSET_POLICY.md). ── */}
      {(() => {
        const have = new Set(books.map((b) => b.title.toLowerCase()));
        const founders = [
          ["Le Jeu de la vie et comment le jouer", "Florence Scovel Shinn"],
          ["Le Guerrier pacifique", "Dan Millman"],
        ].filter(([t]) => !have.has(t.toLowerCase()));
        if (founders.length === 0) return null;
        return (
          <section className="mt-6">
            <p className="mxp-label text-mxp-muted">Les fondateurs — l&apos;esprit du jeu</p>
            <p className="mxp-meta mt-1">
              Les deux livres dont MAINXP tire sa philosophie : la vie comme un jeu qui se
              gagne par la parole et l&apos;acte justes, et l&apos;entraînement du guerrier —
              aucun moment n&apos;est ordinaire.
            </p>
            <div className="mt-2.5 space-y-2">
              {founders.map(([title, author]) => (
                <form key={title} action={addBook} className="flex items-center gap-3">
                  <input type="hidden" name="title" value={title} />
                  <input type="hidden" name="author" value={author} />
                  <input type="hidden" name="status" value="to_read" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-mxp-muted">{author}</span>
                  </span>
                  <button className="mxp-btn-ghost px-3 py-1.5 text-xs">+ Ma pile</button>
                </form>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ── Ajouter ── */}
      <section className="mt-6">
        <p className="mxp-label text-mxp-muted">Ajouter un livre</p>
        <form action={addBook} className="mt-2 space-y-2">
          <input
            type="text"
            name="title"
            required
            maxLength={300}
            placeholder="Titre…"
            className="w-full mxp-input px-4"
          />
          <div className="flex gap-2">
            <input
              type="text"
              name="author"
              maxLength={200}
              placeholder="Auteur (optionnel)"
              className="min-w-0 flex-1 mxp-input px-4"
            />
            <select name="status" className="mxp-input px-3 text-xs">
              <option value="reading">Je le lis</option>
              <option value="to_read">À lire</option>
            </select>
            <button className="mxp-btn px-3 py-2 text-xs">+</button>
          </div>
        </form>
      </section>

      {/* ── À lire ── */}
      {toRead.length > 0 && (
        <section className="mt-6">
          <p className="mxp-label text-mxp-muted">À lire</p>
          <ul className="mt-2 divide-y divide-mxp-line">
            {toRead.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 mxp-body">
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
        <section className="mt-6">
          <p className="mxp-label text-mxp-gold">Terminés · {finished.length}</p>
          <ul className="mt-2 space-y-3">
            {finished.map((b) => (
              <li key={b.id}>
                <p className="mxp-body font-medium">
                  {b.title}
                  {b.author && <span className="text-xs font-normal text-mxp-muted"> — {b.author}</span>}
                </p>
                {b.lessons && (
                  <p className="mxp-meta">Appliqué : {b.lessons}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {books.length === 0 && (
        <p className="mxp-body mt-8 text-center text-mxp-muted">
          Ajoute le livre que tu lis en ce moment — celui du défi « 1 livre cette semaine » ?
        </p>
      )}
    </main>
  );
}
