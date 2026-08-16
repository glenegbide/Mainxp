import { describe, expect, it } from "vitest";
import { xpForEvent } from "./events";

describe("xpForEvent — centralized XP policy (system of record)", () => {
  it("awards the same values the actions awarded before the event engine", () => {
    expect(xpForEvent("main_quest_completed", { taskId: "t1", title: "X", postponeCount: 0 }))
      .toMatchObject({ mainDelta: 100, coinsDelta: 50, multiplier: 1 });
    expect(xpForEvent("task_completed", { taskId: "t1", title: "X", tier: "DAILY_MISSION" }))
      .toMatchObject({ mainDelta: 25, coinsDelta: 10 });
    expect(xpForEvent("task_completed", { taskId: "t1", title: "X", tier: "SIDE_QUEST" }))
      .toMatchObject({ mainDelta: 8, sourceType: "side_quest" });
    expect(xpForEvent("commitment_kept", { nnId: "n1", title: "BJJ" }))
      .toMatchObject({ mainDelta: 20, coinsDelta: 10, attributeDeltas: { DISCIPLINE: 15 } });
    expect(xpForEvent("all_commitments_kept", {}))
      .toMatchObject({ mainDelta: 30, coinsDelta: 15 });
    expect(xpForEvent("goal_reached", { goalId: "g1", title: "20K", lifeArea: "money" }))
      .toMatchObject({ mainDelta: 150, coinsDelta: 100, attributeDeltas: { WEALTH: 100 } });
    expect(xpForEvent("milestone_completed", { milestoneId: "m1", title: "Base" }))
      .toMatchObject({ mainDelta: 40, attributeDeltas: { STRATEGY: 30 } });
    expect(xpForEvent("morning_started", {})).toMatchObject({ mainDelta: 10 });
    expect(xpForEvent("night_review_completed", {})).toMatchObject({ mainDelta: 15 });
    expect(xpForEvent("gratitude_logged", {})).toMatchObject({ mainDelta: 10 });
    expect(xpForEvent("weekly_review_completed", { week: "2026-W33" }))
      .toMatchObject({ mainDelta: 25 });
  });

  it("applies hard mode from postpone count", () => {
    expect(xpForEvent("main_quest_completed", { postponeCount: 3 })).toMatchObject({ multiplier: 1.5 });
    expect(xpForEvent("main_quest_completed", { postponeCount: 6 })).toMatchObject({ multiplier: 2 });
  });

  it("applies habit diminishing from prior same-day taps", () => {
    expect(xpForEvent("habit_completed", { priorTaps: 0 })).toMatchObject({ multiplier: 1 });
    expect(xpForEvent("habit_completed", { priorTaps: 2 })).toMatchObject({ multiplier: 0.6 });
    expect(xpForEvent("habit_completed", { priorTaps: 4 })).toMatchObject({ multiplier: 0 });
  });

  it("never awards XP for slips, notes, or unverified focus", () => {
    expect(xpForEvent("habit_slipped", { habitId: "h1" })).toBeNull();
    expect(xpForEvent("task_note_added", { taskId: "t1" })).toBeNull();
    expect(xpForEvent("focus_completed", { blocks: 0 })).toBeNull();
  });

  it("spends coins (never XP) on rewards and gear", () => {
    expect(xpForEvent("reward_redeemed", { rewardId: "r1", title: "Resto", cost: 300 }))
      .toMatchObject({ mainDelta: 0, coinsDelta: -300 });
    expect(xpForEvent("gear_purchased", { gearId: "lunettes", title: "Lunettes", cost: 80 }))
      .toMatchObject({ mainDelta: 0, coinsDelta: -80 });
  });

  it("scales focus XP by verified blocks with SYSTEM evidence handled upstream", () => {
    expect(xpForEvent("focus_completed", { sessionId: "s1", blocks: 2 }))
      .toMatchObject({ mainDelta: 30, coinsDelta: 16, attributeDeltas: { FOCUS: 30 } });
  });
});
