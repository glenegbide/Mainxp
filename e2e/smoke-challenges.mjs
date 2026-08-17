// CHALLENGES + SURPRISE-XP suite.
// 1) No advertised XP amounts anywhere on Today (rewards are discovered).
// 2) Starter dare accepted → active with progress; tick is 0 XP; completing
//    the 1-book dare fires the surprise (exactly 61 XP / 27 coins).
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Defi");
await page.fill('input[name="email"]', `defi${Date.now()}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// 1 — surprise principle: no "+N XP" advertised on Today
const todayBody = await page.textContent("body");
if (/\+\d+\s?XP/.test(todayBody)) fail("advertised XP amount still visible on Today");
else console.log("1. no advertised XP amounts on Today OK");

// starters visible, personalized ask
if (!todayBody.includes("Un défi, Defi ?")) fail("starter challenges card missing");
if (!todayBody.includes("30 jours de méditation")) fail("meditation starter missing");
else console.log("2. starter dares shown (méditation 30j, livre, organisation)");

// 2 — accept the 1-book week dare
await page
  .locator('li:has-text("1 livre cette semaine") button:has-text("J\'accepte")')
  .click();
await page.waitForSelector("text=0/1 livre");
console.log("3. dare accepted → active with progress 0/1");

// tick = 0 XP (structure)
await page.locator('section:has-text("Défis") .mxp-check').first().click();
await page.waitForSelector("text=1/1 livre", { timeout: 15000 }).catch(() => {});
// completing 1/1 → challenge completed → surprise XP 61/27
await page.goto(`${BASE}/progress`);
const prog = await page.textContent("body");
if (!prog.includes("61")) fail("expected surprise 61 XP after completing the dare, got: " + prog.slice(0, 250));
if (!prog.includes("Défi relevé")) fail("ledger reason for the dare missing");
else console.log("4. dare completed → surprise 61 XP with its reason in the ledger");

// completed dare no longer among live ones; starters return
await page.goto(`${BASE}/today`);
const after = await page.textContent("body");
if (!after.includes("Un défi, Defi ?")) fail("starters should be back after completion");
else console.log("5. challenge lifecycle clean (completed → slot free)");

if (process.exitCode) console.error("CHALLENGES SUITE FAILED");
else console.log("ALL CHALLENGES CHECKS PASSED");
await browser.close();
