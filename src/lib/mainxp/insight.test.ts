import { describe, expect, it } from "vitest";
import { keepRate, weekTrend } from "./insight";

describe("bird's-eye helpers", () => {
  it("computes week-over-week trend honestly", () => {
    expect(weekTrend(300, 200)).toMatchObject({ verdict: "up" });
    expect(weekTrend(150, 200)).toMatchObject({ verdict: "down" });
    expect(weekTrend(205, 200)).toMatchObject({ verdict: "flat" });
    // no history → "new", never a fake +∞%
    expect(weekTrend(120, 0)).toMatchObject({ verdict: "new", delta: null });
    expect(weekTrend(0, 0)).toMatchObject({ verdict: "flat", delta: null });
  });

  it("keep-rate never divides by zero", () => {
    expect(keepRate(10, 14)).toBe(71);
    expect(keepRate(0, 14)).toBe(0);
    expect(keepRate(0, 0)).toBeNull();
  });
});

// Regression: a reversed award (uncheck) must not keep counting toward the
// week. Gross sums made "check → uncheck → recheck" read as double the work.
describe("weekly XP is net, not gross", () => {
  it("nets reversals out of the day total", () => {
    const rows = [
      { day: "2026-08-20", delta: 50 },
      { day: "2026-08-20", delta: -50 },
      { day: "2026-08-20", delta: 50 },
    ];
    const byDay = new Map<string, number>();
    for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.delta);
    expect(byDay.get("2026-08-20")).toBe(50);
  });
});
