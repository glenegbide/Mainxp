// Earned titles (Part 21 foundation). Never chosen, never bought — computed
// from ledger evidence. Tiers unlock as evidence accumulates; body-based
// archetypes (Titan…) arrive with Phase 3 workouts.

import { prisma } from "@/lib/prisma";

export interface TitleDef {
  id: string;
  name: string;
  tiers: number[]; // evidence thresholds for I, II, III
  metric: string; // human label of what counts
  sourceTypes: string[]; // ledger sourceTypes that count as evidence
}

export const TITLES: TitleDef[] = [
  {
    id: "discipline",
    name: "Le Discipliné",
    tiers: [30, 100, 365],
    metric: "non-négociables tenus",
    sourceTypes: ["non_negotiable"],
  },
  {
    id: "strategist",
    name: "Le Stratège",
    tiers: [10, 40, 120],
    metric: "jalons et projets accomplis",
    sourceTypes: ["milestone", "project"],
  },
  {
    id: "focused",
    name: "Le Focalisé",
    tiers: [10, 50, 200],
    metric: "sessions focus vérifiées",
    sourceTypes: ["focus"],
  },
  {
    id: "monk",
    name: "Le Moine",
    tiers: [15, 60, 250],
    metric: "revues, journaux et gratitudes",
    sourceTypes: ["night_review", "gratitude", "journal", "morning", "weekly_review"],
  },
  {
    id: "builder",
    name: "Le Bâtisseur",
    tiers: [3, 10, 30],
    metric: "objectifs atteints",
    sourceTypes: ["goal"],
  },
];

export interface EarnedTitle {
  def: TitleDef;
  count: number;
  tier: number; // 0 = not earned yet
  next: number | null; // evidence needed for the next tier
}

/** Pure — unit-tested. */
export function tierFor(count: number, tiers: number[]): number {
  let tier = 0;
  for (const t of tiers) if (count >= t) tier++;
  return tier;
}

export async function earnedTitles(userId: string): Promise<EarnedTitle[]> {
  const [rows, reversals] = await Promise.all([
    prisma.mxXpTransaction.findMany({
      where: { userId, sourceType: { in: TITLES.flatMap((t) => t.sourceTypes) } },
      select: { id: true, sourceType: true },
    }),
    prisma.mxXpTransaction.findMany({
      where: { userId, reversesId: { not: null } },
      select: { reversesId: true },
    }),
  ]);
  const reversed = new Set(reversals.map((r) => r.reversesId));
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (reversed.has(row.id)) continue;
    counts.set(row.sourceType, (counts.get(row.sourceType) ?? 0) + 1);
  }
  return TITLES.map((def) => {
    const count = def.sourceTypes.reduce((s, st) => s + (counts.get(st) ?? 0), 0);
    const tier = tierFor(count, def.tiers);
    return { def, count, tier, next: def.tiers[tier] ?? null };
  });
}

export const ROMAN = ["", "I", "II", "III"];
