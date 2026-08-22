import { describe, expect, it } from "vitest";
import { dominantAttribute } from "./dominant";

describe("dominantAttribute — the path you actually walked", () => {
  it("picks the attribute with the most earned XP", () => {
    expect(dominantAttribute({ FOCUS: 120, DISCIPLINE: 80 })).toBe("FOCUS");
    expect(dominantAttribute({ WEALTH: 300, KNOWLEDGE: 299 })).toBe("WEALTH");
  });

  it("a new life defaults to Discipline — the first thing anyone builds", () => {
    expect(dominantAttribute({})).toBe("DISCIPLINE");
  });

  it("ties break on a stable order, so the character never flickers", () => {
    expect(dominantAttribute({ FOCUS: 50, STRATEGY: 50 })).toBe("FOCUS");
    expect(dominantAttribute({ MIND: 10, SOCIAL: 10 })).toBe("MIND");
  });
});
