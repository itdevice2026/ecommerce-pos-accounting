-- Phase 0 · Audit log: every insert, update and delete on master and accounting tables.

create table public.audit_log (
  id          bigint generated always as identity primary key,
  company_id  uuid,
  table_name  text not null,
  row_id      uuid,
  action      text not null,
  old_data    jsonb,
  new_data    jsonb,
  user_id     uuid default auth.uid(),
  at          timestamptz not null default now()
);
create index audit_log_row_idx     on public.audit_log (table_name, row_id);
create index audit_log_company_idx on public.audit_log (company_id, at desc);
alter table public.audit_log enable row level security;

create or replace function private.audit_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (company_id, table_name, row_id, action, old_data, new_data, user_id)
  values (
    case when tg_table_name = 'companies' then (r ->> 'id')::uuid else (r ->> 'company_id')::uuid end,
    tg_table_name,
    (r ->> 'id')::uuid,
    tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    auth.uid()
  );
  return null;
end;
$$;

create trigger audit_companies       after insert or update or delete on public.companies       for each row execute function private.audit_row();
create trigger audit_branches        after insert or update or delete on public.branches        for each row execute function private.audit_row();
create trigger audit_user_roles      after insert or update or delete on public.user_roles      for each row execute function private.audit_row();
create trigger audit_tax_codes       after insert or update or delete on public.tax_codes       for each row execute function private.audit_row();
create trigger audit_accounts        after insert or update or delete on public.accounts        for each row execute function private.audit_row();
create trigger audit_fiscal_periods  after insert or update or delete on public.fiscal_periods  for each row execute function private.audit_row();
create trigger audit_journal_entries after insert or update or delete on public.journal_entries for each row execute function private.audit_row();
create trigger audit_journal_lines   after insert or update or delete on public.journal_lines   for each row execute function private.audit_row();
