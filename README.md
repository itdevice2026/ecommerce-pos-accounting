# E-Commerce + Online POS with Basic Accounting and Inventory

One web app that sells online and in-store from a single stock pool, with every sale, purchase and stock movement posting its own double-entry journal.

**Live:** https://itdevice2026.github.io/ecommerce-pos-accounting/

**Stack:** Next.js static site on GitHub Pages · Supabase (Postgres, Auth, RLS) in the shared bom-system project · GitHub Actions

## Modules (v1)

- **Storefront** — catalog, cart, checkout, GCash/Maya/card or COD, pickup or delivery, order tracking
- **POS** — barcode and scale, split tender, receipts, shifts with X/Z reading, offline mode (PWA)
- **Inventory** — multi-location stock, POs and receiving, lots and expiry (FEFO), transfers, adjustments, counts
- **Accounting** — chart of accounts, automatic journals, AR/AP, VAT (12%, senior/PWD), trial balance, P&L, balance sheet
- **Back office** — products, price lists, customers, suppliers, users and roles

## Docs

- [System design and spec](docs/system-design.md) — architecture, schema, workflows, accounting rules, reports, CI/CD, roadmap
- [Supabase setup](docs/supabase-setup.md) — how the POS lives in bom-system, what the migrations create, how to change the schema

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

- [x] Database in the shared **bom-system** Supabase project, all objects prefixed `pos_`
- [x] Companies, branches, roles, RLS, chart of accounts, tax codes, fiscal periods, journals with balance and period-lock rules, audit log
- [x] Next.js app: staff sign-in, role-based access, first-run Company Setup screen (allow-listed), back-office dashboard, POS placeholder
- [x] GitHub Actions CI: lint, types, build, and migrations apply cleanly on a fresh database
- [x] Hosted on GitHub Pages, deployed on every push to `main`
- [x] Company set up: BERNA'S FOOD HUB AND MINI GROCERY

Phase 1 (catalog and inventory):

- [x] Products: categories, products, variants (barcode / scale PLU), POS and online prices
- [x] Inventory: locations, opening stock, stock in, adjustments, transfers, lots and expiry, stock ledger, moving-average cost, journals
- [ ] Purchasing: suppliers, purchase orders

Next up:

- [ ] Users & roles screen
