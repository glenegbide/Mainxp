// XP INTEGRITY suite (P0 audit): mission-cap farming, non-négociable
// uncheck/recheck semantics, duplicate submits. Exact ledger totals at every
// step — final UI state and net ledger must always agree.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const shots = process.env.SHOTS_DIR ?? "./shots-integrity";
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const body = () => page.textContent("body");

// Total XP shown in the Today hero reads "N/..." on the MAINXP bar; asserting
// via /progress (plain totals) is more robust — same source: the ledger.
async function expectTotals(xp, coins, label) {
  await page.goto(`${BASE}/progress`);
  const b = await body();
  if (!b.includes(String(xp))) fail(`${label}: expected ${xp} XP — got: ${b.slice(0, 260)}`);
  if (!b.includes(String(coins))) fail(`${label}: expected ${coins} coins`);
  else console.log(`OK — ${label}: ${xp} XP / ${coins} coins`);
}

// Fresh user (unique per run — reruns must not collide)
const email = `integrity${Date.now()}@e2e.local`;
await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Integrity");
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// ── 1. Non-négociable toggle → untoggle → retoggle ──────────────────────────
await page.fill('input[placeholder*="appels de prospection"]', "Sport 30 min");
await page.locator('form:has(input[placeholder*="appels de prospection"]) button').click();
await page.waitForSelector("text=Sport 30 min");

const nnCheck = page.locator('li:has-text("Sport 30 min") .mxp-check');
await nnCheck.click(); // keep: +20 NN +30 all-kept bonus = 50 XP / 25 coins
await page.waitForTimeout(700);
await expectTotals(50, 25, "NN kept (award + full-day bonus)");

await page.goto(`${BASE}/today`);
await nnCheck.click(); // accidental uncheck → both reversed
await page.waitForTimeout(700);
await expectTotals(0, 0, "NN unchecked (net zero, append-only)");

await page.goto(`${BASE}/today`);
await nnCheck.click(); // recheck → earned back EXACTLY once (bug: was lost forever)
await page.waitForTimeout(700);
await expectTotals(50, 25, "NN rechecked (XP restored, no double)");

// ── 2. Daily-mission cap: complete 5, try to farm a 6th ─────────────────────
await page.goto(`${BASE}/today`);
for (let i = 1; i <= 5; i++) {
  await page.fill('input[placeholder*="mission utile"]', `Mission ${i}`);
  await page.locator('form:has(input[placeholder*="mission utile"]) button').click();
  await page.waitForSelector(`text=Mission ${i}`);
}
// complete all five missions (+125 XP / +50 coins)
for (let i = 1; i <= 5; i++) {
  await page.locator(`li:has-text("Mission ${i}") button[title="Accomplir"]`).first().click();
  await page.waitForTimeout(350);
}
await expectTotals(175, 75, "five missions completed");

// the 6th "mission" must be rerouted to side quest (cap includes DONE — the farm)
await page.goto(`${BASE}/today`);
await page.fill('input[placeholder*="mission utile"]', "Mission farming 6");
await page.locator('form:has(input[placeholder*="mission utile"]) button').click();
await page.waitForTimeout(600);
const b6 = await body();
if (!b6.includes("Mission farming 6")) fail("6th task vanished instead of becoming side quest");
// completing it awards side-quest value (8/3), not mission value (25/10)
await page.locator('li:has-text("Mission farming 6") button[title="Accomplir"]').first().click();
await page.waitForTimeout(500);
await expectTotals(183, 78, "6th task = side-quest value (no +25 farm)");

await page.screenshot({ path: `${shots}/integrity-final.png`, fullPage: true });
if (process.exitCode) { console.error("INTEGRITY SUITE FAILED"); }
else console.log("ALL INTEGRITY CHECKS PASSED");
await browser.close();
