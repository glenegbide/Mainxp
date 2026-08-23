# MAINXP — ASSET POLICY

The rule that makes MAINXP look expensive:
**One art style. One icon family. One character system. One gem system.**
Thirty beautiful packs that don't match are worth less than one coherent hand.

## Never

- Random graphics from Google, Pinterest, Reddit, or screenshots.
- Anything from Dragon Ball, Pokémon, LEGO, Fullmetal Alchemist, Solo
  Leveling or any other franchise — characters, UI, symbols, costumes,
  terminology, assets. No exceptions, including "just as a placeholder".
- Emoji as final production icons (a text symbol may stay only when it is
  semantically intentional and reviewed).
- Quoting copyrighted books. Ideas are free; sentences are not.

## Preference order

1. **Original MAINXP graphics** — the Block Hero
   (`src/app/components/BlockHero.tsx`), the icon family
   (`src/app/components/icons.tsx`), CSS surfaces in `globals.css`.
   This is the default and the identity.
2. **CC0 assets, heavily customized** — Kenney (kenney.nl/assets) is the
   safest source: CC0, commercial use, no attribution required.
3. **Properly licensed commercial packs** — itch.io game assets; the license
   of EVERY individual pack must be checked (creators use different terms).
   Useful searches: RPG UI · fantasy icons · gems · inventory icons · pixel
   effects · quest UI · achievement icons · magic effects · block character.
   These are building materials, never the final MAINXP identity.
4. **Generated original assets** following the one MAINXP art bible
   (`docs/VISUAL_SYSTEM` notes in the world-class pack + DESIGN_BIBLE).

## Ledger

Every external asset must record its source and license HERE before shipping.

| Asset | Source | License | Where used |
|---|---|---|---|
| Block Hero + all `Icon*` SVGs | original, hand-coded | MAINXP own IP | app-wide |
| Unbounded (font) | Google Fonts | OFL 1.1 | display face |
| Geist (font) | Vercel | OFL 1.1 | body face |

## Words are assets too

- Daily-wisdom QUOTES come only from public-domain works, attributed with
  author, title, year (`src/lib/mainxp/wisdom.ts`). Florence Scovel Shinn,
  *The Game of Life and How to Play It* (1925): public domain; our own
  French translations.
- Copyrighted books (e.g. *Way of the Peaceful Warrior*, Dan Millman) may
  inspire CONCEPTS expressed entirely in our own words, honestly labeled
  («&nbsp;d'après un principe…&nbsp;»), never quoted or paraphrased closely.
