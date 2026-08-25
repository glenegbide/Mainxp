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

  it("caps mission farming: over-cap completions fall to side-quest value (P0 audit #1)", () => {
    // 6th+ daily mission completed the same day: still recorded, but at
    // side-quest value with side-quest diminishing — no unlimited +25 XP.
    expect(
      xpForEvent("task_completed", { taskId: "t6", title: "X", tier: "DAILY_MISSION", capExceeded: true })
    ).toMatchObject({ mainDelta: 8, coinsDelta: 3, sourceType: "side_quest" });
    // Under the cap nothing changes.
    expect(
      xpForEvent("task_completed", { taskId: "t1", title: "X", tier: "DAILY_MISSION", capExceeded: false })
    ).toMatchObject({ mainDelta: 25, coinsDelta: 10, sourceType: "task" });
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

  it("challenges: accepting and ticking are free, COMPLETING is the surprise scaled by duration", () => {
    expect(xpForEvent("challenge_accepted", { challengeId: "c1" })).toBeNull();
    expect(xpForEvent("challenge_tick", { challengeId: "c1" })).toBeNull();
    // 7 jours (1 livre cette semaine) → 61 XP / 27 pièces
    expect(xpForEvent("challenge_completed", { challengeId: "c1", title: "1 livre", durationDays: 7 }))
      .toMatchObject({ mainDelta: 61, coinsDelta: 27, sourceType: "challenge" });
    // 30 jours méditation → 130 XP, discipline lourde
    expect(xpForEvent("challenge_completed", { challengeId: "c2", title: "Méditation", durationDays: 30 }))
      .toMatchObject({ mainDelta: 130, coinsDelta: 50, attributeDeltas: { DISCIPLINE: 50 } });
    // au-delà de 30 jours : plafonné (pas d'inflation)
    expect(xpForEvent("challenge_completed", { challengeId: "c3", title: "X", durationDays: 90 }))
      .toMatchObject({ mainDelta: 130 });
  });

  it("finishing a book feeds the Sage — Knowledge XP, discovered not advertised", () => {
    expect(xpForEvent("book_finished", { bookId: "b1", title: "Deep Work" }))
      .toMatchObject({ mainDelta: 50, coinsDelta: 25, sourceType: "book", attributeDeltas: { KNOWLEDGE: 40 } });
  });

  it("rewards journal writing at JOURNAL value (diminishing lives ledger-side)", () => {
    expect(xpForEvent("journal_written", { entryId: "j1", kind: "free", mood: "dur" }))
      .toMatchObject({ mainDelta: 10, coinsDelta: 4, sourceType: "journal", attributeDeltas: { MIND: 8 } });
  });

  it("never awards XP for slips, notes, or unverified focus", () => {
    expect(xpForEvent("habit_slipped", { habitId: "h1" })).toBeNull();
    expect(xpForEvent("task_note_added", { taskId: "t1" })).toBeNull();
    expect(xpForEvent("focus_completed", { blocks: 0 })).toBeNull();
  });

  it("rewards protecting a bad day and coming back — never punishes", () => {
    expect(xpForEvent("minimum_day_activated", {})).toBeNull();
    expect(xpForEvent("minimum_action_completed", { slot: "body" }))
      .toMatchObject({ mainDelta: 8, attributeDeltas: { STRENGTH: 6 } });
    expect(xpForEvent("minimum_action_completed", { slot: "mind" }))
      .toMatchObject({ mainDelta: 8, attributeDeltas: { MIND: 6 } });
    expect(xpForEvent("minimum_day_completed", {})).toMatchObject({ mainDelta: 15 });
    expect(xpForEvent("comeback_completed", {})).toMatchObject({ mainDelta: 40, coinsDelta: 20 });
    expect(xpForEvent("brain_dump_processed", { count: 5 })).toBeNull();
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
  it("pays training honestly: attribute follows the discipline, repetition diminishes", () => {
    expect(xpForEvent("training_completed", { sessionId: "s1", title: "BJJ gi — 90 min", discipline: "bjj", priorToday: 0 }))
      .toMatchObject({ mainDelta: 15, coinsDelta: 7, attributeDeltas: { STRENGTH: 15 }, multiplier: 1 });
    expect(xpForEvent("training_completed", { sessionId: "s2", title: "Course — 30 min", discipline: "cardio", priorToday: 0 }))
      .toMatchObject({ attributeDeltas: { ENDURANCE: 15 } });
    // Third same-day session decays (anti-farming), like habit taps.
    expect(xpForEvent("training_completed", { sessionId: "s3", title: "X", discipline: "bjj", priorToday: 2 }))
      .toMatchObject({ multiplier: 0.6 });
    expect(xpForEvent("technique_mastered", { focusId: "f1", title: "Knee cut" }))
      .toMatchObject({ mainDelta: 25, coinsDelta: 12, attributeDeltas: { STRENGTH: 20 } });
  });

  it("rest markers are facts, never rewards or debts", () => {
    expect(xpForEvent("rest_started", {})).toBeNull();
    expect(xpForEvent("rest_ended", {})).toBeNull();
  });
});
