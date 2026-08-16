import type { MxAttribute } from "@/generated/prisma/enums";

/** Life area → attribute a goal's progress feeds (docs/XP_SYSTEM.md). */
export const LIFE_AREA_ATTRIBUTE: Record<string, MxAttribute> = {
  body: "STRENGTH",
  fitness: "ENDURANCE",
  mind: "MIND",
  money: "WEALTH",
  business: "STRATEGY",
  work: "STRATEGY",
  learning: "KNOWLEDGE",
  people: "SOCIAL",
  family: "SOCIAL",
};

export const LIFE_AREAS = [
  { value: "business", label: "Business / Travail" },
  { value: "money", label: "Argent" },
  { value: "body", label: "Corps / Santé" },
  { value: "fitness", label: "Sport / Endurance" },
  { value: "learning", label: "Apprentissage" },
  { value: "mind", label: "Esprit" },
  { value: "people", label: "Relations" },
  { value: "family", label: "Famille" },
  { value: "other", label: "Autre" },
] as const;
