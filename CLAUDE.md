# MAINXP — project instructions

An AI life OS wrapped inside a real-life RPG. **Your life is the Main Quest.**
The full plan lives in `docs/` — read `docs/BUILD_STATUS.md` first, then the
system doc for whatever you touch (XP_SYSTEM, GOAL_SYSTEM, COACH_SYSTEM, …).

> **MAINXP succeeds when the user closes the app and does something useful in
> real life.** Never optimize for time-in-app.

## Non-negotiable product rules

1. **Everyone starts at zero.** Bio informs the AI; it never awards XP.
2. **SYSTEM OF RECORD**: every meaningful action emits ONE canonical `MxEvent`
   via `emitEvent()` (`src/lib/mainxp/events.ts`); the XP ledger is a listener
   (`xpForEvent`). Server actions NEVER call `awardXp` directly, and no fact is
   updated independently in several places. Ledger stays append-only:
   idempotency keys against duplicates, compensating rows for reversals.
   Evidence level (SELF_REPORTED / SYSTEM_RECORDED / VERIFIED) rides on every
   event — informational, never accusatory.
3. **No shame.** Coach copy uses evidence and numbers, never judgment.
4. **Never fake capability.** No AI key → honest offline state. No pretend
   bank sync or phone monitoring. Placeholders are clearly labeled.
5. **Prestige is never sold.** Coins buy user-defined real rewards and
   cosmetics only — never XP, levels, titles, archetypes.
6. **Original IP only.** Mechanics may be inspired by other games (Habitica
   etc.) but code and art are original; Habitica's code is GPL — never copy it.
7. **User-timezone days.** All daily/weekly logic keys on `dayKey`/`weekKey`
   from `src/lib/mainxp/day.ts`; timestamps stay UTC.
8. **Authorization in services.** Every query filters by `userId` via
   `requireMxUser()`/`getMxUser()`; the proxy redirect is UX, not security.

## Conventions

- Stack: Next.js 16 App Router · TS · Tailwind v4 · Prisma 7 (`prisma-client`
  generator → `src/generated/prisma`) · PostgreSQL. Server Actions for
  mutations; pages are dynamic (session cookie); no `use cache` on user data.
- Prisma models prefixed `Mx`, tables `mainxp_*`. Schema changes ship ONLY as
  migrations (`npm run db:migrate`, history in `prisma/migrations/`; deploys
  run `migrate deploy` via `scripts/ensure-db.mjs`, Neon-safe through
  `DIRECT_DATABASE_URL`). Never hand-edit production tables.
- Hard caps (never exceeded by UI or AI): 1 Main Quest · 3–5 Daily Missions ·
  3–7 Non-Negotiables per day. Overflow goes to Side Quests/Backlog.
- Feature flags in `src/lib/mainxp/flags.ts` gate unfinished modules.
- New UI strings go through `src/lib/mainxp/i18n.ts` keys (French first);
  existing screens migrate opportunistically.
- Design system: tokens + `mxp-*` classes in `src/app/globals.css` (light
  mode, purple identity, Part 58 color semantics). Display face: Bricolage
  Grotesque; body: Geist. Original pixel hero: `src/app/components/PixelHero.tsx`
  (visual tiers earned at levels 10/25/50/75/100).
- UI copy is French (tutoiement), concise, no exclamation-mark hype.

## Verify before pushing

`npm run lint` · `npx tsc --noEmit` · `npm test` (vitest) · `npm run build`.
For UI/flow changes, run a Playwright pass against a local Postgres
(see docs/TEST_PLAN.md); update `docs/BUILD_STATUS.md` with every feature.
