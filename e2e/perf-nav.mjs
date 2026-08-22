// Perceived-speed benchmark: how long from tapping a tab to seeing that
// screen's content, and from tapping a checkbox to the pixel changing.
//
// Numbers here are the honest ones — same machine, same build, run before and
// after any change that claims to make the app faster.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const ROUNDS = Number(process.env.ROUNDS ?? 5);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const stamp = Date.now();
await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Perf");
await page.fill('input[name="email"]', `perf${stamp}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// Give the account something to render so the pages aren't empty shells.
await page.fill('input[name="title"]', "Appeler 5 propriétaires");
await page.getByRole("button", { name: /Définir|Enregistrer|Ajouter/ }).first().click();
await page.waitForTimeout(800);

const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const report = (label, xs) =>
  console.log(
    `${label.padEnd(26)} median ${String(median(xs)).padStart(5)} ms   (${xs.join(", ")})`
  );

// ── 1. Tab switching: tap → the destination's heading is on screen ──
const TABS = [
  ["Jour", "/today"],
  ["Progrès", "/progress"],
  ["Cercle", "/social"],
  ["Moi", "/me"],
];
for (const [label, href] of TABS) {
  const times = [];
  for (let i = 0; i < ROUNDS; i++) {
    await page.goto(`${BASE}/today`);
    await page.waitForSelector("main");
    const t0 = Date.now();
    await page.getByRole("link", { name: label, exact: true }).click();
    await page.waitForURL(`**${href}`);
    await page.waitForSelector("main h1");
    times.push(Date.now() - t0);
  }
  report(`tab → ${label}`, times);
}

// ── 2. Warm tab switching: the real pattern — moving between tabs without
// ever reloading, which is where prefetch and the client cache pay off. ──
{
  await page.goto(`${BASE}/today`);
  const cycle = ["Progrès", "Cercle", "Moi", "Jour"];
  const times = [];
  for (let i = 0; i < ROUNDS * cycle.length; i++) {
    const label = cycle[i % cycle.length];
    const t0 = Date.now();
    await page.getByRole("link", { name: label, exact: true }).click();
    await page.waitForSelector("main h1");
    times.push(Date.now() - t0);
  }
  report("warm tab cycle", times.slice(cycle.length)); // drop the first lap
}

// ── 3. The completion moment: tap → the check is visibly on ──
{
  const times = [];
  await page.goto(`${BASE}/today`);
  for (let i = 0; i < ROUNDS; i++) {
    const box = page.locator("button.mxp-check").first();
    if ((await box.count()) === 0) break;
    const wasOn = (await box.getAttribute("class")).includes("on");
    const t0 = Date.now();
    await box.click();
    await page.waitForFunction(
      (prev) => {
        const el = document.querySelector("button.mxp-check");
        return el && el.classList.contains("on") !== prev;
      },
      wasOn,
      { timeout: 5000 }
    );
    times.push(Date.now() - t0);
    await page.waitForTimeout(900); // let the server settle between rounds
  }
  if (times.length) report("check → pixel flips", times);
}

// ── 4. Cold server render: the HTML byte cost of each screen ──
for (const path of ["/today", "/habits", "/progress", "/social", "/me"]) {
  const times = [];
  for (let i = 0; i < ROUNDS; i++) {
    const t0 = Date.now();
    const res = await page.request.get(`${BASE}${path}`);
    await res.body();
    times.push(Date.now() - t0);
  }
  report(`server HTML ${path}`, times);
}

await browser.close();
