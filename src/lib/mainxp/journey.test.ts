import { describe, expect, it } from "vitest";
import { addMonths, classifyDay, monthDays, monthGridOffset, monthKeyOf } from "./journey";

describe("month math — Monday-first, leap-safe", () => {
  it("knows month lengths, February included", () => {
    expect(monthDays("2026-08")).toHaveLength(31);
    expect(monthDays("2026-02")).toHaveLength(28);
    expect(monthDays("2028-02")).toHaveLength(29);
    expect(monthDays("2026-08")[0]).toBe("2026-08-01");
    expect(monthDays("2026-08")[30]).toBe("2026-08-31");
  });

  it("places the 1st in a Monday-first grid", () => {
    expect(monthGridOffset("2026-08")).toBe(5); // Sat 1 Aug 2026
    expect(monthGridOffset("2026-06")).toBe(0); // Mon 1 Jun 2026
    expect(monthGridOffset("2026-11")).toBe(6); // Sun 1 Nov 2026
  });

  it("navigates months across year edges", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(monthKeyOf("2026-08-25")).toBe("2026-08");
  });
});

describe("classifyDay — one strong signal per date", () => {
  const sets = {
    quest: new Set(["2026-08-05"]),
    active: new Set(["2026-08-05", "2026-08-06"]),
    rest: new Set(["2026-08-06", "2026-08-07"]),
    gold: new Set(["2026-08-05"]),
  };

  it("quest beats everything and can carry gold", () => {
    expect(classifyDay("2026-08-05", sets)).toEqual({ day: "2026-08-05", mark: "quest", gold: true });
  });

  it("acting on a rest day is an acting day", () => {
    expect(classifyDay("2026-08-06", sets).mark).toBe("active");
  });

  it("pure rest is rest, silence is silence — never failure", () => {
    expect(classifyDay("2026-08-07", sets).mark).toBe("rest");
    expect(classifyDay("2026-08-08", sets)).toEqual({ day: "2026-08-08", mark: "none", gold: false });
  });
});
