# MAINXP — Project System

A **project** is an engine that moves a goal; a **task** is a single action.

Example — Goal: earn CHF 20K/month. Projects: owner-prospecting system, referral
campaign, lead reactivation, closing system.

## Fields (implemented on MxProject)

title, desiredOutcome, why, goalId, priority, deadline,
status (IDEA | PLANNING | ACTIVE | WAITING | BLOCKED | AT_RISK | PAUSED | COMPLETED |
CANCELLED), progress (0–100, derived from milestones when present),
nextAction (denormalized pointer — every active project must name its next action),
blockers, createdAt, completedAt.
Related: `MxMilestone[]` (ordered), `MxTask[]`.
Budget/people/documents/risks fields arrive with their phases (finance, people, files).

## AI project planning (Part 8)

The coach can draft a project from conversation: desired outcome, why, 3–6 milestones,
and the immediate next action only. It must NOT generate 60 tasks up front. Tasks are
created just-in-time as milestones activate.

## Anti-drift hooks (Part 10)

- More than 3 ACTIVE projects → coach suggests pausing (season-aware).
- A project whose next action is postponed repeatedly → blocker conversation
  (too large / unclear / fear / no time / low energy / waiting / no longer important).
- Status AT_RISK is set by the goal-risk job, never silently.

## XP

Milestone completed: sourceType `milestone`, STRATEGY XP. Project completed: larger
award scaled by duration and linked-goal priority. All through the ledger.
