// XP ledger service — the ONLY write path for progression (docs/XP_SYSTEM.md).
// Append-only: corrections are compensating rows, duplicates are blocked by
// idempotency keys, totals are always derived from the rows.

import { prisma } from "@/lib/prisma";
import type { MxAttribute } from "@/generated/prisma/enums";
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
