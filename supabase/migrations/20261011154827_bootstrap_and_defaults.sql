-- Phase 0 · First-run setup: one call creates the company, its first branch,
-- makes the caller the owner, and seeds tax codes, chart of accounts and
-- this year's fiscal periods.

create or replace function private.seed_company_defaults(p_company uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Manila'))::int;
begin
  insert into public.tax_codes (company_id, code, name, rate, type) values
    (p_company, 'VAT12',  'VAT 12%',    0.12, 'vatable'),
    (p_company, 'EXEMPT', 'VAT-exempt', 0,    'exempt'),
    (p_company, 'ZERO',   'Zero-rated', 0,    'zero_rated');

  insert into public.accounts (company_id, code, name, type, normal_balance) values
    (p_company, '1010', 'Cash on hand',                          'asset',     'debit'),
    (p_company, '1020', 'Cash in bank',                          'asset',     'debit'),
    (p_company, '1030', 'Payment gateway clearing',              'asset',     'debit'),
    (p_company, '1100', 'Accounts receivable',                   'asset',     'debit'),
    (p_company, '1200', 'Inventory',                             'asset',     'debit'),
    (p_company, '1210', 'Inventory in transit',                  'asset',     'debit'),
    (p_company, '1300', 'Input VAT',                             'asset',     'debit'),
    (p_company, '2010', 'Accounts payable',                      'liability', 'credit'),
    (p_company, '2020', 'Goods received not invoiced (GRNI)',    'liability', 'credit'),
    (p_company, '2100', 'Output VAT payable',                    'liability', 'credit'),
    (p_company, '2200', 'Customer deposits / unearned revenue',  'liability', 'credit'),
    (p_company, '3000', 'Owner''s equity',                       'equity',    'credit'),
    (p_company, '3100', 'Retained earnings',                     'equity',    'credit'),
    (p_company, '4010', 'Sales - online',                        'revenue',   'credit'),
    (p_company, '4020', 'Sales - POS',                           'revenue',   'credit'),
    (p_company, '4030', 'Delivery fee income',                   'revenue',   'credit'),
    (p_company, '4100', 'Sales discounts (incl. senior/PWD)',    'revenue',   'debit'),
    (p_company, '4200', 'Sales returns',                         'revenue',   'debit'),
    (p_company, '5010', 'Cost of goods sold',                    'expense',   'debit'),
    (p_company, '5020', 'Inventory shrinkage and spoilage',      'expense',   'debit'),
    (p_company, '5030', 'Inventory count variance',              'expense',   'debit'),
    (p_company, '6010', 'Payment gateway fees',                  'expense',   'debit'),
    (p_company, '6020', 'Cash over/short',                       'expense',   'debit');

  insert into public.fiscal_periods (company_id, year, month)
  select p_company, y, m from generate_series(1, 12) as m;
end;
$$;
revoke execute on function private.seed_company_defaults(uuid) from public, anon, authenticated;

-- v1 is single-company: bootstrap works only while no company exists yet,
-- so a later sign-up cannot create a second company.
create or replace function public.bootstrap_company(
  p_name            text,
  p_tin             text    default null,
  p_vat_registered  boolean default true,
  p_branch_code     text    default 'MAIN',
  p_branch_name     text    default 'Main Branch')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  bid uuid;
begin
  if uid is null then
    raise exception 'Sign in before setting up the company';
  end if;
  if exists (select 1 from public.companies) then
    raise exception 'The company has already been set up';
  end if;

  insert into public.companies (name, tin, vat_registered, created_by)
  values (p_name, p_tin, p_vat_registered, uid)
  returning id into cid;

  insert into public.branches (company_id, code, name, type, created_by)
  values (cid, p_branch_code, p_branch_name, 'store', uid)
  returning id into bid;

  insert into public.user_roles (user_id, company_id, role, branch_ids, created_by)
  values (uid, cid, 'owner', array[bid], uid);

  perform private.seed_company_defaults(cid);
  return cid;
end;
$$;
revoke execute on function public.bootstrap_company(text, text, boolean, text, text) from public, anon;
grant execute on function public.bootstrap_company(text, text, boolean, text, text) to authenticated;
