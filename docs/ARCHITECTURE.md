# MAINXP — Architecture

## Context: this repository

Standalone MAINXP web application (repository `mainxp`), started as a mobile-first
web product. A native mobile client (Expo) can be added later as a separate client
of the same backend.

Stack: **Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL**,
standalone output for self-hosting.

Historical note: Phase 0 was originally prototyped on a branch of another repository
and extracted here; naming conventions (`Mx*` models, `mainxp_*` tables, `mxp_*`
cookies, `src/lib/mainxp`) were kept — they make every MAINXP artifact
self-identifying and portable.

## Hard rules

1. Namespacing stays:
   - Routes: `src/app/**` (product served at the app root)
   - Libraries: `src/lib/mainxp/**`
   - Prisma models: prefixed `Mx*`, tables mapped to `mainxp_*`
   - Cookies: `mxp_*`
2. No secret keys in client code. All AI calls, XP computation, and authorization run
   server-side (Server Components, Server Actions, route handlers, scheduled jobs).
4. XP is only ever written through the append-only ledger (`MxXpTransaction`).

## Layers

```
Client (React Server Components + small client islands)
  └─ src/app/(auth)   login / signup
  └─ src/app/(app)    authenticated shell: TODAY · COACH · PROGRESS · SOCIAL · ME
Server
  └─ Server Actions          mutations (tasks, plans, check-ins, auth)
  └─ src/lib/mainxp/
       auth.ts               sessions (scrypt + hashed session tokens)
       day.ts                user-timezone day/week keys
       xp/                   XP engine + ledger service
       ai/                   AIProvider abstraction (Anthropic default, graceful "off" state)
Data
  └─ PostgreSQL via Prisma (mainxp_* tables)
Jobs (Phase 1+)
  └─ Route handlers invoked by cron (container cron / external scheduler) for
     morning planner, night-review reminder, weekly review, goal-risk checks.
```

## Rendering & caching

`cacheComponents` is **not** enabled. MAINXP pages read the session cookie
(`cookies()`), so they render dynamically per-request — correct for a personal
dashboard. Do not add `use cache` to user-scoped reads.

## Authentication

- MAINXP is multi-user: `MxUser` (scrypt password hash) + `MxSession` rows
  (random 256-bit token, stored SHA-256-hashed, 30-day expiry, sliding).
- `src/proxy.ts` gains an optimistic guard: `/mainxp/**` without a session cookie
  redirects to `/login` (except auth pages). Real authorization happens
  server-side in `requireMxUser()` on every read/mutation.

## Timezone model

Every `MxUser` stores an IANA timezone. A "day" is midnight-to-midnight in the user's
timezone; all daily/weekly records key on `dayKey` (`YYYY-MM-DD`) / `weekKey`
(ISO `YYYY-Www`) computed via `Intl.DateTimeFormat` in `src/lib/mainxp/day.ts`.
Timestamps themselves are stored UTC.

## AI

See `AI_ARCHITECTURE.md`. Summary: a server-only `AIProvider` interface
(`chat`, `structuredExtract`, `vision`, `embed`, …); Anthropic implementation reads
`MAINXP_ANTHROPIC_API_KEY`; when the key is absent every AI surface renders an honest
"coach offline" state — nothing is faked.

## Offline / mobile future

The web app is built mobile-first (bottom nav, thumb-reach layout). True offline queueing
and phone-distraction monitoring require native APIs and are explicitly out of scope for
the web client (see `NOTIFICATION_SYSTEM.md` and BUILD_STATUS blockers) — interfaces are
designed so an Expo client can reuse the same server actions/route handlers later.

## SYSTEM OF RECORD RULE (addendum #1–2) — implemented

Every meaningful real-life action creates **one canonical `MxEvent`**
(`src/lib/mainxp/events.ts`); all other state derives from it. The XP ledger is
a *listener* (`xpForEvent` policy map); streaks, Élan, titles and stats derive
from ledger/log rows. Server actions emit facts — they never award XP directly,
and no fact is ever updated independently in several places.

Event catalog today: task_completed, main_quest_completed, commitment_kept,
all_commitments_kept, habit_completed, habit_slipped, focus_completed,
goal_reached, milestone_completed, project_completed, morning_started,
night_review_completed, gratitude_logged, weekly_review_completed,
reward_redeemed, gear_purchased, task_note_added. Phase 3+ adds
workout_completed, run_completed, expense_created, income_received,
debt_payment_recorded, book_completed, friend_interaction_completed.

## Evidence levels (addendum #3) — implemented

`MxEvidence` on every event and XP transaction: SELF_REPORTED (manual),
SYSTEM_RECORDED (server-timed, e.g. focus), VERIFIED (integrated source,
Phase 3+). Never used to accuse; used to weight rare achievements and any
future competitive surface. Titles carry `minEvidence` readiness.

## Environments (addendum #30)

- **Development**: local Postgres, fake data, `.env`.
- **Staging**: Vercel preview deployments (every non-main push) against a
  dedicated Neon branch database — never the production DB.
- **Production**: `main` → Vercel production + Neon main. No experiments
  against production user/financial data, ever.

## Migrations & backups (addendum #31–32)

Schema changes ship exclusively as Prisma migrations
(`prisma/migrations/`, applied by `scripts/ensure-db.mjs` → `migrate deploy`,
via `DIRECT_DATABASE_URL` on Neon). Hand-editing production tables is
forbidden. Backups: Neon point-in-time restore (verify the restore window in
the Neon dashboard) + a weekly `pg_dump` kept off-platform once real users
exist; test a restore before public launch.

## Telemetry & product metrics (addendum #33–34, Phase 2+)

Feature usage counts derive from the event stream (types + timestamps only —
**never** journal/conversation text in analytics). Commercial metrics to add
before selling: activation, D1/D7/D30 retention, morning/night completion
rates, Main Quest completion, AI action acceptance, notification
effectiveness, paid conversion, AI cost per user.
