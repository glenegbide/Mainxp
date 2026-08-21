// Engine integration — the whole chain against a real database:
// facts → trigger → gate → recorded decision. Skipped without a database.
//
// What it guards: every evaluation leaves a row. A notification that was never
// sent must still be explainable ("why didn't MAINXP say anything?"), and a
// decision that was taken must never be taken twice.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("evaluateUser — silence is a recorded decision", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let engine: typeof import("./engine");
  let userId: string;

  // 14:00 UTC — inside the main_quest_stale window, outside quiet hours.
  const AT = new Date("2026-08-19T14:00:00Z");

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    engine = await import("./engine");
    const user = await prisma.mxUser.create({
      data: {
        email: `notify-test-${Date.now()}@test.local`,
        passwordHash: "x",
        name: "Notify Test",
        timezone: "UTC",
        notificationMode: "normal",
      },
    });
    userId = user.id;
    await prisma.mxTask.create({
      data: {
        userId,
        title: "Appeler 5 propriétaires",
        tier: "MAIN_QUEST",
        status: "OPEN",
        dayKey: "2026-08-19",
      },
    });
  });

  afterAll(async () => {
    if (userId) await prisma.mxUser.delete({ where: { id: userId } });
  });

  const user = () => prisma.mxUser.findUniqueOrThrow({ where: { id: userId } });
  const rows = () =>
    prisma.mxNotification.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

  it("records the decision with its reason instead of sending into the void", async () => {
    const r = await engine.evaluateUser(await user(), AT);
    expect(r.sent).toBe(0);
    // No device is registered, so the only honest outcome is a logged decision.
    expect(r.suppressed.no_subscription).toBe(1);

    const [row] = await rows();
    expect(row.type).toBe("main_quest_stale");
    expect(row.status).toBe("SUPPRESSED");
    expect(row.suppressedReason).toBe("no_subscription");
    expect(row.body).toContain("Appeler 5 propriétaires");
    expect(row.evidence).toMatchObject({ postponeCount: 0 });
  });

  it("cannot decide the same thing twice, even on overlapping ticks", async () => {
    const before = (await rows()).length;
    await Promise.all([
      engine.evaluateUser(await user(), AT),
      engine.evaluateUser(await user(), AT),
    ]);
    expect((await rows()).length).toBe(before);
  });

  it("stays silent in rest mode — and says that is why", async () => {
    await prisma.mxUser.update({ where: { id: userId }, data: { restMode: true } });
    await prisma.mxNotification.deleteMany({ where: { userId } });
    const r = await engine.evaluateUser(await user(), AT);
    expect(r.sent).toBe(0);
    expect(r.suppressed.rest_mode).toBe(1);
    expect((await rows())[0].suppressedReason).toBe("rest_mode");
    await prisma.mxUser.update({ where: { id: userId }, data: { restMode: false } });
  });

  it("never even looks at the day outside a trigger window", async () => {
    await prisma.mxNotification.deleteMany({ where: { userId } });
    const r = await engine.evaluateUser(await user(), new Date("2026-08-19T03:00:00Z"));
    expect(r).toEqual({ sent: 0, suppressed: {} });
    expect(await rows()).toHaveLength(0);
  });
});
