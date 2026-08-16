# Deploy MAINXP — Vercel + Neon (~10 minutes)

## 1. Database (Neon, free)

1. Go to [neon.tech](https://neon.tech) → sign up → **Create project** (name: `mainxp`,
   region: Europe/Frankfurt).
2. Copy **two** connection strings from the Connect panel:
   - the **pooled** one (host contains `-pooler`) → `DATABASE_URL` (runtime)
   - the **direct** one (no `-pooler`) → `DIRECT_DATABASE_URL` (migrations)

## 2. Hosting (Vercel, free)

1. Go to [vercel.com](https://vercel.com) → sign up with GitHub → **Add New → Project**
   → import **glenegbide/mainxp**.
2. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** connection string |
   | `DIRECT_DATABASE_URL` | Neon **direct** connection string |
   | `MAINXP_GEMINI_API_KEY` | *(optional)* Gemini key ([aistudio.google.com](https://aistudio.google.com), free tier) — activates the AI coach |
   | `MAINXP_ANTHROPIC_API_KEY` | *(optional, alternative)* Anthropic key — takes precedence if both set |

3. Click **Deploy**. The build applies the committed migrations automatically
   (`scripts/ensure-db.mjs` → `prisma migrate deploy`) — no manual step.

## 3. On your phone

Open `https://<your-project>.vercel.app` → sign up → share menu → **Add to Home
Screen**. MAINXP now launches full-screen like an app.

## Notes

- Every push to `main` on GitHub redeploys automatically.
- No key set → the coach shows an honest offline state; everything else works.
- Custom domain: Vercel → Settings → Domains.
- Schema changes are already migration-based (`prisma/migrations/`).
- Staging: every non-main push gets a Vercel preview URL — point previews at a
  separate Neon branch DB, never production (docs/ARCHITECTURE.md).
