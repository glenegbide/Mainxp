"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { emitEvent } from "@/lib/mainxp/events";

const s = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);
const refresh = () => revalidatePath("/library");

export async function addBook(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = s(formData.get("title"), 300);
  if (!title) return;
  await prisma.mxBook.create({
    data: {
      userId: user.id,
      title,
      author: s(formData.get("author"), 200),
      status: s(formData.get("status"), 20) === "to_read" ? "to_read" : "reading",
    },
  });
  refresh();
}

/** The user's own writing on a book — notes while reading, lessons applied. */
export async function saveBookNotes(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const book = await prisma.mxBook.findFirst({ where: { id, userId: user.id } });
  if (!book) return;
  await prisma.mxBook.update({
    where: { id: book.id },
    data: {
      notes: s(formData.get("notes"), 4000),
      lessons: s(formData.get("lessons"), 2000),
    },
  });
  refresh();
}

export async function startBook(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxBook.updateMany({
    where: { id: s(formData.get("id"), 40), userId: user.id, status: "to_read" },
    data: { status: "reading", startedAt: new Date() },
  });
  refresh();
}

export async function finishBook(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const book = await prisma.mxBook.findFirst({
    where: { id, userId: user.id, status: { in: ["reading", "to_read"] } },
  });
  if (!book) return;
  // Real accomplishment → canonical event, atomic with the state change.
  await emitEvent(
    user,
    "book_finished",
    { bookId: book.id, title: book.title, author: book.author },
    {
      idempotencyKey: `book:${book.id}:finished`,
      domainOps: [
        prisma.mxBook.update({
          where: { id: book.id },
          data: { status: "finished", finishedAt: new Date() },
        }),
      ],
    }
  );
  refresh();
  revalidatePath("/progress");
}

export async function abandonBook(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  // Quitting a bad book is wisdom, not failure — recorded, never punished.
  await prisma.mxBook.updateMany({
    where: { id: s(formData.get("id"), 40), userId: user.id, status: { in: ["reading", "to_read"] } },
    data: { status: "abandoned" },
  });
  refresh();
}
