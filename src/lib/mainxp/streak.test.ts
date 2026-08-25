import { describe, expect, it } from "vitest";
import { computeStreak, restDaysFromEvents } from "./streak";

const T = "2026-08-25";
const days = (...d: string[]) => new Set(d);

describe("computeStreak", () => {
  it("counts consecutive active days ending today", () => {
    const r = computeStreak({
      today: T,
      active: days("2026-08-25", "2026-08-24", "2026-08-23"),
      rest: new Set(),
    });
    expect(r).toEqual({ streak: 3, brokeAt: "2026-08-22" });
  });

  it("today not yet acted is never a break (grace until midnight)", () => {
    const r = computeStreak({
      today: T,
      active: days("2026-08-24", "2026-08-23"),
      rest: new Set(),
    });
    expect(r.streak).toBe(2);
  });

  it("a plain quiet day breaks the flame", () => {
    const r = computeStreak({
      today: T,
      active: days("2026-08-25", "2026-08-23"),
      rest: new Set(),
    });
    expect(r).toEqual({ streak: 1, brokeAt: "2026-08-24" });
  });

  it("rest days bridge without counting", () => {
    const r = computeStreak({
      today: T,
      active: days("2026-08-25", "2026-08-21", "2026-08-20"),
      rest: days("2026-08-24", "2026-08-23", "2026-08-22"),
    });
    expect(r.streak).toBe(3); // 25 + (rest bridge) + 21 + 20
  });

  it("acting DURING a rest day still counts it", () => {
    const r = computeStreak({
      today: T,
      active: days("2026-08-25", "2026-08-24", "2026-08-23"),
      rest: days("2026-08-24"),
    });
    expect(r.streak).toBe(3);
  });

  it("bridged days (night-owl grace) count as active", () => {
    const r = computeStreak({
      today: T,
      active: days("2026-08-25", "2026-08-23"),
      rest: new Set(),
      bridged: days("2026-08-24"),
    });
    expect(r.streak).toBe(3);
  });

  it("zero when nothing ever happened", () => {
    const r = computeStreak({ today: T, active: new Set(), rest: new Set() });
    expect(r).toEqual({ streak: 0, brokeAt: "2026-08-24" });
  });
});

describe("restDaysFromEvents", () => {
  it("covers closed intervals inclusively", () => {
    const rest = restDaysFromEvents(
      [
        { type: "rest_started", dayKey: "2026-08-20" },
        { type: "rest_ended", dayKey: "2026-08-22" },
      ],
      false,
      T
    );
    expect(rest).toEqual(days("2026-08-20", "2026-08-21", "2026-08-22"));
  });

  it("an open interval protects through today", () => {
    const rest = restDaysFromEvents([{ type: "rest_started", dayKey: "2026-08-23" }], true, T);
    expect(rest).toEqual(days("2026-08-23", "2026-08-24", "2026-08-25"));
  });

  it("legacy rest-on with no events still protects today", () => {
    expect(restDaysFromEvents([], true, T)).toEqual(days(T));
  });

  it("rest off with no events protects nothing", () => {
    expect(restDaysFromEvents([], false, T).size).toBe(0);
  });

  it("ignores an unmatched rest_ended", () => {
    expect(restDaysFromEvents([{ type: "rest_ended", dayKey: "2026-08-20" }], false, T).size).toBe(0);
  });
});
