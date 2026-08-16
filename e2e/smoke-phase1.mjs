import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const shots = process.env.SHOTS_DIR ?? "./shots-phase1";
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const body = () => page.textContent("body");

// 1. Signup → lands on GET TO KNOW ME onboarding
await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Glen");
await page.fill('input[name="email"]', "glen@phase1.local");
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.fill('input[name="occupation"]', "Agent immobilier indépendant");
await page.fill('textarea[name="why"]', "La liberté financière pour ma famille.");
await page.click('text=Saison Revenus');
await page.fill('input[name="mission90"]', "Signer 6 mandats exclusifs");
await page.click('text=Exigeant');
await page.screenshot({ path: `${shots}/01-onboarding.png`, fullPage: true });
await page.click('button:has-text("C\'est parti")');
await page.waitForURL("**/today");
let b = await body();
if (b.includes("Apprends à me connaître")) fail("onboarding banner still visible after bio_done");

// 2. Goal with pace
await page.goto(`${BASE}/goals`);
await page.fill('input[name="title"]', "Gagner CHF 20K/mois");
await page.fill('input[name="targetValue"]', "20000");
await page.fill('input[name="unit"]', "CHF");
const deadline = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
await page.fill('input[name="deadline"]', deadline);
await page.click('button:has-text("Créer l\'objectif")');
await page.waitForURL("**/goals/**");
await page.fill('input[name="value"]', "3000");
await page.click('button:has-text("Ajouter")');
await page.waitForSelector('text=3000/20000');
b = await body();
if (!b.includes("Rythme")) fail("pace card missing on goal detail");
await page.screenshot({ path: `${shots}/02-goal.png`, fullPage: true });

// 3. Project + milestone → +40 XP STRATEGY
await page.goto(`${BASE}/projects`);
await page.fill('input[name="title"]', "Système de prospection propriétaires");
await page.fill('input[name="nextAction"]', "Lister 20 immeubles cibles");
await page.selectOption('select[name="goalId"]', { index: 1 });
await page.click('button:has-text("Créer le projet")');
await page.waitForURL("**/projects/**");
await page.fill('input[placeholder="Ajouter un jalon…"]', "Base de 100 propriétaires");
await page.click('form:has(input[placeholder="Ajouter un jalon…"]) button');
await page.waitForSelector('li:has-text("Base de 100 propriétaires")');
await page.click('li:has-text("Base de 100 propriétaires") button');
await page.waitForSelector('li:has-text("Base de 100 propriétaires") button[aria-pressed="true"]');
b = await body();
if (!b.includes("100%")) fail("project progress not updated from milestone");
await page.screenshot({ path: `${shots}/03-project.png`, fullPage: true });

// 4. Morning Start: sets Main Quest, awards morning XP once
await page.goto(`${BASE}/today/morning`);
b = await body();
if (!b.includes("liberté financière")) fail("North Star why not shown in morning flow");
await page.fill('input[name="mainQuest"]', "Appeler 10 propriétaires du fichier");
await page.click('button:has-text("DÉMARRER LA JOURNÉE")');
await page.waitForURL("**/today");
b = await body();
if (!b.includes("Appeler 10 propriétaires")) fail("main quest not set from morning flow");
if (!b.includes("Matin ✓")) fail("morning quick action not marked done");

// 5. Complete Main Quest
await page.click('section:has-text("Main Quest") button:has-text("Accompli")');
await page.waitForSelector('section:has-text("Main Quest") [aria-label="accomplie"]');

// 6. Focus: start 25min, end immediately → completed session recorded, no XP block
await page.goto(`${BASE}/focus`);
await page.click('button:has-text("Lancer le focus")');
await page.waitForSelector('button:has-text("Terminer la session")');
await page.click('button:has-text("Terminer la session")');
await page.waitForSelector('text=Dernières sessions');
b = await body();
if (!b.includes("0 min")) fail("early-ended focus session not listed at 0 min");

// 7. Night review with gratitude + One Big Thing → tomorrow prepared
await page.goto(`${BASE}/today/night`);
await page.fill('textarea[name="wentWell"]', "Main Quest bouclée avant midi.");
await page.fill('textarea[name="gratitude"]', "Le café du matin avec Sarah.");
await page.fill('input[name="tomorrowBigThing"]', "Relancer les 3 propriétaires chauds");
await page.click('button:has-text("Clore la journée")');
await page.waitForURL("**/today");
b = await body();
if (!b.includes("Soir ✓")) fail("night review not marked done");

// 8. Ledger + coins: verify exact totals on Progress
// XP: quest 100 + milestone 40 + morning 10 + night 15 + gratitude 10 = 175
// Coins: 50 + 20 + 5 + 8 + 4 = 87
await page.goto(`${BASE}/progress`);
b = await body();
if (!b.includes("175")) fail("expected 175 MAINXP, got: " + b.slice(0, 300));
if (!b.includes("87")) fail("expected 87 coins");
if (!b.includes("Stratégie")) fail("attributes missing");
await page.screenshot({ path: `${shots}/04-progress.png`, fullPage: true });

// 9. Rewards: create for 50 coins → redeem → balance 37; a 500-coin reward is locked
await page.goto(`${BASE}/me/rewards`);
await page.fill('input[name="title"]', "Soirée resto sans culpabilité");
await page.fill('input[name="costCoins"]', "50");
await page.click('button:has-text("Ajouter")');
await page.waitForSelector('text=Soirée resto');
await page.click('button:has-text("Débloquer")');
await page.waitForSelector('text=débloquée 1×');
b = await body();
if (!b.includes("37")) fail("coin balance after redeem should be 37");
await page.fill('input[name="title"]', "Week-end à Zermatt");
await page.fill('input[name="costCoins"]', "500");
await page.click('button:has-text("Ajouter")');
await page.waitForSelector('text=Week-end à Zermatt');
b = await body();
if (!b.includes("Encore 463")) fail("unaffordable reward should show remaining coins");
await page.screenshot({ path: `${shots}/05-rewards.png`, fullPage: true });

// 10. Coach: honest offline state without key
await page.goto(`${BASE}/coach`);
b = await body();
if (!b.includes("Coach hors ligne")) fail("coach should be honestly offline without API key");

// 11. North Star editable
await page.goto(`${BASE}/me/north-star`);
b = await body();
if (!b.includes("liberté financière")) fail("north star should carry onboarding data");

console.log(process.exitCode ? "PHASE1 SMOKE FAILED" : "PHASE1 SMOKE OK");
await browser.close();
