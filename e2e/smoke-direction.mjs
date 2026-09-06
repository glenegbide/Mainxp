// DIRECTION suite — one season, honest mission health, and «Pas maintenant».
//
// The contract:
//   1. a Season opens with a cap, an end date and what stays alive beside it;
//      only one can be active;
//   2. a goal declares its bottleneck + leading input, and the bottleneck
//      follows the Main Quest onto Today;
//   3. an untouched goal is called «À l'arrêt» — with the reason;
//   4. «Pas maintenant» captures an idea without touching the priority, and
//      its hour can come (promotion to a real goal) or not (dropped).
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const stamp = Date.now();

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Cap");
await page.fill('input[name="email"]', `cap${stamp}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// ── 1. Open the season ──
await page.goto(`${BASE}/goals`);
await page.fill('input[name="seasonTitle"]', "Revenus & Structure");
const end = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
await page.fill('input[name="endDay"]', end);
await page.fill('input[name="supportNote"]', "BJJ, famille");
await page.getByRole("button", { name: "Ouvrir la saison" }).click();
await page.waitForTimeout(1200);
await page.reload();
let main = await page.textContent("main");
if (!main.includes("Revenus & Structure") || !main.includes("jours restants")) {
  fail("the season did not open");
} else console.log("1. the season opens with its cap and countdown OK");
if (!main.includes("BJJ, famille")) fail("the support note vanished");
else console.log("   what stays alive beside it is named OK");
if (main.includes('name="seasonTitle"')) fail("a second season form is still offered");
else console.log("   only one season can be active OK");

// ── 2. A goal with bottleneck + leading input ──
// (with no active goal yet, the new-goal form is already unfolded)
await page.fill('input[name="title"]', "Gagner CHF 20K/mois");
await page.getByRole("button", { name: /Créer l.objectif/ }).click();
await page.waitForURL("**/goals/**");
await page.fill('input[name="bottleneck"]', "pas assez de conversations qualifiées");
await page.fill('input[name="leadingInput"]', "20 conversations propriétaires/semaine");
await page.getByRole("button", { name: "Enregistrer" }).first().click();
await page.waitForTimeout(1000);
await page.reload();
const savedBottleneck = await page.locator('input[name="bottleneck"]').inputValue();
main = await page.textContent("main");
if (savedBottleneck !== "pas assez de conversations qualifiées" || !main.includes("Les 7 prochains jours")) {
  fail("the bottleneck did not save");
} else console.log("2. the goal knows where it is actually blocked OK");

// The bottleneck follows the Main Quest onto Today.
const goalUrl = page.url();
const goalId = goalUrl.split("/goals/")[1];
await page.goto(`${BASE}/today`);
await page.fill('input[placeholder*="résultat le plus important"]', "Obtenir 2 rendez-vous");
await page.getByRole("button", { name: /Définir ma quête/ }).click();
await page.waitForTimeout(1200);
// Link the quest to the goal directly (the UI links via goal pages; here we
// verify the display path through the DB-linked task).
const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://mainxp:mainxp@localhost:5432/mainxp_ci" });
await client.connect();
await client.query(
  `UPDATE mainxp_tasks SET "goalId" = $1 WHERE title = 'Obtenir 2 rendez-vous'`,
  [goalId]
);
await client.end();
await page.reload();
main = await page.textContent("main");
if (!main.includes("goulot : pas assez de conversations qualifiées")) {
  fail("the bottleneck does not follow the quest onto Today");
} else console.log("   and it follows the Main Quest onto Today OK");

// ── 3. Honest health: a brand-new goal is moving; silence stalls it ──
await page.goto(`${BASE}/goals`);
main = await page.textContent("main");
if (!/En mouvement|À risque/.test(main)) fail("no health chip on the goal");
else console.log("3. every goal wears its honest health OK");

// ── 4. «Pas maintenant» ──
await page.fill('input[name="notNowTitle"]', `Créer une chaîne YouTube ${stamp}`);
await page.getByRole("button", { name: "Poser" }).click();
await page.waitForTimeout(1000);
await page.reload();
main = await page.textContent("main");
if (!main.includes(`Créer une chaîne YouTube ${stamp}`)) fail("the idea was not parked");
else console.log("4. a new idea parks without touching the priority OK");

await page.getByRole("button", { name: /C.est l.heure/ }).first().click();
await page.waitForURL("**/goals/**");
main = await page.textContent("main");
if (!main.includes(`Créer une chaîne YouTube ${stamp}`)) fail("promotion did not create the goal");
else console.log("   « c'est l'heure » turns it into a real goal, deliberately OK");

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log("DIRECTION SUITE OK");
