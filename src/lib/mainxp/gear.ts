// Cosmetic gear catalog — original pixel layers for the MAINXP hero,
// bought with earned Coins. Cosmetics only: never XP, ranks or titles
// (no pay-to-win, Part 68). Purchases go through the ledger.

export interface GearDef {
  id: string;
  name: string;
  costCoins: number;
  slot: "head" | "eyes" | "torso" | "feet";
  description: string;
}

export const GEAR_CATALOG: GearDef[] = [
  { id: "lunettes", name: "Lunettes de stratège", costCoins: 80, slot: "eyes", description: "Pour voir le prochain jalon." },
  { id: "bandana_bleu", name: "Bandana azur", costCoins: 120, slot: "head", description: "Focus et clarté." },
  { id: "hoodie_vert", name: "Hoodie forêt", costCoins: 150, slot: "torso", description: "Corps et santé." },
  { id: "chaussures_rouges", name: "Baskets écarlates", costCoins: 100, slot: "feet", description: "Momentum aux pieds." },
  { id: "hoodie_or", name: "Hoodie doré", costCoins: 400, slot: "torso", description: "La richesse se construit." },
];

export const gearById = (id: string) => GEAR_CATALOG.find((g) => g.id === id) ?? null;

/** One equipped item per slot — equipping resolves conflicts in the service. */
export const slotOf = (id: string) => gearById(id)?.slot ?? null;
