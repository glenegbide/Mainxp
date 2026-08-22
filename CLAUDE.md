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
9. **Rewards are a SURPRISE.** Never advertise XP amounts before an action —
   no "+N XP" chips/copy as bait, in UI or coach replies. XP is discovered
   after the real action, with its reason in the ledger. Coin COSTS stay
   visible (spending is a decision). The coach, asked "combien ça rapporte ?",
   answers that it's discovered by doing.
10. **Structure earns nothing; completion does.** Routine ticks (morning/
    evening), challenge ticks, writing spaces, creating/organizing: 0 XP.
    The rewarded moments are completed real actions — and they need a reason
    string in the ledger. Journal is the one rewarded writing (diminishing
    same-day: sincerity over volume).
11. **Challenges require explicit acceptance.** The coach/starters PROPOSE
    (« Glen, tu acceptes ? » — nominative, tied to what the user works on);
    only the user accepts, max 3 alive, completion XP scales with duration
    (capped at 30 days). Quitting is allowed and never punished.
12. **The user's words are first-class data.** Every ritual has free-writing
    spaces (morning intention, journal + mood, review feelings/alignment,
    habit descriptions, routine notes, task notes). The coach reads them
    (get_today_context, night feedback) and reacts to THEM, not generalities —
    emotion acknowledged before coaching.
13. **A notification must cite a number, or stay silent.** No trigger may emit
    generic encouragement (`evidence` is required beside the copy, so the path
    does not exist), no notification names an XP amount, quiet hours are never
    overridden — not by Beast mode, not by urgency 100 — and doing the thing
    cancels the nudge about it. Every evaluation writes a row (SENT, or
    SUPPRESSED with its reason): silence is a decision we can audit and learn
    from. Full invariants: `docs/NOTIFICATION_SYSTEM.md`.
14. **Le Cercle is invite-only and closed by default.** No feed, no followers,
    no counts, no discovery — you cannot be found, only invited. Everything one
    person sees of another passes through `circle/visibility.ts`; adding a
    second path is the only way to leak. Journal, gratitude, notes, money,
    memories and coach chat have no switch: they are absent from the types.
    A link is two rows (one per direction), every switch starts false, a
    category is not a permission (allowlists are), and opening an invitation
    changes nothing — accepting is a POST. Full invariants:
    `docs/PRIVACY_SECURITY.md`.

## Writing lives at the moment of doing

Every repeated action carries a note: missions and the Main Quest, each
non-negotiable, each habit, each morning routine step, each gratitude entry.
One component (`components/NoteAction.tsx`) + one server-action file
(`app/(app)/note-actions.ts`) — the same object everywhere, so "leave yourself
a word" is learned once. It opens in place (no modal, no navigation), saves on
blur (no Save button), Escape abandons, and a note is never mistaken for doing
the thing: writing on a habit does not tap it and earns nothing.

## The coach is the brain (P1/P2/P10 — built)

- **Tools only** (`src/lib/mainxp/ai/tools.ts`): validated, capped, event-first
  — reads (today context, goals+pace, priorities, capacity, bird's-eye view,
  challenges, memory) and writes (task, goal, NN, habit, memory, journal,
  gratitude, propose_challenge). Never raw SQL, never around the caps. Agent
  loop in `coach.ts` (`runCoachAgentLoop`, bounded rounds); providers only
  translate wire formats (`provider.ts` — Gemini needs thoughtSignature echoed
  on functionCalls).
- **Priority engine** (`src/lib/mainxp/priority.ts`): ONE action + 1–3 WHY
  facts; the Today card and the coach's get_priorities share the computation.
- **Personality**: life assistant + accountability partner for a high achiever
  (numbers-first reviews, commitments remembered and followed up unprompted,
  ONE dated next step, direct-but-no-shame) + senior-expert discussion in
  immobilier (métier: agent à Genève), finance, entrepreneuriat — with honest
  confidence limits on precise laws/rates.
- **Proactive**: daily morning brief via `/api/cron/daily-brief` (Vercel cron,
  self-authenticated, idempotent per day) and evening feedback after the night
  review (`nightFeedback` in day-actions) — both fail silent, never block the
  user's flow. AI keys are per-user, set in-app (Moi → Coach IA), validated
  live before saving; env keys are only a server-wide fallback.

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
  mode, purple identity, Part 58 color semantics) — full guide in the
  `mainxp-design` skill. Display face: Unbounded (identity moments only);
  body: Geist. Original pixel hero: `src/app/components/PixelHero.tsx`
  (visual tiers earned at levels 10/25/50/75/100).
- UI copy is French (tutoiement), concise, no exclamation-mark hype.

## Design quality directive ($100K bar — non-negotiable)

`docs/DESIGN_BIBLE.md` is the design law; `.claude/agents/` holds the expert
team (design-director, ux-behavior-expert, frontend-motion-expert, + product/
game/lore/finance/notifications/backend/qa). **A screen is not done because it
works.** Every major screen: build → design-director critique → ux critique →
motion critique → improve → re-review. Hard rules: no emoji as final icons
(premium SVG iconography); no identical-card piles; one dominant purpose /
anchor / action per screen; strong hierarchy, generous whitespace, 8pt
spacing, 44px taps; never all colors at equal strength; light/warm-white
default; game layer through character/rank/gems/quests/celebrations — never
clutter. When torn between MORE and LESS: choose LESS, make what stays
exceptional.

## Next.js traps verified in THIS version (16.2.x)

- **Never add a route-level `loading.tsx`.** It silently breaks
  `revalidatePath` from server actions: the mutation commits to the database
  but the screen never updates until a hard reload (verified 2026-08-20 —
  removing the file restored it instantly). For perceived speed, stream with
  `<Suspense>` *inside* the page instead. `error.tsx` is safe.
- Client components must never import a type from a `"use server"` module —
  it drags server code into the client bundle. Shared result types live in
  plain modules (`src/lib/mainxp/action-result.ts`).
- **A write that ends in `redirect()` must `revalidatePath()` first.** With
  `experimental.staleTimes.dynamic` (set, so prefetched tabs render instantly),
  the client router cache will otherwise serve the destination as it looked
  BEFORE the action. Caught 2026-08-22: the morning flow set the Main Quest and
  Today showed the previous state for 15 seconds. Actions that mutate and stay
  put are fine — their `revalidatePath` already clears the cache.

## Verify before pushing

`npm run lint` · `npx tsc --noEmit` · `npm test` (vitest) · `npm run build`.
For UI/flow changes, run a Playwright pass against a local Postgres
(see docs/TEST_PLAN.md); update `docs/BUILD_STATUS.md` with every feature.
