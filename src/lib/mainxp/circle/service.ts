// Le Cercle — the data layer around the door (visibility.ts).
//
// Rules that live here rather than in the UI, so no screen can forget them:
//   - a link is TWO rows, created together, both with every switch off;
//   - accepting is an explicit act by a signed-in person (never a GET);
//   - a circle is small on purpose (MAX_PARTNERS) — this is accountability,
//     not an audience;
//   - blocking ends both directions and survives a new invitation;
//   - reading a partner ALWAYS goes through visibleTo(). No exceptions, no
//     "just this one field".

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { MxUser } from "@/generated/prisma/client";
import { addDays, dayKey, weekKey } from "@/lib/mainxp/day";
import { elanReport } from "@/lib/mainxp/elan";
import { keepRate } from "@/lib/mainxp/insight";
import { levelProgress } from "@/lib/mainxp/xp/curve";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { visibleTo, type CircleLinkView, type PartnerCard, type SharerFacts } from "./visibility";

export const MAX_PARTNERS = 6;
const INVITE_TTL_DAYS = 14;

export type CircleError =
  | "self"
  | "expired"
  | "used"
  | "revoked"
  | "unknown"
  | "blocked"
  | "already"
  | "full";

/* ── Invitations ─────────────────────────────────────────────────────────── */

export async function createInvite(userId: string, label: string) {
  const token = randomBytes(24).toString("base64url");
  return prisma.mxCircleInvite.create({
    data: {
      inviterId: userId,
      token,
      label: label.slice(0, 60),
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
    },
  });
}

export async function revokeInvite(userId: string, id: string) {
  await prisma.mxCircleInvite.updateMany({
    where: { id, inviterId: userId, acceptedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Side-effect free: the accept page renders from this, and only POST accepts. */
export type InvitePreview =
  | { error: CircleError }
  | { error?: undefined; inviter: { id: string; name: string }; label: string };

export async function previewInvite(token: string): Promise<InvitePreview> {
  const invite = await prisma.mxCircleInvite.findUnique({
    where: { token },
    include: { inviter: { select: { id: true, name: true } } },
  });
  if (!invite) return { error: "unknown" as CircleError };
  if (invite.revokedAt) return { error: "revoked" as CircleError };
  if (invite.acceptedAt) return { error: "used" as CircleError };
  if (invite.expiresAt < new Date()) return { error: "expired" as CircleError };
  return { inviter: invite.inviter, label: invite.label };
}

export async function acceptInvite(
  user: Pick<MxUser, "id">,
  token: string
): Promise<{ ok: true; partnerId: string } | { ok: false; error: CircleError }> {
  const preview = await previewInvite(token);
  if (preview.error) return { ok: false, error: preview.error };
  const inviterId = preview.inviter.id;
  if (inviterId === user.id) return { ok: false, error: "self" };

  const [blocked, existing, mine, theirs] = await Promise.all([
    isBlockedBetween(user.id, inviterId),
    prisma.mxCircleLink.findUnique({
      where: { userId_partnerId: { userId: user.id, partnerId: inviterId } },
    }),
    prisma.mxCircleLink.count({ where: { userId: user.id, status: { not: "ended" } } }),
    prisma.mxCircleLink.count({ where: { userId: inviterId, status: { not: "ended" } } }),
  ]);
  if (blocked) return { ok: false, error: "blocked" };
  if (existing && existing.status !== "ended") return { ok: false, error: "already" };
  if (mine >= MAX_PARTNERS || theirs >= MAX_PARTNERS) return { ok: false, error: "full" };

  // One transaction: the invite is consumed and both directions exist, or
  // nothing happened at all.
  await prisma.$transaction([
    prisma.mxCircleInvite.update({
      where: { token },
      data: { acceptedById: user.id, acceptedAt: new Date() },
    }),
    prisma.mxCircleLink.upsert({
      where: { userId_partnerId: { userId: user.id, partnerId: inviterId } },
      create: { userId: user.id, partnerId: inviterId },
      update: { status: "active" }, // a re-accepted link keeps its old switches
    }),
    prisma.mxCircleLink.upsert({
      where: { userId_partnerId: { userId: inviterId, partnerId: user.id } },
      create: { userId: inviterId, partnerId: user.id },
      update: { status: "active" },
    }),
  ]);
  return { ok: true, partnerId: inviterId };
}

/* ── The link itself ─────────────────────────────────────────────────────── */

export interface SharingPatch {
  shareElan?: boolean;
  shareMainQuest?: boolean;
  shareChallenges?: boolean;
  shareWeekly?: boolean;
  goalIds?: string[];
  challengeIds?: string[];
}

/** Only ever writes the caller's OWN row: you cannot change what you receive. */
export async function updateSharing(userId: string, partnerId: string, patch: SharingPatch) {
  // Allowlists are validated against what the user actually owns, so a crafted
  // form can never grant access to someone else's rows.
  const data: SharingPatch = { ...patch };
  if (patch.goalIds) {
    const owned = await prisma.mxGoal.findMany({
      where: { userId, id: { in: patch.goalIds } },
      select: { id: true },
    });
    data.goalIds = owned.map((g) => g.id);
  }
  if (patch.challengeIds) {
    const owned = await prisma.mxChallenge.findMany({
      where: { userId, id: { in: patch.challengeIds } },
      select: { id: true },
    });
    data.challengeIds = owned.map((c) => c.id);
  }
  await prisma.mxCircleLink.updateMany({ where: { userId, partnerId }, data });
}

export async function setLinkStatus(userId: string, partnerId: string, status: "active" | "paused") {
  await prisma.mxCircleLink.updateMany({ where: { userId, partnerId }, data: { status } });
}

/** Leaving is mutual and immediate — no "pending removal", no notification. */
export async function endLink(userId: string, partnerId: string) {
  await prisma.mxCircleLink.updateMany({
    where: {
      OR: [
        { userId, partnerId },
        { userId: partnerId, partnerId: userId },
      ],
    },
    data: { status: "ended" },
  });
}

export async function blockPartner(userId: string, partnerId: string) {
  await prisma.$transaction([
    prisma.mxBlock.upsert({
      where: { userId_blockedId: { userId, blockedId: partnerId } },
      create: { userId, blockedId: partnerId },
      update: {},
    }),
    prisma.mxCircleLink.updateMany({
      where: {
        OR: [
          { userId, partnerId },
          { userId: partnerId, partnerId: userId },
        ],
      },
      data: { status: "ended" },
    }),
  ]);
}

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const n = await prisma.mxBlock.count({
    where: {
      OR: [
        { userId: a, blockedId: b },
        { userId: b, blockedId: a },
      ],
    },
  });
  return n > 0;
}

/* ── Facts + the read path ───────────────────────────────────────────────── */

/** Assembles everything about one person. Never returned to anyone directly. */
async function sharerFacts(user: MxUser): Promise<SharerFacts> {
  const today = dayKey(new Date(), user.timezone);
  const weekStart = addDays(today, -6);
  const [totals, elan, mq, challenges, missions, focus, nns, nnLogs] = await Promise.all([
    xpTotals(user.id),
    elanReport(user.id, user.timezone, user.restMode),
    prisma.mxTask.findFirst({
      where: { userId: user.id, dayKey: today, tier: "MAIN_QUEST" },
      include: { goal: { select: { id: true, title: true } } },
    }),
    prisma.mxChallenge.findMany({
      where: { userId: user.id, status: "active" },
      include: { logs: { select: { id: true } } },
    }),
    prisma.mxTask.count({
      where: { userId: user.id, status: "DONE", dayKey: { gte: weekStart, lte: today } },
    }),
    prisma.mxFocusSession.findMany({
      where: { userId: user.id, endedAt: { not: null }, startedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      select: { startedAt: true, endedAt: true },
    }),
    prisma.mxNonNegotiable.count({ where: { userId: user.id, active: true, cadence: "DAILY" } }),
    prisma.mxNonNegotiableLog.findMany({
      where: { userId: user.id, completed: true, periodKey: { gte: weekStart, lte: today } },
      select: { periodKey: true },
    }),
  ]);

  const focusMin = focus.reduce(
    (s, f) => s + Math.round((f.endedAt!.getTime() - f.startedAt.getTime()) / 60_000),
    0
  );

  return {
    name: user.name,
    level: levelProgress(totals.main).level,
    elan: elan.value,
    keepRate7: keepRate(nnLogs.length, nns * 7),
    mainQuest: mq
      ? {
          title: mq.title,
          done: mq.status === "DONE",
          goalId: mq.goalId,
          goalTitle: mq.goal?.title ?? null,
        }
      : null,
    challenges: challenges.map((c) => ({
      id: c.id,
      title: c.title,
      ticks: c.logs.length,
      targetCount: c.targetCount,
    })),
    week: {
      missionsDone: missions,
      focusMin,
      daysKept: new Set(nnLogs.map((l) => l.periodKey)).size,
    },
  };
}

const linkView = (l: {
  status: string;
  shareElan: boolean;
  shareMainQuest: boolean;
  shareChallenges: boolean;
  shareWeekly: boolean;
  goalIds: string[];
  challengeIds: string[];
}): CircleLinkView => l;

export interface CirclePartner {
  partnerId: string;
  /** What they show me — through the door, always. */
  card: PartnerCard;
  /** What I show them (my own row), so the exchange is never one-sided in secret. */
  mine: CircleLinkView;
  supportedToday: boolean;
}

export async function loadCircle(user: MxUser): Promise<CirclePartner[]> {
  const today = dayKey(new Date(), user.timezone);
  const [mineRows, blocks, supportSent] = await Promise.all([
    prisma.mxCircleLink.findMany({
      where: { userId: user.id, status: { not: "ended" } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.mxBlock.findMany({
      where: { OR: [{ userId: user.id }, { blockedId: user.id }] },
    }),
    prisma.mxEncouragement.findMany({
      where: { fromId: user.id, dayKey: today },
      select: { toId: true },
    }),
  ]);
  if (mineRows.length === 0) return [];

  const blockedIds = new Set(blocks.flatMap((b) => [b.userId, b.blockedId]));
  const supported = new Set(supportSent.map((s) => s.toId));
  const partnerIds = mineRows.map((l) => l.partnerId);

  const [theirRows, partners] = await Promise.all([
    prisma.mxCircleLink.findMany({
      where: { userId: { in: partnerIds }, partnerId: user.id },
    }),
    prisma.mxUser.findMany({ where: { id: { in: partnerIds } } }),
  ]);
  const theirByUser = new Map(theirRows.map((l) => [l.userId, l]));
  const userById = new Map(partners.map((p) => [p.id, p]));

  const out: CirclePartner[] = [];
  for (const mine of mineRows) {
    const partner = userById.get(mine.partnerId);
    if (!partner) continue;
    const blocked = blockedIds.has(partner.id);
    const theirs = theirByUser.get(partner.id) ?? null;
    // Only fetch a person's facts when something could actually be shown.
    const shows =
      !blocked && theirs !== null && theirs.status === "active" &&
      (theirs.shareElan || theirs.shareMainQuest || theirs.shareChallenges || theirs.shareWeekly);
    const facts: SharerFacts = shows
      ? await sharerFacts(partner)
      : {
          name: partner.name,
          level: 0,
          elan: null,
          keepRate7: null,
          mainQuest: null,
          challenges: [],
          week: { missionsDone: 0, focusMin: 0, daysKept: 0 },
        };
    const card = visibleTo({ link: theirs ? linkView(theirs) : null, blocked, facts });
    out.push({
      partnerId: partner.id,
      card: card ?? {
        name: partner.name,
        paused: theirs?.status === "paused",
        level: null,
        elan: null,
        mainQuest: null,
        challenges: [],
        week: null,
      },
      mine: linkView(mine),
      supportedToday: supported.has(partner.id),
    });
  }
  return out;
}

/* ── Support ─────────────────────────────────────────────────────────────── */

export const SUPPORT_KINDS = {
  support: "Je te soutiens",
  proud: "Fier de toi",
  push: "Vas-y, aujourd'hui",
} as const;

export type SupportKind = keyof typeof SUPPORT_KINDS;

/** One of each kind per day per person: care, not a like button. */
export async function encourage(
  from: MxUser,
  toId: string,
  kind: SupportKind
): Promise<{ ok: boolean }> {
  const linked = await prisma.mxCircleLink.count({
    where: { userId: from.id, partnerId: toId, status: { not: "ended" } },
  });
  if (!linked) return { ok: false };
  if (await isBlockedBetween(from.id, toId)) return { ok: false };

  try {
    await prisma.mxEncouragement.create({
      data: { fromId: from.id, toId, kind, dayKey: dayKey(new Date(), from.timezone) },
    });
  } catch {
    return { ok: false }; // already sent today — silently idempotent
  }
  const { notifySupport } = await import("@/lib/mainxp/notify/direct");
  await notifySupport(from, toId, kind);
  return { ok: true };
}

export async function receivedSupport(user: MxUser, days = 7) {
  const rows = await prisma.mxEncouragement.findMany({
    where: { toId: user.id, createdAt: { gte: new Date(Date.now() - days * 86_400_000) } },
    orderBy: { createdAt: "desc" },
    include: { from: { select: { name: true } } },
    take: 20,
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.from.name,
    kind: r.kind as SupportKind,
    dayKey: r.dayKey,
    seen: r.seenAt != null,
  }));
}

export async function markSupportSeen(userId: string) {
  await prisma.mxEncouragement.updateMany({
    where: { toId: userId, seenAt: null },
    data: { seenAt: new Date() },
  });
}

/** Used by the weekly review to say what the week looked like together. */
export async function circleWeekSummary(user: MxUser) {
  const week = weekKey(new Date(), user.timezone);
  const [sent, received] = await Promise.all([
    prisma.mxEncouragement.count({ where: { fromId: user.id, dayKey: { startsWith: week.slice(0, 4) } } }),
    prisma.mxEncouragement.count({ where: { toId: user.id, dayKey: { startsWith: week.slice(0, 4) } } }),
  ]);
  return { sent, received };
}
