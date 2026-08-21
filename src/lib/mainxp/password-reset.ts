// Password recovery.
//
// Three rules decide the shape of everything here:
//   1. The answer to "did that email exist?" is always the same sentence.
//      An account-recovery form must never become an account-existence oracle.
//   2. The token lives in the email, never in the database — only its SHA-256
//      is stored, so a database leak cannot take over accounts.
//   3. Using a reset link ends every session everywhere. If someone else had
//      your password, the reset is what pushes them out.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/mainxp/auth";
import { passwordResetMail, sendEmail } from "@/lib/mainxp/email";

export const RESET_TTL_MIN = 60;
export const MAX_RESETS_PER_HOUR = 3;
export const MIN_PASSWORD = 8;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** A constant-time comparison for hashes of equal, known length. */
function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export type RequestOutcome =
  | { sent: true }
  | { sent: false; reason: "no_account" | "rate_limited" | "email_unavailable" };

/**
 * Creates a reset link and mails it. The CALLER must show the same message
 * whatever comes back — the outcome exists for logs and for the honest
 * "email isn't configured on this server" case, not to tell the visitor
 * whether an account exists.
 */
export async function requestPasswordReset(
  rawEmail: string,
  origin: string
): Promise<RequestOutcome> {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.mxUser.findUnique({ where: { email } });
  if (!user) return { sent: false, reason: "no_account" };

  const recent = await prisma.mxPasswordReset.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (recent >= MAX_RESETS_PER_HOUR) return { sent: false, reason: "rate_limited" };

  const token = randomBytes(32).toString("base64url");
  await prisma.mxPasswordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000),
    },
  });

  const mail = passwordResetMail(user.name, `${origin}/mot-de-passe/${token}`, RESET_TTL_MIN);
  const result = await sendEmail({ ...mail, to: user.email });
  return result.ok ? { sent: true } : { sent: false, reason: "email_unavailable" };
}

export type TokenState = "valid" | "unknown" | "expired" | "used";

export async function checkResetToken(token: string): Promise<TokenState> {
  const row = await prisma.mxPasswordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || !sameHash(row.tokenHash, hashToken(token))) return "unknown";
  if (row.usedAt) return "used";
  if (row.expiresAt < new Date()) return "expired";
  return "valid";
}

export type ResetOutcome = { ok: true } | { ok: false; error: TokenState | "weak_password" };

/** Sets the new password, burns the token, and logs every device out. */
export async function completePasswordReset(
  token: string,
  password: string
): Promise<ResetOutcome> {
  if (password.length < MIN_PASSWORD) return { ok: false, error: "weak_password" };

  const state = await checkResetToken(token);
  if (state !== "valid") return { ok: false, error: state };

  const row = await prisma.mxPasswordReset.findUniqueOrThrow({
    where: { tokenHash: hashToken(token) },
  });

  await prisma.$transaction([
    prisma.mxUser.update({
      where: { id: row.userId },
      data: { passwordHash: hashPassword(password) },
    }),
    prisma.mxPasswordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    // Any other link that was floating in an inbox dies with this one.
    prisma.mxPasswordReset.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    // Sessions everywhere: gone. This is the whole point of a reset.
    prisma.mxSession.deleteMany({ where: { userId: row.userId } }),
  ]);
  return { ok: true };
}

/** The origin to build links from — the request's own host, never a guess. */
export function originFromHeaders(headers: Headers): string {
  const configured = process.env.MAINXP_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
