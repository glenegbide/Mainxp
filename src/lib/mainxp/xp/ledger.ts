// XP ledger service — the ONLY write path for progression (docs/XP_SYSTEM.md).
// Append-only: corrections are compensating rows, duplicates are blocked by
// idempotency keys, totals are always derived from the rows.

import { prisma } from "@/lib/prisma";
import type { MxAttribute, MxEvidence } from "@/generated/prisma/enums";
import { dayStartUtc } from "@/lib/mainxp/day";
import { DIMINISHING_SOURCE_TYPES, diminishingFactor } from "./curve";

export type AttributeDeltas = Partial<Record<MxAttribute, number>>;

export interface AwardInput {
  userId: string;
  sourceType: string; // task | non_negotiable | habit | focus | goal | journal | …
  sourceId?: string;
  reason: string;
  mainDelta: number;
  /** Spendable Coins (rewards economy). Positive on awards, negative on redemptions. */
  coinsDelta?: number;
  attributeDeltas?: AttributeDeltas;
  multiplier?: number;
  /** Unique per source event, e.g. "task:<id>:completed". Replays become no-ops. */
  idempotencyKey?: string;
  /** How the underlying action was recorded (docs/XP_SYSTEM.md). */
  evidence?: MxEvidence;
  /** User timezone, needed for same-day anti-farming decay. */
  timezone?: string;
}

export interface XpTotals {
  main: number;
  coins: number;
  attributes: Record<MxAttribute, number>;
}

const scale = (v: number, f: number) => Math.round(v * f);

/**
 * Append an award to the ledger. Applies multiplier and (for trivial repeatable
 * source types) same-day diminishing returns. Returns the created row, or null
 * when the idempotency key already exists or decay reduced the award to zero.
 */
export async function awardXp(input: AwardInput) {
  const multiplier = input.multiplier ?? 1;
  let factor = multiplier;

  if (DIMINISHING_SOURCE_TYPES.has(input.sourceType)) {
    const tz = input.timezone ?? "Europe/Zurich";
    const priorToday = await prisma.mxXpTransaction.count({
      where: {
        userId: input.userId,
        sourceType: input.sourceType,
        reversesId: null,
        createdAt: { gte: dayStartUtc(new Date(), tz) },
      },
    });
    factor *= diminishingFactor(priorToday);
  }

  const mainDelta = scale(input.mainDelta, factor);
  const coinsDelta = scale(input.coinsDelta ?? 0, factor);
  const attributeDeltas: Record<string, number> = {};
  for (const [attr, delta] of Object.entries(input.attributeDeltas ?? {})) {
    const scaled = scale(delta ?? 0, factor);
    if (scaled !== 0) attributeDeltas[attr] = scaled;
  }
  if (mainDelta === 0 && coinsDelta === 0 && Object.keys(attributeDeltas).length === 0) return null;

  try {
    return await prisma.mxXpTransaction.create({
      data: {
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        reason: input.reason,
        multiplier: factor,
        mainDelta,
        coinsDelta,
        attributeDeltas,
        evidence: input.evidence ?? "SELF_REPORTED",
        idempotencyKey: input.idempotencyKey,
      },
    });
  } catch (e: unknown) {
    // Unique violation on idempotencyKey → the award already happened. No-op.
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") return null;
    throw e;
  }
}

/**
 * Award generations: a legitimate un-toggle reverses an award; a legitimate
 * re-toggle must then earn it back — exactly once. A bare idempotency key
 * cannot express that (the old key blocks the re-award forever), so keys grow
 * a generation suffix: "nn:<id>:<day>", then "nn:<id>:<day>#2", "#3"…
 * A new generation opens ONLY when every earlier one has been reversed, so the
 * net ledger state always agrees with the final toggle state and rapid
 * toggle-cycling can never net more than one live award.
 */
const genKey = (base: string, g: number) => (g === 1 ? base : `${base}#${g}`);
const MAX_GENERATIONS = 60; // sanity bound; a 60-cycle day is not a use case

async function isReversed(txId: string): Promise<boolean> {
  const reversal = await prisma.mxXpTransaction.findUnique({ where: { reversesId: txId } });
  return reversal !== null;
}

/**
 * Award with re-award-after-reversal semantics. Same contract as awardXp:
 * returns the created row, or null when a live (un-reversed) award already
 * exists for this logical key.
 */
export async function awardXpReawardable(input: AwardInput & { idempotencyKey: string }) {
  for (let g = 1; g <= MAX_GENERATIONS; g++) {
    const key = genKey(input.idempotencyKey, g);
    const existing = await prisma.mxXpTransaction.findUnique({ where: { idempotencyKey: key } });
    if (!existing) return awardXp({ ...input, idempotencyKey: key });
    if (!(await isReversed(existing.id))) return null; // still live — never double-award
  }
  return null;
}

/**
 * How many award generations exist for a logical key (reversed or not).
 * Deterministic input for event-row keys on re-toggles: the Nth keep of the
 * same commitment is a distinct fact and gets a distinct event, while the
 * ledger chain above keeps net XP equal to final state.
 */
export async function countAwardGenerations(baseKey: string): Promise<number> {
  for (let g = 1; g <= MAX_GENERATIONS; g++) {
    const tx = await prisma.mxXpTransaction.findUnique({
      where: { idempotencyKey: genKey(baseKey, g) },
    });
    if (!tx) return g - 1;
  }
  return MAX_GENERATIONS;
}

/**
 * Reverse the latest live generation of a logical key (used by un-toggles).
 * No-op when nothing is awarded or the latest generation is already reversed.
 */
export async function reverseLatestAward(userId: string, baseKey: string, reason: string) {
  let latest: { id: string } | null = null;
  for (let g = 1; g <= MAX_GENERATIONS; g++) {
    const tx = await prisma.mxXpTransaction.findUnique({
      where: { idempotencyKey: genKey(baseKey, g) },
    });
    if (!tx) break;
    latest = tx;
  }
  if (!latest) return null;
  return reverseXp(userId, latest.id, reason); // reverseXp itself refuses double-reversal
}

/**
 * Reverse a transaction (Part 64): appends a compensating row. The unique
 * constraint on reversesId guarantees a transaction is reversed at most once.
 */
export async function reverseXp(userId: string, transactionId: string, reason: string) {
  const original = await prisma.mxXpTransaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!original || original.reversesId) return null; // never reverse a reversal

  const negated: Record<string, number> = {};
  for (const [attr, delta] of Object.entries(
    (original.attributeDeltas as Record<string, number>) ?? {}
  )) {
    negated[attr] = -delta;
  }

  try {
    return await prisma.mxXpTransaction.create({
      data: {
        userId,
        sourceType: "reversal",
        sourceId: original.sourceId,
        reason,
        mainDelta: -original.mainDelta,
        coinsDelta: -original.coinsDelta,
        attributeDeltas: negated,
        reversesId: original.id,
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") return null;
    throw e;
  }
}

/** Derive totals from the ledger. */
export async function xpTotals(userId: string): Promise<XpTotals> {
  const rows = await prisma.mxXpTransaction.findMany({
    where: { userId },
    select: { mainDelta: true, coinsDelta: true, attributeDeltas: true },
  });
  const attributes = {
    STRENGTH: 0,
    ENDURANCE: 0,
    FOCUS: 0,
    DISCIPLINE: 0,
    KNOWLEDGE: 0,
    STRATEGY: 0,
    WEALTH: 0,
    MIND: 0,
    SOCIAL: 0,
  } as Record<MxAttribute, number>;
  let main = 0;
  let coins = 0;
  for (const row of rows) {
    main += row.mainDelta;
    coins += row.coinsDelta;
    for (const [attr, delta] of Object.entries(
      (row.attributeDeltas as Record<string, number>) ?? {}
    )) {
      if (attr in attributes) attributes[attr as MxAttribute] += delta;
    }
  }
  return { main: Math.max(0, main), coins: Math.max(0, coins), attributes };
}
