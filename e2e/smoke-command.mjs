// COMMAND CENTER suite — the first-principles loop, end to end:
// quest → next physical move → arena (carrying the move) → interruptions
// tapped live → focus quality in one tap.
//
// The contract:
//   1. the Main Quest hero carries an editable "prochain geste";
//   2. the Arena shows that move during the session;
//   3. interruptions are logged by tapping their source, no typing;
//   4. after the session, quality is one tap and never blocks a new block.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const stamp = Date.now();

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Commandant");
await page.fill('input[name="email"]', `cmd${stamp}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// ── 1. Quest + next move ──
await page.fill('input[placeholder*="résultat le plus important"]', "Obtenir 2 rendez-vous propriétaires");
await page.getByRole("button", { name: /Définir ma quête/ }).click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /quel est le prochain geste/ }).click();
await page.fill('input[aria-label="Le prochain geste"]', `Appeler Marc Dupont ${stamp}`);
await page.locator("h1").first().click(); // blur = save
await page.waitForTimeout(1000);
await page.reload();
let main = await page.textContent("main");
if (!main.includes(`Appeler Marc Dupont ${stamp}`)) fail("the next move did not persist on the quest");
else console.log("1. the quest carries its next physical move OK");

// ── 2. The Arena door is on the hero, and the move follows inside ──
await page.getByRole("link", { name: /Entrer dans l.Arène/ }).click();
await page.waitForURL("**/focus");
await page.selectOption('select[name="taskId"]', { index: 1 }); // the quest
await page.getByRole("button", { name: "Lancer le focus" }).click();
await page.waitForTimeout(1200);
main = await page.textContent("main");
if (!main.includes(`Appeler Marc Dupont ${stamp}`)) fail("the next move is not shown during the session");
else console.log("2. the arena session shows the next move OK");

// ── 3. Interruptions are taps, not typing ──
await page.getByRole("button", { name: "Message" }).click();
await page.getByRole("button", { name: /Message ×1/ }).click();
await page.getByRole("button", { name: "Pensée" }).click();
main = await page.textContent("main");
if (!main.includes("×2")) fail("interruption taps did not count");
else console.log("3. interruptions tapped live (Message ×2, Pensée ×1) OK");

await page.getByRole("button", { name: "Terminer la session" }).click();
await page.waitForTimeout(1500);
await page.reload();

// ── 4. Quality is one tap; the next block is never blocked ──
main = await page.textContent("main");
if (!main.includes("Session terminée")) fail("the just-ended card did not appear");
else console.log("4. the session asks for one tap of quality OK");
if (!main.includes("Nouvelle session")) fail("the quality card blocks starting a new block");
else console.log("   and the next block stays available OK");
await page.getByRole("button", { name: "Fragmenté" }).click();
await page.waitForTimeout(1200);
await page.reload();
main = await page.textContent("main");
if (main.includes("Session terminée")) fail("quality tap did not resolve the card");
else console.log("   one tap resolves it OK");

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log("COMMAND CENTER SUITE OK");
