import { describe, expect, it } from "vitest";
import { computeElan } from "./elan";

describe("computeElan (momentum — no-shame HP)", () => {
  it("is full with a clean week", () => {
    expect(computeElan({ missedDays: 0, badTaps: 0, rest: false })).toBe(100);
  });

  it("decays gently per missed non-negotiable day and per bad-habit tap", () => {
    expect(computeElan({ missedDays: 2, badTaps: 0, rest: false })).toBe(80);
    expect(computeElan({ missedDays: 0, badTaps: 4, rest: false })).toBe(88);
    expect(computeElan({ missedDays: 3, badTaps: 5, rest: false })).toBe(55);
  });

  it("never goes below the floor — no death spiral, ever", () => {
    expect(computeElan({ missedDays: 7, badTaps: 50, rest: false })).toBe(10);
  });

  it("caps bad-tap influence so one rough day cannot nuke the gauge", () => {
    expect(computeElan({ missedDays: 0, badTaps: 100, rest: false })).toBe(
      computeElan({ missedDays: 0, badTaps: 10, rest: false })
    );
  });

  it("pauses entirely during recovery mode", () => {
    expect(computeElan({ missedDays: 7, badTaps: 10, rest: true })).toBeNull();
  });
});
