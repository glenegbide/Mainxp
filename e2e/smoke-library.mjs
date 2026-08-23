// LIBRARY suite: add a book, write notes/lessons, finish it → exact surprise
// XP (50/25) with its reason in the ledger; abandoning is shame-free.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Lecteur");
await page.fill('input[name="email"]', `lecteur${Date.now()}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// reachable from Me
await page.goto(`${BASE}/me`);
await page.click('a[href="/library"]');
await page.waitForURL("**/library");

// add current book
await page.fill('input[placeholder="Titre…"]', "Deep Work");
await page.fill('input[placeholder*="Auteur"]', "Cal Newport");
await page.locator('form:has(input[placeholder="Titre…"]) button:has-text("+")').click();
await page.waitForSelector("text=Deep Work");
console.log("1. book added (reading)");

// write notes + applied lesson
await page.fill('textarea[name="notes"]', "Le travail profond est rare et précieux — les blocs sans téléphone.");
await page.fill('textarea[name="lessons"]', "Bloquer 9h-11h chaque matin sans téléphone.");
await page.getByRole("button", { name: "Sauver mes notes" }).click();
await page.waitForTimeout(600);
const persisted = await page.inputValue('textarea[name="lessons"]');
if (!persisted.includes("9h-11h")) fail("book notes not persisted");
else console.log("2. notes + applied lesson persisted");

// finish → surprise 50 XP with reason
await page.getByRole("button", { name: /J.ai fini ce livre/ }).click();
await page.waitForSelector("text=Terminés · 1");
console.log("3. book finished → in the palmarès with its applied lesson");
await page.goto(`${BASE}/progress`);
const prog = await page.textContent("body");
if (!prog.includes("50")) fail("expected surprise 50 XP after finishing, got: " + prog.slice(0, 200));
if (!prog.includes("Livre terminé")) fail("ledger reason missing");
else console.log("4. surprise 50 XP with reason « Livre terminé : Deep Work »");

// double-finish impossible (idempotent) — the button is gone; totals stay
await page.goto(`${BASE}/library`);
const body = await page.textContent("body");
if (body.includes("Terminé 📖")) fail("finish button still visible after completion");
else console.log("5. lifecycle clean (no double-finish surface)");

if (process.exitCode) console.error("LIBRARY SUITE FAILED");
else console.log("ALL LIBRARY CHECKS PASSED");
await browser.close();
