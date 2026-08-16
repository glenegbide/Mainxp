# MAINXP

**An AI life operating system wrapped inside a real-life RPG.**

Your life is the Main Quest. You start at zero. You do not pick your character —
your actions build your character.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL.

---

## Run locally

```bash
npm install
cp .env.example .env        # then fill in the values
npx prisma db push          # create the database tables
npm run dev                 # http://localhost:3000
```

Sign up at `/signup` — every player starts at Level 1 · Novice · 0 XP.

## Checks

```bash
npm run lint
npm test                    # vitest unit tests (XP curve, timezones, goal pace)
npx tsc --noEmit
npm run build
```

## Documentation

The product and engineering plan lives in [`docs/`](docs/):
PRODUCT_REQUIREMENTS, ARCHITECTURE, DATABASE_SCHEMA, XP_SYSTEM, GOAL_SYSTEM,
PROJECT_SYSTEM, COACH_SYSTEM, AI_ARCHITECTURE, MEMORY_SYSTEM, FINANCE_SYSTEM,
NOTIFICATION_SYSTEM, PRIVACY_SECURITY, SCREEN_MAP, ROADMAP, TEST_PLAN, and the
live [BUILD_STATUS](docs/BUILD_STATUS.md).

## Environment variables

See `.env.example`. The AI coach activates only when `MAINXP_ANTHROPIC_API_KEY`
is set (server-side only — nothing is faked without it).
