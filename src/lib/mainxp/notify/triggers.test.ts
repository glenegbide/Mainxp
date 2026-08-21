import { describe, expect, it } from "vitest";
import type { PriorityContext } from "@/lib/mainxp/priority";
import {
  challengeTick,
  commitmentOpen,
  goalPaceBehind,
  mainQuestStale,
  nightReview,
  TRIGGERS,
} from "./triggers";
import type { TriggerFacts } from "./types";

const context = (over: Partial<PriorityContext> = {}): PriorityContext => ({
  minimumDay: false,
  restMode: false,
  energy: null,
  stress: null,
  hourOfDay: 14,
  mainQuest: null,
  openMissions: [],
  unmetNonNegotiables: [],
  goalsAtRisk: [],
  nightReviewDone: false,
  ...over,
});

const facts = (over: Partial<TriggerFacts> = {}): TriggerFacts => ({
  user: {
    id: "u1",
    name: "Glen",
    timezone: "Europe/Zurich",
    notificationMode: "normal",
    quietHoursStart: 22,
    quietHoursEnd: 7,
    restMode: false,
    notifDailyCap: null,
  },
  dayKey: "2026-08-19", // a Wednesday
  weekKey: "2026-W34",
  hourLocal: 14,
  context: context(),
  eventsToday: 5,
  missionsDoneToday: 2,
  focusMinToday: 50,
  nnKeepRate7: 82,
  goalsBehind: [],
  activeChallenges: [],
  ...over,
});

const OPEN_MQ = { id: "mq", title: "Appeler 5 propriétaires", status: "OPEN" as const, postponeCount: 0 };

describe("every trigger — the structural promises", () => {
  it("no trigger can ever mention XP or coins (CLAUDE.md rule 9)", () => {
    const rich = facts({
      context: context({ mainQuest: { ...OPEN_MQ, postponeCount: 4 }, unmetNonNegotiables: [{ id: "n", title: "Sport" }] }),
      goalsBehind: [{ title: "20K CHF", requiredWeeklyPace: 2500, unit: "CHF" }],
      activeChallenges: [{ id: "c", title: "30 jours de méditation", targetCount: 30, ticks: 4, daysLeft: 5 }],
      dayKey: "2026-08-17", // Monday, so goal_pace_behind fires too
    });
    for (const t of TRIGGERS) {
      const r = t.evaluate(rich);
      if (!r) continue;
      expect(`${r.title} ${r.body}`).not.toMatch(/\bXP\b|pièces?|coins?/i);
    }
  });

  it("a trigger that fires always carries the evidence that justified it", () => {
    const rich = facts({
      context: context({ mainQuest: OPEN_MQ, unmetNonNegotiables: [{ id: "n", title: "Sport" }] }),
      activeChallenges: [{ id: "c", title: "Lecture", targetCount: 4, ticks: 1, daysLeft: 3 }],
    });
    for (const t of TRIGGERS) {
      const r = t.evaluate(rich);
      if (!r) continue;
      expect(Object.keys(r.evidence).length).toBeGreaterThan(0);
      expect(r.urgency).toBeGreaterThan(0);
      expect(r.urgency).toBeLessThanOrEqual(100);
      expect(r.type).toBe(t.type);
    }
  });

  it("an empty life produces total silence — no generic encouragement exists", () => {
    const empty = facts({ eventsToday: 0, nnKeepRate7: null });
    for (const t of TRIGGERS) expect(t.evaluate(empty)).toBeNull();
  });

  it("windows never collide inside a single local hour more than the caps allow", () => {
    for (let h = 0; h < 24; h++) {
      const open = TRIGGERS.filter((t) => t.windowHours.includes(h));
      expect(open.length).toBeLessThanOrEqual(2);
    }
  });
});

describe("main_quest_stale", () => {
  it("fires on an open Main Quest and names it", () => {
    const r = mainQuestStale.evaluate(facts({ context: context({ mainQuest: OPEN_MQ }) }));
    expect(r?.body).toContain("Appeler 5 propriétaires");
    expect(r?.url).toBe("/today");
  });

  it("stays silent when the Main Quest is done or absent", () => {
    expect(mainQuestStale.evaluate(facts())).toBeNull();
    expect(
      mainQuestStale.evaluate(facts({ context: context({ mainQuest: { ...OPEN_MQ, status: "DONE" } }) }))
    ).toBeNull();
  });

  it("stays silent on a protected day — the win condition changed this morning", () => {
    const r = mainQuestStale.evaluate(
      facts({ context: context({ mainQuest: OPEN_MQ, minimumDay: true }) })
    );
    expect(r).toBeNull();
  });

  it("cites the goal pace when the Main Quest serves a goal that is behind", () => {
    const r = mainQuestStale.evaluate(
      facts({
        context: context({
          mainQuest: {
            ...OPEN_MQ,
            goal: { title: "20K CHF", priority: 5, verdict: "behind", requiredWeeklyPace: 2500, unit: "CHF" },
          },
        }),
      })
    );
    expect(r?.body).toContain("2500 CHF/semaine");
    expect(r?.evidence.goalBehind).toBe(true);
  });

  it("escalates urgency with postponements, capped at 100", () => {
    const low = mainQuestStale.evaluate(facts({ context: context({ mainQuest: OPEN_MQ }) }))!;
    const high = mainQuestStale.evaluate(
      facts({ context: context({ mainQuest: { ...OPEN_MQ, postponeCount: 5 } }) })
    )!;
    expect(high.urgency).toBeGreaterThan(low.urgency);
    expect(high.urgency).toBeLessThanOrEqual(100);
    expect(high.body).toContain("5 fois");
  });
});

describe("commitment_open", () => {
  const withOpen = (n: number, rate: number | null = 82) =>
    facts({
      hourLocal: 18,
      nnKeepRate7: rate,
      context: context({
        unmetNonNegotiables: Array.from({ length: n }, (_, i) => ({ id: `n${i}`, title: `Engagement ${i + 1}` })),
      }),
    });

  it("says nothing when everything is kept", () => {
    expect(commitmentOpen.evaluate(facts({ hourLocal: 18 }))).toBeNull();
  });

  it("names the single remaining commitment and cites the 7-day keep rate", () => {
    const r = commitmentOpen.evaluate(withOpen(1))!;
    expect(r.title).toBe("Non-négociables — 1 restant");
    expect(r.body).toContain("Engagement 1");
    expect(r.body).toContain("82 %");
  });

  it("pluralises and lists at most two", () => {
    const r = commitmentOpen.evaluate(withOpen(3))!;
    expect(r.title).toBe("Non-négociables — 3 restants");
    expect(r.body).toContain("Engagement 1, Engagement 2");
    expect(r.body).not.toContain("Engagement 3");
  });

  it("drops the number rather than inventing one when there is no keep rate", () => {
    const r = commitmentOpen.evaluate(withOpen(1, null))!;
    expect(r.body).not.toMatch(/%/);
  });

  it("a low keep rate raises urgency", () => {
    expect(commitmentOpen.evaluate(withOpen(1, 40))!.urgency).toBeGreaterThan(
      commitmentOpen.evaluate(withOpen(1, 95))!.urgency
    );
  });

  it("respects rest mode and minimum days", () => {
    const base = withOpen(2);
    expect(
      commitmentOpen.evaluate({ ...base, context: { ...base.context, restMode: true } })
    ).toBeNull();
    expect(
      commitmentOpen.evaluate({ ...base, context: { ...base.context, minimumDay: true } })
    ).toBeNull();
  });
});

describe("night_review", () => {
  it("never nudges a day that never started", () => {
    expect(nightReview.evaluate(facts({ hourLocal: 21, eventsToday: 0 }))).toBeNull();
  });

  it("never nudges twice — a done review is silence", () => {
    expect(
      nightReview.evaluate(facts({ hourLocal: 21, context: context({ nightReviewDone: true }) }))
    ).toBeNull();
  });

  it("reflects the day back with its real numbers", () => {
    const r = nightReview.evaluate(facts({ hourLocal: 21, missionsDoneToday: 3, focusMinToday: 75 }))!;
    expect(r.body).toContain("3 missions");
    expect(r.body).toContain("75 min");
    expect(r.url).toBe("/today/night");
  });

  it("stays honest on a day with nothing done — no fake celebration", () => {
    const r = nightReview.evaluate(facts({ hourLocal: 21, missionsDoneToday: 0, focusMinToday: 0 }))!;
    expect(r.body).not.toMatch(/0 mission/);
    expect(r.body).toContain("bloqué");
  });
});

describe("goal_pace_behind — weekly, on Monday only", () => {
  const behind = [{ title: "20K CHF", requiredWeeklyPace: 2500, unit: "CHF" }];

  it("fires on Monday with the pace required to hold the deadline", () => {
    const r = goalPaceBehind.evaluate(facts({ dayKey: "2026-08-17", hourLocal: 8, goalsBehind: behind }))!;
    expect(r.body).toContain("2500 CHF");
    expect(r.url).toBe("/goals");
  });

  it("is deduped per week, not per day", () => {
    const r = goalPaceBehind.evaluate(
      facts({ dayKey: "2026-08-17", hourLocal: 8, goalsBehind: behind, weekKey: "2026-W34" })
    )!;
    expect(r.dedupeSuffix).toBe("2026-W34");
  });

  it("stays silent every other day of the week", () => {
    for (const day of ["2026-08-18", "2026-08-19", "2026-08-22", "2026-08-23"]) {
      expect(goalPaceBehind.evaluate(facts({ dayKey: day, hourLocal: 8, goalsBehind: behind }))).toBeNull();
    }
  });

  it("stays silent when no goal is behind", () => {
    expect(goalPaceBehind.evaluate(facts({ dayKey: "2026-08-17", hourLocal: 8 }))).toBeNull();
  });
});

describe("challenge_tick — only when the window is genuinely at risk", () => {
  const challenge = (over: Partial<{ targetCount: number; ticks: number; daysLeft: number }> = {}) => ({
    id: "c1",
    title: "30 jours de méditation",
    targetCount: 30,
    ticks: 20,
    daysLeft: 14,
    ...over,
  });

  it("says nothing while there is comfortable slack — one missed day is fine", () => {
    expect(challengeTick.evaluate(facts({ hourLocal: 19, activeChallenges: [challenge()] }))).toBeNull();
  });

  it("fires when the days left barely cover what remains", () => {
    const r = challengeTick.evaluate(
      facts({ hourLocal: 19, activeChallenges: [challenge({ ticks: 20, daysLeft: 11 })] })
    )!;
    expect(r.body).toContain("10 restants");
    expect(r.body).toContain("11 jours");
    expect(r.dedupeSuffix).toBe("c1");
    expect(r.url).toBe("/defis");
  });

  it("says nothing about a challenge already completed", () => {
    expect(
      challengeTick.evaluate(facts({ hourLocal: 19, activeChallenges: [challenge({ ticks: 30, daysLeft: 1 })] }))
    ).toBeNull();
  });

  it("picks the challenge at risk, ignoring the comfortable one", () => {
    const r = challengeTick.evaluate(
      facts({
        hourLocal: 19,
        activeChallenges: [
          challenge({ ticks: 29, daysLeft: 20 }),
          { id: "c2", title: "1 livre par semaine", targetCount: 4, ticks: 1, daysLeft: 4 },
        ],
      })
    )!;
    expect(r.body).toContain("1 livre par semaine");
    expect(r.dedupeSuffix).toBe("c2");
  });
});
