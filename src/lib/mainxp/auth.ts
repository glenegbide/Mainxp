// MAINXP multi-user auth — fully separate from the site's admin auth (lib/auth.ts).
// Passwords: scrypt with per-user salt. Sessions: random 256-bit token in an
// HttpOnly cookie, stored SHA-256-hashed with a sliding 30-day expiry.

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";

export const MXP_COOKIE = "mxp_session";
const SESSION_DAYS = 30;

// ── Passwords ──

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ── Sessions ──

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.mxSession.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  const store = await cookies();
  store.set(MXP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(MXP_COOKIE)?.value;
  if (token) {
    await prisma.mxSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(MXP_COOKIE);
}

/** Current MAINXP user, or null. The real security boundary — the proxy redirect is UX only. */
export async function getMxUser(): Promise<MxUser | null> {
  const store = await cookies();
  const token = store.get(MXP_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.mxSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  // "Is the user in the app right now?" — the notification engine suppresses
  // pushes for 10 minutes after this. Conditional so it costs at most one
  // write per 5 minutes, never one per page view.
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
  if (!session.user.lastSeenAt || session.user.lastSeenAt < fiveMinutesAgo) {
    void prisma.mxUser
      .updateMany({
        where: { id: session.user.id, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: fiveMinutesAgo } }] },
        data: { lastSeenAt: new Date() },
      })
      .catch(() => {});
  }
  return session.user;
}

/** For server actions: returns the user or throws (actions must never run unauthenticated). */
export async function requireMxUser(): Promise<MxUser> {
  const user = await getMxUser();
  if (!user) throw new Error("Non autorisé");
  return user;
}
