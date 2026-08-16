# Deploy MAINXP — Vercel + Neon (~10 minutes)

## 1. Database (Neon, free)

1. Go to [neon.tech](https://neon.tech) → sign up → **Create project** (name: `mainxp`,
   region: Europe/Frankfurt).
2. Copy the **pooled connection string** (it looks like
   `postgresql://…-pooler.…neon.tech/neondb?sslmode=require`). The pooled URL matters —
   serverless functions open many short connections.

## 2. Hosting (Vercel, free)

1. Go to [vercel.com](https://vercel.com) → sign up with GitHub → **Add New → Project**
   → import **glenegbide/mainxp**.
2. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon pooled connection string |
   | `MAINXP_ANTHROPIC_API_KEY` | *(optional)* your key from [console.anthropic.com](https://console.anthropic.com) — activates the AI coach |

3. Click **Deploy**. The build runs `prisma db push` automatically (see
   `scripts/ensure-db.mjs`), so the tables are created on first deploy — no manual step.

## 3. On your phone

Open `https://<your-project>.vercel.app` → sign up → share menu → **Add to Home
Screen**. MAINXP now launches full-screen like an app.

## Notes

- Every push to `main` on GitHub redeploys automatically.
- No key set → the coach shows an honest offline state; everything else works.
- Custom domain: Vercel → Settings → Domains.
- Before real users: switch schema changes from `db push` to `prisma migrate`
  (docs/DATABASE_SCHEMA.md).
