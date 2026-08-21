// Transactional email — one provider, no dependency, and an honest offline
// state (CLAUDE.md rule 4: never fake a capability).
//
// MAINXP sends exactly one kind of email today: "you asked to reset your
// password". No marketing, no digests, no re-engagement. If a future feature
// wants to send something else, it has to justify itself here.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAINXP_EMAIL_FROM);
}

export interface Mail {
  to: string;
  subject: string;
  /** Plain text is the message; HTML is a courtesy. Both say the same thing. */
  text: string;
  html?: string;
}

export type SendResult = { ok: true } | { ok: false; reason: "not_configured" | "provider" };

export async function sendEmail(mail: Mail): Promise<SendResult> {
  if (!emailConfigured()) {
    // In development the link is the point of the test — print it rather than
    // silently dropping it. In production this returns a real failure, which
    // the caller reports instead of pretending an email is on its way.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] to=${mail.to} subject=${mail.subject}\n${mail.text}`);
    }
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAINXP_EMAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
      }),
    });
    if (!res.ok) {
      console.error("email provider refused:", res.status, await res.text().catch(() => ""));
      return { ok: false, reason: "provider" };
    }
    return { ok: true };
  } catch (e) {
    console.error("email send failed:", e instanceof Error ? e.message : e);
    return { ok: false, reason: "provider" };
  }
}

/** The reset mail. Written like a person wrote it, in the product's language. */
export function passwordResetMail(name: string, url: string, minutes: number): Mail {
  const text = [
    `${name},`,
    "",
    "Tu as demandé à réinitialiser ton mot de passe MAINXP. Ce lien fonctionne",
    `pendant ${minutes} minutes, une seule fois :`,
    "",
    url,
    "",
    "Si ce n'est pas toi, tu n'as rien à faire : tant que ce lien n'est pas",
    "ouvert, ton mot de passe actuel reste le seul valable.",
    "",
    "— MAINXP",
  ].join("\n");

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f5fb;padding:32px 16px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:#1a1626">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:28px">
    <p style="margin:0 0 4px;font-weight:700;font-size:20px;letter-spacing:-.02em">MAIN<span style="color:#7c3aed">XP</span></p>
    <p style="margin:0 0 20px;font-size:13px;color:#6b6880">Ta vie est la quête principale.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55">${escapeHtml(name)}, tu as demandé à réinitialiser ton mot de passe. Ce lien fonctionne pendant ${minutes} minutes, une seule fois.</p>
    <p style="margin:0 0 20px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:600;font-size:15px">Choisir un nouveau mot de passe</a></p>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b6880">Si ce n'est pas toi, tu n'as rien à faire : tant que ce lien n'est pas ouvert, ton mot de passe actuel reste le seul valable.</p>
  </div></body></html>`;

  return { to: "", subject: "Réinitialiser ton mot de passe MAINXP", text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
