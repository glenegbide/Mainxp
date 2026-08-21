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

---

## Built (Wave: Web Push, 2026-08)

The engine lives in `src/lib/mainxp/notify/`. Four files, one responsibility each:

| File | Responsibility | Pure? |
|---|---|---|
| `types.ts` | `Trigger`, `TriggerFacts`, `TriggerResult` | yes |
| `triggers.ts` | when + the exact French copy | yes (unit-tested) |
| `policy.ts` | modes, quiet hours, caps, gaps | yes (unit-tested) |
| `engine.ts` | facts → evaluate → gate → record → deliver | I/O |
| `send.ts` | Web Push delivery, retiring dead endpoints | I/O |
| `on-event.ts` | a real action pre-empts the nudge about it | I/O |

### Invariants (do not regress)

1. **A trigger that cannot cite a number returns `null`.** `evidence` is
   required next to `body`, so "sois productif !" has no code path.
2. **XP amounts never appear in a notification** (CLAUDE.md rule 9 — rewards
   are discovered, never advertised).
3. **Quiet hours are never overridden**, not by Beast mode, not by urgency 100.
   The range wraps past midnight (22 → 7 means 22,23,0…6).
4. **Every evaluation writes a row** — `SENT`, or `SUPPRESSED` with its reason.
   Silence is an auditable decision, which is what makes "why didn't it say
   anything?" answerable and lets effectiveness be learned per type.
5. **Insert before deliver.** The unique `dedupeKey` is what makes a double
   send impossible under overlapping ticks. Never check-then-insert.
6. **Doing the thing cancels the nudge about it** (`on-event.ts` writes a
   pre-emptive `SUPPRESSED(resolved)` row).
7. **Never push at someone already in the app** — iOS cannot receive-and-withhold,
   so `lastSeenAt` is checked server-side.

### Modes

| Mode | Cap/day | Min gap | Urgency floor | Types |
|---|---|---|---|---|
| Silence | 1 | 12 h | 80 | night review only |
| Normal | 2 | 4 h | 55 | main quest, commitments, night review |
| Coache-moi | 4 | 2 h | 35 | + goal pace, challenges |
| Beast | 6 | 1 h | 20 | all — quiet hours still protected |

### Scheduling

Vercel Hobby allows one cron per day, which the daily brief uses. The 15-minute
heartbeat therefore runs from `.github/workflows/notification-tick.yml`, calling
`GET /api/jobs/tick` with `MAINXP_JOBS_SECRET`. The route is idempotent, so a
delayed or duplicated run is harmless.

### iOS reality (tested, not assumed)

- Web Push works **only** from the home-screen install. Safari-in-a-tab has no
  `PushManager`; the UI says so instead of offering a dead button.
- `Notification.requestPermission()` must be the **first** statement in the click
  handler — any `await` before it consumes the gesture and the prompt never appears.
- Permission is one-shot: "Don't Allow" can only be undone in iOS Settings.
- `userVisibleOnly: true` is mandatory; a silent push retires the subscription.
- Deleting the home-screen icon invalidates the subscription — a 404/410 from the
  push service soft-disables the row (`disabledAt`), it is never deleted.
- `/sw.js`, `/manifest.webmanifest` and the icons must stay reachable **while
  logged out** (see `src/proxy.ts`): a redirect to `/login` aborts service-worker
  registration and breaks "Sur l'écran d'accueil".

### Setup

```bash
npx web-push generate-vapid-keys      # → NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY
```

Rotating the pair invalidates every existing subscription; every device has to
re-subscribe.
