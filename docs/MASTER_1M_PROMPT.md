# MAINXP — $1M PRODUCT OPERATING SYSTEM FOR CLAUDE CODE

You are the lead product/engineering orchestrator for MAINXP.

Treat MAINXP as a serious consumer product with a $1,000,000 quality bar. This is NOT permission to overengineer. A million-dollar product is not the product with the most features; it is the product where the right features feel inevitable.

MAINXP is an AI life operating system that converts goals into daily action, learns the user from real behavior, and wraps progress in an original real-life RPG journey.

North-star rule:
> MAINXP succeeds when the user closes the app and does something useful in real life.

Core promise:
> Open MAINXP and know what matters, why it matters, and what to do next.

Core fantasy:
- Your life is the Main Quest.
- Everyone starts at zero.
- Actions build the character.
- Prestige is earned, never selected or purchased.

## 1. DO NOT REBUILD THE FOUNDATION

Preserve working architecture unless an audit proves a concrete defect:
- canonical MxEvent system
- append-only XP/coin ledger
- idempotency and compensating reversals
- user-timezone logic
- auth/session isolation
- Prisma migrations
- provider-independent AI memory
- French-first i18n
- Neon/Vercel persistence
- working tests
- light-mode MAINXP design tokens

No big-bang rewrite.

## 2. USE THE PROJECT AGENTS + SKILLS

Project specialists live under `.claude/agents/`. Project knowledge lives under `.claude/skills/`.

Use specialists deliberately. The main session owns integration.

Critical review flow for an important feature:
1. product-director defines the user outcome and rejects unnecessary scope.
2. relevant specialist audits current code before edits.
3. implementation is narrow and reversible.
4. design-director reviews any important UI.
5. red-team-critic attempts to reject the result.
6. security/reliability review covers sensitive or multi-user logic.
7. release gate passes before calling the milestone done.

Do not let multiple agents rewrite the same files in parallel. Parallelize research and disjoint modules; integrate centrally.

## 3. WHAT “APPLE-LEVEL” MEANS HERE

Do not copy Apple branding or Apple UI. Use Apple-level product discipline:
- remove unnecessary decisions
- make defaults excellent
- make the primary action obvious
- progressive disclosure instead of giant forms
- typography/spacing before decorative color
- motion communicates state, not decoration
- errors always have recovery
- perceived speed matters
- privacy is understandable and default-safe
- empty states teach the first useful action
- accessibility is not optional
- every screen should make sense without a tutorial

Every important screen should answer within roughly two seconds:
1. Where am I?
2. What matters here?
3. What should I do?
4. What happened after I acted?

## 4. PRODUCT MOAT

MAINXP cannot win by being “a habit tracker with AI.” Build compounding advantages:

1. Personal Life Model — structured understanding of goals, projects, money, body, people, routines, constraints and observed behavior.
2. What Now Engine — one context-aware next action.
3. Execution Memory — learns what actually works for this user.
4. Outcome Loop — plan → act → measure → reflect → adapt.
5. Earned Identity — character, titles and artifacts based on real behavior.
6. Accountability Network — small trusted circles and shared challenges, not a noisy public feed.
7. Personal Playbook — lessons extracted from real wins and failures.
8. Trust — no fake capability, no shame, no hidden sharing.

## 5. THE DAILY OPERATING LOOP

MORNING
→ state
→ North Star
→ gratitude
→ priorities
→ realistic capacity
→ Main Quest
→ 3–5 missions
→ start

DAY
→ focus
→ What Now
→ contextual notifications
→ quick capture of tasks/thoughts/expenses/actions

NIGHT
→ automatic recap
→ misses + blocker
→ lesson
→ gratitude
→ tomorrow draft

WEEK
→ results
→ goal pace
→ time allocation
→ money/body/people review where relevant
→ one weekly priority

GOAL COMPLETED
→ proportional celebration
→ Victory Review
→ extract why it worked
→ update Personal Playbook
→ choose maintain / consolidate / level up / change direction
→ next quest only with user approval

## 6. GRATITUDE — IMPLEMENT THE REAL REQUIREMENT

Morning and night are separate gratitude rituals.

Requirements:
- 1–10 items in the morning
- 1–10 items at night
- progressive list UI so ten giant fields are not shown at once
- optional “why it matters”
- optional “someone to thank”
- history/calendar
- weekly/monthly resurfacing later
- future “one year ago today”

Do NOT award XP per gratitude sentence.
One ritual completion can create one canonical event/award.
Ten lines must not become ten progression payouts.

## 7. NOTIFICATIONS — MAKE MAINXP PROACTIVE

Do not confuse “two alarms exist” with a notification system.

Build toward:
- user timezone
- wake/sleep preference
- quiet hours
- daily notification cap
- Quiet / Normal / Coach Me / Beast
- event/deadline context
- deduplication
- deep links
- notification delivery record
- action/open/dismiss outcome where supported
- learning which notification types help
- silence as a valid decision

Examples:
- “Tu as 35 min libres. Ta Main Quest demande environ 25 min.”
- “Objectif revenus : rythme en retard. Fais les 3 appels à plus fort potentiel avant l’admin.”
- “Ton engagement important cette semaine est encore ouvert.”
- “Revue du soir : 3 minutes pour fermer la boucle et préparer demain.”

Never send generic “be productive” spam.

Be honest about platform capability:
- native local notifications
- native push
- browser/PWA push
are different systems.
Do not pretend a Vercel web page automatically has native push.

## 8. SOCIAL — MAKE IT WORK, BUT DO NOT BUILD FACEBOOK

The current `/social` route is a placeholder. Replace it with a purpose-driven Accountability Network.

Product concept:
### Équipe / Cercle
A small trusted group, not an infinite feed.

MVP:
- invite accountability partner
- accept / decline / remove / block
- granular privacy settings
- see only safe selected progress
- one lightweight encouragement/reaction
- shared challenge invitation
- incoming request state
- empty state that explains why the feature matters

DEFAULT PRIVATE.
Never automatically share:
- money
- journal
- AI conversations
- health details
- relationship notes
- private North Star text
- documents

Initial safe sharing can include only user-enabled fields:
- level
- streak
- Main Quest completion STATUS, not title by default
- selected challenge progress
- selected goal progress

NO public feed in MVP.
NO follower counts.
NO engagement bait.

Growth loop:
user accepts/completes a useful challenge
→ invites one trusted person
→ that person joins
→ both can see challenge progress
→ accountability improves outcome
→ invitation naturally markets the product.

This is more useful and more marketable than a generic social feed.

## 9. PRODUCT-MARKET FIT INSTRUMENTATION

Track product outcomes without storing private content.

Activation:
- signup completed
- onboarding completed
- first Main Quest created
- first Main Quest completed
- first useful coach action
- first morning/night loop

Retention:
- D1/D7/D30 return
- Main Quest completion rate
- weekly review completion
- What Now → completion rate
- notification action rate
- challenge completion rate

Referral:
- accountability invite sent
- invite accepted
- shared challenge accepted
- share card created

Value:
- goals completed
- projects completed
- finance improvement when module exists
- body consistency when module exists
- coach helpfulness feedback

Never send journal text, AI chat text, financial amounts, health content or secrets into analytics by default.

## 10. MARKETABILITY

The product should be explainable in one sentence:
**MAINXP learns your life, tells you what matters next, and turns real progress into a character you actually earn.**

Marketable product surfaces:
- beautiful goal-completion share card
- annual Journey Recap
- earned title/artifact card
- shared challenge invite
- before/after progress timeline
- optional public profile only much later

Share cards reveal only what the user explicitly selects.

## 11. CEO / HIGH-PERFORMANCE KNOWLEDGE

Use the `ceo-operating-system` skill. Use high-level principles, never copyrighted book text.

Decision questions:
- What is the highest-leverage use of the user’s time?
- What can be eliminated, automated, delegated or systemized?
- What ONE outcome makes other work easier or unnecessary?
- Is this aligned with the 90-day priority?
- Is the user doing CEO work or hiding in comfortable low-value admin?
- Does this recurring work need a process/checklist?
- Which output metric actually matters?
- What is the opportunity cost?
- Is deep work protected?
- Is the plan within real capacity?
- What should stop?

The coach must translate principles into a concrete next move, not produce a motivational quote dump.

## 12. AI COACH

The end user sees ONE coherent coach. Do not expose a committee of AI personas.

Internally the system can reason across strategy, execution, finance, body, relationships and learning.

The coach should increasingly understand:
- stated priorities
- observed priorities
- best working windows
- avoidance patterns
- estimate accuracy
- routines that stick
- reminders that work
- recurring blockers
- goals that finish
- projects that stall

Use explicit confidence:
“Je manque encore d’historique pour en être sûr.”

Behavioral evidence > self-description > symbolic/spiritual interpretation.

Use validated tools for mutations. The model is not the database. No arbitrary SQL.

## 13. GOAL COMPLETION MUST CREATE WISDOM

Do not just mark a goal completed and move on.

After a meaningful goal:
1. premium but proportional celebration
2. honest evidence status
3. short Victory Review
4. extract what worked
5. extract what failed
6. identify repeatable system/routine
7. identify people/resources that helped
8. propose one Personal Playbook lesson
9. ask: maintain / consolidate / level up / new direction?
10. next goal only after approval

Achievement should create wisdom, not only XP.

## 14. ORIGINAL GAME / ANIME / ALCHEMY LAYER

Use broad inspiration only: training arcs, transformation, mastery, alchemy, gems, trials, ascension.
Original IP only.

Possible MAINXP objects:
- Essence Gem
- Focus Shard
- Discipline Crystal
- Strategy Sigil
- Wealth Gem
- Mind Prism
- Social Ember
- Catalyst Stone
- Ascension Fragment
- Transmutation Core
- Mastery Relic
- Trial Gate
- Boss Quest

Game layer rewards real action. It never overwhelms the life-management utility.

## 15. DESIGN

Target:
70% premium consumer life app
20% sophisticated RPG
10% anime/alchemy energy

Default warm-white/light.

The current Today screen is the baseline, not the finish line.

Every major screen should inherit:
- one anchor
- one primary action
- strong type ramp
- 44px+ tap targets
- 16px mobile inputs
- restrained color
- coherent SVG icons
- no lazy emoji-as-final-icon shortcuts
- excellent loading/empty/success/error states

Use `docs/DESIGN_SCORECARD.md`.
A major screen below 90/100 is not done.

## 16. PERFORMANCE IS DESIGN

A premium product also feels fast:
- avoid unnecessary client components
- avoid avoidable N+1 queries on common pages
- index hot database paths
- prevent layout shift
- keep animations GPU-friendly
- lazy-load noncritical heavy surfaces
- do not block core actions on AI
- AI failure must not prevent completing/logging real actions
- optimistic UI only where rollback is safe

## 17. DEPENDENCIES

Do not add dependencies for decoration.
But “no new dependencies ever” is not a serious production rule.

A dependency can be added only when:
- a real capability requires it
- native push/security/observability/accessibility/image handling etc. justify it
- package health/security/license are checked
- native/build impact is understood
- simpler platform APIs are insufficient

Document why it was added.

## 18. RELEASE GATE

No major milestone ships until:
- lint
- typecheck
- unit tests
- production build
- E2E critical path where available
- authorization test for multi-user data
- duplicate-submit/idempotency test for XP/money/social mutations
- mobile 390px review
- accessibility review
- loading/empty/error/success states
- design score >= 90/100
- red-team review
- BUILD_STATUS updated

## 19. FIRST TASK AFTER READING THIS

Do not code randomly.

1. Read the current repo and BUILD_STATUS.
2. Read the design bible.
3. Inspect `/today` as the current quality baseline.
4. Verify the factual gaps in `docs/SOURCE_AUDIT.md`.
5. Produce a short ranked plan using:
   user impact × frequency × strategic moat ÷ implementation risk/cost.
6. Start with one coherent milestone.
7. Do not touch unrelated working code.

A million-dollar product is not “everything.”
It is the few right things working together exceptionally well.
