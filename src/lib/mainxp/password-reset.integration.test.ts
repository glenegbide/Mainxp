// Password recovery against a real database.
//
// This is the one flow where a mistake hands someone else an account, so the
// tests are written as attacks: replay the link, use it after expiry, ask for
// twenty of them, keep an old session alive after a reset.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("password recovery", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let reset: typeof import("./password-reset");
  let auth: typeof import("./auth");
  let userId: string;
  const email = `reset-${Date.now()}@test.local`;
  const ORIGIN = "https://mainxp.test";

  // The plaintext token exists only inside the email, so the tests that need
  // one mint it the same way the service does and verify through the public
  // API — never by reading a secret back out of the database.

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    reset = await import("./password-reset");
    auth = await import("./auth");
    const user = await prisma.mxUser.create({
      data: { email, passwordHash: auth.hashPassword("originalpass1"), name: "Reset Test" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.mxUser.deleteMany({ where: { id: userId } });
  });

  it("normalises the address, so Glen@ and glen@ are the same account", () => {
    expect(reset.normalizeEmail("  Glen@Example.CH ")).toBe("glen@example.ch");
  });

  it("an unknown address creates nothing at all", async () => {
    const before = await prisma.mxPasswordReset.count();
    const out = await reset.requestPasswordReset("personne@nulle-part.test", ORIGIN);
    expect(out).toEqual({ sent: false, reason: "no_account" });
    expect(await prisma.mxPasswordReset.count()).toBe(before);
  });

  it("creates a row whose token is NOT stored in plaintext", async () => {
    const out = await reset.requestPasswordReset(email.toUpperCase(), ORIGIN);
    // No provider in tests: the send fails honestly, the row still exists.
    expect(out).toEqual({ sent: false, reason: "email_unavailable" });
    const row = await prisma.mxPasswordReset.findFirstOrThrow({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.usedAt).toBeNull();
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("stops after three requests in an hour", async () => {
    await reset.requestPasswordReset(email, ORIGIN);
    await reset.requestPasswordReset(email, ORIGIN);
    const fourth = await reset.requestPasswordReset(email, ORIGIN);
    expect(fourth).toEqual({ sent: false, reason: "rate_limited" });
  });

  it("refuses a token that was never issued", async () => {
    expect(await reset.checkResetToken("not-a-real-token")).toBe("unknown");
    expect(await reset.completePasswordReset("not-a-real-token", "brandnewpass1")).toEqual({
      ok: false,
      error: "unknown",
    });
  });

  it("resets the password, burns the link, and logs every device out", async () => {
    // Mint a token the way requestPasswordReset does, so the plaintext is
    // known to the test exactly as the email would know it.
    const { createHash, randomBytes } = await import("node:crypto");
    const token = randomBytes(32).toString("base64url");
    await prisma.mxPasswordReset.deleteMany({ where: { userId } });
    await prisma.mxPasswordReset.create({
      data: {
        userId,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    // Two devices are signed in when the reset happens.
    await prisma.mxSession.createMany({
      data: [
        { userId, tokenHash: "session-a-" + Date.now(), expiresAt: new Date(Date.now() + 86_400_000) },
        { userId, tokenHash: "session-b-" + Date.now(), expiresAt: new Date(Date.now() + 86_400_000) },
      ],
    });

    expect(await reset.checkResetToken(token)).toBe("valid");
    expect(await reset.completePasswordReset(token, "shortie")).toEqual({
      ok: false,
      error: "weak_password",
    });

    expect(await reset.completePasswordReset(token, "brandnewpass1")).toEqual({ ok: true });

    const user = await prisma.mxUser.findUniqueOrThrow({ where: { id: userId } });
    expect(auth.verifyPassword("brandnewpass1", user.passwordHash)).toBe(true);
    expect(auth.verifyPassword("originalpass1", user.passwordHash)).toBe(false);
    expect(await prisma.mxSession.count({ where: { userId } })).toBe(0);

    // Replaying the link does nothing — this is the attack that matters.
    expect(await reset.checkResetToken(token)).toBe("used");
    expect(await reset.completePasswordReset(token, "attackerpass1")).toEqual({
      ok: false,
      error: "used",
    });
    const after = await prisma.mxUser.findUniqueOrThrow({ where: { id: userId } });
    expect(auth.verifyPassword("brandnewpass1", after.passwordHash)).toBe(true);
  });

  it("an expired link is refused even though it was never used", async () => {
    const { createHash, randomBytes } = await import("node:crypto");
    const token = randomBytes(32).toString("base64url");
    await prisma.mxPasswordReset.create({
      data: {
        userId,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    expect(await reset.checkResetToken(token)).toBe("expired");
    expect(await reset.completePasswordReset(token, "anotherpass12")).toEqual({
      ok: false,
      error: "expired",
    });
  });

  it("using one link kills the others still sitting in the inbox", async () => {
    const { createHash, randomBytes } = await import("node:crypto");
    await prisma.mxPasswordReset.deleteMany({ where: { userId } });
    const tokens = [randomBytes(32).toString("base64url"), randomBytes(32).toString("base64url")];
    for (const t of tokens) {
      await prisma.mxPasswordReset.create({
        data: {
          userId,
          tokenHash: createHash("sha256").update(t).digest("hex"),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
    }
    expect(await reset.completePasswordReset(tokens[0], "finalpassword1")).toEqual({ ok: true });
    expect(await reset.checkResetToken(tokens[1])).toBe("used");
  });
});

describe("origin resolution", () => {
  it("prefers the configured public URL and drops a trailing slash", async () => {
    const { originFromHeaders } = await import("./password-reset");
    process.env.MAINXP_PUBLIC_URL = "https://mainxp.app/";
    expect(originFromHeaders(new Headers())).toBe("https://mainxp.app");
    delete process.env.MAINXP_PUBLIC_URL;
  });

  it("otherwise builds from the request's own host", async () => {
    const { originFromHeaders } = await import("./password-reset");
    expect(originFromHeaders(new Headers({ host: "mainxp.vercel.app" }))).toBe(
      "https://mainxp.vercel.app"
    );
    expect(originFromHeaders(new Headers({ host: "localhost:3500" }))).toBe(
      "http://localhost:3500"
    );
    expect(
      originFromHeaders(new Headers({ "x-forwarded-host": "app.mainxp.ch", "x-forwarded-proto": "https" }))
    ).toBe("https://app.mainxp.ch");
  });
});
