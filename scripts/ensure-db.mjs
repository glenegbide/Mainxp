import "dotenv/config";
// Applies pending migrations at build time when a database is configured.
// Uses DIRECT_DATABASE_URL when present (Neon: non-pooled) via prisma.config.ts.
// Rule (CLAUDE.md): production tables change ONLY through migration history.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL && !process.env.DIRECT_DATABASE_URL) {
  console.log("ensure-db: no database configured — skipping prisma migrate deploy.");
  process.exit(0);
}
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
