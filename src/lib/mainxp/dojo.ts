// LE DOJO — shared constants (kept out of the "use server" module, which may
// only export async functions).

export const DISCIPLINES: Record<string, string> = {
  bjj: "BJJ",
  muscu: "Muscu",
  cardio: "Cardio",
  mobilite: "Mobilité",
  autre: "Autre",
};

export const GRADES = ["blanche", "bleue", "violette", "marron", "noire"] as const;

export const GRADE_LABEL: Record<string, string> = {
  blanche: "Ceinture blanche",
  bleue: "Ceinture bleue",
  violette: "Ceinture violette",
  marron: "Ceinture marron",
  noire: "Ceinture noire",
};

/** Belt band colors — original MAINXP rendering, plain CSS. */
export const GRADE_COLOR: Record<string, string> = {
  blanche: "#f2f1ec",
  bleue: "#2563ab",
  violette: "#6d4fa1",
  marron: "#7a4f2d",
  noire: "#17171c",
};

export const MAX_FOCUS_ACTIVE = 5; // more than five things "in progress" is zero things
