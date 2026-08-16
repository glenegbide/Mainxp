# MAINXP — XP System

## Absolute rule

Every player starts at **zero**. Bio and past achievements award nothing. Only actions
completed after joining create progression. Initial state: **NOVICE**, level 1, 0 XP.

## Attributes

`STRENGTH, ENDURANCE, FOCUS, DISCIPLINE, KNOWLEDGE, STRATEGY, WEALTH, MIND, SOCIAL`
(enum `MxAttribute`). MAINXP (the main level) is tracked as its own delta on each
transaction — it is not the sum of attributes, so tuning one never corrupts the other.

## Ledger (source of truth)

`MxXpTransaction`:

```
id, userId, sourceType, sourceId, reason, multiplier,
mainDelta, attributeDeltas (JSON {attribute: delta}),
idempotencyKey (unique), reversesId, createdAt
```

Rules:
- Append-only. Totals and levels are **computed** from rows (`xpTotals(userId)`).
- Reversal (Part 64): deleting a logged workout/task never edits totals — it appends a
  compensating transaction with `reversesId` pointing at the original. A transaction can
  be reversed at most once (enforced by unique `reversesId`).
- Idempotency (Part 65): awards for a source event carry
  `idempotencyKey = "<sourceType>:<sourceId>:<event>"`; replays are no-ops.

## Level curve

Cumulative XP required to *reach* level L: `50 · L · (L − 1)`
(L2 = 100, L3 = 300, L10 = 4 500, L25 = 30 000, L50 = 122 500, L100 = 495 000).
Implemented as pure functions in `src/lib/mainxp/xp/curve.ts` (levelForXp, xpForLevel,
progress within level) — unit-tested.

## Award engine (Part 18 — personalized XP)

`awardXp()` takes a base value and applies bounded modifiers:

- importance / difficulty of the linked goal or task (0.75×–1.5×)
- first-time achievement bonus, personal-record bonus
- "hard mode": task postponed ≥3 times then completed → multiplier
- diminishing returns: same-day repetition of trivial actions decays (anti-farming)

Phase 1 ships the base values + hard-mode + diminishing returns; history-aware
modifiers (PRs, improvement detection) land with the Learning Engine.

### Base values (initial tuning, all subject to ledger-safe re-tuning)

| Action | MAINXP | Attribute |
|---|---|---|
| Main Quest completed | 100 | +50 relevant |
| Daily Mission completed | 25 | +10 relevant |
| Side Quest completed | 8 | — |
| Daily Non-Negotiable kept | 20 | +15 DISCIPLINE |
| All Non-Negotiables in a day | 30 bonus | +20 DISCIPLINE |
| Focus session (per completed 25 min) | 15 | +15 FOCUS |
| Habit logged (meets minimum) | 10 | +8 category attribute |
| Journal / gratitude / night review | 10 each | +8 MIND |
| Workout logged (Phase 3 verified flow) | 20–60 | STRENGTH/ENDURANCE |

## Anti-farming (Part 20)

Zero XP for: opening the app, creating (not completing) items, edits, clicks,
duplicated logs (idempotency), self-awarded amounts. Per-day caps per sourceType;
trivial repetition decays 100% → 60% → 30% → 0%.

## No pay-to-win

XP, ranks, titles and archetypes can never be purchased (Part 68).
