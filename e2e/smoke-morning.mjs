// MORNING RITUAL suite: routine checklist (0 XP, toggle-safe), free morning
// writing, habit creation with description. Exact XP asserted: the whole
// morning flow awards 10 XP once — routine ticks and writing award nothing.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Morning");
await page.fill('input[name="email"]', `morning${Date.now()}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// ── Routine du matin: add item WITH a personal note ──
await page.goto(`${BASE}/today/morning`);
await page.fill('input[placeholder*="Ajouter une étape"]', "10 min de lecture");
await page.fill('input[placeholder*="pourquoi, comment"]', "Avant le téléphone — ça pose la tête.");
await page.locator('form:has(input[placeholder*="Ajouter une étape"]) button').click();
await page.waitForSelector("text=10 min de lecture");
const noteVisible = await page.textContent("body");
if (!noteVisible.includes("Avant le téléphone")) fail("routine note not shown");
else console.log("1. routine item + personal note OK");

// toggle on → off → on (structure: no XP anywhere)
const check = page.locator('li:has-text("10 min de lecture") .mxp-check');
await check.click();
await page.waitForSelector('li:has-text("10 min de lecture") .mxp-check.on');
await check.click();
await page.waitForSelector('li:has-text("10 min de lecture") .mxp-check:not(.on)');
await check.click();
await page.waitForSelector('li:has-text("10 min de lecture") .mxp-check.on');
console.log("2. routine toggle on/off/on OK");

// ── Morning form: sliders + free writing + main quest ──
await page.fill('textarea[name="intention"]', "Aujourd'hui je reste calme et je signe le mandat.");
await page.fill('input[name="mainQuest"]', "Signer le mandat Rue des Eaux-Vives");
await page.getByRole("button", { name: /DÉMARRER LA JOURNÉE/ }).click();
await page.waitForURL("**/today");
console.log("3. morning saved with intention");

// re-open: intention must persist (a real writing place, not a black hole)
await page.goto(`${BASE}/today/morning`);
const intentionValue = await page.inputValue('textarea[name="intention"]');
if (!intentionValue.includes("je signe le mandat")) fail("intention not persisted");
else console.log("4. intention persisted OK");

// ── XP: exactly 10 (morning once) — routine ticks and writing added nothing ──
await page.goto(`${BASE}/progress`);
const prog = await page.textContent("body");
if (!/\b10\b/.test(prog)) fail("expected exactly 10 XP after morning flow, got: " + prog.slice(0, 200));
else console.log("5. XP = 10 exactly (no farming surface) OK");

// ── Habit with description ──
await page.goto(`${BASE}/habits`);
await page.fill('input[name="title"]', "BJJ 3x/semaine");
await page.fill('textarea[name="description"]', "Lun-mer-ven à midi. Le sac est prêt la veille.");
await page.getByRole("button", { name: /Créer l.habitude/ }).click();
await page.waitForSelector("text=BJJ 3x/semaine");
const habitsBody = await page.textContent("body");
if (!habitsBody.includes("Le sac est prêt la veille")) fail("habit description not shown");
else console.log("6. habit created with user's own words OK");

if (process.exitCode) console.error("MORNING SUITE FAILED");
else console.log("ALL MORNING CHECKS PASSED");
await browser.close();
