// LE RESET — shared definitions (kept prisma-free: the client flow
// imports these; recovery stats live in reset.ts).
//
// Drift is not failure; staying drifted is. The whole flow takes under a
// minute: name what's happening → notice the old pattern → choose the state
// to operate from → take ONE tiny action. MAINXP measures RECOVERY (how fast
// you return), never perfection.

/** States one can choose to operate from — «la fréquence». Each translates
 *  into behavior, because a state without a behavior is a mood. */
export const STATES: Record<string, { label: string; means: string }> = {
  abondance: { label: "Abondance", means: "créer des opportunités au lieu de t'inquiéter" },
  focus: { label: "Focus", means: "finir la quête avant les réseaux" },
  calme: { label: "Calme", means: "une pause avant chaque réponse difficile" },
  courage: { label: "Courage", means: "faire l'appel que tu évites" },
  discipline: { label: "Discipline", means: "tenir ce qui est prévu, sans négocier" },
  creation: { label: "Création", means: "produire avant de consommer" },
  gratitude: { label: "Gratitude", means: "nommer ce qui est déjà là" },
};

export const MAX_FREQUENCIES = 3;

/** What's happening right now — named, so it loses half its weight. */
export const TRIGGERS: Record<string, string> = {
  peur: "Peur",
  stress: "Stress",
  rarete: "Manque",
  colere: "Colère",
  distraction: "Distraction",
  surcharge: "Surcharge",
  fatigue: "Fatigue",
};

/** CSV → valid state keys, capped. Unknown keys are dropped silently. */
export function parseFrequencies(csv: string): string[] {
  return csv
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k in STATES)
    .slice(0, MAX_FREQUENCIES);
}

/** Pure median, minutes rounded. */
export function medianMinutes(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(m);
}

