import { describe, expect, it } from "vitest";
import {
  diminishingFactor,
  hardModeMultiplier,
  levelForXp,
  levelProgress,
  xpToReachLevel,
} from "./curve";

describe("level curve", () => {
  it("starts at level 1 with 0 XP (everyone starts at zero)", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(-10)).toBe(1);
    expect(xpToReachLevel(1)).toBe(0);
  });

  it("matches documented thresholds", () => {
    expect(xpToReachLevel(2)).toBe(100);
    expect(xpToReachLevel(3)).toBe(300);
    expect(xpToReachLevel(10)).toBe(4500);
    expect(xpToReachLevel(25)).toBe(30000);
    expect(xpToReachLevel(50)).toBe(122500);
    expect(xpToReachLevel(100)).toBe(495000);
  });

  it("is exact at level boundaries", () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(495000)).toBe(100);
  });

  it("is monotonic and consistent with xpToReachLevel", () => {
    for (let level = 1; level <= 120; level++) {
      const threshold = xpToReachLevel(level);
      expect(levelForXp(threshold)).toBe(level);
      if (threshold > 0) expect(levelForXp(threshold - 1)).toBe(level - 1);
    }
  });

  it("reports progress within a level", () => {
    const p = levelProgress(150); // level 2 spans 100..300
    expect(p.level).toBe(2);
    expect(p.intoLevel).toBe(50);
    expect(p.neededForNext).toBe(200);
    expect(p.ratio).toBeCloseTo(0.25);
  });
});

describe("multipliers", () => {
  it("hard mode kicks in after repeated postponements, bounded at 2x", () => {
    expect(hardModeMultiplier(0)).toBe(1);
    expect(hardModeMultiplier(2)).toBe(1);
    expect(hardModeMultiplier(3)).toBe(1.5);
    expect(hardModeMultiplier(6)).toBe(2);
    expect(hardModeMultiplier(100)).toBe(2);
  });

  it("diminishing returns decay to zero (anti-farming)", () => {
    expect(diminishingFactor(0)).toBe(1);
    expect(diminishingFactor(1)).toBe(1);
    expect(diminishingFactor(2)).toBe(0.6);
    expect(diminishingFactor(3)).toBe(0.3);
    expect(diminishingFactor(4)).toBe(0);
    expect(diminishingFactor(50)).toBe(0);
  });
});
