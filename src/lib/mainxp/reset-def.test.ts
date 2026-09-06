import { describe, expect, it } from "vitest";
import { medianMinutes, parseFrequencies, MAX_FREQUENCIES, STATES, TRIGGERS } from "./reset-def";

describe("parseFrequencies — the state you operate from, bounded", () => {
  it("keeps only known states, capped at three", () => {
    expect(parseFrequencies("abondance,focus,calme,courage")).toEqual([
      "abondance",
      "focus",
      "calme",
    ]);
  });

  it("drops junk silently", () => {
    expect(parseFrequencies("abondance, dragons ,focus,")).toEqual(["abondance", "focus"]);
    expect(parseFrequencies("")).toEqual([]);
  });

  it("every state translates into a behavior — a state without one is a mood", () => {
    for (const s of Object.values(STATES)) {
      expect(s.means.length).toBeGreaterThan(10);
    }
    expect(MAX_FREQUENCIES).toBe(3);
    expect(Object.keys(TRIGGERS).length).toBeGreaterThanOrEqual(5);
  });
});

describe("medianMinutes — recovery is measured, not judged", () => {
  it("handles empty, odd and even", () => {
    expect(medianMinutes([])).toBeNull();
    expect(medianMinutes([7])).toBe(7);
    expect(medianMinutes([2, 100, 6])).toBe(6);
    expect(medianMinutes([10, 20])).toBe(15);
  });
});
