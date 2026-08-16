# MAINXP — Screen Map

Product served at the app root. Mobile-first; bottom nav with 5 tabs (Part 59) + global "+".

```
/                           → redirects to /today (or login)
/login               Phase 0 ✅
/signup              Phase 0 ✅ (name, email, password, timezone auto-detect)

(app shell — bottom nav: TODAY · COACH · PROGRESS · SOCIAL · ME, global "+")
/today               Phase 0/1 ✅ core — Main Quest, missions, side quests,
                            non-negotiables, WHAT NOW?, streak, level header
/today/morning       Phase 1 — Morning Start flow (state → why → standing → plan)
/today/night         Phase 1 — Night Review + tomorrow prep
/coach               Phase 1 — chat, Brain Dump; honest offline state
/progress            Phase 1 — XP, attributes, goals pace, weekly summary
/progress/goals      Phase 1 — goal list/detail (+ /goals/[id])
/progress/projects   Phase 1 — project list/detail (+ /projects/[id])
/social              Phase 4 — people, accountability, clubs (placeholder page
                            clearly labeled "coming later" until then)
/me                  Phase 0 ✅ minimal — character/level, attributes, logout
/me/north-star       Phase 1 — Why, values, season, priorities
/me/memory           Phase 1/2 — memory controls
/me/settings         Phase 1 — coach prefs, notifications, quiet hours
/focus               Phase 1 — focus timer (25/50/90/custom)

"+" quick add (Part 59): Brain Dump · Task · Goal · Habit · Expense(P3) · Journal ·
Gratitude · Workout(P3) · Reminder
```

## Design reference mapping (design pack)

- White Core template → overall shell, cards, typography (light mode default).
- Game RPG template → mechanics styling: XP bars, level header, quest cards, streak.
- Home = WHITE_REFERENCE 01 + game HOME quest/streak blocks, purple hero card.
- Colors (Part 58): warm white bg; purple = identity/progression; green = body; blue =
  knowledge/focus; gold = wealth/rewards; coral = people; teal = mind/journal; orange =
  challenge; red = urgent/Beast Mode only. Tokens: `mxp-*` in globals.css.
- Characters: original stylized pixel/illustrated art only (Part 57); Phase 0 uses a
  neutral original avatar placeholder, evolution tiers at levels 10/25/50/75/100.
