---
name: mainxp-verify
description: Run MAINXP's full verification pipeline (lint, typecheck, unit tests, build, migrations, Playwright end-to-end) before any push. Use after any code change, when asked to "verify", "check everything", or before deploying.
---

# MAINXP verification pipeline

Run ALL of it before any push — a feature is not done because the UI exists
(docs/TEST_PLAN.md).

## 1. Static + unit

```bash
npm run lint            # zero warnings tolerated
npx tsc --noEmit
npm test                # vitest — all pure logic: XP curve, events policy,
                        # élan, titles, timezones, goal pace, brain dump parsing
```

## 2. Build + migrations

```bash
npm run build           # includes prisma generate + ensure-db (migrate deploy)
# Fresh-database proof (catches missing migration files):
createdb mainxp_verify && DIRECT_DATABASE_URL=postgresql://…/mainxp_verify npx prisma migrate deploy
```

## 3. End-to-end (Playwright against a local build)

Start `npm run start -- --port 3500` with a local Postgres, then drive the
browser through: signup→onboarding→Main Quest (+100 XP)→missions→
non-négociables (award + reversal, exact ledger totals)→habits ± (diminishing
8/8/5)→élan→gear purchase (exact wallet)→minimum day (exact 39 XP)→night
review→weekly review idempotency→coach/dump honest offline states.

**Regression rule**: XP/coin totals are exact assertions. If a refactor changes
a total, that's a behavior change — stop and justify it, never loosen the
assertion silently.

## 4. Invariants to spot-check in review

- No server action calls `awardXp` directly — only `emitEvent()`.
- Every award path has an idempotency key; reversals are compensating rows.
- Caps hold: 1 Main Quest, ≤5 missions/day, ≤7 non-négociables, ≤15 habits.
- No user-facing feature pretends to work without its dependency (AI key…).
- New user-scoped queries filter by `userId`.
