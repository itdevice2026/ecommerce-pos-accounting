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

## Status

Phase 0 (foundation) in progress:

- [x] Supabase project `ecommerce-pos-accounting` (Singapore)
- [x] Database foundation: companies, branches, roles, RLS, chart of accounts, tax codes, fiscal periods, journals with balance and period-lock rules, audit log
- [x] Access-token hook enabled (role, company and branches in the JWT)
- [ ] Create the owner login and bootstrap the company (see Supabase setup)
- [ ] Next.js app skeleton with Supabase Auth
- [ ] GitHub Actions CI/CD
