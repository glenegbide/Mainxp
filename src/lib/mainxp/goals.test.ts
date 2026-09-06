import { describe, expect, it } from "vitest";
import { goalPace, isGoalAtRisk, missionHealth } from "./goals";

const WEEK = 7 * 86_400_000;

describe("goalPace", () => {
  const createdAt = new Date("2026-01-05T00:00:00Z");
  const deadline = new Date(createdAt.getTime() + 10 * WEEK);

  it("computes paces, remaining and projection", () => {
    // 10-week goal of 100 units; 5 weeks in, 50 done → exactly on track
    const r = goalPace({
      targetValue: 100,
      currentValue: 50,
      createdAt,
      deadline,
      now: new Date(createdAt.getTime() + 5 * WEEK),
    });
    expect(r.targetPace).toBeCloseTo(10);
    expect(r.actualPace).toBeCloseTo(10);
    expect(r.remaining).toBe(50);
    expect(r.requiredWeeklyPace).toBeCloseTo(10);
    expect(r.projection).toBeCloseTo(100);
    expect(r.verdict).toBe("on_track");
  });

  it("flags behind and ahead", () => {
    const behind = goalPace({
      targetValue: 100,
      currentValue: 20,
      createdAt,
      deadline,
      now: new Date(createdAt.getTime() + 5 * WEEK),
    });
    expect(behind.verdict).toBe("behind");

    const ahead = goalPace({
      targetValue: 100,
      currentValue: 80,
      createdAt,
      deadline,
      now: new Date(createdAt.getTime() + 5 * WEEK),
    });
    expect(ahead.verdict).toBe("ahead");
  });

  it("survives zero-elapsed and past-deadline windows", () => {
    const fresh = goalPace({ targetValue: 100, currentValue: 0, createdAt, deadline, now: createdAt });
    expect(fresh.actualPace).toBe(0);
    expect(Number.isFinite(fresh.requiredWeeklyPace)).toBe(true);

    const overdue = goalPace({
      targetValue: 100,
      currentValue: 60,
      createdAt,
      deadline,
      now: new Date(deadline.getTime() + WEEK),
    });
    expect(overdue.weeksLeft).toBe(0);
    expect(overdue.requiredWeeklyPace).toBe(40); // whole remainder due now
    expect(Number.isFinite(overdue.projection)).toBe(true);
  });
});

describe("isGoalAtRisk", () => {
  const behindReport = goalPace({
    targetValue: 100,
    currentValue: 10,
    createdAt: new Date("2026-01-05T00:00:00Z"),
    deadline: new Date("2026-03-16T00:00:00Z"),
    now: new Date("2026-03-05T00:00:00Z"),
  });

  it("requires both a behind verdict and a near deadline", () => {
    expect(behindReport.verdict).toBe("behind");
    expect(isGoalAtRisk(behindReport, 10)).toBe(true);
    expect(isGoalAtRisk(behindReport, 30)).toBe(false);
  });
});

describe("missionHealth — moving, slipping, or untouched (phase 2)", () => {
  it("is stalled after 5 idle days, whatever the pace says", () => {
    expect(missionHealth({ paceVerdict: "behind", daysSinceAction: 6, ageDays: 40 })).toEqual({
      status: "stalled",
      reason: "aucune action liée depuis 6 jours",
    });
  });

  it("a goal never acted on stalls by age, with an honest reason", () => {
    const h = missionHealth({ paceVerdict: null, daysSinceAction: null, ageDays: 9 });
    expect(h.status).toBe("stalled");
    expect(h.reason).toBe("aucune action liée depuis sa création");
  });

  it("recently touched but behind pace → at risk", () => {
    expect(missionHealth({ paceVerdict: "behind", daysSinceAction: 1, ageDays: 30 })).toEqual({
      status: "at_risk",
      reason: "en retard sur le rythme requis",
    });
  });

  it("touched and on pace (or without numbers) → on track, no reason needed", () => {
    expect(missionHealth({ paceVerdict: "on_track", daysSinceAction: 0, ageDays: 30 }).status).toBe("on_track");
    expect(missionHealth({ paceVerdict: null, daysSinceAction: 2, ageDays: 3 }).reason).toBeNull();
  });

  it("a brand-new goal is not stalled", () => {
    expect(missionHealth({ paceVerdict: null, daysSinceAction: null, ageDays: 2 }).status).toBe("on_track");
  });
});
