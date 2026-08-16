// Brain Dump (addendum #18): one utterance → typed proposals → CONFIRM ALL.
// The AI extracts; the user confirms; each confirmation emits its canonical
// event through the normal creation paths. Nothing is created silently.

export const DUMP_KINDS = ["task", "reminder", "idea", "journal", "habit"] as const;
export type DumpKind = (typeof DUMP_KINDS)[number];

export interface DumpProposal {
  kind: DumpKind;
  title: string; // short actionable label
  detail?: string; // optional context
}

export const EXTRACT_INSTRUCTION = `Tu es l'extracteur Brain Dump de MAINXP.
L'utilisateur vide sa tête en une fois. Découpe son message en éléments typés.
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, du format :
[{"kind":"task|reminder|idea|journal|habit","title":"…","detail":"…"}]
Règles :
- "task" = action à faire aujourd'hui ; "reminder" = action pour demain/plus tard ;
  "idea" = idée à garder ; "journal" = état émotionnel ou contexte à consigner ;
  "habit" = habitude récurrente évoquée.
- Une dépense mentionnée devient "journal" avec le montant dans le titre
  (le module finance arrive plus tard — ne l'invente pas).
- Titres courts et actionnables, en français. Maximum 8 éléments.
- N'invente RIEN qui n'est pas dans le message.`;

/**
 * Parse the model's reply into proposals — defensive: tolerates fenced code
 * blocks and stray prose, drops malformed entries, caps at 8. Pure — tested.
 */
export function parseDumpReply(text: string): DumpProposal[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const proposals: DumpProposal[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const kind = String(e.kind ?? "");
    const title = String(e.title ?? "").trim().slice(0, 200);
    if (!title || !DUMP_KINDS.includes(kind as DumpKind)) continue;
    proposals.push({
      kind: kind as DumpKind,
      title,
      detail: e.detail ? String(e.detail).trim().slice(0, 300) : undefined,
    });
    if (proposals.length >= 8) break;
  }
  return proposals;
}

/** Compact URL-safe encoding for the confirm round-trip (user's own data). */
export function encodeProposals(proposals: DumpProposal[]): string {
  return Buffer.from(JSON.stringify(proposals), "utf8").toString("base64url");
}

export function decodeProposals(encoded: string): DumpProposal[] {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return Array.isArray(parsed) ? parseDumpReply(JSON.stringify(parsed)) : [];
  } catch {
    return [];
  }
}

export const KIND_LABEL: Record<DumpKind, { label: string; icon: string }> = {
  task: { label: "Mission aujourd'hui", icon: "⚡" },
  reminder: { label: "Rappel demain", icon: "⏰" },
  idea: { label: "Idée gardée", icon: "💡" },
  journal: { label: "Note de journal", icon: "📓" },
  habit: { label: "Habitude proposée", icon: "➕" },
};
