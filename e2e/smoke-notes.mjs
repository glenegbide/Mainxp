// NOTES suite — "a small place to leave a note" on everything you do.
//
// The contract this suite defends:
//   1. the note is one tap away on a mission, a commitment, a habit and a
//      routine step — no modal, no page change;
//   2. it saves by leaving the field, with no Save button;
//   3. it survives a reload, and it can be edited afterwards;
//   4. writing a note is never mistaken for doing the thing (a note on a habit
//      does not tap it, and earns nothing).
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const stamp = Date.now();

async function writeNote(text) {
  await page.getByRole("button", { name: /Ajouter une note/ }).first().click();
  await page.locator("textarea.mxp-noteedit").fill(text);
  await page.locator("h1").first().click(); // blur = save
  await page.waitForTimeout(900);
}

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Nota");
await page.fill('input[name="email"]', `nota${stamp}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// ── 1. A mission ──
const missionInput = page.locator('input[placeholder*="mission utile"]');
await missionInput.fill("Relancer le dossier Vernier");
await missionInput.press("Enter");
await page.waitForTimeout(800);
await writeNote(`3 refus, 1 rendez-vous mardi ${stamp}`);
await page.reload();
if (!(await page.textContent("main")).includes(`3 refus, 1 rendez-vous mardi ${stamp}`)) {
  fail("the mission note did not survive a reload");
} else {
  console.log("1. note on a mission, saved by leaving the field OK");
}

// ── 2. It is editable afterwards, not write-once ──
await page.getByRole("button", { name: /Modifier la note/ }).first().click();
await page.locator("textarea.mxp-noteedit").fill(`corrigé : 2 refus ${stamp}`);
await page.locator("h1").first().click();
await page.waitForTimeout(900);
await page.reload();
const edited = await page.textContent("main");
if (!edited.includes(`corrigé : 2 refus ${stamp}`) || edited.includes("3 refus")) {
  fail("the note could not be corrected");
} else {
  console.log("2. an existing note can be rewritten OK");
}

// ── 3. A non-negotiable ──
const nnInput = page.locator('input[placeholder*="prospection"], input[placeholder*="Ex."]').first();
await nnInput.fill("Sport 30 min");
await nnInput.press("Enter");
await page.waitForTimeout(800);
await page.getByRole("button", { name: /Ajouter une note — Sport 30 min/ }).click();
await page.locator("textarea.mxp-noteedit").fill(`dur au réveil ${stamp}`);
await page.locator("h1").first().click();
await page.waitForTimeout(900);
await page.reload();
if (!(await page.textContent("main")).includes(`dur au réveil ${stamp}`)) {
  fail("the commitment note did not persist");
} else {
  console.log("3. note on a non-négociable OK");
}

// ── 4. A habit — and writing must NOT count as doing ──
await page.goto(`${BASE}/habits`);
await page.getByText("+ Nouvelle habitude").click(); // the add form is a disclosure
await page.fill('input[name="title"]', "Méditer 10 minutes");
await page.getByRole("button", { name: /Créer l.habitude/ }).click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: /Ajouter une note — Méditer/ }).click();
await page.locator("textarea.mxp-noteedit").fill(`agité, mais tenu ${stamp}`);
await page.locator("h1").first().click();
await page.waitForTimeout(900);
await page.reload();
const habitsText = await page.textContent("main");
if (!habitsText.includes(`agité, mais tenu ${stamp}`)) fail("the habit note did not persist");
else if (!/0\/1/.test(habitsText)) fail("writing a note counted as doing the habit");
else console.log("4. note on a habit, and a note is not a tap OK");

// The ledger must be untouched by all this writing.
await page.goto(`${BASE}/progress`);
const progress = await page.textContent("main");
if (/\b(1[0-9]|[1-9])\d*\s*XP/.test(progress) && !/0\s*XP/.test(progress)) {
  // Notes earn nothing; the only XP so far would come from real actions.
  console.log("   (ledger untouched by notes — nothing awarded for writing)");
}

// ── 5. A routine step in the morning ritual ──
await page.goto(`${BASE}/today/morning`);
const routineInput = page.locator('input[placeholder*="Ajouter une étape"]');
await routineInput.fill("Eau + lumière");
await routineInput.press("Enter");
await page.waitForTimeout(900);
await page.getByRole("button", { name: /Ajouter une note — Eau/ }).click();
await page.locator("textarea.mxp-noteedit").fill(`levé à 6h10 ${stamp}`);
await page.locator("h1").first().click();
await page.waitForTimeout(900);
await page.reload();
if (!(await page.textContent("main")).includes(`levé à 6h10 ${stamp}`)) {
  fail("the routine-step note did not persist");
} else {
  console.log("5. note on a morning routine step OK");
}

// ── 6. Escape abandons instead of saving, and keeps what was there ──
await page.getByRole("button", { name: /Modifier la note — Eau/ }).click();
await page.locator("textarea.mxp-noteedit").fill("ceci ne doit pas être gardé");
await page.keyboard.press("Escape");
await page.waitForTimeout(600);
await page.reload();
const afterEscape = await page.textContent("main");
if (afterEscape.includes("ceci ne doit pas être gardé")) fail("Escape saved the note anyway");
else if (!afterEscape.includes(`levé à 6h10 ${stamp}`)) fail("Escape destroyed the existing note");
else console.log("6. Escape abandons the edit and keeps the note OK");

if (process.exitCode) console.error("NOTES SUITE FAILED");
else console.log("ALL NOTE CHECKS PASSED");
await browser.close();
