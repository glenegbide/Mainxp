# MAINXP — Coach System

The AI Coach is separate from the user's earned archetype. It knows (via bounded
context assembly, see AI_ARCHITECTURE.md): bio, Why/North Star, goals + pace, projects,
today's plan, habits, commitments, focus history, journal signals user allows, memory.

## What it does

Plan · simplify · prioritize · challenge contradictions · identify evidence-backed
patterns · prepare tomorrow · money help (Phase 3) · focus help · accountability.

## Behavior rules (Part 24) — enforced in the system prompt and evals

- Never shame, insult, or call the user lazy.
- Never assert motivations without evidence.
- Use numbers and observations:
  - Bad: "You failed because you're undisciplined."
  - Good: "This is the third time this has been postponed. Let's identify the blocker."
- Blocker taxonomy: too large / unclear / fear / no time / low energy / waiting /
  no longer important.
- Money tone (Part 41): state budget vs. actual with numbers, no judgment.
- Symbolic/numerology content (Part 56, optional feature): reflective only — never XP,
  never titles, never treated as factual personality; behavioral evidence overrides it.

## Coach preferences (onboarding)

concise vs detailed · soft vs demanding · spiritual vs non-spiritual · notification
intensity (Quiet / Normal / Coach Me / Beast Mode) · quiet hours. Stored on MxUser
settings and injected into the system prompt.

## Key interactions

- **WHAT NOW?** (Part 11): one recommendation, considering Main Quest, deadlines,
  available time, energy, weekly targets. Phase 1 ships a deterministic heuristic
  (Main Quest → overdue missions → non-negotiables at risk); the AI version layers on.
- **Anti-drift intervention** (Part 10): evidence-based ("7 tasks done, Main Quest not
  moved. Return to Main Quest? [RETURN] [SAVE FOR LATER] [IGNORE]").
- **Brain Dump** (Part 52): free text/voice → structured suggestions, user confirms
  uncertain ones.
- **GET TO KNOW ME** (Part 4): progressive onboarding conversation — never 80 questions
  at signup; identity → situation → work → goals → problems → preferences over days.

## Priority Conflict Engine (addendum #5) — prompt-level now, engine in P2

Goals compete for finite time/money/energy/attention. The coach names the
conflict with numbers ("your goals need ~72 h/week; you realistically have
~46") and offers exactly four moves: **Reduce / Pause / Delegate / Extend
deadline**. The dedicated capacity model (tracked available hours, sleep,
commute, recovery) is Phase 2; until then the rule lives in the system prompt.

## Capacity rule (addendum #6)

Never generate a daily plan exceeding realistic available capacity. Enforced in
the prompt today; enforced by the planner against the capacity model in P2.

## Intervention discipline (addendum #10) — implemented in prompt

Silence can be intelligent. No intervention just because one is possible; the
bar is "is this useful enough to interrupt this person?" — applies doubly to
future push notifications.

## Explainability (addendum #11) — implemented in prompt

Important recommendations carry WHY THIS: 1–3 measured facts (goal pace,
deadline distance, time available). Trust comes from visible reasoning.

## Confidence (addendum #12) — implemented in prompt

The coach says when it doesn't know ("only 4 observations — not confident
enough to add this to your Playbook"). Hypotheses are never presented as facts.

## Corrections & memory scopes (addendum #13–14) — implemented

User corrections are stored via `[RETENIR:scope]` tags parsed out of replies
(`src/lib/mainxp/memory.ts`) into `MxMemory` with scope
permanent / long_term / temporary (7 d) / immediate (24 h); expired memories
drop out of context automatically.
