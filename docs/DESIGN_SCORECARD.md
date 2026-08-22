# MAINXP — DESIGN SCORECARD

The release gate for any major screen (`docs/MASTER_1M_PROMPT.md` §15, §18).
**A major screen below 90/100 is not done.** Score honestly; a screen that
"works" routinely scores 60.

Ten criteria, 10 points each.

| # | Criterion | What full marks look like |
|---|---|---|
| 1 | **Purpose** | One dominant purpose. Answers *where am I / what matters here* in 2s. |
| 2 | **Anchor** | Exactly ONE dominant visual object. Nothing else competes on size or elevation. |
| 3 | **Primary action** | One obvious primary action; the only filled button above the fold. |
| 4 | **Type hierarchy** | Real ramp (`.mxp-display/.mxp-title/.mxp-body/.mxp-meta`). Nothing lives between 10–14px only. |
| 5 | **Restraint** | One accent carries the screen. No identical-card pile. 30% could not be removed without loss. |
| 6 | **Iconography** | Coherent stroke SVGs. Zero emoji as final icons. |
| 7 | **States** | Loading skeleton (shape-accurate), empty state that teaches the first action, success feedback, error with recovery. |
| 8 | **Motion** | Communicates state, never decoration. Optimistic where rollback is safe. Reduced-motion keeps the feedback. |
| 9 | **Ergonomics** | 44px+ targets, 16px inputs, thumb-reachable primary action, real accessible names. |
| 10 | **MAINXP identity** | Unmistakably this product: earned progression, no shame, no advertised XP, French-first, warm light. |

## Current scores

| Screen | Score | Blocking gaps |
|---|---|---|
| `/today` | 94 | Block Hero landed; density pass done. |
| `/defis` | 88 | No skeleton of its own; challenge tick lacks the optimistic moment. |
| `/journal` | 90 | Blank page is the anchor; timeline is chrome-less. Calendar/history later. |
| `/library` | 89 | Current book is the anchor. Cover art and reading pace still missing. |
| `/habits` | 90 | Anchored on today's tally with live taps; character evolution still to come. |
| `/progress` | 91 | One weekly story + 7-day chart + the path forming; ledger folded away. |
| `/me` | 90 | Rebuilt: character stage anchor, path + titles, relic chips, quiet settings rows. Next: relic art per title. |
| `/coach` | 88 | Standing-position brief (visible facts) + teaching empty state + honest pending state. Missing: streaming. |
| morning / night | 88 | Gratitude 01–10 (sunrise/moon), smart-tomorrow classification. Next: full bible order pass on morning. |
| `/focus` | 89 | Training Arena: ring chamber + Block Hero; game energy concentrated here. |

## Process

Build → screenshot at 390×844 → `design-director` → `ux-behavior-expert` →
`frontend-motion-expert` → fix → re-score. Record the new score here in the
same commit as the fix.
