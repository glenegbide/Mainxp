"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, verifyPassword } from "@/lib/mainxp/auth";

/** Only an in-app path may be followed after auth — never an absolute URL. */
const safeNext = (value: FormDataEntryValue | null): string | null => {
  const v = String(value ?? "");
  return v.startsWith("/") && !v.startsWith("//") ? v : null;
};

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
  const suite = safeNext(formData.get("suite"));

  const q = suite ? `&suite=${encodeURIComponent(suite)}` : "";
  if (!name || name.length > 100) redirect(`/signup?error=name${q}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/signup?error=email${q}`);
  if (password.length < 8) redirect(`/signup?error=password${q}`);

  const existing = await prisma.mxUser.findUnique({ where: { email } });
  if (existing) redirect(`/signup?error=exists${q}`);

  const user = await prisma.mxUser.create({
    data: { name, email, passwordHash: hashPassword(password), timezone },
  });
  await createSession(user.id);
  redirect(suite ?? "/onboarding");
}

export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const suite = safeNext(formData.get("suite"));

  const user = await prisma.mxUser.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect(`/login?error=credentials${suite ? `&suite=${encodeURIComponent(suite)}` : ""}`);
  }
  await createSession(user.id);
  redirect(suite ?? "/today");
}
