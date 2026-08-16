# MAINXP — AI Architecture

## Provider abstraction (Part 50)

`src/lib/mainxp/ai/provider.ts` defines a server-only interface:

```ts
interface AIProvider {
  chat(req): Promise<ChatResult>            // coach conversation (tool-use loop)
  structuredExtract(req): Promise<T>        // Brain Dump, receipt fields → typed JSON
  vision(req): Promise<VisionResult>        // receipt / photo understanding (Phase 3)
  transcribe(req): Promise<string>          // voice journal (Phase 5)
  embed(texts): Promise<number[][]>         // memory retrieval
  summarize(req): Promise<string>
}
```

- Default implementation: Anthropic (`MAINXP_ANTHROPIC_API_KEY` env; never bundled to
  client). Model choice per workload: cheap/fast model for extraction & classification,
  strongest model for coaching/reasoning (Part 66).
- `getAIProvider()` returns `null` when unconfigured → every AI surface shows an honest
  "Coach offline" state. Nothing is faked.

## Tool use (Part 51)

The LLM never executes SQL. It calls validated tools (zod-checked input, user-scoped,
authorization enforced server-side): createGoal, updateGoal, createProject, createTask,
completeTask, createHabit, logHabit, startFocusSession, createJournalEntry,
createGratitude, createMemory, searchMemory, deleteMemory, getDailyPlan,
getWeeklyProgress, getGoalProgress, … Tools live in `src/lib/mainxp/ai/tools/` and are
the same service functions the UI's server actions use — one code path, one
authorization model. XP awards happen inside services, never at the LLM's request.

## Context assembly (Part 66 — cost control)

Per request, build a bounded context: user profile + North Star summary + today's plan +
top-K retrieved memories (embedding search) + last N conversation turns. Never ship full
history. Log model, tokens, latency, feature and user for cost tracking
(`mainxp_ai_usage` table, Phase 1+).

## Proactive AI (Part 49)

No infinite loop on the client. Server-side scheduled jobs (cron-invoked route handlers
under `/api/jobs/*`, secret-guarded) + DB events drive: morning planner, midday
progress check, night-review reminder, weekly review, goal-risk checker. Push channels:
web push (Phase 2+), then native push when the mobile client exists.

## Structured outputs (Part 52)

Brain Dump returns a typed list of suggestions (expense / reminder / task / CRM update /
journal…), each with confidence; low-confidence items require user confirmation before
any record is created. Duplicate suggestion → idempotency check before insert.

## Safety & evaluation

- Coach behavior rules in COACH_SYSTEM.md are part of the system prompt.
- Eval suite (Part 67) lives in TEST_PLAN.md: no hallucinated memories, no shaming, no
  invented balances, no duplicate tasks, no XP awards outside services, symbolic
  numerology never treated as fact.

## Brain Dump is a primary input surface (addendum #18, P2)

The user should almost never navigate five menus. One utterance ("45 francs de
parking, appeler Paul demain, idée de club de course, stressé par le loyer,
BJJ fait") → typed suggestions (expense / reminder / idea / journal context /
workout) → **CONFIRM ALL**. Each confirmation emits its canonical event.

## Voice mode (addendum #19, P5)

"MAINXP, what's next / log 60 francs / I finished training / brain dump" —
same tools, transcription in front. Architecture-ready via AIProvider.

## AI mission caps (addendum #20) — enforced invariant

The AI (and the UI) can never exceed: 1 Main Quest · 3–5 Daily Missions ·
3–7 Non-Negotiables. Everything else goes to Side Quests / Backlog. Enforced
in server actions; also stated in the coach prompt.
