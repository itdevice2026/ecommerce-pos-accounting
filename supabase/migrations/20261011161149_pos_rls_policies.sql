-- Phase 0 · Row Level Security policies (pos_ tables).
-- Pattern: rows are visible only inside the caller's company, then narrowed by role.
-- Journals, sequences and the audit log have no write policies: they change only
-- through security-definer functions and triggers.

-- Anonymous visitors get nothing from these tables (the storefront will expose
-- catalog tables separately in Phase 4).
revoke all on public.pos_companies, public.pos_branches, public.pos_user_roles, public.pos_tax_codes,
              public.pos_accounts, public.pos_fiscal_periods, public.pos_doc_sequences,
              public.pos_journal_entries, public.pos_journal_lines, public.pos_audit_log
  from anon;

-- companies ------------------------------------------------------------------
create policy "members read own company" on public.pos_companies
  for select to authenticated
  using (id = (select pos_private.company_id()));

create policy "owner/admin update company" on public.pos_companies
  for update to authenticated
  using (id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')))
  with check (id = (select pos_private.company_id()));

-- branches -------------------------------------------------------------------
create policy "members read company branches" on public.pos_branches
  for select to authenticated
  using (company_id = (select pos_private.company_id()));

create policy "owner/admin insert branches" on public.pos_branches
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')));

create policy "owner/admin update branches" on public.pos_branches
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')))
  with check (company_id = (select pos_private.company_id()));

-- user_roles -----------------------------------------------------------------
-- Everyone can read their own row; owner/admin manage the company's users.
-- Only an owner can create, change or remove an owner.
create policy "read own role or manage company roles" on public.pos_user_roles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')))
  );

create policy "owner/admin insert roles" on public.pos_user_roles
  for insert to authenticated
  with check (
    company_id = (select pos_private.company_id())
    and (select pos_private.has_role('owner', 'admin'))
    and (role <> 'owner' or (select pos_private.has_role('owner')))
  );

create policy "owner/admin update roles" on public.pos_user_roles
  for update to authenticated
  using (
    company_id = (select pos_private.company_id())
    and (select pos_private.has_role('owner', 'admin'))
    and (role <> 'owner' or (select pos_private.has_role('owner')))
  )
  with check (
    company_id = (select pos_private.company_id())
    and (role <> 'owner' or (select pos_private.has_role('owner')))
  );

create policy "owner/admin delete roles" on public.pos_user_roles
  for delete to authenticated
  using (
    company_id = (select pos_private.company_id())
    and (select pos_private.has_role('owner', 'admin'))
    and (role <> 'owner' or (select pos_private.has_role('owner')))
    and user_id <> (select auth.uid())
  );

-- tax_codes ------------------------------------------------------------------
create policy "staff read tax codes" on public.pos_tax_codes
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));

create policy "owner/admin/accountant insert tax codes" on public.pos_tax_codes
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin', 'accountant')));

create policy "owner/admin/accountant update tax codes" on public.pos_tax_codes
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin', 'accountant')))
  with check (company_id = (select pos_private.company_id()));

-- accounts -------------------------------------------------------------------
create policy "staff read accounts" on public.pos_accounts
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));

create policy "owner/admin/accountant insert accounts" on public.pos_accounts
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin', 'accountant')));

create policy "owner/admin/accountant update accounts" on public.pos_accounts
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin', 'accountant')))
  with check (company_id = (select pos_private.company_id()));

-- fiscal_periods -------------------------------------------------------------
create policy "staff read periods" on public.pos_fiscal_periods
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));

create policy "owner/admin/accountant insert periods" on public.pos_fiscal_periods
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin', 'accountant')));

create policy "owner/accountant open or close periods" on public.pos_fiscal_periods
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'accountant')))
  with check (company_id = (select pos_private.company_id()));

-- journals (read-only from the client) ---------------------------------------
create policy "finance reads journal entries" on public.pos_journal_entries
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin', 'accountant')));

create policy "finance reads journal lines" on public.pos_journal_lines
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin', 'accountant')));

-- audit_log (read-only) ------------------------------------------------------
create policy "owner/admin read audit log" on public.pos_audit_log
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')));
