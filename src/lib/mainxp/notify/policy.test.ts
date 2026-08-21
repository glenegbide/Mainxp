import { describe, expect, it } from "vitest";
import { asMode, gate, inQuietHours, localHour, MODE_POLICY, type GateInput } from "./policy";
import type { TriggerResult } from "./types";

const result = (over: Partial<TriggerResult> = {}): TriggerResult => ({
  type: "night_review",
  urgency: 90,
  title: "t",
  body: "b",
  url: "/today",
  evidence: {},
  ...over,
});

const input = (over: Partial<GateInput> = {}): GateInput => ({
  result: result(),
  mode: "normal",
  hourLocal: 21,
  quietStart: 22,
  quietEnd: 7,
  sentToday: 0,
  dailyCap: 2,
  minutesSinceLastSend: null,
  restMode: false,
  lastSeenMinutesAgo: null,
  hasSubscription: true,
  ...over,
});

describe("inQuietHours — the range wraps past midnight", () => {
  it("22 → 7 covers the night, not the day", () => {
    for (const h of [22, 23, 0, 3, 6]) expect(inQuietHours(h, 22, 7)).toBe(true);
    for (const h of [7, 12, 18, 21]) expect(inQuietHours(h, 22, 7)).toBe(false);
  });

  it("a same-day range does not wrap", () => {
    expect(inQuietHours(14, 13, 16)).toBe(true);
    expect(inQuietHours(20, 13, 16)).toBe(false);
  });

  it("start === end means no quiet hours at all", () => {
    for (const h of [0, 9, 23]) expect(inQuietHours(h, 9, 9)).toBe(false);
  });

  it("nulls fall back to 22 → 7", () => {
    expect(inQuietHours(2, null, null)).toBe(true);
    expect(inQuietHours(10, null, null)).toBe(false);
  });
});

describe("localHour — never the server's clock", () => {
  it("reads the hour in the user's timezone", () => {
    const t = new Date("2026-01-15T23:30:00Z");
    expect(localHour(t, "UTC")).toBe(23);
    expect(localHour(t, "Europe/Zurich")).toBe(0); // next day, local
    expect(localHour(t, "America/New_York")).toBe(18);
  });
});

describe("asMode", () => {
  it("keeps known modes and falls back to normal", () => {
    expect(asMode("beast")).toBe("beast");
    expect(asMode("coach_me")).toBe("coach_me");
    expect(asMode("quiet")).toBe("quiet");
    expect(asMode("")).toBe("normal");
    expect(asMode("BEAST")).toBe("normal");
  });
});

describe("gate — sleep is never negotiable", () => {
  it("quiet hours block even beast mode at maximum urgency", () => {
    const d = gate(input({ mode: "beast", hourLocal: 3, result: result({ urgency: 100 }) }));
    expect(d).toEqual({ send: false, reason: "quiet_hours" });
  });

  it("rest mode silences everything", () => {
    expect(gate(input({ restMode: true }))).toEqual({ send: false, reason: "rest_mode" });
  });

  it("rest mode is checked before quiet hours (cheapest rejection first)", () => {
    const d = gate(input({ restMode: true, hourLocal: 3 }));
    expect(d).toEqual({ send: false, reason: "rest_mode" });
  });
});

describe("gate — mode decides what may interrupt", () => {
  it("quiet mode allows only the night review", () => {
    expect(gate(input({ mode: "quiet" })).send).toBe(true);
    expect(gate(input({ mode: "quiet", dailyCap: 1, result: result({ type: "challenge_tick", urgency: 100 }) }))).toEqual({
      send: false,
      reason: "mode",
    });
  });

  it("normal mode refuses challenge and goal-pace triggers", () => {
    for (const type of ["challenge_tick", "goal_pace_behind"] as const) {
      expect(gate(input({ result: result({ type }) }))).toEqual({ send: false, reason: "mode" });
    }
  });

  it("coach_me accepts what normal refuses", () => {
    const d = gate(input({ mode: "coach_me", dailyCap: 4, hourLocal: 19, result: result({ type: "challenge_tick", urgency: 55 }) }));
    expect(d.send).toBe(true);
  });

  it("urgency below the mode floor is rejected as mode", () => {
    expect(gate(input({ mode: "quiet", result: result({ urgency: 79 }) }))).toEqual({
      send: false,
      reason: "mode",
    });
    expect(gate(input({ mode: "quiet", result: result({ urgency: 80 }) })).send).toBe(true);
  });

  it("every mode's floor and cap are ordered from calm to loud", () => {
    const order = ["quiet", "normal", "coach_me", "beast"] as const;
    for (let i = 1; i < order.length; i++) {
      const prev = MODE_POLICY[order[i - 1]];
      const cur = MODE_POLICY[order[i]];
      expect(cur.dailyCap).toBeGreaterThan(prev.dailyCap);
      expect(cur.minGapMin).toBeLessThan(prev.minGapMin);
      expect(cur.urgencyFloor).toBeLessThan(prev.urgencyFloor);
    }
  });
});

describe("gate — volume limits", () => {
  it("stops at the daily cap", () => {
    expect(gate(input({ sentToday: 2, dailyCap: 2 }))).toEqual({ send: false, reason: "daily_cap" });
    expect(gate(input({ sentToday: 1, dailyCap: 2 })).send).toBe(true);
  });

  it("respects the minimum gap of the mode", () => {
    expect(gate(input({ minutesSinceLastSend: 239 }))).toEqual({ send: false, reason: "min_gap" });
    expect(gate(input({ minutesSinceLastSend: 240 })).send).toBe(true);
  });

  it("never pushes at someone who is already in the app", () => {
    expect(gate(input({ lastSeenMinutesAgo: 2 }))).toEqual({ send: false, reason: "in_app" });
    expect(gate(input({ lastSeenMinutesAgo: 10 })).send).toBe(true);
  });

  it("with no device registered there is nothing to send to", () => {
    expect(gate(input({ hasSubscription: false }))).toEqual({
      send: false,
      reason: "no_subscription",
    });
  });

  it("a user's own cap can be stricter than the mode's", () => {
    expect(gate(input({ mode: "beast", sentToday: 1, dailyCap: 1 }))).toEqual({
      send: false,
      reason: "daily_cap",
    });
  });
});
