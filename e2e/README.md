# MAINXP E2E suites (Playwright, plain Node)

Real-browser regression tests with **exact XP/coin totals** — the ledger's
behavior is asserted through the UI, so a wiring change that alters awards
fails loudly.

| Suite | Covers | Known-good totals |
|---|---|---|
| `smoke-phase1.mjs` | signup → onboarding → quest/milestone/morning/night/rewards | 175 XP / 87 coins |
| `smoke-phase2.mjs` | habits ±, Élan, gear shop, rest mode, weekly review | élan 97, wallet 5 |
| `smoke-wave2.mjs` | Minimum Day, Comeback, Brain Dump confirm caps | 39 XP min-day |
| `smoke-integrity.mjs` | mission-cap farming, NN uncheck/recheck, duplicate submits | 50 → 0 → 50 → 183 |
| `smoke-coach.mjs` | coach conversation + memory recall (needs an AI key) | — |
| `smoke-aikey.mjs` | in-app AI key: reject bad key, save real key, coach reply | — |

## Running

Each suite signs up its own throwaway user against a running server:

```bash
npm run build && npm run start -- --port 3500   # or a dev server
node e2e/smoke-integrity.mjs
```

Environment:

- `BASE_URL` — server under test (default `http://localhost:3500`)
- `CHROMIUM_PATH` — Chromium binary (default: the CI sandbox path; locally
  point it at `npx playwright install chromium`'s binary or Chrome)
- `SHOTS_DIR` — screenshot output (default `./shots-<suite>`)
- `SMOKE_GEMINI_KEY` — required by `smoke-aikey.mjs` only (a real key: the
  suite proves the live key-validation path)

Suites use fresh unique emails per run — safe to re-run against a dev
database, not meant for production.
