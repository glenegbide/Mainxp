// NOTIFICATIONS suite.
// 1) /me is a door to the notification settings.
// 2) The page is honest about the device it is running on (a desktop browser
//    without a home-screen install is told so, instead of being offered a
//    button that cannot work).
// 3) Preferences persist, and the summary line reflects the chosen mode.
// 4) The job endpoint refuses an unauthenticated caller.
// 5) The service worker is served fresh (a cached worker = a frozen product).
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3500";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Notif");
await page.fill('input[name="email"]', `notif${Date.now()}@e2e.local`);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: /C.est parti/ }).click();
await page.waitForURL("**/today");

// 1 — reachable from Moi
await page.goto(`${BASE}/me`);
await page.getByRole("link", { name: /Notifications/ }).click();
await page.waitForURL("**/me/notifications");
console.log("1. /me → Notifications OK");

// 2 — honest device state, never a dead button
const deviceBox = await page.textContent("main");
if (!/écran d.accueil|ne gère pas les notifications|Activer les notifications|Notifications actives/.test(deviceBox)) {
  fail("device section says nothing about this device: " + deviceBox.slice(0, 200));
} else {
  console.log("2. device state explained honestly OK");
}

// 3 — preferences persist
await page.getByText("Coache-moi", { exact: true }).click();
await page.fill('input[name="quietStart"]', "23");
await page.fill('input[name="quietEnd"]', "6");
await page.getByRole("button", { name: "Enregistrer" }).click();
await page.waitForTimeout(900);
await page.reload();
const saved = await page.textContent("main");
if (!saved.includes("4 par jour maximum")) fail("mode not persisted (expected the coach_me cap): " + saved.slice(0, 300));
const start = await page.inputValue('input[name="quietStart"]');
const end = await page.inputValue('input[name="quietEnd"]');
if (start !== "23" || end !== "6") fail(`quiet hours not persisted: ${start} → ${end}`);
else console.log("3. mode + quiet hours persisted OK");

// no XP amounts are advertised on this screen either (rule 9)
if (/\+\d+\s?XP/.test(saved)) fail("advertised XP amount on the notifications screen");

// 4 — the tick endpoint is not an open door
const tick = await page.request.get(`${BASE}/api/jobs/tick`);
if (tick.status() !== 401) fail(`/api/jobs/tick answered ${tick.status()} without the secret`);
else console.log("4. /api/jobs/tick refuses an unauthenticated caller OK");

// 5 — the service worker must never be cached
const sw = await page.request.get(`${BASE}/sw.js`);
const cache = sw.headers()["cache-control"] ?? "";
if (!sw.ok()) fail("sw.js not served");
else if (!/no-store|no-cache/.test(cache)) fail(`sw.js is cacheable: ${cache}`);
else console.log("5. sw.js served fresh OK");

// 6 — installability while logged out: the manifest, the icons and the worker
// must be served, never redirected to /login (that is how a PWA dies).
const anon = await browser.newContext();
for (const [path, what] of [
  ["/sw.js", "service worker"],
  ["/manifest.webmanifest", "manifest"],
  ["/icon-192.png", "icon"],
  ["/apple-touch-icon.png", "apple touch icon"],
]) {
  const res = await anon.request.get(`${BASE}${path}`, { maxRedirects: 0 });
  if (res.status() !== 200) fail(`${what} answered ${res.status()} to a logged-out device`);
}
// …while a real page still requires a session.
const guarded = await anon.request.get(`${BASE}/today`, { maxRedirects: 0 });
if (guarded.status() !== 307 && guarded.status() !== 302) fail(`/today is not guarded: ${guarded.status()}`);
// …and the tick is reachable without a cookie, but still refuses the caller.
const anonTick = await anon.request.get(`${BASE}/api/jobs/tick`, { maxRedirects: 0 });
if (anonTick.status() !== 401) fail(`/api/jobs/tick unreachable for a scheduler: ${anonTick.status()}`);
if (!process.exitCode) console.log("6. installable + guarded + reachable by the scheduler OK");
await anon.close();

if (process.exitCode) console.error("NOTIFICATIONS SUITE FAILED");
else console.log("ALL NOTIFICATION CHECKS PASSED");
await browser.close();
