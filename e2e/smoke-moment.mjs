// THE COMPLETION MOMENT — the interaction that decides whether MAINXP feels
// like an app or a web page. Locks in: optimistic check under 300ms (no
// server wait), the surprise XP revealed only after the ledger granted it,
// and — critically — that the screen actually refreshes after a mutation
// (a route-level loading.tsx silently breaks revalidatePath in Next 16.2).
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Moment");
await page.fill('input[name="email"]', `moment${Date.now()}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// A mutation must be visible without a reload (revalidation guard)
await page.fill('input[placeholder*="appels de prospection"]', "Sport 30 min");
await page.locator('form:has(input[placeholder*="appels de prospection"]) button').click();
let appeared = false;
for (let i = 0; i < 20 && !appeared; i++) {
  await page.waitForTimeout(500);
  appeared = (await page.locator("button.mxp-check").count()) > 0;
}
if (!appeared) fail("mutation not reflected without a reload (revalidatePath broken)");
else console.log("1. mutation visible without reload OK");

// Optimistic: the check turns on long before any server round-trip
const check = page.locator("button.mxp-check").first();
const t0 = Date.now();
await check.click();
let on = false;
for (let i = 0; i < 40 && !on; i++) {
  await page.waitForTimeout(25);
  on = (await page.locator("button.mxp-check.on").count()) > 0;
}
const ms = Date.now() - t0;
if (!on) fail("check never turned on");
else if (ms > 300) fail(`optimistic check took ${ms}ms — it must not wait for the server`);
else console.log(`2. optimistic check in ${ms}ms OK`);

// The reward is revealed only after the ledger granted it
let xp = null;
for (let i = 0; i < 40 && xp === null; i++) {
  await page.waitForTimeout(400);
  if (await page.locator(".mxp-xpfloat").count()) {
    xp = await page.locator(".mxp-xpfloat").first().textContent();
  }
}
if (!xp || !/^\+\d+$/.test(xp.trim())) fail(`no XP reveal after the action (got ${xp})`);
else console.log(`3. surprise XP revealed after the action: ${xp.trim()} OK`);

if (process.exitCode) console.error("MOMENT SUITE FAILED");
else console.log("ALL MOMENT CHECKS PASSED");
await browser.close();
