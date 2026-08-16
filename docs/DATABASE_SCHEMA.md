# MAINXP — Database Schema

All MAINXP models are prefixed `Mx` in Prisma and mapped to `mainxp_*` tables —
a convention kept from the original prototype location; it keeps every table
self-identifying and collision-proof if the schema ever shares a database.

## Implemented in Phase 0/1 (see prisma/schema.prisma)

| Model | Table | Purpose |
|---|---|---|
| MxEvent | mainxp_events | **System of record**: one canonical event per real-life action (type, payload, evidence, dayKey, idempotency) |
| MxUser | mainxp_users | Account: email, scrypt hash, name, timezone, locale, onboarding state |
| MxSession | mainxp_sessions | Hashed session tokens, expiry |
| MxNorthStar | mainxp_north_stars | Why, values, future self, 1-y vision, 90-d mission, season, priorities, rules |
| MxGoal | mainxp_goals | Full Part-7 field set incl. target/current/unit/deadline/pace inputs |
| MxProject | mainxp_projects | Part-8 fields, status enum (IDEA…CANCELLED), next action |
| MxMilestone | mainxp_milestones | Ordered project milestones |
| MxTask | mainxp_tasks | Tier: MAIN_QUEST / DAILY_MISSION / SIDE_QUEST / BACKLOG; dayKey scheduling; links to goal/project |
| MxNonNegotiable | mainxp_non_negotiables | Daily or weekly cadence, target+unit+minimum, linked goal |
| MxNonNegotiableLog | mainxp_non_negotiable_logs | Per dayKey/weekKey value + completion |
| MxHabit / MxHabitLog | mainxp_habits / _logs | Part-16 fields; streaks derived from logs, never stored as truth |
| MxDayPlan | mainxp_day_plans | Morning check-in (mood/energy/stress/focus), night review answers, prep state |
| MxFocusSession | mainxp_focus_sessions | Start/end/minutes/interruptions/completed, linked task/goal |
| MxXpTransaction | mainxp_xp_transactions | **Append-only ledger** — see XP_SYSTEM.md |
| MxJournalEntry | mainxp_journal_entries | kind (free/morning/night/decision/…) + content |
| MxGratitudeEntry | mainxp_gratitude_entries | Per-day gratitude |
| MxMemory | mainxp_memories | Typed AI memory records (Part 25 fields) |
| MxConversation / MxMessage | mainxp_conversations / _messages | Coach chat threads |

### Ledger invariants

- XP totals (MAINXP + 9 attributes) are always derived from `MxXpTransaction` rows.
- Reversal = a new compensating row with `reversesId` set; original marked via relation.
  No row is ever updated or deleted.
- `idempotencyKey` (unique, nullable) prevents duplicate awards for the same source event.

## Planned (later phases — do NOT create tables until the phase starts)

- **Phase 2**: MxRoutine/MxRoutineStep, MxTitle/MxUserTitle, MxAchievement, MxChallenge,
  MxReward, MxBook/MxBookProgress/MxHighlight, MxLearnedInsight, MxPlaybookEntry
- **Phase 3**: MxAccount, MxExpense, MxIncome, MxBudget, MxDebt, MxSavingsGoal,
  MxReceipt, MxBankConnection (BankingProvider abstraction, manual balances first)
- **Phase 4**: MxContact, MxInteraction, MxClub, MxClubMember, MxClubQuest, sharing grants
- **Phase 5**: MxNotification, MxScheduledJob, MxIntegration, MxAuditLog, screen-time models

## Migration policy

The project uses `prisma db push` for now (no migration files). Once real user data
exists, switch to `prisma migrate` before any destructive schema change.
