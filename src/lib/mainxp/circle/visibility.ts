// THE DOOR. Every byte that travels from one person to another passes through
// this pure function — there is no second path, and adding one is the only way
// to leak. Two consequences are deliberate:
//
//   1. The output type has no field for money, journal, gratitude, notes,
//      memories or coach conversations. Those are not "off by default": they
//      are unrepresentable. A future toggle cannot turn them on by accident.
//   2. Nothing is visible without an explicit switch on the SHARER's own row.
//      A fresh partner sees a first name and the ability to say « je te
//      soutiens ». That is the entire default.
//
// The unit tests around this file assert on sentinel values planted in the
// private fields: if a refactor ever widens the door, a test fails loudly.

export interface CircleLinkView {
  status: string; // active | paused | ended
  shareElan: boolean;
  shareMainQuest: boolean;
  shareChallenges: boolean;
  shareWeekly: boolean;
  goalIds: readonly string[];
  challengeIds: readonly string[];
}

/** Everything the app knows about the sharer. Only a subset ever leaves. */
export interface SharerFacts {
  name: string;
  level: number;
  /** The 0–100 momentum gauge; null while the person is resting. */
  elan: number | null;
  keepRate7: number | null;
  mainQuest: { title: string; done: boolean; goalId: string | null; goalTitle: string | null } | null;
  challenges: ReadonlyArray<{ id: string; title: string; ticks: number; targetCount: number }>;
  week: { missionsDone: number; focusMin: number; daysKept: number };
}

export interface PartnerCard {
  name: string;
  /** Paused = "I need a moment", not "we're done". The card stays, the facts stop. */
  paused: boolean;
  level: number | null;
  elan: { value: number | null; keepRate7: number | null } | null;
  mainQuest: { title: string; done: boolean; goalTitle: string | null } | null;
  challenges: Array<{ title: string; ticks: number; targetCount: number }>;
  week: { missionsDone: number; focusMin: number; daysKept: number } | null;
}

export interface VisibilityInput {
  /** The SHARER's row describing what they show to this viewer. */
  link: CircleLinkView | null;
  /** True if either side blocked the other. */
  blocked: boolean;
  facts: SharerFacts;
}

/** null = show nothing at all, not even a card. */
export function visibleTo({ link, blocked, facts }: VisibilityInput): PartnerCard | null {
  if (blocked) return null;
  if (!link) return null;
  if (link.status === "ended") return null;

  const card: PartnerCard = {
    name: facts.name,
    paused: link.status === "paused",
    level: null,
    elan: null,
    mainQuest: null,
    challenges: [],
    week: null,
  };
  // A paused link keeps the person and drops the facts — the same shape a
  // brand-new partner has, so pausing can never look like an accusation.
  if (link.status !== "active") return card;

  if (link.shareElan) {
    card.level = facts.level;
    card.elan = { value: facts.elan, keepRate7: facts.keepRate7 };
  }

  if (link.shareMainQuest && facts.mainQuest) {
    const mq = facts.mainQuest;
    // Sharing today's headline never implies sharing the goal behind it: the
    // goal name appears only if that specific goal was allowlisted.
    const goalAllowed = mq.goalId != null && link.goalIds.includes(mq.goalId);
    card.mainQuest = {
      title: mq.title,
      done: mq.done,
      goalTitle: goalAllowed ? mq.goalTitle : null,
    };
  }

  if (link.shareChallenges) {
    card.challenges = facts.challenges
      .filter((c) => link.challengeIds.includes(c.id))
      .map((c) => ({ title: c.title, ticks: c.ticks, targetCount: c.targetCount }));
  }

  if (link.shareWeekly) {
    // The week's shape, never the ledger: no XP, no coins, no level-ups.
    card.week = {
      missionsDone: facts.week.missionsDone,
      focusMin: facts.week.focusMin,
      daysKept: facts.week.daysKept,
    };
  }

  return card;
}

/** What the sharer is told they are showing — same door, read backwards. */
export function shareSummary(link: CircleLinkView): string[] {
  if (link.status === "ended") return [];
  if (link.status === "paused") return ["en pause — rien n'est partagé"];
  const out: string[] = [];
  if (link.shareElan) out.push("ton élan et ton niveau");
  if (link.shareMainQuest) out.push("ta Main Quest du jour");
  if (link.shareChallenges && link.challengeIds.length > 0) {
    out.push(
      link.challengeIds.length === 1 ? "1 défi choisi" : `${link.challengeIds.length} défis choisis`
    );
  }
  if (link.shareWeekly) out.push("la forme de ta semaine");
  return out;
}
