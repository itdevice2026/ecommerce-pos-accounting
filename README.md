# E-Commerce + Online POS with Basic Accounting and Inventory

One web app that sells online and in-store from a single stock pool, with every sale, purchase and stock movement posting its own double-entry journal.

**Stack:** Next.js + TypeScript · Supabase (Postgres, Auth, RLS, Edge Functions, Storage, Realtime) · GitHub Actions CI/CD

## Modules (v1)

- **Storefront** — catalog, cart, checkout, GCash/Maya/card or COD, pickup or delivery, order tracking
- **POS** — barcode and scale, split tender, receipts, shifts with X/Z reading, offline mode (PWA)
- **Inventory** — multi-location stock, POs and receiving, lots and expiry (FEFO), transfers, adjustments, counts
- **Accounting** — chart of accounts, automatic journals, AR/AP, VAT (12%, senior/PWD), trial balance, P&L, balance sheet
- **Back office** — products, price lists, customers, suppliers, users and roles

## Docs

- [System design and spec](docs/system-design.md) — architecture, schema, workflows, accounting rules, reports, CI/CD, roadmap
- [Supabase setup](docs/supabase-setup.md) — project details, what the migrations create, one-time steps

## Run locally

```bash
cd apps/web
cp .env.example .env.local   # add the Supabase publishable key
npm install
npm run dev                  # http://localhost:3000
```

See [apps/web/README.md](apps/web/README.md) for scripts and code layout.

## Status

Phase 0 (foundation):

- [x] Supabase project `ecommerce-pos-accounting` (Singapore)
- [x] Database foundation: companies, branches, roles, RLS, chart of accounts, tax codes, fiscal periods, journals with balance and period-lock rules, audit log
- [x] Access-token hook enabled (role, company and branches in the JWT)
- [x] Next.js app: staff sign-in, role-based access, first-run Company Setup screen, back-office dashboard, POS placeholder
- [x] GitHub Actions: CI (lint, types, build, migrations) and database deploy on merge
- [ ] Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` secrets so database deploys run
- [ ] Create the owner login and run Company Setup (`/setup`)
- [ ] Users & roles screen
- [ ] App hosting (Vercel or own server)
