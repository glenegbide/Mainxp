# MAINXP — Build Status

_Last updated: 2026-08-16 (standalone repository `mainxp`, branch `main`)_

## Hardening wave (35-point addendum): DONE

| Item | Status |
|---|---|
| Event engine / system of record: `MxEvent` + `emitEvent()`; XP is a listener (`xpForEvent`); all actions refactored | ✅ regression-verified, identical totals |
| Evidence levels on events + transactions (focus = SYSTEM_RECORDED) | ✅ |
| Real migrations: baseline committed, `migrate deploy` at build, `DIRECT_DATABASE_URL` for Neon | ✅ |
| Feature flags (`flags.ts`): AI_COACH on; FINANCE/CLUBS/SCREEN_TIME/SPIRITUALITY dark | ✅ |
| Coach: explainability, confidence, intelligent silence, capacity/conflict rules; corrections stored via [RETENIR] with scopes + expiry; scoped memories in context | ✅ |
| Task completion notes (📝 on done tasks, `task_note_added` event) | ✅ |
| Guiding principle atop PRODUCT_REQUIREMENTS + CLAUDE.md; caps as invariants | ✅ |
| i18n scaffold (`i18n.ts`) — new strings by key, French first | ✅ |
| All 35 addendum points implemented or specced with phase tags across docs/ | ✅ |

Verified: 39 unit tests, lint, tsc, build, migrate-deploy on fresh DB, both
Playwright end-to-end suites (identical XP/coin totals pre/post refactor),
live event-stream inspection, task-note flow.

## Phase 2 (first wave, Habitica-inspired — original implementation): DONE

| Item | Status |
|---|---|
| Habits ± : good habits award XP (per-habit same-day diminishing), bad habits never remove XP — they feed Élan | ✅ /habits + quick-tap card on Today |
| Élan (momentum): derived 0–100 gauge over last 7 days (missed non-negotiable days −10, bad taps −3 capped, floor 10, no death) | ✅ hero gauge, unit-tested |
| Recovery mode ("the inn"): pauses Élan decay; rest is part of the game | ✅ toggle in Me |
| Cosmetic gear shop: original pixel layers bought with Coins through the ledger, one item per slot, equip/unequip | ✅ 5 items; never prestige |
| Titles foundation: Discipliné/Stratège/Focalisé/Moine/Bâtisseur, tiers I–III from non-reversed ledger evidence | ✅ Me page, unit-tested |
| Weekly review: ISO-week stats (XP, coins, quests, NN rate, focus minutes) + 3 questions → journal + idempotent +25 XP | ✅ /progress/week |

Still open in Phase 2: routines, monthly review, books/playbook, learning engine,
challenges, deeper character tiers (50/75/100).

## Phase 1 — Core loop: DONE (this commit)

| Item | Status |
|---|---|
| GET TO KNOW ME onboarding (5 questions, progressive — never 80) | ✅ signup lands here |
| North Star (why, values, season, priorities, rules, refusals) | ✅ editable, feeds coach |
| Goals: create, pace math (target/actual/required/projection/verdict), at-risk surfacing | ✅ |
| Projects: create, milestones (+40 XP Stratégie, reversible), next action, statuses, anti-drift warning | ✅ |
| Morning Start: state check → why → standing → Main Quest proposal | ✅ +10 XP idempotent/day |
| Night Review: recap, questions, gratitude, One Big Thing → tomorrow auto-prepared (carry-overs + MQ candidate) | ✅ +15 XP |
| Focus mode: 25/50/90/custom, server-verified blocks (early stop = 0 XP, overtime capped) | ✅ |
| AI Coach chat: real conversation w/ bounded context (North Star, today, goals pace); honest offline state without key | ✅ |
| Coins economy + Rewards (Habitica-inspired, original): real-life rewards bought with earned coins, same auditable ledger | ✅ |
| Vercel readiness: build-time `prisma db push` when DATABASE_URL set; DEPLOY.md | ✅ |

Verified: lint, tsc, 21 unit tests, production build, Playwright end-to-end
(onboarding → goal+pace → project+milestone → morning → main quest → focus →
night review → exact ledger totals 175 XP / 87 coins → reward redeem → coach
offline state).

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
