// The dominant path: the attribute with the most EARNED XP. Pure — feeds the
// Block Hero's core and the identity screens. Ties break on a stable order so
// the character never flickers between two colors on equal totals.

import type { MxAttribute } from "@/generated/prisma/client";

const ORDER: MxAttribute[] = [
  "DISCIPLINE",
  "FOCUS",
  "STRENGTH",
  "ENDURANCE",
  "KNOWLEDGE",
  "STRATEGY",
  "WEALTH",
  "MIND",
  "SOCIAL",
];

export const ATTRIBUTE_LABEL: Record<MxAttribute, string> = {
  STRENGTH: "Force",
  ENDURANCE: "Endurance",
  FOCUS: "Focus",
  DISCIPLINE: "Discipline",
  KNOWLEDGE: "Connaissance",
  STRATEGY: "Stratégie",
  WEALTH: "Richesse",
  MIND: "Esprit",
  SOCIAL: "Social",
};

export function dominantAttribute(
  attributes: Partial<Record<MxAttribute, number>>
): MxAttribute {
  let best: MxAttribute = "DISCIPLINE";
  let bestValue = -1;
  for (const attr of ORDER) {
    const v = attributes[attr] ?? 0;
    if (v > bestValue) {
      best = attr;
      bestValue = v;
    }
  }
  return best;
}
