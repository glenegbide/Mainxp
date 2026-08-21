"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { emailConfigured } from "@/lib/mainxp/email";
import {
  completePasswordReset,
  originFromHeaders,
  requestPasswordReset,
} from "@/lib/mainxp/password-reset";

/**
 * Always lands on the same confirmation, whatever happened — an unknown
 * address, a rate limit and a real send are indistinguishable from outside.
 * The one exception is a server with no email provider configured: pretending
 * a mail is on its way would leave the person waiting forever (CLAUDE.md
 * rule 4), so that says so plainly.
 */
export async function askPasswordReset(formData: FormData): Promise<void> {
  // "Can this server send mail at all?" is a fact about the server, so saying
  // it leaks nothing. It is checked BEFORE the lookup precisely so that the
  // answer can never depend on whether the address belongs to someone.
  if (!emailConfigured()) redirect("/mot-de-passe-oublie?etat=indisponible");

  const email = String(formData.get("email") ?? "");
  const origin = originFromHeaders(await headers());
  // The outcome is for the logs. The visitor always sees the same sentence.
  await requestPasswordReset(email, origin);
  redirect("/mot-de-passe-oublie?etat=envoye");
}

export async function submitNewPassword(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) redirect(`/mot-de-passe/${token}?erreur=confirmation`);

  const result = await completePasswordReset(token, password);
  redirect(result.ok ? "/login?etat=motdepasse" : `/mot-de-passe/${token}?erreur=${result.error}`);
}
