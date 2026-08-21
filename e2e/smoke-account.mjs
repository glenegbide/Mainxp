// ACCOUNT + RECOVERY suite.
//
// Covers the paths a person only ever walks when something has gone wrong:
// a forgotten password, a stolen device, a changed address, leaving for good.
// The reset link is planted directly in the database (that is exactly what the
// email carries — the hash is all the server ever stores), then the rest of
// the journey runs through the real screens.
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  return env.match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
}

const db = new pg.Client({ connectionString: databaseUrl() });
await db.connect();

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };

const stamp = Date.now();
const email = `compte${stamp}@e2e.local`;
const PASS1 = "supersecret1";
const PASS2 = "deuxiememotdepasse2";
const PASS3 = "troisiememotdepasse3";

async function login(pwd) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pwd);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  return page.url();
}

// ── signup ──
await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Zoe");
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', PASS1);
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// 1 — the account screen is reachable from Moi
await page.goto(`${BASE}/me`);
await page.getByRole("link", { name: /Compte/ }).first().click();
await page.waitForURL("**/me/compte");
if (!(await page.textContent("main")).includes(email)) fail("account page does not show the address");
else console.log("1. /me → Compte, showing the login address OK");

// 2 — the display name is editable and travels everywhere
await page.fill('input[name="name"]', "Zoé Renommée");
await page.getByRole("button", { name: "Enregistrer" }).first().click();
await page.waitForTimeout(900);
if (!(await page.textContent("main")).includes("Nom mis à jour")) fail("name change not confirmed");
await page.goto(`${BASE}/me`);
if (!(await page.textContent("main")).includes("Zoé Renommée")) fail("new name missing on /me");
else console.log("2. name changed and visible on the profile OK");

// 3 — a wrong current password changes nothing
// (Scope every field to its own form: three forms share this screen, and a
// loose input[name=…] would silently type into the wrong one.)
const pwForm = () => page.locator('form:has(input[name="current"])');
await page.goto(`${BASE}/me/compte`);
await pwForm().locator('input[name="current"]').fill("cenestpaslebon");
await pwForm().locator('input[name="password"]').fill(PASS2);
await pwForm().locator('input[name="confirm"]').fill(PASS2);
await page.getByRole("button", { name: "Changer le mot de passe" }).click();
await page.waitForTimeout(900);
if (!(await page.textContent("main")).includes("incorrect")) fail("wrong current password was accepted");
else console.log("3. wrong current password refused OK");

// 4 — the real change keeps THIS device signed in
await pwForm().locator('input[name="current"]').fill(PASS1);
await pwForm().locator('input[name="password"]').fill(PASS2);
await pwForm().locator('input[name="confirm"]').fill(PASS2);
await page.getByRole("button", { name: "Changer le mot de passe" }).click();
await page.waitForTimeout(1200);
if (!(await page.textContent("main")).includes("Mot de passe changé")) fail("password change not confirmed");
await page.goto(`${BASE}/today`);
if (!page.url().includes("/today")) fail("changing the password logged this device out");
else console.log("4. password changed, current device still signed in OK");

// 5 — the old password is dead, the new one works
await page.goto(`${BASE}/me`);
await page.getByRole("button", { name: /Se déconnecter/ }).click();
await page.waitForTimeout(900);
if (!(await login(PASS1)).includes("/login")) fail("the OLD password still works");
if (!(await login(PASS2)).includes("/today")) fail("the new password does not work");
else console.log("5. old password dead, new one works OK");

// 6 — the recovery form answers the same thing to everyone
await page.goto(`${BASE}/me`);
await page.getByRole("button", { name: /Se déconnecter/ }).click();
await page.waitForTimeout(600);
await page.goto(`${BASE}/login`);
await page.getByRole("link", { name: /Mot de passe oublié/ }).click();
await page.waitForURL("**/mot-de-passe-oublie");
await page.fill('input[name="email"]', "personne-inconnue@nulle-part.test");
await page.getByRole("button", { name: "Envoyer le lien" }).click();
await page.waitForTimeout(900);
const unknownAnswer = await page.textContent("main");
await page.goto(`${BASE}/mot-de-passe-oublie`);
await page.fill('input[name="email"]', email);
await page.getByRole("button", { name: "Envoyer le lien" }).click();
await page.waitForTimeout(900);
const knownAnswer = await page.textContent("main");
// Two legitimate answers exist: "a link is on its way" when the server can
// send mail, and "this server cannot send mail" when it cannot. Which one
// appears must depend ONLY on the server — never on the address typed in.
const NEUTRAL = /Si un compte MAINXP utilise cette adresse/;
const NO_MAILER = /n'est pas configuré sur ce serveur/;
if (!NEUTRAL.test(unknownAnswer) && !NO_MAILER.test(unknownAnswer)) {
  fail("unexpected answer to an unknown address: " + unknownAnswer.slice(0, 160));
} else if (unknownAnswer !== knownAnswer) {
  fail("the form answers differently for a real account — that is an existence oracle");
} else {
  console.log(
    `6. recovery form is not an account-existence oracle OK (${NEUTRAL.test(knownAnswer) ? "mailer on" : "mailer off"})`
  );
}

// 7 — the link from the email: plant it exactly as the server would have
const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");
const { rows } = await db.query('SELECT id FROM mainxp_users WHERE email = $1', [email]);
const userId = rows[0]?.id;
if (!userId) fail("test user not found in the database");
await db.query(
  'INSERT INTO mainxp_password_resets (id, "userId", "tokenHash", "expiresAt") VALUES ($1,$2,$3,$4)',
  [`e2e${stamp}`, userId, tokenHash, new Date(Date.now() + 3_600_000)]
);

await page.goto(`${BASE}/mot-de-passe/${token}`);
if (!(await page.textContent("main")).includes("Nouveau mot de passe")) fail("valid reset link not accepted");
await page.fill('input[name="password"]', PASS3);
await page.fill('input[name="confirm"]', "pasidentique9");
await page.getByRole("button", { name: "Enregistrer" }).click();
await page.waitForTimeout(900);
if (!(await page.textContent("main")).includes("identiques")) fail("mismatched confirmation was accepted");

await page.fill('input[name="password"]', PASS3);
await page.fill('input[name="confirm"]', PASS3);
await page.getByRole("button", { name: "Enregistrer" }).click();
await page.waitForURL("**/login**");
if (!(await page.textContent("main")).includes("Nouveau mot de passe enregistré")) {
  fail("no confirmation after the reset");
} else {
  console.log("7. reset link → new password → back to login OK");
}

// 8 — the same link cannot be walked twice
await page.goto(`${BASE}/mot-de-passe/${token}`);
if (!(await page.textContent("main")).includes("déjà servi")) fail("the reset link is replayable");
else console.log("8. reset link is single-use OK");

// 9 — the password set by the link is the one that works now
if (!(await login(PASS2)).includes("/login")) fail("the pre-reset password still works");
if (!(await login(PASS3)).includes("/today")) fail("the password set by the link does not work");
else console.log("9. the link's password is the live one OK");

// 10 — deletion needs the password AND the word, then it is total
await page.goto(`${BASE}/me/compte`);
await page.locator("details").first().click();
await page.locator('input[name="deletePassword"]').fill(PASS3);
await page.locator('input[name="deleteConfirm"]').fill("oui");
await page.getByRole("button", { name: "Supprimer définitivement" }).click();
await page.waitForTimeout(900);
if (!(await page.textContent("main")).includes("SUPPRIMER en toutes lettres")) {
  fail("account deletion accepted a wrong confirmation word");
}
await page.locator("details").first().click();
await page.locator('input[name="deletePassword"]').fill(PASS3);
await page.locator('input[name="deleteConfirm"]').fill("SUPPRIMER");
await page.getByRole("button", { name: "Supprimer définitivement" }).click();
await page.waitForTimeout(1500);

const after = await db.query("SELECT id FROM mainxp_users WHERE email = $1", [email]);
if (after.rowCount !== 0) fail("the account row survived deletion");
if (!(await login(PASS3)).includes("/login")) fail("a deleted account can still sign in");
else console.log("10. deletion requires both proofs, then removes everything OK");

await db.end();
if (process.exitCode) console.error("ACCOUNT SUITE FAILED");
else console.log("ALL ACCOUNT CHECKS PASSED");
await browser.close();
