// i18n scaffold (addendum #35): French first, multilingual structurally.
// Rule (CLAUDE.md): NEW screens take their strings from here by key;
// existing screens migrate opportunistically. Keys are stable identifiers —
// `t("today.mainQuest")` — so English (and more) can be added without
// touching 300 components later.

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

type Dict = { [key: string]: string | Dict };

const fr: Dict = {
  today: {
    title: "Aujourd'hui",
    mainQuest: "Main Quest",
    missions: "Missions du jour",
    nonNegotiables: "Non-négociables",
    sideQuests: "Side quests",
    whatNow: "Et maintenant ?",
    noteplaceholder: "Une note ? (ce qui a marché, ce que tu retiens…)",
  },
  coach: { title: "Coach", offline: "Coach hors ligne." },
  progress: { title: "Progression", ledger: "Registre XP (auditable)" },
  me: { title: "Moi", titles: "Titres — ils se gagnent", gear: "Équipement" },
};

const en: Dict = {
  today: {
    title: "Today",
    mainQuest: "Main Quest",
    missions: "Daily missions",
    nonNegotiables: "Non-negotiables",
    sideQuests: "Side quests",
    whatNow: "What now?",
    noteplaceholder: "A note? (what worked, what you learned…)",
  },
  coach: { title: "Coach", offline: "Coach offline." },
  progress: { title: "Progress", ledger: "XP ledger (auditable)" },
  me: { title: "Me", titles: "Titles — earned only", gear: "Gear" },
};

const dictionaries: Record<Locale, Dict> = { fr, en };

/** Dot-path lookup with French fallback; returns the key itself when missing. */
export function t(locale: string, key: string): string {
  const walk = (dict: Dict): string | null => {
    let node: string | Dict = dict;
    for (const part of key.split(".")) {
      if (typeof node === "string" || node[part] === undefined) return null;
      node = node[part];
    }
    return typeof node === "string" ? node : null;
  };
  const loc = (locales as readonly string[]).includes(locale) ? (locale as Locale) : defaultLocale;
  return walk(dictionaries[loc]) ?? walk(dictionaries.fr) ?? key;
}
