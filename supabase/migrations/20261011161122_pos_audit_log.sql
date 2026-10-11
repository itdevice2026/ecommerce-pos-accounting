-- Phase 0 · Audit log: every insert, update and delete on master and accounting tables.

create table public.pos_audit_log (
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
create index pos_audit_log_row_idx     on public.pos_audit_log (table_name, row_id);
create index pos_audit_log_company_idx on public.pos_audit_log (company_id, at desc);
alter table public.pos_audit_log enable row level security;

create or replace function pos_private.audit_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.pos_audit_log (company_id, table_name, row_id, action, old_data, new_data, user_id)
  values (
    case when tg_table_name = 'pos_companies' then (r ->> 'id')::uuid else (r ->> 'company_id')::uuid end,
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

create trigger pos_audit_companies       after insert or update or delete on public.pos_companies       for each row execute function pos_private.audit_row();
create trigger pos_audit_branches        after insert or update or delete on public.pos_branches        for each row execute function pos_private.audit_row();
create trigger pos_audit_user_roles      after insert or update or delete on public.pos_user_roles      for each row execute function pos_private.audit_row();
create trigger pos_audit_tax_codes       after insert or update or delete on public.pos_tax_codes       for each row execute function pos_private.audit_row();
create trigger pos_audit_accounts        after insert or update or delete on public.pos_accounts        for each row execute function pos_private.audit_row();
create trigger pos_audit_fiscal_periods  after insert or update or delete on public.pos_fiscal_periods  for each row execute function pos_private.audit_row();
create trigger pos_audit_journal_entries after insert or update or delete on public.pos_journal_entries for each row execute function pos_private.audit_row();
create trigger pos_audit_journal_lines   after insert or update or delete on public.pos_journal_lines   for each row execute function pos_private.audit_row();
