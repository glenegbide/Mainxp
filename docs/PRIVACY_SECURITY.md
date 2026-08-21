# MAINXP — Privacy & Security

MAINXP holds extremely sensitive data: finances, health, journal, relationships,
AI memory, spirituality. Treated accordingly from Phase 0.

## Implemented in Phase 0

- **Authentication**: scrypt password hashing (Node crypto, per-user salt, timing-safe
  compare); sessions are random 256-bit tokens stored **hashed** (SHA-256) with expiry;
  cookie `mxp_session` is HttpOnly, Secure (in prod), SameSite=Lax, Path=/.
- **Authorization**: every query/mutation goes through `requireMxUser()` and filters by
  `userId` — user-level isolation at the service layer. The proxy redirect is only an
  optimistic UX guard, never the security boundary.
- **Secrets**: only in env vars (`MAINXP_ANTHROPIC_API_KEY`, `MAINXP_JOBS_SECRET`);
  never in client bundles or the DB.

## Rules for later phases

- Journal, finance, health, people data and AI conversations are **never** auto-shared
  (accountability sharing is per-goal, opt-in, Part 43).
- Receipt images and documents go to private storage, not `public/`.
- Memory controls: forget = hard delete; "private"/"don't use in coaching" excluded
  from AI context unconditionally.
- Export & delete account (GDPR/nLPD): full JSON export + cascading hard delete —
  required before public launch (all Mx tables cascade from MxUser).
- Audit log (`MxAuditLog`) for sensitive operations (Phase 2+).
- AI provider: data sent only to the configured provider, per its DPA; no training on
  user data without explicit consent.

## Club & social safety (addendum #28, architect now, build P4)

Clubs ship only with: block user, leave club, remove member, report content,
mute, private/public visibility, invitation controls. The social schema must
reserve these capabilities from its first migration.

---

## Le Cercle — built (2026-08)

Invite-only accountability partners. No feed, no followers, no counts, no
discovery: **you cannot be found in MAINXP, only invited.** Max 6 partners.

### The door

`src/lib/mainxp/circle/visibility.ts` is the ONLY path from one person's data
to another's. It is pure, and its test suite plants sentinel strings in the
private fields and searches the rendered card for them.

1. **Money, journal, gratitude, notes, memories and coach conversations have no
   switch.** They are absent from `SharerFacts` and from `PartnerCard`, so they
   are unrepresentable — not "off by default", but impossible to turn on.
2. **A link is two rows**, one per direction. My row says what I show you.
   Revoking is local, instant, and cannot inherit the other side's generosity.
3. **Every switch defaults to false.** A fresh partner sees a first name.
4. **Categories are not permissions.** `shareChallenges` shares nothing until
   specific challenge ids are allowlisted; a shared Main Quest names its goal
   only if that goal id is allowlisted.
5. **Allowlists are re-validated server-side** against what the user owns, so a
   crafted form cannot grant access to rows that are not theirs.
6. **Blocking ends both directions and survives re-invitation.**
7. **Pausing keeps the person and drops the facts** — the same shape as a new
   partner, so a pause can never read as an accusation.

### The invitation

A random 24-byte token in a share link, valid 14 days, single use, revocable.
**Opening it changes nothing**: the page only reads (message apps and mail
clients prefetch URLs). The link becomes a link between people when a
signed-in person presses the button — a POST. An invited person without an
account keeps their destination through signup via the `suite` parameter,
which is accepted only when it is an in-app path.

### The only social action

« Je te soutiens » — one per person per day, enforced by a unique constraint.
No likes, no comments, no visible counters: support is sent to a person, not
performed for an audience. It arrives as a push through `notify/direct.ts`,
which respects sleep and rest mode but not the machine's daily cap (a human
chose to send it).

### Tests

- `visibility.test.ts` — 17 sentinel/permission tests on the pure door.
- `service.integration.test.ts` — invitations, expiry, revocation, re-use,
  crafted allowlists, blocking, unlinked support.
- `e2e/smoke-circle.mjs` — two real accounts in two browser contexts; the
  sentinel sweep runs over every one of the partner's screens.

---

## Account & recovery — built (2026-08)

### Password recovery (`src/lib/mainxp/password-reset.ts`)

- **The token is never stored.** Only its SHA-256 lives in
  `mainxp_password_resets`; the token itself exists in the email and nowhere
  else, so a database leak cannot be used to take over accounts.
- **One hour, one use.** Using a link burns it *and* every other unused link
  for that account — an old mail sitting in an inbox stops working.
- **A reset ends every session.** That is the point: it is what removes anyone
  who already had the old password.
- **The form is not an existence oracle.** The forgotten-password screen shows
  the same sentence for a real address, an unknown one, and a rate-limited one.
  The only other answer it can give is "this server cannot send mail at all",
  which is a fact about the server and is decided *before* any lookup.
- **Three requests per hour per account**, counted in the database.
- Changing the password from inside the app also invalidates unused reset
  links, and signs out every other device while keeping the current one.

### Email (`src/lib/mainxp/email.ts`)

One provider (Resend), no dependency, and exactly one kind of message: "you
asked to reset your password". No digests, no re-engagement, no marketing.
With `RESEND_API_KEY` / `MAINXP_EMAIL_FROM` unset the app says so on screen
rather than pretending (CLAUDE.md rule 4); in development the link is printed
to the server log so the flow stays testable.

### The account screen (`/me/compte`)

Name, address, password, devices, deletion. Everything touching identity asks
for the current password — being able to open the app is not proof of
ownership. Deletion needs the password *and* the typed word SUPPRIMER, then
removes the user row and everything cascading from it: no "deactivated"
limbo, no 30-day hostage period.

### Tests

`password-reset.integration.test.ts` (replay, expiry, rate limit, session
wipe, sibling-link invalidation), `email.test.ts` (wire shape against a
stubbed fetch, HTML escaping, honest offline), and `e2e/smoke-account.mjs` —
ten checks through the real screens, including planting a reset link exactly
as the email would carry it, and proving a deleted account can no longer
sign in.
