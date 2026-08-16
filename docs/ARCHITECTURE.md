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
