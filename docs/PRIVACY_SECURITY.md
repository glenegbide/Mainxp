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
