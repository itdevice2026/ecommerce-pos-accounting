# Supabase setup

The POS runs in your existing shared Supabase project, **bom-system**, alongside your other apps (HRIS, ISRR, NMIS, bills, check printing and others).

| Item | Value |
| --- | --- |
| Project | `bom-system` |
| Project ref | `emkcwukiqxnvcbhkjiqz` |
| API URL | `https://emkcwukiqxnvcbhkjiqz.supabase.co` |
| Region | ap-southeast-1 (Singapore) |
| Organization | Meatplus-Trading-Corp |

The publishable key goes in `apps/web/.env.local`. The secret (service-role) key is never used by this app.

## How the POS fits in a shared project

- **Every object is prefixed `pos_`**: tables (`pos_companies`, `pos_accounts`, `pos_journal_entries`…), enum types (`pos_app_role`…), indexes, triggers and the `pos_bootstrap_company()` function. Helper functions live in the `pos_private` schema, which the REST API does not expose. Nothing touches other apps' tables.
- **No custom auth hook.** A failing hook would block sign-in for every app in the project, so POS role checks read `pos_user_roles` directly.
- **Shared sign-in.** Users of your other apps can sign in to the POS with the same account, but they see no POS data until they're given a POS role. The project's existing rule (from the Final Pay app) still applies: new accounts must use an `@meatplus.ph` email or one in the employee masterfile.
- **Company setup is allow-listed.** Only emails in `pos_private.setup_allowlist` can run first-run setup. It currently holds `itdevice@meatplus.ph`. To add another:

  ```sql
  insert into pos_private.setup_allowlist (email) values ('name@meatplus.ph');
  ```

## What Phase 0 created

Applied to bom-system on 2026-10-11:

| Migration | Contents |
| --- | --- |
| `20261011161020_pos_foundation` | `pos_companies`, `pos_branches`, `pos_user_roles`; role/company/branch helpers in `pos_private` |
| `20261011161100_pos_accounting_core` | `pos_tax_codes`, `pos_accounts`, `pos_fiscal_periods`, `pos_doc_sequences` (gapless numbers), `pos_journal_entries`, `pos_journal_lines`, posting rules |
| `20261011161122_pos_audit_log` | `pos_audit_log` plus triggers on every POS master and accounting table |
| `20261011161149_pos_rls_policies` | RLS policies per role; anon has no access to POS tables |
| `20261011161250_pos_bootstrap_and_defaults` | Setup allow-list; `pos_bootstrap_company()`; default tax codes, chart of accounts, fiscal periods |

### Rules enforced by the database

- A journal entry posts only if it has 2+ lines and debits equal credits (checked at commit).
- Entries cannot be posted into a missing or closed fiscal period.
- Posted entries and their lines cannot be edited or deleted; the only allowed change is marking an entry reversed.
- Lines can only be added to a draft entry, using a postable account of the same company.
- Journal numbers come from `pos_doc_sequences` under a row lock, so they stay gapless.
- Clients cannot write journals directly; posting happens through database functions (Phase 2).

Verified on 2026-10-11 in bom-system with a test run that rolled itself back (no data left behind): a non-allow-listed account cannot run setup; setup seeds 23 accounts and 12 periods; a second setup is refused; balanced entries post as no. 1; unbalanced entries are rejected; posted entries are read-only; closed periods block posting; a user with no POS role sees no POS data; the allow-list is not readable by users.

## Company setup (when you're ready)

Sign in to the app with `itdevice@meatplus.ph` (or another allow-listed email). With no POS role yet, the app sends you to **Company Setup** (`/setup`). Or in SQL as that user:

```sql
select public.pos_bootstrap_company('Company name', 'TIN', true, 'MAIN', 'Main Branch');
```

It creates the company and first branch, makes the caller the owner, and seeds tax codes, the chart of accounts and this year's fiscal periods. It refuses to run once a company exists.

## Changing the schema

bom-system's migration history includes 300+ migrations from your other apps that are not in this repo, so **do not run `supabase db push` from this repo**; it would try to reconcile the whole history. Instead:

1. Add a new file in `supabase/migrations/` (prefix every object with `pos_`).
2. Open a pull request; CI applies all POS migrations to a fresh local database to prove they run cleanly.
3. After merge, apply the file to bom-system (Supabase SQL editor, or ask Claude to apply it), then rename the local file to the version Supabase recorded so the repo matches.

## Other project

`ecommerce-pos-accounting` (`zsjtqltvwauzhdyiidfo`) was created first and still holds an earlier, unprefixed copy of this schema with no real data. The app no longer uses it.
