---
name: mainxp-design
description: The MAINXP visual language — design tokens, mxp-* component classes, typography rules, and the process for evolving the look without breaking it. Use whenever you touch any MAINXP UI: building a screen, styling a component, changing fonts or colors, or when the user says the design "feels off", asks for polish, or wants inspiration from other apps.
---

# MAINXP design

The identity in one line: **~70% premium app, ~20% game, ~10% manga energy** —
light, warm, purple. It must feel like a serious life tool that happens to be
a game, never a toy. Source of truth is `src/app/globals.css` (tokens +
components) and `src/app/layout.tsx` (fonts, shell). When this skill and the
code disagree, the code wins — then update this skill.

## Tokens (never hardcode colors)

All colors are CSS variables in `:root`, mirrored into Tailwind via
`@theme inline` (so `bg-mxp-purple`, `text-mxp-muted`, `border-mxp-line` work).
Each accent has a *meaning* — use the color of the life area, not the color you
like:

| Token | Means |
|---|---|
| `--mxp-purple` #7c3aed | MAINXP identity, progression, XP |
| `--mxp-green` | body / health / success states |
| `--mxp-blue` | knowledge / clarity / focus |
| `--mxp-gold` | wealth / rewards / achievements |
| `--mxp-coral` | people / community |
| `--mxp-teal` | mind / journal / reflection |
| `--mxp-orange` | challenge / momentum / alerts |
| `--mxp-red` | urgent only (Beast Mode) — never decorative |

Neutrals: `--mxp-bg` (warm near-white #faf9f7), `--mxp-card` (white),
`--mxp-ink`, `--mxp-muted`, `--mxp-line`. Dark mode does not exist yet — do
not half-add it.

## Typography

Two faces, strict roles (`layout.tsx`):

- **Unbounded** (`--font-display`, weights 500/600/700) — identity moments
  only: wordmark, `h1`, `.font-displaymx`, big numerals. It is wide and loud,
  so headings stay small (h1 is 1.15rem) — presence comes from the letterforms,
  not the size. Never set body copy in it.
- **Geist** (`--font-geist`) — everything you read. Numbers that align
  (XP, coins, totals) get `tabular-nums`.

Section headers are not headings: use `.mxp-label` (10.5px uppercase, tracked)
with a `text-mxp-*` accent matching the section's meaning.

## Component classes (use these, don't reinvent)

- **Cards**: `.mxp-card` (20px radius, warm shadow). Emphasis variants stack on
  top: `.mxp-quest` (purple ring — the Main Quest only), `.mxp-bluec` (focus),
  `.mxp-alert` (orange edge), `.mxp-goldc` (rewards). One emphasized card per
  screen region — if everything glows, nothing does.
- **Buttons**: `.mxp-btn` (purple gradient, the default action) + color
  variants `-teal/-blue/-gold/-orange/-green` for area-specific actions;
  `.mxp-btn-ghost` for secondary; `.mxp-quiet` for actions that should
  whisper (minimum day). Never style a `<button>` as `.mxp-input`.
- **Inputs**: `.mxp-input` (purple focus ring built in).
- **Progress**: `.mxp-xpbar` (hero XP, travelling shine) and `.mxp-rail`
  (everything else) — both animate width, fill is an `<i>` element.
- **Small parts**: `.mxp-check` (tap circle, green when `.on`), `.mxp-chip`
  (pill badge), `.mxp-dot` (attribute bullet), `.mxp-label` (section header).
- **Hero**: `.mxp-hero` — the purple gradient header with aurora + pixel-grid
  texture. There is exactly one hero, on Today. Don't spawn more.
- **Shell**: pages live inside the `max-w-md` `.mxp-shell` column — design for
  390px-wide mobile first; wider is a bonus, not a target.

The pixel avatar (`src/app/components/PixelHero.tsx`) is the 10% manga: it
earns gear visually (headband lvl 10, cape lvl 25). Keep pixel art *contained*
(avatar, hero texture, icons) — the chrome around it stays premium and clean.

## Motion & feel

Micro-interactions are the game feel: `:active { scale(0.97) }` on buttons,
check pop, width transitions with the `cubic-bezier(0.22,0.61,0.36,1)` ease,
XP shine. Keep them under ~600ms, springy, and always honor the existing
`prefers-reduced-motion` block. No confetti walls, no blocking animations —
the user should close the app fast (the product's own success metric).

## Voice on screen

French first, tutoiement, no-shame: states are honest but never scolding
("Ta Main Quest n'a pas bougé" — a fact plus the highest-impact next action,
not guilt). Empty states say what to do next. XP amounts are shown before the
action (`+100 XP` chip), not as a surprise after.

## Evolving the design (the "feels off" workflow)

1. **Name the offness** before touching CSS: contrast? hierarchy (too many
   things shouting)? typography? spacing rhythm? Screenshot first
   (Playwright at 390×844) and look.
2. **Steal proportions, not skins**: reference the craft of premium consumer
   apps (Linear, Vercel, Arc) for chrome, and game UIs (Habitica's warmth,
   Duolingo's feedback loops) for reward moments — concepts only, no code or
   assets from GPL/proprietary sources, original IP only (no existing manga/
   game characters).
3. **Change tokens/classes, not call sites**: fix it once in `globals.css`;
   sweep call sites only when a class's *role* changes.
4. **Verify visually**: rebuild, screenshot login + today + one content page,
   compare before/after side by side. Then run the `mainxp-verify` skill —
   design passes must not change XP totals or behavior.
5. **Fonts**: swap only via `next/font/google` in `layout.tsx`, keep the
   variable names (`--font-display`, `--font-geist`), and re-tune h1
   size/tracking to the new face's width. Subset to what's used.
