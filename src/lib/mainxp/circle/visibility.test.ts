// The door's test suite. Written before the screens, because the door IS the
// product: everything else in Le Cercle is a rendering of what this returns.
//
// The method is sentinels — private values are planted in the facts and the
// whole rendered card is searched for them. A refactor that widens the door
// fails here before it can ever reach a phone.
import { describe, expect, it } from "vitest";
import { shareSummary, visibleTo, type CircleLinkView, type SharerFacts } from "./visibility";

const SECRET = "SENTINEL_PRIVATE_bcbd6f";

const facts = (over: Partial<SharerFacts> = {}): SharerFacts => ({
  name: "Glen",
  level: 12,
  elan: 97,
  keepRate7: 86,
  mainQuest: {
    title: `Appeler 5 propriétaires ${SECRET}-mq`,
    done: false,
    goalId: "g1",
    goalTitle: `20K CHF ${SECRET}-goal`,
  },
  challenges: [
    { id: "c1", title: `Méditation ${SECRET}-c1`, ticks: 6, targetCount: 30 },
    { id: "c2", title: `Lecture ${SECRET}-c2`, ticks: 1, targetCount: 4 },
  ],
  week: { missionsDone: 11, focusMin: 320, daysKept: 5 },
  ...over,
});

const link = (over: Partial<CircleLinkView> = {}): CircleLinkView => ({
  status: "active",
  shareElan: false,
  shareMainQuest: false,
  shareChallenges: false,
  shareWeekly: false,
  goalIds: [],
  challengeIds: [],
  ...over,
});

describe("the default is silence", () => {
  it("a brand-new partner sees a first name and nothing else", () => {
    const card = visibleTo({ link: link(), blocked: false, facts: facts() })!;
    expect(card).toEqual({
      name: "Glen",
      paused: false,
      level: null,
      elan: null,
      mainQuest: null,
      challenges: [],
      week: null,
    });
  });

  it("no link means no card — being in someone's contacts is not access", () => {
    expect(visibleTo({ link: null, blocked: false, facts: facts() })).toBeNull();
  });

  it("a block hides everything, even with every switch on", () => {
    const everything = link({
      shareElan: true,
      shareMainQuest: true,
      shareChallenges: true,
      shareWeekly: true,
      goalIds: ["g1"],
      challengeIds: ["c1", "c2"],
    });
    expect(visibleTo({ link: everything, blocked: true, facts: facts() })).toBeNull();
  });

  it("ending the link removes the card; pausing keeps the person, drops the facts", () => {
    const on = { shareElan: true, shareMainQuest: true, shareWeekly: true };
    expect(visibleTo({ link: link({ ...on, status: "ended" }), blocked: false, facts: facts() })).toBeNull();

    const paused = visibleTo({ link: link({ ...on, status: "paused" }), blocked: false, facts: facts() })!;
    expect(paused.paused).toBe(true);
    expect(paused.name).toBe("Glen");
    expect(paused.elan).toBeNull();
    expect(paused.mainQuest).toBeNull();
    expect(paused.week).toBeNull();
  });
});

describe("each switch opens exactly one thing", () => {
  it("élan brings the gauge and the level, and nothing else", () => {
    const card = visibleTo({ link: link({ shareElan: true }), blocked: false, facts: facts() })!;
    expect(card.elan).toEqual({ value: 97, keepRate7: 86 });
    expect(card.level).toBe(12);
    expect(card.mainQuest).toBeNull();
    expect(card.week).toBeNull();
    expect(card.challenges).toEqual([]);
  });

  it("the Main Quest travels without the goal behind it unless that goal is allowlisted", () => {
    const without = visibleTo({ link: link({ shareMainQuest: true }), blocked: false, facts: facts() })!;
    expect(without.mainQuest?.title).toContain("Appeler 5 propriétaires");
    expect(without.mainQuest?.goalTitle).toBeNull();

    const withGoal = visibleTo({
      link: link({ shareMainQuest: true, goalIds: ["g1"] }),
      blocked: false,
      facts: facts(),
    })!;
    expect(withGoal.mainQuest?.goalTitle).toContain("20K CHF");
  });

  it("a goal id that is not this Main Quest's goal grants nothing", () => {
    const card = visibleTo({
      link: link({ shareMainQuest: true, goalIds: ["some-other-goal"] }),
      blocked: false,
      facts: facts(),
    })!;
    expect(card.mainQuest?.goalTitle).toBeNull();
  });

  it("no Main Quest today shows no Main Quest — never an empty accusation", () => {
    const card = visibleTo({
      link: link({ shareMainQuest: true }),
      blocked: false,
      facts: facts({ mainQuest: null }),
    })!;
    expect(card.mainQuest).toBeNull();
  });

  it("sharing challenges shares ONLY the allowlisted ones", () => {
    const card = visibleTo({
      link: link({ shareChallenges: true, challengeIds: ["c2"] }),
      blocked: false,
      facts: facts(),
    })!;
    expect(card.challenges).toHaveLength(1);
    expect(card.challenges[0].title).toContain("Lecture");
    expect(JSON.stringify(card)).not.toContain("c1");
  });

  it("the category switch alone shares nothing — the allowlist is the permission", () => {
    const card = visibleTo({ link: link({ shareChallenges: true }), blocked: false, facts: facts() })!;
    expect(card.challenges).toEqual([]);
  });

  it("the week shares its shape, never the ledger", () => {
    const card = visibleTo({ link: link({ shareWeekly: true }), blocked: false, facts: facts() })!;
    expect(card.week).toEqual({ missionsDone: 11, focusMin: 320, daysKept: 5 });
    const keys = Object.keys(card.week!);
    for (const forbidden of ["xp", "coins", "main", "level", "ledger"]) {
      expect(keys.map((k) => k.toLowerCase())).not.toContain(forbidden);
    }
  });
});

describe("what cannot be shared at all", () => {
  // These fields do not exist in SharerFacts, so they cannot be typed into a
  // card. This test states the intent so that adding them fails review, not
  // production.
  it("has no representation for money, journal, gratitude, notes, memory or coach chat", () => {
    const card = visibleTo({
      link: link({
        shareElan: true,
        shareMainQuest: true,
        shareChallenges: true,
        shareWeekly: true,
        goalIds: ["g1"],
        challengeIds: ["c1", "c2"],
      }),
      blocked: false,
      facts: facts(),
    })!;
    const keys = Object.keys(card);
    for (const forbidden of [
      "journal",
      "gratitude",
      "money",
      "finance",
      "notes",
      "memories",
      "conversations",
      "email",
      "coach",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("everything that DOES travel was switched on deliberately", () => {
    // With every switch off, no sentinel can appear anywhere in the payload.
    const closed = visibleTo({ link: link(), blocked: false, facts: facts() })!;
    expect(JSON.stringify(closed)).not.toContain(SECRET);

    // With switches on, only the sentinels belonging to those switches appear.
    const open = visibleTo({
      link: link({ shareMainQuest: true, shareChallenges: true, challengeIds: ["c1"] }),
      blocked: false,
      facts: facts(),
    })!;
    const payload = JSON.stringify(open);
    expect(payload).toContain(`${SECRET}-mq`);
    expect(payload).toContain(`${SECRET}-c1`);
    expect(payload).not.toContain(`${SECRET}-goal`); // goal not allowlisted
    expect(payload).not.toContain(`${SECRET}-c2`); // challenge not allowlisted
  });
});

describe("shareSummary — the sharer always knows what they are showing", () => {
  it("says nothing when nothing is shared", () => {
    expect(shareSummary(link())).toEqual([]);
  });

  it("names each open switch in plain French", () => {
    const s = shareSummary(
      link({ shareElan: true, shareMainQuest: true, shareChallenges: true, challengeIds: ["c1"], shareWeekly: true })
    );
    expect(s).toEqual([
      "ton élan et ton niveau",
      "ta Main Quest du jour",
      "1 défi choisi",
      "la forme de ta semaine",
    ]);
  });

  it("does not claim to share challenges when none are allowlisted", () => {
    expect(shareSummary(link({ shareChallenges: true }))).toEqual([]);
  });

  it("a paused link says so instead of listing switches", () => {
    expect(shareSummary(link({ status: "paused", shareElan: true }))).toEqual([
      "en pause — rien n'est partagé",
    ]);
  });
});
