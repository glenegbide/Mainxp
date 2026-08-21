// Open tracking: what the user actually does with a notification is the input
// to "learn which ones help" — and to staying silent about the ones that don't.

import { prisma } from "@/lib/prisma";
import { getMxUser } from "@/lib/mainxp/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getMxUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return Response.json({ ok: false }, { status: 400 });
  // Scoped to the session's own user — a notification id is never enough.
  await prisma.mxNotification.updateMany({
    where: { id, userId: user.id, openedAt: null },
    data: { openedAt: new Date() },
  });
  return Response.json({ ok: true });
}
