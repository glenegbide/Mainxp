# MAINXP — Test Plan

## Foundation (Phase 0)

- Runner: **vitest** (`npm test`), tests colocated in `src/lib/mainxp/**/*.test.ts`.
- Pure-logic first: XP curve, ledger math, day/week keys (timezone + DST cases),
  goal pace math. No DB required for unit tests.
- Service tests against a real Postgres (integration) arrive in Phase 1 CI.

## Definition of Done per feature (Part 71)

UI works · data persists · authorization enforced (cross-user access impossible) ·
validation works · loading/empty/error states exist · tests pass · mobile layout works ·
`next build` green with no regressions.

## Standing unit-test areas

1. **XP**: curve monotonicity, level boundaries, reversal nets to zero, idempotency key
   blocks duplicates, diminishing returns schedule, per-day caps.
2. **Time**: dayKey/weekKey across timezones, DST transitions (Europe/Zurich Mar/Oct),
   week boundaries (ISO weeks).
3. **Goals**: pace/projection/verdict math, division-by-zero windows, goal-at-risk rule.
4. **Auth**: scrypt verify, session expiry, token hashing (no plaintext tokens stored).

## AI evaluation suite (Part 67 — Phase 1+, runs against recorded fixtures)

The coach must: select correct priorities · never hallucinate memories · never shame ·
not duplicate tasks · interpret Brain Dumps correctly · respect privacy flags · never
invent bank balances · never award XP directly · never create fake achievements ·
never treat numerology as factual identity.

## Manual smoke per release

signup → onboarding → create goal → set Main Quest → complete it → XP visible →
night review → tomorrow draft → logout/login.
