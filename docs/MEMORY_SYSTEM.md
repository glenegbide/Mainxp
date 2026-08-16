# MAINXP — Memory System

Chat history is **not** memory (Part 25). Data is separated into:

1. **Profile data** — MxUser + onboarding answers (structured columns).
2. **Structured data** — goals, projects, tasks, habits, finance… (their own tables).
3. **AI memory** — `MxMemory`: distilled facts/preferences/commitments the coach may use.
4. **Conversations** — `MxConversation`/`MxMessage`, kept for UX, summarized for context.
5. **Knowledge library** — books/notes (Phase 2).
6. **Learned insights** — `MxLearnedInsight` (Phase 2): evidence-backed patterns only.

## MxMemory record

```
id, userId, type, content, importance (1–5), confidence (0–1),
source (user_stated | ai_inferred | onboarding), sensitivity (normal | private),
doNotUseInCoaching (bool), createdAt, updatedAt, lastAccessedAt, embeddingRef
```

Types: identity, preference, goal, commitment, person, project, decision, lesson,
event, pattern, financial_context, health_context, journal_insight.

## User controls (non-negotiable)

Remember this · Forget this (hard delete) · Edit · Mark private ·
Don't use in coaching · Export. Surfaced under ME → Memory.

## Retrieval

Embedding search (AIProvider.embed) + recency/importance ranking → top-K into coach
context. `lastAccessedAt` updated on use. Private / doNotUseInCoaching records are
excluded from coaching context unconditionally.

## Learning engine (Part 26 — Phase 2)

Patterns are stored only after evidence accumulates:
`observation, confidence, sampleSize, supportingData, firstSeen, lastSeen,
userConfirmed`. The AI never invents patterns; below sample-size thresholds it says
"not enough data yet".
