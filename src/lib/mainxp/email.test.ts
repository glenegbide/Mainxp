// The email layer, without sending anything: the wire shape is asserted
// against a stubbed fetch, so a broken payload fails here rather than in
// someone's forgotten-password moment.
import { afterEach, describe, expect, it, vi } from "vitest";
import { emailConfigured, passwordResetMail, sendEmail } from "./email";

const realFetch = globalThis.fetch;
const realEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...realEnv };
  vi.restoreAllMocks();
});

function configure() {
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.MAINXP_EMAIL_FROM = "MAINXP <coach@mainxp.app>";
}

describe("emailConfigured — honest capability", () => {
  it("needs both the key and the from address", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAINXP_EMAIL_FROM;
    expect(emailConfigured()).toBe(false);

    process.env.RESEND_API_KEY = "re_test_key";
    expect(emailConfigured()).toBe(false);

    process.env.MAINXP_EMAIL_FROM = "coach@mainxp.app";
    expect(emailConfigured()).toBe(true);
  });
});

describe("sendEmail", () => {
  it("says so instead of pretending when nothing is configured", async () => {
    delete process.env.RESEND_API_KEY;
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    vi.spyOn(console, "info").mockImplementation(() => {});

    expect(await sendEmail({ to: "a@b.ch", subject: "s", text: "t" })).toEqual({
      ok: false,
      reason: "not_configured",
    });
    expect(spy).not.toHaveBeenCalled(); // no half-attempt, no fake success
  });

  it("posts exactly what the provider expects", async () => {
    configure();
    const calls: Array<[string, RequestInit]> = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    expect(await sendEmail({ to: "glen@example.ch", subject: "Sujet", text: "Corps", html: "<p>Corps</p>" })).toEqual({
      ok: true,
    });

    const [url, init] = calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      from: "MAINXP <coach@mainxp.app>",
      to: ["glen@example.ch"],
      subject: "Sujet",
      text: "Corps",
      html: "<p>Corps</p>",
    });
  });

  it("reports a refusal instead of throwing into the action", async () => {
    configure();
    globalThis.fetch = (async () => new Response("nope", { status: 422 })) as unknown as typeof fetch;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendEmail({ to: "a@b.ch", subject: "s", text: "t" })).toEqual({
      ok: false,
      reason: "provider",
    });
  });

  it("survives the network being gone", async () => {
    configure();
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendEmail({ to: "a@b.ch", subject: "s", text: "t" })).toEqual({
      ok: false,
      reason: "provider",
    });
  });
});

describe("passwordResetMail", () => {
  const mail = passwordResetMail("Glen", "https://mainxp.app/mot-de-passe/abc123", 60);

  it("carries the link and the deadline in BOTH the text and the html", () => {
    expect(mail.text).toContain("https://mainxp.app/mot-de-passe/abc123");
    expect(mail.text).toContain("60 minutes");
    expect(mail.html).toContain("https://mainxp.app/mot-de-passe/abc123");
    expect(mail.html).toContain("60 minutes");
    expect(mail.subject).toMatch(/mot de passe/i);
  });

  it("tells someone who did not ask that they have nothing to do", () => {
    expect(mail.text).toMatch(/Si ce n'est pas toi/);
  });

  it("never carries a password, nor an advertised reward", () => {
    const all = `${mail.text}${mail.html}`;
    expect(all).not.toMatch(/mot de passe (?:actuel )?est\b/i); // never quotes a secret
    expect(all).not.toMatch(/\+\d+\s?XP/); // rewards stay a surprise, even by mail
  });

  it("escapes a name that contains markup", () => {
    const evil = passwordResetMail('<img src=x onerror="alert(1)">', "https://mainxp.app/x", 60);
    expect(evil.html).not.toContain("<img");
    expect(evil.html).toContain("&lt;img");
  });
});
