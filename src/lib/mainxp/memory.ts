// Memory scoping (addendum #13, #14): not everything belongs permanently in
// memory. Corrections and temporary priorities expire out of coach context.

export const MEMORY_SCOPES = ["permanent", "long_term", "temporary", "immediate"] as const;
export type MemoryScope = (typeof MEMORY_SCOPES)[number];

/** Default lifetime per scope (null = never expires). */
export function scopeExpiry(scope: MemoryScope, from: Date): Date | null {
  switch (scope) {
    case "immediate":
      return new Date(from.getTime() + 24 * 3600_000);
    case "temporary":
      return new Date(from.getTime() + 7 * 24 * 3600_000);
    case "long_term":
    case "permanent":
      return null;
  }
}

export interface MemoryLike {
  doNotUseInCoaching: boolean;
  sensitivity: string;
  expiresAt: Date | null;
}

/** Whether a memory may enter coach context right now. Pure — unit-tested. */
export function isActiveMemory(memory: MemoryLike, now: Date): boolean {
  if (memory.doNotUseInCoaching) return false;
  if (memory.sensitivity === "private") return false;
  if (memory.expiresAt !== null && memory.expiresAt <= now) return false;
  return true;
}

/**
 * Parse coach-emitted memory tags out of a reply.
 * Format (instructed in the system prompt): `[RETENIR:scope] content`
 * Returns the cleaned text plus the memories to store.
 */
export function extractMemoryTags(text: string): {
  cleaned: string;
  memories: Array<{ scope: MemoryScope; content: string }>;
} {
  const memories: Array<{ scope: MemoryScope; content: string }> = [];
  const cleaned = text
    .replace(/\[RETENIR:(\w+)\]\s*([^\n\]]+)/gi, (_all, rawScope: string, content: string) => {
      const scope = MEMORY_SCOPES.includes(rawScope as MemoryScope)
        ? (rawScope as MemoryScope)
        : "temporary";
      const trimmed = content.trim();
      if (trimmed) memories.push({ scope, content: trimmed.slice(0, 500) });
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { cleaned, memories };
}
