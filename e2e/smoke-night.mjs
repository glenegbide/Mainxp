// NIGHT suite — smart tomorrow + the two gratitude rituals.
//
// What it defends:
//   1. open tasks are CLASSIFIED at night — carry / backlog / cancel — and
//      each decision does exactly what it says in the database;
//   2. morning and night gratitude both store, in order, replacing cleanly;
//   3. the day pays gratitude XP at most once even with both rituals filled.
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const db = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ??
    readFileSync(new URL("../.env", import.meta.url), "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1],
});
await db.connect();

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const stamp = Date.now();
const email = `nuit${stamp}@e2e.local`;

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Nuit");
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

const { rows: urows } = await db.query("SELECT id FROM mainxp_users WHERE email = $1", [email]);
const userId = urows[0].id;

// ── 1. morning gratitude stores in order ──
await page.goto(`${BASE}/today/morning`);
await page.fill('input[name="gratitudeMorning_0"]', "Réveil sans réveil");
await page.fill('input[name="gratitudeMorning_1"]', "Café tranquille");
await page.getByRole("button", { name: /DÉMARRER LA JOURNÉE/i }).click();
await page.waitForURL("**/today");
const { rows: morning } = await db.query(
  `SELECT content, position FROM mainxp_gratitude_entries WHERE "userId"=$1 AND period='morning' ORDER BY position`,
  [userId]
);
if (morning.length !== 2 || morning[0].content !== "Réveil sans réveil") {
  fail("morning gratitude not stored in order: " + JSON.stringify(morning));
} else console.log("1. morning gratitude 01–10 stored in order OK");

// ── 2. three open missions to classify at night ──
for (const v of ["Garder pour demain", "Mettre au backlog", "Abandonner celle-ci"]) {
  const i = page.locator('input[placeholder*="mission utile"]');
  await i.fill(v);
  await i.press("Enter");
  await page.waitForTimeout(600);
}
const { rows: tasks } = await db.query(
  `SELECT id, title FROM mainxp_tasks WHERE "userId"=$1 AND status='OPEN' AND tier='DAILY_MISSION'`,
  [userId]
);
const byTitle = Object.fromEntries(tasks.map((t) => [t.title, t.id]));

await page.goto(`${BASE}/today/night`);
// the radios are sr-only behind styled labels — click through the label
await page.locator(`input[name="tomorrow_${byTitle["Mettre au backlog"]}"][value="backlog"]`).check({ force: true });
await page.locator(`input[name="tomorrow_${byTitle["Abandonner celle-ci"]}"][value="cancel"]`).check({ force: true });
await page.fill('input[name="gratitudeNight_0"]', "Le rendez-vous décroché");
await page.getByRole("button", { name: /Clore la journée/ }).click();
await page.waitForTimeout(2500);

// ── 3. each decision did what it said ──
const { rows: after } = await db.query(
  `SELECT title, status, tier, "dayKey" FROM mainxp_tasks WHERE "userId"=$1 AND tier IN ('DAILY_MISSION','BACKLOG')`,
  [userId]
);
const t = Object.fromEntries(after.map((r) => [r.title, r]));
if (t["Garder pour demain"]?.status !== "OPEN" || !t["Garder pour demain"]?.dayKey) {
  fail("carry did not keep the task alive for tomorrow: " + JSON.stringify(t["Garder pour demain"]));
}
if (t["Mettre au backlog"]?.tier !== "BACKLOG" || t["Mettre au backlog"]?.dayKey !== null) {
  fail("backlog did not move the task off the day: " + JSON.stringify(t["Mettre au backlog"]));
}
if (t["Abandonner celle-ci"]?.status !== "CANCELLED") {
  fail("cancel did not cancel: " + JSON.stringify(t["Abandonner celle-ci"]));
}
if (!process.exitCode) console.log("2. carry / backlog / cancel each did exactly that OK");

// ── 4. both rituals stored; exactly one gratitude payout ──
const { rows: night } = await db.query(
  `SELECT content FROM mainxp_gratitude_entries WHERE "userId"=$1 AND period='night'`,
  [userId]
);
if (night.length !== 1) fail("night gratitude not stored");
const { rows: pays } = await db.query(
  `SELECT COUNT(*)::int AS n FROM mainxp_xp_transactions WHERE "userId"=$1 AND "sourceType"='gratitude'`,
  [userId]
);
if (pays[0].n !== 1) fail(`expected exactly 1 gratitude payout, got ${pays[0].n}`);
else console.log("3. morning + night both stored, exactly ONE gratitude payout OK");

await db.end();
if (process.exitCode) console.error("NIGHT SUITE FAILED");
else console.log("ALL NIGHT CHECKS PASSED");
await browser.close();
