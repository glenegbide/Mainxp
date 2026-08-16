# MAINXP — Notification System

## Principles (Part 48)

Contextual, never generic. Bad: "Be productive!" Good: "You have 40 minutes before your
next appointment. Your Main Quest needs ~25."

Controls per user: quiet hours, max nudges/day, aggressiveness mode
(**Quiet / Normal / Coach Me / Beast Mode**), per-category permissions.
All respect the user's timezone (day boundaries from day.ts).

## Delivery architecture (Part 49)

Server-side only — no client loops:

1. Cron-invoked route handlers (`/api/jobs/*`, guarded by `MAINXP_JOBS_SECRET`):
   morning planner, midday progress check, night-review reminder, weekly review,
   goal-risk checker, follow-up checker.
2. DB events (task_completed, focus_completed, commitment_missed, …) enqueue
   notifications.
3. Channels: in-app inbox first (Phase 1–2), Web Push (Phase 2+), native push when the
   Expo client exists (Phase 5).

## Phone / distraction monitoring (Part 46) — honesty rule

Web cannot read screen time or block apps. Status: **not implementable in the current
web client**. We ship: a `DistractionProvider` interface + permission-state model +
mock/dev adapter, and document the native work (iOS Screen Time API / Android
UsageStats + Expo native modules) required. The UI never pretends monitoring works.

## Failure states (Part 61)

Notification service down → app fully usable; jobs are idempotent and safe to re-run;
every job logs its run.
