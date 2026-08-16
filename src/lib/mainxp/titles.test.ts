import { describe, expect, it } from "vitest";
import { tierFor, TITLES } from "./titles";

describe("earned title tiers", () => {
  it("starts at zero — nobody begins with a title", () => {
    for (const def of TITLES) expect(tierFor(0, def.tiers)).toBe(0);
  });

  it("unlocks tiers exactly at their evidence thresholds", () => {
    expect(tierFor(29, [30, 100, 365])).toBe(0);
    expect(tierFor(30, [30, 100, 365])).toBe(1);
    expect(tierFor(100, [30, 100, 365])).toBe(2);
    expect(tierFor(400, [30, 100, 365])).toBe(3);
  });

  it("all title definitions have strictly increasing thresholds", () => {
    for (const def of TITLES) {
      for (let i = 1; i < def.tiers.length; i++) {
        expect(def.tiers[i]).toBeGreaterThan(def.tiers[i - 1]);
      }
    }
  });
});
