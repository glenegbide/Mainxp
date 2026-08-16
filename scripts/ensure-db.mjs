// Creates/updates the database schema at build time when DATABASE_URL is set.
// Lets a Vercel deploy work end-to-end with zero manual migration steps.
// Once real user data exists, switch to `prisma migrate` (docs/DATABASE_SCHEMA.md).
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("ensure-db: DATABASE_URL not set — skipping prisma db push.");
  process.exit(0);
}
const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
