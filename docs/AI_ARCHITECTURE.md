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

- Implementations: Anthropic (`MAINXP_ANTHROPIC_API_KEY`) and Gemini
  (`MAINXP_GEMINI_API_KEY`, supporting AI Studio `AIza…` and Vertex Express `AQ.…`
  keys). Anthropic wins when both are set; keys never bundled to client. Model
  choice per workload: cheap/fast for extraction, strongest for coaching (Part 66).
- Memory is provider-independent: conversations, MxMemory and all context live in
  MAINXP's database and are assembled per request — switching providers loses nothing.
- `getAIProvider()` returns `null` when unconfigured → every AI surface shows an honest
  "Coach offline" state. Nothing is faked.

## Tool use (Part 51) — BUILT (audit P1)

The LLM never executes SQL. It calls validated tools (hand-validated input,
user-scoped, executed server-side) from the registry in
`src/lib/mainxp/ai/tools.ts`:

- **Read**: get_today_context, get_north_star, get_goals (with pace verdicts),
  get_projects, get_priorities (the What-Now engine — same computation as the
  Today card), get_capacity (caps + slots left), search_memory.
- **Write**: create_task (cap-aware via `tasks.ts`, same path as the UI),
  postpone_task, create_goal, create_non_negotiable (cap 7), create_habit
  (cap 15), create_memory (scoped), create_journal_entry, log_gratitude
  (event-first, day-idempotent).

The agent loop lives in `coach.ts` (bounded rounds); providers only translate
the neutral AgentMessage/ToolWireSpec shapes to their wire format
(`provider.ts` — Anthropic tool_use blocks, Gemini functionDeclarations).
Tool errors return as `{ ok:false, error }` data so the coach explains
honestly instead of crashing. Mutations run only on a clear user ask; caps are
enforced by the tools, not by the prompt. XP awards happen inside the event
engine, never at the LLM's request. Phase 3+: completeTask-by-voice,
finance/body tools (createExpense, logWorkout…), deleteMemory with confirm.

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
