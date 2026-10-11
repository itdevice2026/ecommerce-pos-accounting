# Web app

Next.js 16 (App Router, Cache Components) + Supabase. One app serves the storefront (`/`), the POS (`/pos`) and the back office (`/admin`).

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
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types + TypeScript |
| `npm run gen:types` | Regenerate `src/lib/database.types.ts` from Supabase (needs `supabase login`) |

## Layout

```
src/
  proxy.ts                    refreshes the Supabase session; sends signed-out users to /login
  lib/supabase/               server, browser and proxy clients
  lib/auth.ts                 getCurrentUser() and requireRole() — the only place pages read the session
  lib/database.types.ts       generated DB types
  components/ui.tsx           shared buttons, inputs, cards
  app/(store)/page.tsx        public home (storefront in Phase 4)
  app/login/                  staff sign-in
  app/setup/                  first-run Company Setup (calls bootstrap_company)
  app/(admin)/admin/          back office
  app/(pos)/pos/              point of sale (Phase 3)
```

## Rules for new pages

- Read the session only through `getCurrentUser()` / `requireRole()`, and only inside a `<Suspense>` boundary (Cache Components requirement).
- Re-check the role inside every Server Action; actions can be called directly.
- Never use the Supabase secret key in this app. RLS is the security boundary.
- Next.js 16 differs from older versions; check `node_modules/next/dist/docs/` before using an API.
