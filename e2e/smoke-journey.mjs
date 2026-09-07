// MON PARCOURS suite — the life calendar shows what actually happened.
//
// The contract:
//   1. the month is the anchor; today wears its mark once something real
//      happened, and the summary counts it;
//   2. tapping a date replays ONLY recorded facts (quest, proof, mind);
//   3. an empty day is honest («Aucune activité enregistrée») — no failure
//      language, nothing invented;
//   4. month navigation works and the future is «pas encore écrit»;
//   5. user isolation: another account sees its own empty month, never
//      someone else's history.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const stamp = Date.now();

async function signup(name, email) {
  await page.goto(`${BASE}/signup`);
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "supersecret1");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: /C.est parti/ }).click();
  await page.waitForURL("**/today");
}

await signup("Voyageur", `voyage${stamp}@e2e.local`);

// Write one real day: quest defined + done, a mission, a note of proof.
await page.fill('input[placeholder*="résultat le plus important"]', `Signer le mandat Vernier ${stamp}`);
await page.getByRole("button", { name: /Définir ma quête/ }).click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /C.est fait/ }).click();
await page.waitForTimeout(1500);

// ── 1-2. Today wears the quest mark; the replay shows the real day ──
await page.getByRole("link", { name: /→/ }).first().click(); // the date link on Today
await page.waitForURL("**/journey**");
let main = await page.textContent("main");
if (!main.includes("1 jour d'action") || !main.includes("1 quête")) {
  fail("the month summary does not count the real day");
} else console.log("1. the month counts the day that actually happened OK");
if (!main.includes(`Signer le mandat Vernier ${stamp}`)) {
  fail("the Day Replay does not show the completed quest");
} else console.log("2. the replay shows the quest, from real records OK");
if (!/MAINXP ce jour-là/.test(main)) fail("net XP line missing on a paid day");
else console.log("   and the day's earned MAINXP OK");

// ── 3. An empty past day is honest ──
const today = new Date();
const monthKey = main.match(/journey\?m=(\d{4}-\d{2})/)?.[1] ?? null;
// Pick the 1st of the current month unless today IS the 1st (then use month nav later).
const y = today.getFullYear();
const m = String(today.getMonth() + 1).padStart(2, "0");
const emptyDay = today.getDate() === 1 ? null : `${y}-${m}-01`;
if (emptyDay) {
  await page.goto(`${BASE}/journey?m=${y}-${m}&d=${emptyDay}`);
  main = await page.textContent("main");
  if (!main.includes("Aucune activité enregistrée")) fail("an empty day is not honestly empty");
  else if (/échec|raté|perdu/i.test(main)) fail("failure language on an empty day");
  else console.log("3. an empty day says only the truth OK");
} else {
  console.log("3. skipped (today is the 1st)");
}

// ── 4. Month navigation + the unwritten future ──
await page.goto(`${BASE}/journey`);
await page.getByRole("link", { name: "Mois précédent" }).click();
await page.waitForTimeout(400);
main = await page.textContent("main");
if (!main.includes("Revenir à aujourd'hui")) fail("previous month navigation broken");
else console.log("4. months navigate quietly OK");
const next2 = new Date(y, today.getMonth() + 1, 15);
const futureMonth = `${next2.getFullYear()}-${String(next2.getMonth() + 1).padStart(2, "0")}`;
await page.goto(`${BASE}/journey?m=${futureMonth}&d=${futureMonth}-15`);
main = await page.textContent("main");
if (!main.includes("pas encore écrit")) fail("the future pretends to be history");
else console.log("   and the future is « pas encore écrit » OK");

// ── 5. Isolation: a second account sees ITS month, empty ──
await page.context().clearCookies();
await signup("Isolée", `isolee${stamp}@e2e.local`);
await page.goto(`${BASE}/journey`);
main = await page.textContent("main");
if (main.includes(`Signer le mandat Vernier ${stamp}`)) fail("cross-user history leaked");
else console.log("5. another account never sees someone else's history OK");
void monthKey;

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log("MON PARCOURS SUITE OK");
