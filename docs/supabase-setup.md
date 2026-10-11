# Supabase setup

| Item | Value |
| --- | --- |
| Project | `ecommerce-pos-accounting` |
| Project ref | `zsjtqltvwauzhdyiidfo` |
| API URL | `https://zsjtqltvwauzhdyiidfo.supabase.co` |
| Region | ap-southeast-1 (Singapore) |
| Organization | Meatplus-Trading-Corp |

Keys are in the dashboard under **Project Settings → API Keys**. The publishable key goes in the app's `.env`; the secret (service-role) key goes only in Edge Function secrets and GitHub Actions secrets, never in the browser or the repo.

## What Phase 0 created

Migrations in `supabase/migrations/`, applied to the project on 2026-10-11:

| Migration | Contents |
| --- | --- |
| `20261011154703_foundation` | `companies`, `branches`, `user_roles`; role/company/branch helpers in the `private` schema; custom access-token hook |
| `20261011154735_accounting_core` | `tax_codes`, `accounts`, `fiscal_periods`, `doc_sequences` (gapless numbers), `journal_entries`, `journal_lines`, posting rules |
| `20261011154748_audit_log` | `audit_log` plus triggers on every master and accounting table |
| `20261011154809_rls_policies` | RLS policies per role; anon has no access to these tables |
| `20261011154827_bootstrap_and_defaults` | `bootstrap_company()` first-run setup; default tax codes, chart of accounts, fiscal periods |

### Rules enforced by the database

- A journal entry posts only if it has 2+ lines and debits equal credits (checked at commit).
- Entries cannot be posted into a missing or closed fiscal period.
- Posted entries and their lines cannot be edited or deleted; the only allowed change is marking an entry reversed.
- Lines can only be added to a draft entry, using a postable account of the same company.
- Journal numbers come from `doc_sequences` under a row lock, so they stay gapless.
- Clients cannot write journals directly; posting happens through database functions (Phase 2).

These were verified on 2026-10-11 with a test run that rolled itself back: bootstrap seeds 23 accounts and 12 periods, a second bootstrap is refused, balanced entries post as no. 1, unbalanced entries are rejected, posted entries are read-only, closed periods block posting, and a user with no role sees no data.

## One-time steps

1. **Enable the access-token hook.** Dashboard → Authentication → Hooks → *Customize Access Token (JWT) Claims* → Postgres function `public.custom_access_token_hook`. Until it is on, RLS still works by looking up `user_roles`, just with one extra query per check.
2. **Create the first user and the company.** Sign up the owner account (Authentication → Users → Add user), sign in from the app, then call once:

   ```sql
   select public.bootstrap_company('Company name', 'TIN', true, 'MAIN', 'Main Branch');
   ```

   or from the app: `supabase.rpc('bootstrap_company', { p_name: 'Company name', p_tin: 'TIN' })`.
   This creates the company and its first branch, makes the caller the owner, and seeds tax codes, the chart of accounts and this year's fiscal periods. It refuses to run once a company exists.

## Working with migrations

```bash
npm i -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref zsjtqltvwauzhdyiidfo
supabase migration new <name>   # write SQL in the new file
supabase db push                # apply to the linked project
```

Never change the schema by hand in the dashboard; add a migration file instead so the repo stays the source of truth.
