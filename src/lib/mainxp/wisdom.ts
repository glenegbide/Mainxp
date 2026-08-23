// La sagesse du jour — one line each morning, deterministic by dayKey so a
// reload never reshuffles it.
//
// SOURCING RULES (asset policy — docs/ASSET_POLICY.md applies to words too):
//   - QUOTES come only from public-domain works, attributed. Florence Scovel
//     Shinn's "The Game of Life and How to Play It" (1925) is public domain;
//     translations here are our own.
//   - Copyrighted books are NEVER quoted. "Way of the Peaceful Warrior"
//     (Dan Millman) inspires CONCEPTS expressed entirely in our own words —
//     ideas are free, sentences are not. Those entries carry no quote marks
//     and name the inspiration honestly.
//   - MAINXP's own principles carry no attribution: they are ours.

export interface Wisdom {
  text: string;
  /** Attribution shown under the line; empty = MAINXP's own principle. */
  source: string;
}

export const WISDOM: readonly Wisdom[] = [
  // ── Florence Scovel Shinn, Le Jeu de la vie (1925, domaine public) ──
  {
    text: "« La vie est un jeu de boomerangs. Nos pensées, nos actes et nos mots nous reviennent tôt ou tard, avec une précision étonnante. »",
    source: "Florence Scovel Shinn, Le Jeu de la vie (1925) — trad. libre",
  },
  {
    text: "« Ce que l'homme imagine avec constance finit, tôt ou tard, par se manifester dans sa vie. »",
    source: "Florence Scovel Shinn, Le Jeu de la vie (1925) — trad. libre",
  },
  {
    text: "« L'intuition n'explique pas — elle montre simplement le chemin. »",
    source: "Florence Scovel Shinn, Le Jeu de la vie (1925) — trad. libre",
  },
  {
    text: "« Prépare-toi à recevoir ce que tu as demandé, même quand rien n'en donne encore le signe. »",
    source: "Florence Scovel Shinn, Le Jeu de la vie (1925) — trad. libre",
  },
  {
    text: "« Aucun homme n'est ton ennemi, aucun homme n'est ton ami : chacun est ton maître. »",
    source: "Florence Scovel Shinn, Le Jeu de la vie (1925) — trad. libre",
  },
  {
    text: "« Le jeu de la vie ne se gagne pas par la lutte, mais par la parole juste et l'acte juste, au bon moment. »",
    source: "Florence Scovel Shinn, Le Jeu de la vie (1925) — trad. libre",
  },
  // ── Concepts du guerrier pacifique, dans nos mots (idées libres, texte à nous) ──
  {
    text: "Il n'y a pas de moment ordinaire. Cet appel, cette marche, cette phrase que tu écris — c'est ça, l'entraînement.",
    source: "d'après un principe du guerrier pacifique",
  },
  {
    text: "Le combat n'est jamais dehors. Il se joue entre toi et le bavardage de ta propre tête — et il se gagne en agissant maintenant.",
    source: "d'après un principe du guerrier pacifique",
  },
  {
    text: "La connaissance sait. Le guerrier fait. La différence entre les deux, c'est ta journée d'aujourd'hui.",
    source: "d'après un principe du guerrier pacifique",
  },
  {
    text: "Tu n'as pas besoin d'être parfait pour commencer. Tu as besoin d'être présent — le reste s'entraîne.",
    source: "d'après un principe du guerrier pacifique",
  },
  // ── Principes MAINXP (identité, self-concept — les nôtres) ──
  {
    text: "Ton identité n'est pas ce que tu déclares. C'est ce que tu répètes. Chaque action d'aujourd'hui vote pour la personne que tu deviens.",
    source: "",
  },
  {
    text: "L'histoire que tu te racontes est un brouillon, pas un verdict : elle se réécrit en vivant depuis le nouveau soi, un matin à la fois.",
    source: "",
  },
  {
    text: "La tête déclare, le cœur ratifie. Tant que les deux ne disent pas la même chose, c'est l'ancien programme qui gouverne — alors agis jusqu'à ce qu'ils s'accordent.",
    source: "",
  },
  {
    text: "Ce que tu fais avant 10h décide rarement de ta journée — mais ça décide de qui la vit.",
    source: "",
  },
];

/** Same line all day, next line tomorrow — never a slot machine. */
export function wisdomForDay(day: string): Wisdom {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return WISDOM[h % WISDOM.length];
}
