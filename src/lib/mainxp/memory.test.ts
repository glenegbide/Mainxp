import { describe, expect, it } from "vitest";
import { extractMemoryTags, isActiveMemory, scopeExpiry } from "./memory";

const NOW = new Date("2026-08-16T12:00:00Z");

describe("memory scopes (addendum #13/#14)", () => {
  it("immediate expires in 24h, temporary in 7 days, others never", () => {
    expect(scopeExpiry("immediate", NOW)!.getTime() - NOW.getTime()).toBe(24 * 3600_000);
    expect(scopeExpiry("temporary", NOW)!.getTime() - NOW.getTime()).toBe(7 * 24 * 3600_000);
    expect(scopeExpiry("long_term", NOW)).toBeNull();
    expect(scopeExpiry("permanent", NOW)).toBeNull();
  });

  it("filters expired, private, and do-not-use memories out of coach context", () => {
    const base = { doNotUseInCoaching: false, sensitivity: "normal", expiresAt: null };
    expect(isActiveMemory(base, NOW)).toBe(true);
    expect(isActiveMemory({ ...base, doNotUseInCoaching: true }, NOW)).toBe(false);
    expect(isActiveMemory({ ...base, sensitivity: "private" }, NOW)).toBe(false);
    expect(isActiveMemory({ ...base, expiresAt: new Date(NOW.getTime() - 1) }, NOW)).toBe(false);
    expect(isActiveMemory({ ...base, expiresAt: new Date(NOW.getTime() + 1000) }, NOW)).toBe(true);
  });
});

describe("extractMemoryTags", () => {
  it("pulls [RETENIR:scope] lines out and cleans the reply", () => {
    const { cleaned, memories } = extractMemoryTags(
      "Compris, Y passe en priorité.\n[RETENIR:temporary] Jusqu'à vendredi, le projet Y prime (pénalité contractuelle)."
    );
    expect(memories).toEqual([
      { scope: "temporary", content: "Jusqu'à vendredi, le projet Y prime (pénalité contractuelle)." },
    ]);
    expect(cleaned).toBe("Compris, Y passe en priorité.");
  });

  it("defaults unknown scopes to temporary and leaves plain text untouched", () => {
    const { memories } = extractMemoryTags("[RETENIR:foo] Chose à retenir");
    expect(memories[0].scope).toBe("temporary");
    const plain = extractMemoryTags("Réponse normale sans tag.");
    expect(plain.memories).toHaveLength(0);
    expect(plain.cleaned).toBe("Réponse normale sans tag.");
  });
});
