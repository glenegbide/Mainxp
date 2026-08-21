// Circle service integration — the rules that must hold against a real
// database, where two people and a shared token actually exist.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("Le Cercle — invitations, links and their limits", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let svc: typeof import("./service");
  let a: { id: string };
  let b: { id: string };
  const stamp = Date.now();

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    svc = await import("./service");
    a = await prisma.mxUser.create({
      data: { email: `circle-a-${stamp}@test.local`, passwordHash: "x", name: "Ada" },
    });
    b = await prisma.mxUser.create({
      data: { email: `circle-b-${stamp}@test.local`, passwordHash: "x", name: "Bo" },
    });
  });

  afterAll(async () => {
    await prisma.mxUser.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  });

  it("reading an invitation never consumes it — a prefetching mail client changes nothing", async () => {
    const invite = await svc.createInvite(a.id, "pour Bo");
    await svc.previewInvite(invite.token);
    await svc.previewInvite(invite.token);
    const fresh = await prisma.mxCircleInvite.findUniqueOrThrow({ where: { token: invite.token } });
    expect(fresh.acceptedAt).toBeNull();
    await prisma.mxCircleInvite.delete({ where: { id: invite.id } });
  });

  it("refuses your own link, and accepts exactly once", async () => {
    const invite = await svc.createInvite(a.id, "pour Bo");
    expect(await svc.acceptInvite(a, invite.token)).toEqual({ ok: false, error: "self" });

    const first = await svc.acceptInvite(b, invite.token);
    expect(first).toEqual({ ok: true, partnerId: a.id });

    // A link is two rows — one per direction — and both start closed.
    const rows = await prisma.mxCircleLink.findMany({
      where: { OR: [{ userId: a.id, partnerId: b.id }, { userId: b.id, partnerId: a.id }] },
    });
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.shareElan || r.shareMainQuest || r.shareChallenges || r.shareWeekly).toBe(false);
      expect(r.goalIds).toEqual([]);
      expect(r.challengeIds).toEqual([]);
    }

    // The same token cannot connect a third person, or the same pair twice.
    expect(await svc.acceptInvite(b, invite.token)).toEqual({ ok: false, error: "used" });
  });

  it("an expired invitation is dead, not merely discouraged", async () => {
    const invite = await svc.createInvite(a.id, "vieux");
    await prisma.mxCircleInvite.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await svc.acceptInvite(b, invite.token)).toEqual({ ok: false, error: "expired" });
  });

  it("a revoked invitation cannot be rescued by having the link", async () => {
    const invite = await svc.createInvite(a.id, "annulée");
    await svc.revokeInvite(a.id, invite.id);
    expect(await svc.acceptInvite(b, invite.token)).toEqual({ ok: false, error: "revoked" });
  });

  it("sharing only ever grants what the user actually owns", async () => {
    const goal = await prisma.mxGoal.create({
      data: { userId: a.id, title: "20K CHF", priority: 5 },
    });
    const foreign = await prisma.mxGoal.create({
      data: { userId: b.id, title: "Objectif de Bo", priority: 3 },
    });
    // A crafted form containing someone else's ids must be filtered, not trusted.
    await svc.updateSharing(a.id, b.id, {
      shareMainQuest: true,
      goalIds: [goal.id, foreign.id, "does-not-exist"],
    });
    const row = await prisma.mxCircleLink.findUniqueOrThrow({
      where: { userId_partnerId: { userId: a.id, partnerId: b.id } },
    });
    expect(row.goalIds).toEqual([goal.id]);
  });

  it("leaving cuts both directions at once", async () => {
    await svc.endLink(a.id, b.id);
    const rows = await prisma.mxCircleLink.findMany({
      where: { OR: [{ userId: a.id, partnerId: b.id }, { userId: b.id, partnerId: a.id }] },
    });
    expect(rows.every((r) => r.status === "ended")).toBe(true);
    expect(await svc.loadCircle(await prisma.mxUser.findUniqueOrThrow({ where: { id: b.id } }))).toEqual([]);
  });

  it("a block survives a new invitation", async () => {
    await svc.blockPartner(b.id, a.id);
    const invite = await svc.createInvite(a.id, "encore");
    expect(await svc.acceptInvite(b, invite.token)).toEqual({ ok: false, error: "blocked" });
    expect(await svc.isBlockedBetween(a.id, b.id)).toBe(true);
  });

  it("support cannot be sent to someone you are not linked to", async () => {
    const from = await prisma.mxUser.findUniqueOrThrow({ where: { id: a.id } });
    expect(await svc.encourage(from, b.id, "support")).toEqual({ ok: false });
  });
});
