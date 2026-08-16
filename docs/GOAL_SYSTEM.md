# MAINXP — Goal System

## Horizons

Lifetime → 3-year → 1-year → 90-day objectives → monthly → weekly targets.
`MxGoal.horizon` enum; weekly targets are derived slices, not separate entities.

## Fields (implemented on MxGoal)

id, userId, title, description, why, lifeArea, horizon, targetValue, currentValue,
unit, deadline, priority (1–5), status (ACTIVE | PAUSED | COMPLETED | ABANDONED),
reward (free text, user-defined real-life reward), createdAt, completedAt.

Links: projects, tasks, habits, non-negotiables, focus sessions reference `goalId`.
People/money/fitness/book links arrive with their phases.

## Pace math (Part 7) — `src/lib/mainxp/goals.ts`

Given targetValue, currentValue, createdAt→deadline window:

- targetPace = target / total weeks
- actualPace = current / elapsed weeks
- remaining = target − current
- requiredWeeklyPace = remaining / weeks left
- projection = current + actualPace · weeks left
- verdict: **ahead** (projection ≥ 1.05·target) / **on track** / **behind**
  (projection < 0.95·target); goals `behind` with deadline < 14 days are
  "goal at risk" and surface on TODAY and in coach context.

Pure functions, unit-tested; timezone-correct week boundaries via day.ts.

## Rules

- A goal without a measurable target still works (status/milestone driven), but the UI
  nudges toward measurability ("why? deadline? measurable result?" — onboarding).
- Completing a goal awards XP through the ledger with sourceType `goal`.
- Every meaningful goal should link at least one project or recurring commitment;
  the coach flags orphan goals ("no engine behind this goal").
