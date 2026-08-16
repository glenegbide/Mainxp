# MAINXP — Build Status

_Last updated: 2026-08-16 (standalone repository `mainxp`, branch `main`)_

## Phase 0 — Foundation: DONE

| Item | Status |
|---|---|
| Repository + design-pack audit | ✅ done (see ARCHITECTURE.md context section) |
| docs/ suite (16 documents) | ✅ done |
| Prisma core schema (Mx*, mainxp_* tables) | ✅ done — applied via `prisma db push` on deploy |
| XP engine: curve + ledger service + anti-farming caps | ✅ done, unit-tested |
| Day/week timezone helpers | ✅ done, unit-tested |
| Multi-user auth (signup/login/logout, hashed sessions) | ✅ done |
| Proxy guard (session cookie → /login) | ✅ done |
| Design tokens (mxp-* colors) | ✅ done |
| App shell: bottom nav TODAY/COACH/PROGRESS/SOCIAL/ME | ✅ done |
| TODAY page: Main Quest, missions, side quests, quick add, complete→XP | ✅ done |
| ME page: level, attributes from ledger, logout | ✅ done |
| Testing foundation (vitest, `npm test`) | ✅ done |
| Goal pace math lib | ✅ done, unit-tested (UI in Phase 1) |

## Honest placeholders (clearly labeled in UI, no faked behavior)

- COACH tab: renders "Coach offline / arrives in Phase 1" (AIProvider interface exists;
  no key configured, no chat UI yet).
- PROGRESS tab: shows ledger-derived XP + attributes only; goal/project UI is Phase 1.
- SOCIAL tab: labeled Phase 4.

## Known blockers / decisions needed

1. **Standalone repo (resolved)**: Phase 0 was prototyped on a branch of the
   florissant-immobilier repository by mistake, then extracted into this standalone
   `mainxp` repository; the prototype branch was deleted. The master prompt describes
   an Expo mobile app — this web app is the product's first client; an Expo client
   can be added in Phase 5 against the same backend.
2. **AI key**: coach features need `MAINXP_ANTHROPIC_API_KEY` env (server-side only).
3. **Migrations**: `prisma db push` for now (no migration files). Fine now; switch to
   `prisma migrate` before first destructive schema change with real users.
4. **Phone monitoring**: impossible in web client — interface + mock only (Part 46).
5. **Web push**: needs VAPID keys + service worker (Phase 2).

## Next up (Phase 1 start)

GET TO KNOW ME onboarding → North Star → Goals UI → Morning Start → Night Review →
Coach chat (with key) → Focus mode.
