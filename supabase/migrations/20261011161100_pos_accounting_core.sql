-- Phase 0 · Accounting core: tax codes, chart of accounts, fiscal periods,
-- document sequences, journal entries and lines with integrity rules.

create type public.pos_account_type   as enum ('asset', 'liability', 'equity', 'revenue', 'expense');
create type public.pos_balance_side   as enum ('debit', 'credit');
create type public.pos_tax_type       as enum ('vatable', 'exempt', 'zero_rated');
create type public.pos_period_status  as enum ('open', 'closed');
create type public.pos_journal_status as enum ('draft', 'posted', 'reversed');

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------
create table public.pos_tax_codes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.pos_companies (id) on delete cascade,
  code        text not null,
  name        text not null,
  rate        numeric(6, 4) not null default 0 check (rate >= 0 and rate < 1),
  type        public.pos_tax_type not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  unique (company_id, code)
);
alter table public.pos_tax_codes enable row level security;

create table public.pos_accounts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.pos_companies (id) on delete cascade,
  code            text not null,
  name            text not null,
  type            public.pos_account_type not null,
  normal_balance  public.pos_balance_side not null,
  parent_id       uuid references public.pos_accounts (id),
  is_postable     boolean not null default true,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid(),
  unique (company_id, code)
);
create index pos_accounts_parent_id_idx on public.pos_accounts (parent_id);
alter table public.pos_accounts enable row level security;

create table public.pos_fiscal_periods (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.pos_companies (id) on delete cascade,
  year        int not null check (year between 2000 and 2100),
  month       int not null check (month between 1 and 12),
  status      public.pos_period_status not null default 'open',
  closed_at   timestamptz,
  closed_by   uuid,
  created_at  timestamptz not null default now(),
  unique (company_id, year, month)
);
alter table public.pos_fiscal_periods enable row level security;

-- ---------------------------------------------------------------------------
-- Gapless document numbers (receipts, journals, invoices…).
-- The UPDATE takes a row lock, so concurrent callers queue and a rolled-back
-- transaction gives its number back.
-- ---------------------------------------------------------------------------
create table public.pos_doc_sequences (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.pos_companies (id) on delete cascade,
  doc_type     text not null,
  branch_id    uuid references public.pos_branches (id) on delete cascade,
  terminal_id  text,
  prefix       text not null default '',
  next_no      bigint not null default 1 check (next_no > 0),
  created_at   timestamptz not null default now()
);
create unique index pos_doc_sequences_key on public.pos_doc_sequences
  (company_id, doc_type,
   coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
   coalesce(terminal_id, ''));
create index pos_doc_sequences_branch_id_idx on public.pos_doc_sequences (branch_id);
alter table public.pos_doc_sequences enable row level security;  -- no policies: functions only

create or replace function pos_private.next_doc_no(
  p_company uuid, p_doc_type text, p_branch uuid default null, p_terminal text default null)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  n bigint;
begin
  insert into public.pos_doc_sequences (company_id, doc_type, branch_id, terminal_id)
  values (p_company, p_doc_type, p_branch, p_terminal)
  on conflict (company_id, doc_type,
               coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
               coalesce(terminal_id, ''))
  do nothing;

  update public.pos_doc_sequences
     set next_no = next_no + 1
   where company_id = p_company
     and doc_type = p_doc_type
     and branch_id is not distinct from p_branch
     and terminal_id is not distinct from p_terminal
  returning next_no - 1 into n;

  return n;
end;
$$;
revoke execute on function pos_private.next_doc_no(uuid, text, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Journals
-- ---------------------------------------------------------------------------
create table public.pos_journal_entries (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.pos_companies (id) on delete restrict,
  entry_no         bigint,
  entry_date       date not null,
  period_id        uuid references public.pos_fiscal_periods (id),
  source_doc_type  text not null default 'manual',
  source_doc_id    uuid,
  memo             text,
  status           public.pos_journal_status not null default 'draft',
  reversal_of      uuid references public.pos_journal_entries (id),
  reversed_by      uuid references public.pos_journal_entries (id),
  posted_at        timestamptz,
  posted_by        uuid,
  created_at       timestamptz not null default now(),
  created_by       uuid default auth.uid(),
  unique (company_id, entry_no)
);
create index pos_journal_entries_period_id_idx   on public.pos_journal_entries (period_id);
create index pos_journal_entries_source_idx      on public.pos_journal_entries (source_doc_type, source_doc_id);
create index pos_journal_entries_reversal_of_idx on public.pos_journal_entries (reversal_of);
create index pos_journal_entries_reversed_by_idx on public.pos_journal_entries (reversed_by);
create index pos_journal_entries_date_idx        on public.pos_journal_entries (company_id, entry_date);
alter table public.pos_journal_entries enable row level security;

create table public.pos_journal_lines (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.pos_journal_entries (id) on delete cascade,
  company_id  uuid not null references public.pos_companies (id) on delete restrict,
  line_no     int not null default 1,
  account_id  uuid not null references public.pos_accounts (id),
  branch_id   uuid references public.pos_branches (id),
  partner_id  uuid,
  memo        text,
  debit       numeric(14, 2) not null default 0 check (debit >= 0),
  credit      numeric(14, 2) not null default 0 check (credit >= 0),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);
create index pos_journal_lines_entry_id_idx   on public.pos_journal_lines (entry_id);
create index pos_journal_lines_account_id_idx on public.pos_journal_lines (account_id);
create index pos_journal_lines_branch_id_idx  on public.pos_journal_lines (branch_id);
create index pos_journal_lines_company_id_idx on public.pos_journal_lines (company_id);
alter table public.pos_journal_lines enable row level security;

-- Entry rules: period must exist and be open; posted entries are read-only
-- (the only allowed change is posted → reversed); numbers assigned on posting.
create or replace function pos_private.je_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  p public.pos_fiscal_periods;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Posted journal entries cannot be deleted; reverse them instead';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.status <> 'draft' then
    if old.status = 'posted' and new.status = 'reversed' and new.reversed_by is not null
       and (to_jsonb(new) - array['status', 'reversed_by'])
         = (to_jsonb(old) - array['status', 'reversed_by']) then
      return new;
    end if;
    raise exception 'Posted journal entries are read-only; reverse them instead';
  end if;

  select * into p
    from public.pos_fiscal_periods fp
   where fp.company_id = new.company_id
     and fp.year  = extract(year  from new.entry_date)::int
     and fp.month = extract(month from new.entry_date)::int;

  if not found then
    raise exception 'No fiscal period exists for %', new.entry_date;
  end if;
  if p.status = 'closed' then
    raise exception 'Fiscal period %-% is closed', p.year, lpad(p.month::text, 2, '0');
  end if;
  new.period_id := p.id;

  if new.status = 'posted' then
    new.posted_at := now();
    new.posted_by := auth.uid();
    if new.entry_no is null then
      new.entry_no := pos_private.next_doc_no(new.company_id, 'journal_entry');
    end if;
  end if;

  return new;
end;
$$;

create trigger pos_journal_entries_before_write
  before insert or update or delete on public.pos_journal_entries
  for each row execute function pos_private.je_before_write();

-- Checked at commit, so a posting function can insert the entry and its lines
-- in any order within one transaction.
create or replace function pos_private.je_check_balanced()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  st public.pos_journal_status;
  d numeric;
  c numeric;
  n int;
begin
  select je.status into st from public.pos_journal_entries je where je.id = new.id;
  if st is distinct from 'posted' then
    return null;
  end if;

  select coalesce(sum(jl.debit), 0), coalesce(sum(jl.credit), 0), count(*)
    into d, c, n
    from public.pos_journal_lines jl
   where jl.entry_id = new.id;

  if n < 2 or d = 0 or d <> c then
    raise exception 'Journal entry % is not balanced (debits %, credits %, lines %)', new.id, d, c, n;
  end if;
  return null;
end;
$$;

create constraint trigger pos_journal_entries_balanced
  after insert or update on public.pos_journal_entries
  deferrable initially deferred
  for each row execute function pos_private.je_check_balanced();

-- Line rules: only draft entries take line changes; account must be postable
-- and belong to the same company.
create or replace function pos_private.jl_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  st         public.pos_journal_status;
  e_company  uuid;
  a          record;
begin
  select je.status, je.company_id into st, e_company
    from public.pos_journal_entries je
   where je.id = coalesce(new.entry_id, old.entry_id);

  if tg_op = 'DELETE' then
    if st is not null and st <> 'draft' then
      raise exception 'Lines of a posted journal entry cannot be changed';
    end if;
    return old;
  end if;

  if st is distinct from 'draft' then
    raise exception 'Lines can only be added to a draft journal entry; insert lines first, then post';
  end if;

  new.company_id := e_company;

  select ac.company_id, ac.is_postable, ac.is_active into a
    from public.pos_accounts ac where ac.id = new.account_id;
  if a.company_id is distinct from e_company then
    raise exception 'Account % belongs to another company', new.account_id;
  end if;
  if not a.is_postable or not a.is_active then
    raise exception 'Account % is not postable', new.account_id;
  end if;

  return new;
end;
$$;

create trigger pos_journal_lines_before_write
  before insert or update or delete on public.pos_journal_lines
  for each row execute function pos_private.jl_before_write();
