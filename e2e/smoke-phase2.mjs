import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const shots = process.env.SHOTS_DIR ?? "./shots-phase2";
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = m => { console.error("FAIL:", m); process.exitCode = 1; };
const body = () => page.textContent("body");

// signup + skip onboarding quickly
await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Glen");
await page.fill('input[name="email"]', "glen"+Date.now()+"@phase2.local");
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.click('button:has-text("C\'est parti")');
await page.waitForURL("**/today");
let b = await body();
if (!b.includes("ÉLAN")) fail("élan gauge missing from hero");
if (!b.includes("100/100")) fail("élan should start full");

// earn coins: set + complete main quest (+50c), NN (+10c +15c bonus)
await page.fill('.mxp-anchor input[name="title"]', "Boucler la présentation investisseur");
await page.getByRole("button", { name: /Définir ma quête/ }).click();
await page.waitForSelector('text=Boucler la présentation');
await page.getByRole("button", { name: "C'est fait" }).click();
await page.waitForSelector('.mxp-anchor .line-through');
await page.fill('input[placeholder*="appels de prospection"]', "Entraînement (BJJ)");
await page.click('section:has-text("Non-négociables") button:has-text("+")');
await page.waitForSelector('li:has-text("Entraînement (BJJ)")');
await page.click('li:has-text("Entraînement (BJJ)") button[aria-pressed="false"]');
await page.waitForSelector('li:has-text("Entraînement (BJJ)") button[aria-pressed="true"]');


// The add form lives behind a disclosure that stays open across revalidations.
async function openHabitForm() {
  if (!(await page.locator('input[name="title"]').isVisible().catch(() => false))) {
    await page.click("summary:has-text('Nouvelle habitude')");
  }
}

// habits: good habit ×3 taps (10, 10, 6 XP), bad habit tap → élan 97
await page.goto(`${BASE}/habits`);
await openHabitForm();
await page.fill('input[name="title"]', "Lire 10 pages");
await page.selectOption('select[name="attribute"]', "KNOWLEDGE");
await page.click('button:has-text("Créer l\'habitude")');
await page.waitForSelector('li:has-text("Lire 10 pages")');
for (let i = 1; i <= 3; i++) {
  await page.locator('button[aria-label="Marquer : Lire 10 pages"]').click();
  await page.waitForSelector(`li:has-text("Lire 10 pages") span:has-text("×${i}")`);
  await page.waitForTimeout(700);
}
await openHabitForm();
await page.fill('input[name="title"]', "Scroller au lit");
await page.click('label:has-text("À réduire")');
await page.click('button:has-text("Créer l\'habitude")');
await page.waitForSelector('li:has-text("Scroller au lit")');
await page.locator('button[aria-label="Noter un écart : Scroller au lit"]').click();
await page.waitForSelector('li:has-text("Scroller au lit") span:has-text("×1")');
await page.screenshot({ path: `${shots}/01-habits.png`, fullPage: true });
await page.goto(`${BASE}/today`);
b = await body();
if (!b.includes("97/100")) fail("élan should be 97 after one bad tap, body: " + b.slice(0, 200));
if (!b.includes("Lire 10 pages")) fail("habit quick-tap card missing on Today");
await page.screenshot({ path: `${shots}/02-today.png`, fullPage: true });

// knowledge XP check: 10+10+6 = 26
await page.goto(`${BASE}/progress`);
b = await body();
if (!b.includes("21 XP")) fail("Connaissance should be 21 XP (8+8+5 with diminishing 3rd tap)");

// gear: buy lunettes (80 coins; wallet = 50+10+15+4+4+2 = 85)
await page.goto(`${BASE}/me`);
b = await body();
if (!b.includes("Lunettes de stratège")) fail("gear catalog missing");
await page.click('li:has-text("Lunettes de stratège") button:has-text("Acheter")');
await page.waitForSelector('li:has-text("Lunettes de stratège") button:has-text("Retirer")');
b = await body();
if (!b.includes("🪙 5")) fail("coins after gear purchase should be 5");
if (!b.includes("Le Discipliné")) fail("titles section missing");
await page.screenshot({ path: `${shots}/03-me-gear.png`, fullPage: true });

// rest mode → élan shows recovery
await page.click('button[aria-label="Basculer le mode récupération"]');
await page.waitForSelector('text=Mode récupération');
await page.goto(`${BASE}/today`);
b = await body();
if (!/récupération/i.test(b)) fail("élan should show recovery state");
await page.goto(`${BASE}/me`);
await page.click('button[aria-label="Basculer le mode récupération"]');
await page.waitForSelector('button[aria-label="Basculer le mode récupération"][aria-pressed="false"]');

// weekly review: stats + save, then idempotent
await page.goto(`${BASE}/progress/week`);
b = await body();
if (!b.includes("Main Quests accomplies")) fail("weekly stats missing");
await page.fill('textarea[name="win"]', "Présentation bouclée.");
await page.fill('input[name="nextPriority"]', "3 mandats signés");
await page.click('button:has-text("Clore la semaine")');
await page.waitForURL("**/progress");
await page.goto(`${BASE}/progress/week`);
b = await body();
if (!b.includes("déjà faite")) fail("weekly review should be idempotent per week");
await page.screenshot({ path: `${shots}/04-weekly.png`, fullPage: true });

console.log(process.exitCode ? "PHASE2 SMOKE FAILED" : "PHASE2 SMOKE OK");
await browser.close();
