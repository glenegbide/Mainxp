import { describe, expect, it } from "vitest";
import { missionScore, whatNow, type PriorityContext } from "./priority";

const base: PriorityContext = {
  minimumDay: false,
  restMode: false,
  energy: null,
  stress: null,
  hourOfDay: 10,
  mainQuest: null,
  openMissions: [],
  unmetNonNegotiables: [],
  goalsAtRisk: [],
  nightReviewDone: false,
};

describe("whatNow — one action, concrete WHY (audit P2)", () => {
  it("minimum day overrides everything", () => {
    const r = whatNow({
      ...base,
      minimumDay: true,
      mainQuest: { id: "m", title: "X", status: "OPEN", postponeCount: 0 },
    });
    expect(r.kind).toBe("minimum_day");
  });

  it("asks for a Main Quest while the day is young, arming it with the at-risk goal", () => {
    const r = whatNow({
      ...base,
      goalsAtRisk: [
        { title: "20K CHF", priority: 5, verdict: "behind", requiredWeeklyPace: 2500, unit: "CHF", daysToDeadline: 10 },
      ],
    });
    expect(r.kind).toBe("define_main_quest");
    expect(r.why.join(" ")).toContain("20K CHF");
    expect(r.why.length).toBeLessThanOrEqual(3);
  });

  it("an open Main Quest wins, with goal-pace and hard-mode facts", () => {
    const r = whatNow({
      ...base,
      mainQuest: {
        id: "mq1",
        title: "Appeler les 5 propriétaires",
        status: "OPEN",
        postponeCount: 3,
        goal: { title: "6 mandats", priority: 5, verdict: "behind", requiredWeeklyPace: 1, unit: "mandats" },
      },
    });
    expect(r.kind).toBe("main_quest");
    expect(r.targetId).toBe("mq1");
    expect(r.why.join(" ")).toContain("6 mandats");
    expect(r.why.join(" ")).toContain("3 fois");
    expect(r.why.length).toBeLessThanOrEqual(3);
  });

  it("scores missions by goal priority, lateness, deadline and postpones — and says why", () => {
    const filler = { id: "a", title: "Ranger le bureau", postponeCount: 0 };
    const vital = {
      id: "b",
      title: "Relancer le notaire",
      postponeCount: 2,
      goal: { title: "Vente Rue du Rhône", priority: 5, verdict: "behind" as const, daysToDeadline: 5, requiredWeeklyPace: null, unit: null },
    };
    expect(missionScore(vital)).toBeGreaterThan(missionScore(filler));
    const r = whatNow({
      ...base,
      mainQuest: { id: "mq", title: "done", status: "DONE", postponeCount: 0 },
      openMissions: [filler, vital],
    });
    expect(r.kind).toBe("mission");
    expect(r.targetId).toBe("b");
    expect(r.why.join(" ")).toContain("Vente Rue du Rhône");
    expect(r.why.join(" ")).toContain("5 jours");
  });

  it("falls through: non-négociables, then night review, then honest rest", () => {
    const nn = whatNow({
      ...base,
      mainQuest: { id: "mq", title: "done", status: "DONE", postponeCount: 0 },
      unmetNonNegotiables: [{ id: "n1", title: "Sport" }],
    });
    expect(nn.kind).toBe("non_negotiable");

    const night = whatNow({
      ...base,
      hourOfDay: 21,
      mainQuest: { id: "mq", title: "done", status: "DONE", postponeCount: 0 },
    });
    expect(night.kind).toBe("night_review");

    const done = whatNow({
      ...base,
      hourOfDay: 21,
      nightReviewDone: true,
      mainQuest: { id: "mq", title: "done", status: "DONE", postponeCount: 0 },
    });
    expect(done.kind).toBe("day_done");
  });

  it("never returns more than 3 facts and always at least 1", () => {
    for (const ctx of [
      base,
      { ...base, hourOfDay: 20 },
      { ...base, mainQuest: { id: "m", title: "X", status: "OPEN" as const, postponeCount: 9 }, energy: 9 },
    ]) {
      const r = whatNow(ctx);
      expect(r.why.length).toBeGreaterThanOrEqual(1);
      expect(r.why.length).toBeLessThanOrEqual(3);
    }
  });
});
