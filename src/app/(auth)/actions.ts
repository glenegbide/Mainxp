"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, verifyPassword } from "@/lib/mainxp/auth";

const VALID_TZ = (tz: string): string => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "Europe/Zurich";
  }
};

export async function signup(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const timezone = VALID_TZ(String(formData.get("timezone") ?? "").trim() || "Europe/Zurich");

  if (!name || name.length > 100) redirect("/signup?error=name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/signup?error=email");
  if (password.length < 8) redirect("/signup?error=password");

  const existing = await prisma.mxUser.findUnique({ where: { email } });
  if (existing) redirect("/signup?error=exists");

  const user = await prisma.mxUser.create({
    data: { name, email, passwordHash: hashPassword(password), timezone },
  });
  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.mxUser.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=credentials");
  }
  await createSession(user.id);
  redirect("/today");
}
