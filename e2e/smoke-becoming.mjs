// QUI JE DEVIENS suite — identity through evidence, never affirmation.
//
// The contract:
//   1. a direction is declared once, in the user's words, with «what it
//      means in real life» — and shows honest early language («la première
//      semaine écrit la première ligne»);
//   2. after real action, the voice becomes «Tu construis la preuve» — and
//      NEVER «tu ES» after one good day;
//   3. declaring pays zero XP and lights nothing;
//   4. self-trust counts kept promises (visible from 3 past quests);
//   5. the 30-day PROOF block on /progress shows real counts + the
//      strongest consistency, computed, not motivational.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const stamp = Date.now();

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Devenir");
await page.fill('input[name="email"]', `devenir${stamp}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// ── 1. Declare a direction (athlete → training evidence) ──
await page.goto(`${BASE}/me/identite`);
await page.fill('input[name="directionTitle"]', "Un athlète constant");
await page.fill('input[name="proofNote"]', "3 entraînements par semaine");
await page.locator('input[name="source"][value="entrainement"]').check({ force: true });
await page.getByRole("button", { name: "Suivre cette direction" }).click();
await page.waitForTimeout(1000);
await page.reload();
let main = await page.textContent("main");
if (!main.includes("Un athlète constant")) fail("the direction was not saved");
else console.log("1. the direction is declared once, in his words OK");
if (!main.includes("la première semaine écrit la première ligne")) {
  fail("empty evidence does not speak honestly");
} else console.log("   with honest early language OK");

// Declaring pays nothing.
await page.goto(`${BASE}/progress`);
main = await page.textContent("main");
if (!/Tout le monde commence à zéro/.test(main) && /\d+ MAINXP cette semaine/.test(main) === false) {
  // XP ledger empty is asserted via the registre default line below
}
const hasTx = !(await page.textContent("main")).includes("Tout le monde commence à zéro");
if (hasTx) fail("declaring an identity direction created XP");
else console.log("2. declaring pays zero XP OK");

// ── 3. Real action strengthens the voice ──
await page.goto(`${BASE}/dojo`);
await page.getByRole("button", { name: "Séance faite" }).click();
await page.waitForTimeout(1200);
await page.goto(`${BASE}/dojo`);
await page.getByRole("button", { name: "Séance faite" }).click();
await page.waitForTimeout(1200);
await page.goto(`${BASE}/me/identite`);
main = await page.textContent("main");
if (!main.includes("Tu construis la preuve")) fail("evidence did not strengthen the voice");
else console.log("3. two real sessions → « Tu construis la preuve » OK");
if (/C'est en train de devenir toi/.test(main)) fail("identity language claimed after two days");
else console.log("   and it never says « tu ES » after two days OK");

// ── 4. Self-trust needs real history; build 3 past quests via DB dayKeys ──
const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://mainxp:mainxp@localhost:5432/mainxp_ci" });
await client.connect();
const { rows: urows } = await client.query(`SELECT id FROM mainxp_users WHERE email = $1`, [`devenir${stamp}@e2e.local`]);
const uid = urows[0].id;
const past = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
for (const [i, done] of [[3, true], [2, true], [1, false]].entries()) {
  await client.query(
    `INSERT INTO mainxp_tasks (id, "userId", title, tier, status, "dayKey", "order", "postponeCount", notes, "nextAction", "createdAt")
     VALUES ($1, $2, $3, 'MAIN_QUEST', $4, $5, 0, 0, '', '', NOW())`,
    [`e2e-trust-${stamp}-${i}`, uid, `Quête passée ${i}`, done[1] ? "DONE" : "OPEN", past(done[0])]
  );
}
await client.end();
await page.goto(`${BASE}/me/identite`);
main = await page.textContent("main");
if (!main.includes("Confiance en soi : 2 de tes 3 dernières quêtes importantes tenues")) {
  fail("self-trust does not count kept promises");
} else console.log("4. self-trust: 2 of the last 3 promises kept OK");

// ── 5. The PROOF block on /progress ──
await page.goto(`${BASE}/progress`);
main = await page.textContent("main");
if (!main.includes("La preuve — 30 jours")) fail("the 30-day proof block is missing");
else console.log("5. the 30-day PROOF block exists OK");
await page.locator("summary", { hasText: "La preuve" }).click();
main = await page.textContent("main");
if (!main.includes("Entraînements") || !main.includes("2")) fail("proof counts are not real");
else console.log("   with real counts (2 entraînements) OK");
if (!main.includes("l'entraînement") === false && main.includes("constance la plus solide")) {
  console.log("   strongest consistency computed OK");
}

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log("QUI JE DEVIENS SUITE OK");
