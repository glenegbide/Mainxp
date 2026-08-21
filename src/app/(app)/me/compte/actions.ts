"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  requireMxUser,
  verifyPassword,
} from "@/lib/mainxp/auth";
import { MIN_PASSWORD, normalizeEmail } from "@/lib/mainxp/password-reset";

const back = (state: string) => redirect(`/me/compte?etat=${state}`);

/** The name everyone sees — the circle, the coach, the app itself. */
export async function saveName(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 100) back("nom_invalide");
  await prisma.mxUser.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/me/compte");
  revalidatePath("/me");
  back("nom");
}

/** Email is the login, so changing it asks for the password. */
export async function saveEmail(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("currentPassword") ?? "");

  if (!verifyPassword(password, user.passwordHash)) back("mdp_incorrect");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("email_invalide");
  if (email === user.email) back("email_identique");

  const taken = await prisma.mxUser.findUnique({ where: { email } });
  if (taken) back("email_pris");

  await prisma.mxUser.update({ where: { id: user.id }, data: { email } });
  revalidatePath("/me/compte");
  back("email");
}

/**
 * Changing the password logs out every OTHER device and re-issues this one's
 * session: the person doing it keeps working, everyone else has to sign in.
 */
export async function savePassword(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!verifyPassword(current, user.passwordHash)) back("mdp_incorrect");
  if (next.length < MIN_PASSWORD) back("mdp_court");
  if (next !== confirm) back("mdp_confirmation");

  await prisma.$transaction([
    prisma.mxUser.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } }),
    prisma.mxSession.deleteMany({ where: { userId: user.id } }),
    prisma.mxPasswordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }, // any reset link still in an inbox dies here
    }),
  ]);
  await createSession(user.id);
  back("mdp");
}

/** "I left it signed in somewhere" — one button, no forensics needed. */
export async function signOutEverywhere(): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxSession.deleteMany({ where: { userId: user.id } });
  await createSession(user.id); // this device stays, every other one is out
  back("sessions");
}

/**
 * Deleting is real and immediate: the row goes, and every related row goes
 * with it (Prisma cascades). No "deactivated" limbo, no 30-day hostage period.
 */
export async function deleteAccount(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const password = String(formData.get("deletePassword") ?? "");
  const confirm = String(formData.get("deleteConfirm") ?? "").trim().toUpperCase();

  if (!verifyPassword(password, user.passwordHash)) back("mdp_incorrect");
  if (confirm !== "SUPPRIMER") back("suppression_confirmation");

  await prisma.mxUser.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/signup");
}
