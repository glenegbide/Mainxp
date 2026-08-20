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
| `/today` | 92 | Character art is still a placeholder sprite (identity, criterion 10). |
| `/defis` | 88 | No skeleton of its own; challenge tick lacks the optimistic moment. |
| `/journal` | 62 | Card pile, no anchor, no type ramp, mood chips carry the screen alone. |
| `/library` | 64 | Same pile; the current book should be the anchor. |
| `/habits` | 60 | Two symmetrical lists, no anchor, `+`/`−` buttons below 44px. |
| `/progress` | 58 | Reads as an admin dashboard; no single story per week. |
| `/me` | 66 | Long settings stack; titles/gear deserve the game layer. |
| `/coach` | 74 | Good bones; needs streaming feedback + empty state that teaches. |
| morning / night | 70 | Bible order not fully applied; gratitude 01–10 ritual not built. |

## Process

Build → screenshot at 390×844 → `design-director` → `ux-behavior-expert` →
`frontend-motion-expert` → fix → re-score. Record the new score here in the
same commit as the fix.
