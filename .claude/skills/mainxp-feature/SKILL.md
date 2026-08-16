---
name: mainxp-feature
description: The MAINXP feature workflow — how to add any feature to this app correctly (event-first design, migrations, XP policy, UI conventions, verification). Use when building or changing any MAINXP feature.
---

# Building a MAINXP feature

Read `CLAUDE.md` and the relevant `docs/*_SYSTEM.md` first. Then follow this
order (docs/ROADMAP.md decides *what*; this skill decides *how*).

## 1. Design event-first (SYSTEM OF RECORD)

What real-life action does this feature record? Define its canonical event
type in `src/lib/mainxp/events.ts` (`MxEventType`), its payload, and its XP
policy in `xpForEvent` (values in `XP_VALUES`, `src/lib/mainxp/xp/curve.ts`).
Rules: creation/input/organizing = 0 XP; only completed real actions award;
choose evidence level; idempotency key = `<domain>:<id>:<qualifier>`.

## 2. Schema via migration

Add `Mx*` models mapped to `mainxp_*` tables. `npm run db:migrate -- --name
<change>` — never `db push`, never hand-edit tables. Cascade from MxUser.

## 3. Server action

`"use server"` + `requireMxUser()`; validate/clip inputs; enforce caps
(1 Main Quest / ≤5 missions / ≤7 NN / ≤15 habits); mutate domain rows; then
`emitEvent(user, type, payload, { idempotencyKey })` — NEVER `awardXp`
directly. Reversals: `reverseXp` via the ledger row found by idempotency key.

## 4. UI

French (tutoiement), mobile-first, design system classes from
`src/app/globals.css` (`mxp-card`, `mxp-btn`, `mxp-input`, `mxp-check`,
`mxp-label`, `mxp-rail`, `mxp-hero`). Section color semantics: purple=identity,
green=body/habits, blue=focus/knowledge, gold=wealth, teal=mind, orange=alerts.
Every surface needs loading-free server rendering, an empty state, and an
honest disabled state if a dependency is missing. New strings via
`src/lib/mainxp/i18n.ts` keys.

## 5. No-shame check

Copy states facts and numbers, never judgment. Failure/absence paths get the
gentle treatment (élan decays softly, comeback has no guilt, minimum day is a
success). Nothing punishes with XP loss except explicit user-initiated
reversals of their own entries.

## 6. Verify + document

Run the `mainxp-verify` skill. Add pure-logic unit tests for any new math.
Update `docs/BUILD_STATUS.md` (and the system doc if behavior changed).
One commit per working feature.
