import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const shots = process.env.SHOTS_DIR ?? "./shots-wave2";
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = m => { console.error("FAIL:", m); process.exitCode = 1; };
const body = () => page.textContent("body");

// signup
await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Glen");
await page.fill('input[name="email"]', "glen"+Date.now()+"@wave2.local");
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.click('button:has-text("C\'est parti")');
await page.waitForURL("**/today");

// ── Minimum Day ──
await page.click('button:has-text("Passe en journée minimum")');
await page.waitForSelector('text=Protège ces trois choses');
let b = await body();
const slots = page.locator('section:has-text("Protège ces trois choses") button[aria-pressed]');
if ((await slots.count()) !== 3) fail("expected 3 minimum slots, got " + (await slots.count()));
for (let i = 0; i < 3; i++) {
  await page.locator('section:has-text("Protège ces trois choses") button[aria-pressed="false"]').first().click();
  await page.waitForFunction(
    (n) => document.querySelectorAll('button[aria-pressed="true"]').length >= n,
    i + 1,
    { timeout: 15000 }
  );
}
await page.screenshot({ path: `${shots}/01-minimum-day.png`, fullPage: true });
await page.goto(`${BASE}/progress`);
b = await body();
// 8*3 + 15 bonus = 39 XP
if (!b.includes("39")) fail("minimum day should total 39 XP, got: " + b.slice(0, 220));
if (!b.includes("récupération réussie")) fail("recovery-day ledger entry missing");

// ── Comeback: backdate every event by 5 days, reload Today ──
execSync(`su postgres -c "psql -d mainxp_ci -c \\"UPDATE mainxp_events SET \\\\\\"createdAt\\\\\\" = \\\\\\"createdAt\\\\\\" - interval '5 days';\\""`);
await page.goto(`${BASE}/today`);
await page.waitForSelector('text=Quête de retour');
await page.screenshot({ path: `${shots}/02-comeback.png`, fullPage: true });
await page.fill('input[name="whatChanged"]', "Deux semaines de rush au bureau, sommeil en vrac.");
await page.fill('input[name="priority"]', "Relancer la prospection propriétaires");
await page.click('button:has-text("Reprendre")');
await page.waitForSelector('text=Quête de retour', { state: "detached", timeout: 20000 });
await page.goto(`${BASE}/progress`);
b = await body();
if (!b.includes("de retour dans l'arène")) fail("comeback ledger entry missing");

// ── Brain Dump: honest offline state without key ──
await page.goto(`${BASE}/dump`);
b = await body();
if (!b.includes("Vide-tête hors ligne")) fail("dump should be honestly offline without API key");
await page.screenshot({ path: `${shots}/03-dump-offline.png`, fullPage: true });

console.log(process.exitCode ? "WAVE2 SMOKE FAILED" : "WAVE2 SMOKE OK");
await browser.close();
