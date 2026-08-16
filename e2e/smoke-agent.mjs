// COACH AGENT suite: the coach reads state and ACTS through validated tools.
// Needs SMOKE_GEMINI_KEY (a real key) — proves the full loop live: user asks
// in chat → model calls create_task → task exists on /today.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const KEY = process.env.SMOKE_GEMINI_KEY;
if (!KEY) throw new Error("SMOKE_GEMINI_KEY not set");

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };

// fresh user + in-app AI key
await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Agent");
await page.fill('input[name="email"]', `agent${Date.now()}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");
await page.goto(`${BASE}/me`);
await page.fill('input[name="aiKey"]', KEY);
await page.getByRole("button", { name: /Tester/ }).click();
await page.waitForSelector("text=Coach actif", { timeout: 60000 });
console.log("1. key active");

// chat: ask the coach to CREATE a mission (tool mutation)
await page.goto(`${BASE}/coach`);
await page.fill('input[name="text"]', "Ajoute une mission pour aujourd'hui : Appeler le notaire Dupont");
await page.click("form button.mxp-btn");
let replied = false;
for (let i = 0; i < 60 && !replied; i++) {
  await page.waitForTimeout(1500);
  replied = (await page.locator("div.border.border-mxp-line").count()) > 0;
}
if (!replied) fail("coach did not reply to the create request");
else console.log("2. coach replied");

// the mission must actually exist on /today
await page.goto(`${BASE}/today`);
const body = await page.textContent("body");
if (!body.includes("notaire Dupont")) fail("mission not created by the coach tool");
else console.log("3. mission created via tool — visible on /today");

if (process.exitCode) console.error("AGENT SUITE FAILED");
else console.log("ALL AGENT CHECKS PASSED");
await browser.close();
