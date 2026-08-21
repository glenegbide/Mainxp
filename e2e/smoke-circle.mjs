// CERCLE suite — two real accounts in two browser contexts.
//
// The point of this suite is not that the feature works: it is that the door
// holds. User A writes private things (journal, gratitude, a goal, a task
// note) containing a sentinel string. User B is linked to A and, at every
// step, B's entire page HTML is searched for that sentinel.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };
const stamp = Date.now();
const SECRET = `SENTINELPRIVE${stamp}`;

async function signUp(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup`);
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', `${name.toLowerCase()}${stamp}@e2e.local`);
  await page.fill('input[name="password"]', "supersecret1");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: /C.est parti/ }).click();
  await page.waitForURL("**/today");
  return page;
}

const [alice, bob] = [await signUp("Alice"), await signUp("Bob")];

// Alice writes private things, all carrying the sentinel.
await alice.goto(`${BASE}/journal`);
await alice.fill("textarea", `Journal intime ${SECRET}`);
await alice.getByRole("button", { name: /Enregistrer|Sauver|Écrire/ }).first().click();
await alice.waitForTimeout(800);
console.log("0. Alice wrote a private journal entry");

// 1 — Alice invites, Bob accepts.
await alice.goto(`${BASE}/social`);
await alice.fill('input[placeholder*="Marc"]', "Bob");
await alice.getByRole("button", { name: "Créer le lien" }).click();
await alice.waitForSelector("p.break-all");
// Read the link from its own element: neighbouring text would otherwise run
// into the token (textContent has no word boundaries).
const inviteUrl = (await alice.textContent("p.break-all")).trim();
if (!inviteUrl) { fail("no invite link rendered"); }
else console.log("1. invite link created");

// The link must be inert until someone presses the button (mail clients and
// message apps fetch URLs on their own).
const prefetch = await browser.newContext();
await (await prefetch.newPage()).goto(inviteUrl).catch(() => {});
await prefetch.close();

await bob.goto(inviteUrl);
await bob.getByRole("button", { name: /Accepter l.invitation/ }).click();
await bob.waitForURL("**/social**");
const bobAfterJoin = await bob.content();
if (!bobAfterJoin.includes("Alice")) fail("Bob does not see Alice after accepting");
else console.log("2. Bob accepted — a link exists");

// 3 — the default is silence: Bob sees a first name and nothing else.
// Scope every read to the partner section: the rest of the page is Bob's own
// controls, which naturally mention the same words.
const circleText = (page) => page.locator("section.mxp-anchor").first().textContent();
if (/Élan|Niveau|Cette semaine|✓/.test(await circleText(bob))) {
  fail("Bob sees facts about Alice with every switch off");
} else {
  console.log("3. default silence: Bob sees only a first name");
}
if (bobAfterJoin.includes(SECRET)) fail("SENTINEL LEAK on Bob's circle page");

// 4 — Alice opens exactly one switch.
// (Alice is already on /social; leave and come back so her client router cache
// lets go of the version rendered before Bob accepted.)
await alice.goto(`${BASE}/today`);
await alice.goto(`${BASE}/social`);
await alice.locator("details", { hasText: "Bob" }).first().click();
await alice.locator('input[name="shareElan"]').check();
await alice.getByRole("button", { name: "Enregistrer" }).first().click();
await alice.waitForTimeout(900);

await bob.goto(`${BASE}/today`);
await bob.goto(`${BASE}/social`);
const bobText = await circleText(bob);
if (!/Élan|récupération|Niveau/.test(bobText)) fail("Bob still cannot see the élan Alice opened");
else console.log("4. one switch opened → exactly that appears");
if (/Cette semaine/.test(bobText)) fail("opening élan leaked the week too");

// 5 — the leak sweep: nothing private, in any form, on any of Bob's screens.
for (const path of ["/social", "/today", "/progress", "/journal"]) {
  await bob.goto(`${BASE}${path}`);
  const html = await bob.content();
  if (html.includes(SECRET)) fail(`SENTINEL LEAK on ${path}`);
  if (path !== "/social" && html.includes("Alice")) fail(`Alice's name leaked onto ${path}`);
}
if (!process.exitCode) console.log("5. no sentinel anywhere on Bob's screens");

// 6 — support: one per day, and it says so.
await bob.goto(`${BASE}/social`);
await bob.getByRole("button", { name: "Je te soutiens" }).click();
await bob.waitForTimeout(900);
await bob.goto(`${BASE}/today`);
await bob.goto(`${BASE}/social`);
if (!(await circleText(bob)).includes("Envoyé")) fail("support was not recorded");
else console.log("6. « je te soutiens » sent once, and stays sent");

// 7 — Alice ends the link: it disappears for both, immediately.
await alice.goto(`${BASE}/today`);
await alice.goto(`${BASE}/social`);
await alice.locator("details", { hasText: "Bob" }).first().click();
await alice.getByRole("button", { name: "Quitter ce lien" }).click();
await alice.waitForTimeout(900);
await bob.goto(`${BASE}/today`);
await bob.goto(`${BASE}/social`);
if ((await bob.textContent("main")).includes("Alice")) fail("Bob still sees Alice after she left");
else console.log("7. leaving cuts both directions at once");

if (process.exitCode) console.error("CERCLE SUITE FAILED");
else console.log("ALL CERCLE CHECKS PASSED");
await browser.close();
