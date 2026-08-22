import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
mkdirSync(process.env.SHOTS_DIR ?? "./shots-aikey", { recursive: true });

const GEMINI_KEY = process.env.SMOKE_GEMINI_KEY;
if (!GEMINI_KEY) throw new Error("SMOKE_GEMINI_KEY not set");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// fresh user
await page.goto("http://localhost:3500/signup");
await page.fill('input[name="name"]', "Glen");
await page.fill('input[name="email"]', `glen${Date.now()}@aikey.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// coach must be offline with a link to settings
await page.goto("http://localhost:3500/coach");
await page.waitForSelector("text=il lui faut une voix");
await page.waitForSelector("text=Configurer ma clé IA");
console.log("1. coach offline + settings link OK");

// invalid key must be rejected by the live test
await page.goto("http://localhost:3500/me");
await page.fill('input[name="aiKey"]', "AIzaBogusKeyThatCannotWork123");
await page.getByRole("button", { name: /Tester/ }).click();
await page.waitForSelector("text=n'a pas fonctionné", { timeout: 30000 });
console.log("2. invalid key rejected OK");
await page.screenshot({ path: "shots-aikey/invalid.png" });

// real key must be verified live and saved
await page.fill('input[name="aiKey"]', GEMINI_KEY);
await page.getByRole("button", { name: /Tester/ }).click();
await page.waitForSelector("text=Coach actif", { timeout: 60000 });
await page.waitForSelector("text=Gemini (Google)");
console.log("3. real key verified + saved OK");
await page.screenshot({ path: "shots-aikey/active.png" });

// coach must now answer end-to-end with the stored key
await page.goto("http://localhost:3500/coach");
await page.waitForSelector('input[name="text"]');
await page.fill('input[name="text"]', "Dis-moi bonjour en une phrase.");
await page.click('form button.mxp-btn');
let replied = false;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1500);
  const bubbles = await page.locator("div.border.border-mxp-line").count();
  if (bubbles > 0) { replied = true; break; }
}
if (!replied) throw new Error("coach did not reply");
console.log("4. coach replied with stored key OK");
await page.screenshot({ path: "shots-aikey/coach.png" });

// remove key -> offline again
await page.goto("http://localhost:3500/me");
await page.getByRole("button", { name: /Retirer la clé/ }).click();
await page.waitForSelector('input[name="aiKey"]');
console.log("5. key removal OK");

// re-add for the screenshot state
await page.fill('input[name="aiKey"]', GEMINI_KEY);
await page.getByRole("button", { name: /Tester/ }).click();
await page.waitForSelector("text=Coach actif", { timeout: 60000 });
console.log("ALL AI-KEY SMOKE CHECKS PASSED");
await browser.close();
