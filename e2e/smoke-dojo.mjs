// LE DOJO suite — the body's floor of the game.
//
// The contract this suite defends:
//   1. a session is logged in one gesture and lands in the week count,
//      the totals and the history;
//   2. logging a session pays XP (Force) and lights the flame on /today;
//   3. "ce que je travaille" holds work items with a note, caps at five,
//      and "Acquise" moves an item to the earned list;
//   4. the belt profile saves (grade, barrettes, weekly target) and renders;
//   5. a second identical log is a second honest session, not a duplicate
//      of the first (two rows, two facts).
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const stamp = Date.now();

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Tatami");
await page.fill('input[name="email"]', `tatami${stamp}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// ── 1. Log a BJJ session from the Dojo tab ──
await page.goto(`${BASE}/dojo`);
await page.locator('input[name="rounds"]').fill("6");
await page.locator('input[name="note"]').fill(`bon travail de garde ${stamp}`);
await page.getByRole("button", { name: "Séance faite" }).click();
await page.waitForTimeout(1500);
await page.reload(); // assert against the server's truth, not a render race
let main = await page.textContent("main");
if (!main.includes("1/3")) fail("the session did not land in the week count");
else console.log("1. one gesture, one session in the week OK");
if (!main.includes("90 min sur le tapis") || !main.includes("6 rounds")) {
  fail("week totals (minutes, rounds) missing");
} else console.log("   totals show minutes and sparring rounds OK");
if (!main.includes(`bon travail de garde ${stamp}`)) fail("the session note is not in the history");
else console.log("   the session (with its note) is in the history OK");

// ── 2. It paid: the flame is lit on /today ──
await page.goto(`${BASE}/today`);
const todayText = await page.textContent("main");
if (!/1\s*j/.test(todayText)) fail("the training did not light the flame on /today");
else console.log("2. a training day lights the flame OK");

// ── 3. The work-list: add, note, master ──
await page.goto(`${BASE}/dojo`);
const focusInput = page.locator('input[placeholder*="knee cut"]');
await focusInput.fill(`Sortie de side control ${stamp}`);
await page.getByRole("button", { name: "Travailler" }).click();
await page.waitForTimeout(900);
main = await page.textContent("main");
if (!main.includes(`Sortie de side control ${stamp}`)) fail("the work item was not added");
else console.log("3. a work item joins « ce que je travaille » OK");

await page.getByRole("button", { name: /Ajouter une note/ }).first().click();
await page.locator("textarea.mxp-noteedit").fill(`cadre + hanche, pas les bras ${stamp}`);
await page.locator("h1").first().click();
await page.waitForTimeout(900);
await page.reload();
main = await page.textContent("main");
if (!main.includes(`cadre + hanche, pas les bras ${stamp}`)) fail("the work-item note did not survive");
else console.log("   its note saves by leaving the field OK");

await page.getByRole("button", { name: "Acquise" }).first().click();
await page.waitForTimeout(1000);
main = await page.textContent("main");
if (!main.includes("Techniques acquises (1)")) fail("mastering did not move the item to the earned list");
else console.log("   « Acquise » moves it to the earned list OK");

// ── 4. The belt profile saves and renders ──
await page.locator("summary", { hasText: "Ceinture" }).click();
await page.selectOption('select[name="grade"]', "bleue");
await page.selectOption('select[name="stripes"]', "2");
await page.selectOption('select[name="weeklyTarget"]', "4");
await page.getByRole("button", { name: "Enregistrer" }).click();
await page.waitForTimeout(1000);
main = await page.textContent("main");
if (!main.includes("Ceinture bleue") || !main.includes("2 barrettes")) fail("the belt did not save");
else console.log("4. the belt (bleue, 2 barrettes) hangs on the wall OK");
if (!main.includes("1/4")) fail("the weekly target did not update the count");
else console.log("   the weekly target reshapes the week OK");

// ── 5. A second session is a second fact ──
await page.locator('input[name="rounds"]').fill("4");
await page.getByRole("button", { name: "Séance faite" }).click();
await page.waitForTimeout(1500);
await page.reload();
main = await page.textContent("main");
if (!main.includes("2/4")) fail("the second session did not count");
else console.log("5. a second session is a second honest fact OK");
if (!main.includes("180 min sur le tapis") || !main.includes("10 rounds")) {
  fail("week totals did not accumulate");
} else console.log("   totals accumulate (180 min, 10 rounds) OK");

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log("LE DOJO SUITE OK");
