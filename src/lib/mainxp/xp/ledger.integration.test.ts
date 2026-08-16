// Ledger integration tests — P0 audit: toggle/reversal/re-toggle semantics.
// Needs a database (local dev / CI with Postgres); skipped when none is set.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("ledger generations — final state and net ledger agree", () => {
  // Imported lazily so a db-less environment never even loads the client.
  let prisma: typeof import("@/lib/prisma").prisma;
  let ledger: typeof import("./ledger");
  let userId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    ledger = await import("./ledger");
    const user = await prisma.mxUser.create({
      data: {
        email: `ledger-test-${Date.now()}@test.local`,
        passwordHash: "x",
        name: "Ledger Test",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.mxUser.delete({ where: { id: userId } });
  });

  const award = () =>
    ledger.awardXpReawardable({
      userId,
      sourceType: "non_negotiable",
      sourceId: "nn-test",
      reason: "test NN",
      mainDelta: 20,
      coinsDelta: 10,
      attributeDeltas: { DISCIPLINE: 15 },
      idempotencyKey: `nn-test:${userId}:2026-01-01`,
    });
  const unaward = () =>
    ledger.reverseLatestAward(userId, `nn-test:${userId}:2026-01-01`, "test uncheck");
  const totals = () => ledger.xpTotals(userId);

  it("awards exactly once, survives uncheck/recheck, never duplicates", async () => {
    // 1. legitimate completion → exactly one award
    expect(await award()).not.toBeNull();
    expect(await totals()).toMatchObject({ main: 20, coins: 10 });

    // 2. double-submit → no duplicate
    expect(await award()).toBeNull();
    expect(await totals()).toMatchObject({ main: 20, coins: 10 });

    // 3. accidental uncheck → net zero via compensating row (append-only)
    expect(await unaward()).not.toBeNull();
    expect(await totals()).toMatchObject({ main: 0, coins: 0 });

    // 4. double-uncheck → no double reversal
    expect(await unaward()).toBeNull();
    expect(await totals()).toMatchObject({ main: 0, coins: 0 });

    // 5. recheck → the legitimate XP comes BACK (old bug: lost forever)
    expect(await award()).not.toBeNull();
    expect(await totals()).toMatchObject({ main: 20, coins: 10 });
    expect((await totals()).attributes.DISCIPLINE).toBe(15);

    // 6. another double-submit at generation 2 → still no duplicate
    expect(await award()).toBeNull();
    expect(await totals()).toMatchObject({ main: 20, coins: 10 });

    // 7. full cycle once more — rapid toggling nets exactly one live award
    await unaward();
    await award();
    expect(await totals()).toMatchObject({ main: 20, coins: 10 });

    // Ledger shape: 3 awards + 2 reversals, all preserved (append-only).
    const rows = await prisma.mxXpTransaction.findMany({ where: { userId } });
    expect(rows).toHaveLength(5);
    expect(rows.filter((r) => r.reversesId !== null)).toHaveLength(2);
  });
});
