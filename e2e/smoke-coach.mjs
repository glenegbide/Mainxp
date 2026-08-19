import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
mkdirSync(process.env.SHOTS_DIR ?? "./shots-coach", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const fail = m => { console.error("FAIL:", m); process.exitCode = 1; };

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Glen");
await page.fill('input[name="email"]', "glen"+Date.now()+"@coach.local");
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.fill('input[name="occupation"]', "Agent immobilier indépendant");
await page.fill('textarea[name="why"]', "La liberté financière pour ma famille.");
await page.click('text=Saison Revenus');
await page.click('button:has-text("C\'est parti")');
await page.waitForURL("**/today");
await page.fill('.mxp-anchor input[name="title"]', "Signer le mandat Berger");
await page.getByRole("button", { name: /Définir ma quête/ }).click();
await page.waitForSelector('text=Signer le mandat Berger');

// Coach message 1: state a priority (goes into DB conversation history)
await page.goto(`${BASE}/coach`);
let b = await page.textContent("body");
if (b.includes("hors ligne")) fail("coach should be ONLINE with Gemini key");
await page.fill('input[name="text"]', "Ma priorité absolue cette semaine est le dossier Berger, à cause d'une clause de délai.");
await page.click('form button:has-text("→")');
const bubbles = page.locator("div.whitespace-pre-wrap");
for (let i = 0; i < 90 && (await bubbles.count()) < 2; i++) await page.waitForTimeout(1000);
if ((await bubbles.count()) < 2) fail("no assistant reply after message 1");

await page.waitForTimeout(25000); // free-tier RPM pacing
// Coach message 2: memory recall — the answer must come from OUR stored history
await page.fill('input[name="text"]', "Rappelle-moi quelle est ma priorité de la semaine et pourquoi ?");
await page.click('form button:has-text("→")');
for (let i = 0; i < 90 && (await bubbles.count()) < 4; i++) await page.waitForTimeout(1000);
if ((await bubbles.count()) < 4) fail("no assistant reply after message 2");
await page.waitForTimeout(300);
b = await page.textContent("body");
if (!/[Bb]erger/.test(b.split("Rappelle-moi")[1] ?? "")) fail("coach reply should recall 'Berger' from stored history");
await page.screenshot({ path: "shots-coach/coach-gemini.png", fullPage: true });

await page.waitForTimeout(25000); // free-tier RPM pacing
// Brain Dump with real AI
await page.goto(`${BASE}/dump`);
await page.fill('textarea[name="text"]', "45 francs de parking, appeler Paul demain matin, idée: club de course le dimanche, et je suis stressé par le loyer du bureau.");
await page.click('button:has-text("Trier tout ça")');
await page.waitForSelector('text=TOUT CONFIRMER', { timeout: 90000 });
await page.screenshot({ path: "shots-coach/dump-gemini.png", fullPage: true });
await page.click('button:has-text("TOUT CONFIRMER")');
await page.waitForURL("**/today");
b = await page.textContent("body");
if (!/[Pp]aul/.test(b) && !/parking/i.test(b)) console.log("note: dump items scheduled (some for tomorrow)");

console.log(process.exitCode ? "COACH SMOKE FAILED" : "COACH SMOKE OK — Gemini + DB memory");
await browser.close();
