// JOURNAL + EVENING FEEDBACK suite. Journal: moods, persistence, exact
// diminishing XP (10, 10, 6 → 26 total). Evening feedback (needs
// SMOKE_GEMINI_KEY): the coach answers the user's own account of their day
// in the chat.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const KEY = process.env.SMOKE_GEMINI_KEY; // optional — feedback leg skipped without

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Journal");
await page.fill('input[name="email"]', `journal${Date.now()}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// journal reachable from Today
await page.click('a[href="/journal"]');
await page.waitForURL("**/journal");

// entry 1 — mood "dur" (+10)
await page.click('label:has-text("😣 Dur")');
await page.fill('textarea[name="content"]', "Journée compliquée, le vendeur de Champel hésite encore.");
await page.getByRole("button", { name: "Écrire" }).click();
await page.waitForSelector("text=le vendeur de Champel");
// entry 2 (+10)
await page.fill('textarea[name="content"]', "Mais deux nouveaux contacts au téléphone, ça avance.");
await page.getByRole("button", { name: "Écrire" }).click();
await page.waitForSelector("text=deux nouveaux contacts");
// entry 3 (+6, diminishing)
await page.fill('textarea[name="content"]', "Troisième note du jour.");
await page.getByRole("button", { name: "Écrire" }).click();
await page.waitForSelector("text=Troisième note");
console.log("1. three entries written, mood chip OK");

await page.goto(`${BASE}/progress`);
const prog = await page.textContent("body");
if (!prog.includes("26")) fail("expected exactly 26 XP (10+10+6 diminishing), got: " + prog.slice(0, 200));
else console.log("2. journal XP diminishing exact: 26");

// ── Evening feedback (live AI) ──
if (!KEY) {
  console.log("3-5. skipped (no SMOKE_GEMINI_KEY)");
} else {
  await page.goto(`${BASE}/me`);
  await page.fill('input[name="aiKey"]', KEY);
  await page.getByRole("button", { name: /Tester/ }).click();
  await page.waitForSelector("text=Coach actif", { timeout: 60000 });
  console.log("3. key active");

  await page.goto(`${BASE}/today/night`);
  await page.fill('textarea[name="wentWell"]', "J'ai tenu mes 5 appels de prospection et le RDV de Champel s'est bien passé.");
  await page.fill('textarea[name="missedWhy"]', "Pas touché au dossier de financement — trop d'interruptions l'après-midi.");
  await page.fill('textarea[name="lesson"]', "Bloquer les après-midis sans téléphone.");
  await page.fill('input[name="tomorrowBigThing"]', "Finir le dossier de financement avant midi");
  await page.click('button:has-text("Clore la journée")');
  await page.waitForURL("**/coach", { timeout: 90000 });
  console.log("4. night review redirected to coach (feedback generated)");

  await page.waitForSelector("text=Feedback du soir");
  const feedback = await page.locator("div.border.border-mxp-line").last().textContent();
  if (feedback.length < 100) fail("feedback too short: " + feedback);
  else console.log(`5. evening feedback live (${feedback.length} chars):\n` + feedback.slice(0, 300));
}

if (process.exitCode) console.error("JOURNAL SUITE FAILED");
else console.log("ALL JOURNAL CHECKS PASSED");
await browser.close();
