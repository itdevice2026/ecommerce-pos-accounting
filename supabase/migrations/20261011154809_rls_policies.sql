-- Phase 0 · Row Level Security policies.
-- Pattern: rows are visible only inside the caller's company, then narrowed by role.
-- Journals, sequences and the audit log have no write policies: they change only
-- through security-definer functions and triggers.

-- Anonymous visitors get nothing from these tables (the storefront will expose
-- catalog tables separately in Phase 4).
revoke all on public.companies, public.branches, public.user_roles, public.tax_codes,
              public.accounts, public.fiscal_periods, public.doc_sequences,
              public.journal_entries, public.journal_lines, public.audit_log
  from anon;

-- companies ------------------------------------------------------------------
create policy "members read own company" on public.companies
  for select to authenticated
  using (id = (select private.company_id()));

create policy "owner/admin update company" on public.companies
  for update to authenticated
  using (id = (select private.company_id()) and (select private.has_role('owner', 'admin')))
  with check (id = (select private.company_id()));

-- branches -------------------------------------------------------------------
create policy "members read company branches" on public.branches
  for select to authenticated
  using (company_id = (select private.company_id()));

create policy "owner/admin insert branches" on public.branches
  for insert to authenticated
  with check (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin')));

create policy "owner/admin update branches" on public.branches
  for update to authenticated
  using (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin')))
  with check (company_id = (select private.company_id()));

-- user_roles -----------------------------------------------------------------
-- Everyone can read their own row; owner/admin manage the company's users.
-- Only an owner can create, change or remove an owner.
create policy "read own role or manage company roles" on public.user_roles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin')))
  );

create policy "owner/admin insert roles" on public.user_roles
  for insert to authenticated
  with check (
    company_id = (select private.company_id())
    and (select private.has_role('owner', 'admin'))
    and (role <> 'owner' or (select private.has_role('owner')))
  );

create policy "owner/admin update roles" on public.user_roles
  for update to authenticated
  using (
    company_id = (select private.company_id())
    and (select private.has_role('owner', 'admin'))
    and (role <> 'owner' or (select private.has_role('owner')))
  )
  with check (
    company_id = (select private.company_id())
    and (role <> 'owner' or (select private.has_role('owner')))
  );

create policy "owner/admin delete roles" on public.user_roles
  for delete to authenticated
  using (
    company_id = (select private.company_id())
    and (select private.has_role('owner', 'admin'))
    and (role <> 'owner' or (select private.has_role('owner')))
    and user_id <> (select auth.uid())
  );

-- tax_codes ------------------------------------------------------------------
create policy "staff read tax codes" on public.tax_codes
  for select to authenticated
  using (company_id = (select private.company_id()) and (select private.is_staff()));

create policy "owner/admin/accountant insert tax codes" on public.tax_codes
  for insert to authenticated
  with check (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin', 'accountant')));

create policy "owner/admin/accountant update tax codes" on public.tax_codes
  for update to authenticated
  using (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin', 'accountant')))
  with check (company_id = (select private.company_id()));

-- accounts -------------------------------------------------------------------
create policy "staff read accounts" on public.accounts
  for select to authenticated
  using (company_id = (select private.company_id()) and (select private.is_staff()));

create policy "owner/admin/accountant insert accounts" on public.accounts
  for insert to authenticated
  with check (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin', 'accountant')));

create policy "owner/admin/accountant update accounts" on public.accounts
  for update to authenticated
  using (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin', 'accountant')))
  with check (company_id = (select private.company_id()));

-- fiscal_periods -------------------------------------------------------------
create policy "staff read periods" on public.fiscal_periods
  for select to authenticated
  using (company_id = (select private.company_id()) and (select private.is_staff()));

create policy "owner/admin/accountant insert periods" on public.fiscal_periods
  for insert to authenticated
  with check (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin', 'accountant')));

create policy "owner/accountant open or close periods" on public.fiscal_periods
  for update to authenticated
  using (company_id = (select private.company_id()) and (select private.has_role('owner', 'accountant')))
  with check (company_id = (select private.company_id()));

-- journals (read-only from the client) ---------------------------------------
create policy "finance reads journal entries" on public.journal_entries
  for select to authenticated
  using (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin', 'accountant')));

create policy "finance reads journal lines" on public.journal_lines
  for select to authenticated
  using (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin', 'accountant')));

-- audit_log (read-only) ------------------------------------------------------
create policy "owner/admin read audit log" on public.audit_log
  for select to authenticated
  using (company_id = (select private.company_id()) and (select private.has_role('owner', 'admin')));
