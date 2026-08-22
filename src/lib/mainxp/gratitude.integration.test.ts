// Gratitude 01–10 against a real database — the anti-farming promise:
// morning and night both STORE, but the day pays at most once, whoever writes
// first (ritual or coach tool). Skipped without a database.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("gratitude ritual — two lists, one payout", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let grat: typeof import("./gratitude");
  let ledger: typeof import("./xp/ledger");
  let user: import("@/generated/prisma/client").MxUser;
  const DAY = "2026-08-22";

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    grat = await import("./gratitude");
    ledger = await import("./xp/ledger");
    user = await prisma.mxUser.create({
      data: {
        email: `grat-${Date.now()}@test.local`,
        passwordHash: "x",
        name: "Grat Test",
        timezone: "UTC",
      },
    });
  });

  afterAll(async () => {
    if (user) await prisma.mxUser.delete({ where: { id: user.id } });
  });

  const rows = (period: string) =>
    prisma.mxGratitudeEntry.findMany({
      where: { userId: user.id, dayKey: DAY, period },
      orderBy: { position: "asc" },
    });

  it("stores up to ten ordered morning entries", async () => {
    const items = Array.from({ length: 10 }, (_, i) => `matin ${i + 1}`);
    await grat.saveGratitudeList(user, DAY, "morning", items);
    const saved = await rows("morning");
    expect(saved).toHaveLength(10);
    expect(saved.map((r) => r.content)).toEqual(items);
    expect(saved.map((r) => r.position)).toEqual([...Array(10).keys()]);
  });

  it("re-saving replaces the same period — never duplicates", async () => {
    await grat.saveGratitudeList(user, DAY, "morning", ["seul survivant"]);
    const saved = await rows("morning");
    expect(saved).toHaveLength(1);
    expect(saved[0].content).toBe("seul survivant");
  });

  it("morning and night coexist without touching each other", async () => {
    await grat.saveGratitudeList(user, DAY, "night", ["soir 1", "soir 2"]);
    expect(await rows("morning")).toHaveLength(1);
    expect(await rows("night")).toHaveLength(2);
  });

  it("the day pays gratitude XP at most once, whatever writes", async () => {
    const total = (await ledger.xpTotals(user.id)).main;
    // the morning save already paid; the night save and a re-save must not
    await grat.saveGratitudeList(user, DAY, "night", ["encore", "toujours"]);
    await grat.saveGratitudeList(user, DAY, "morning", ["reécrit"]);
    expect((await ledger.xpTotals(user.id)).main).toBe(total);

    const gratTx = await prisma.mxXpTransaction.count({
      where: { userId: user.id, sourceType: "gratitude" },
    });
    expect(gratTx).toBe(1);
  });

  it("an emptied list stores nothing and pays nothing", async () => {
    const before = (await ledger.xpTotals(user.id)).main;
    await grat.saveGratitudeList(user, "2026-08-23", "morning", []);
    expect(
      await prisma.mxGratitudeEntry.count({ where: { userId: user.id, dayKey: "2026-08-23" } })
    ).toBe(0);
    expect((await ledger.xpTotals(user.id)).main).toBe(before);
  });

  it("gratitudeItems keeps the user's order and drops blanks", () => {
    const fd = new FormData();
    fd.set("gratitudeMorning_0", "  premier  ");
    fd.set("gratitudeMorning_2", "troisième");
    fd.set("gratitudeMorning_5", "   ");
    expect(grat.gratitudeItems(fd, "gratitudeMorning")).toEqual(["premier", "troisième"]);
  });
});
