import { describe, expect, it } from "vitest";
import { addDays, dayKey, dayStartUtc, daysBetween, weekKey } from "./day";

describe("dayKey", () => {
  it("respects the user's timezone, not UTC", () => {
    // 23:30 UTC on Jan 1 is already Jan 2 in Zurich (UTC+1 in winter)
    const instant = new Date("2026-01-01T23:30:00Z");
    expect(dayKey(instant, "UTC")).toBe("2026-01-01");
    expect(dayKey(instant, "Europe/Zurich")).toBe("2026-01-02");
    // …and still Jan 1 in New York
    expect(dayKey(instant, "America/New_York")).toBe("2026-01-01");
  });

  it("handles the DST spring-forward day (Europe/Zurich, 2026-03-29)", () => {
    const beforeSwitch = new Date("2026-03-29T00:30:00Z"); // 01:30 local CET
    const afterSwitch = new Date("2026-03-29T22:30:00Z"); // 00:30 local CEST next day
    expect(dayKey(beforeSwitch, "Europe/Zurich")).toBe("2026-03-29");
    expect(dayKey(afterSwitch, "Europe/Zurich")).toBe("2026-03-30");
  });
});

describe("weekKey (ISO 8601)", () => {
  it("computes ISO weeks including year edges", () => {
    expect(weekKey(new Date("2026-01-01T12:00:00Z"), "UTC")).toBe("2026-W01");
    // 2027-01-01 is a Friday → belongs to 2026's last ISO week (W53)
    expect(weekKey(new Date("2027-01-01T12:00:00Z"), "UTC")).toBe("2026-W53");
    // 2024-12-30 (Monday) belongs to 2025-W01
    expect(weekKey(new Date("2024-12-30T12:00:00Z"), "UTC")).toBe("2025-W01");
  });
});

describe("calendar arithmetic", () => {
  it("adds days across month/year boundaries", () => {
    expect(addDays("2026-08-16", 1)).toBe("2026-08-17");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29"); // leap year
  });

  it("measures whole-day distances", () => {
    expect(daysBetween("2026-08-01", "2026-08-16")).toBe(15);
    expect(daysBetween("2026-08-16", "2026-08-01")).toBe(-15);
  });
});

describe("dayStartUtc", () => {
  it("returns the UTC instant of local midnight", () => {
    const instant = new Date("2026-01-15T12:00:00Z");
    // Zurich winter = UTC+1 → local midnight is 23:00 UTC the previous day
    expect(dayStartUtc(instant, "Europe/Zurich").toISOString()).toBe(
      "2026-01-14T23:00:00.000Z"
    );
    expect(dayStartUtc(instant, "UTC").toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });
});
