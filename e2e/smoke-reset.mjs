// RESET suite — drift → named → new state → one action, under a minute.
//
// The contract:
//   1. a pattern named on /me/identite (old self → new self) exists to be
//      offered at the exact moment of drift;
//   2. morning frequencies (≤3 states) save and are worn on Today;
//   3. the Reset flow completes in three taps + one submit, pays once,
//      and lands back on Today with the confirmation;
//   4. the recovery line appears on /progress («N resets… retour à
//      l'action»), measuring return — never perfection.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const stamp = Date.now();

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Retour");
await page.fill('input[name="email"]', `retour${stamp}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// ── 1. Name a pattern on Identité ──
await page.goto(`${BASE}/me/identite`);
await page.fill('input[name="fromLabel"]', "Rareté");
await page.fill('input[name="toLabel"]', "Abondance");
await page.fill('input[name="trigger"]', "Manque d'argent");
await page.fill('input[name="newResponse"]', `Un appel qui crée une opportunité ${stamp}`);
await page.getByRole("button", { name: "Nommer ce pattern" }).click();
await page.waitForTimeout(1000);
await page.reload();
let main = await page.textContent("main");
if (!main.includes("Rareté") || !main.includes("Abondance")) fail("the pattern was not named");
else console.log("1. the old self is named, armed with a new response OK");

// ── 2. Morning frequencies ──
await page.goto(`${BASE}/today/morning`);
await page.locator('input[name="frequency"][value="abondance"]').check({ force: true });
await page.locator('input[name="frequency"][value="focus"]').check({ force: true });
await page.getByRole("button", { name: /DÉMARRER LA JOURNÉE/ }).click();
await page.waitForURL("**/today");
await page.waitForTimeout(600);
main = await page.textContent("main");
if (!main.includes("Tu opères depuis : Abondance · Focus")) {
  fail("the chosen states are not worn on Today");
} else console.log("2. the morning states are worn on Today OK");

// ── 3. The Reset: three taps and a submit ──
await page.getByRole("link", { name: /Reset, 60 secondes/ }).click();
await page.waitForURL("**/reset");
await page.getByRole("button", { name: "Manque" }).click();
main = await page.textContent("main");
if (!main.includes("Rareté → Abondance")) fail("the named pattern is not offered mid-drift");
else console.log("3. the drift offers the named pattern OK");
await page.getByRole("button", { name: "Abondance", exact: true }).click();
await page.getByRole("button", { name: /Un appel qui crée une opportunité/ }).click();
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today?reset=ok");
main = await page.textContent("main");
if (!main.includes("Reset fait")) fail("no confirmation after the reset");
else console.log("   three taps, one submit, back to the day OK");

// ── 4. Recovery is measured on /progress ──
await page.goto(`${BASE}/progress`);
main = await page.textContent("main");
if (!main.includes("Récupération : 1 reset")) fail("the recovery line is missing on /progress");
else console.log("4. recovery is measured — return, not perfection OK");

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log("RESET SUITE OK");
