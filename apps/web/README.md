# Web app

Next.js 16 static site + Supabase. One app serves the storefront (`/`), the POS (`/pos`) and the back office (`/admin`).

**Live:** https://itdevice2026.github.io/ecommerce-pos-accounting/

## How it works

The build is a static export (`output: "export"`): plain HTML and JavaScript published to GitHub Pages, with no server. Sign-in, data loading and the company-setup call all run in the browser through the Supabase client. **Row Level Security in Supabase is the security boundary**; the screen-level role checks (`RequireRole`) only decide what to show.

Because there is no server, these Next.js features are not available here: Server Actions, `proxy.ts`, `cookies()`, API routes, and dynamic routes without `generateStaticParams`. Anything that needs a trusted server (payment webhooks, emails, scheduled jobs) goes in a Supabase Edge Function or a Postgres function instead.

## Run locally

```bash
cd apps/web
cp .env.example .env.local      # fill in the publishable key
npm install
npm run dev                     # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Static export to `out/` (set `BASE_PATH=/ecommerce-pos-accounting` to match GitHub Pages) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types + TypeScript |
| `npm run gen:types` | Regenerate DB types (keep only the `pos_` entries) |

## Layout

```
src/
  lib/supabase/client.ts      browser Supabase client (session in localStorage)
  lib/auth.tsx                AuthProvider, useAuth(), RequireRole, role lists
  lib/database.types.ts       pos_ table types
  components/                 shared UI and the sign-out button
  app/(store)/page.tsx        public home (storefront in Phase 4)
  app/login/                  staff sign-in
  app/setup/                  first-run Company Setup (calls pos_bootstrap_company)
  app/(admin)/admin/          back office (gated by RequireRole)
  app/(pos)/pos/              point of sale (Phase 3)
```

## Deploying

Every push to `main` that touches `apps/web/` runs `.github/workflows/pages.yml`, which builds the site and publishes it to GitHub Pages.

## Rules for new pages

- Use internal links with `next/link` (the `/ecommerce-pos-accounting` prefix is added automatically) and end paths with `/`.
- Wrap protected screens in `<RequireRole roles={…}>`, and make sure the matching RLS policy exists in a `pos_` migration; RLS is what actually protects the data.
- Never put the Supabase secret key in this app.
- Next.js 16 differs from older versions; check `node_modules/next/dist/docs/` before using an API.
