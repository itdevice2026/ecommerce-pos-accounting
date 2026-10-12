-- Phase 1 · Inventory: stock locations, lots, an immutable stock ledger with
-- running balances, moving-average cost, and stock documents (opening stock,
-- stock in, adjustments, transfers) whose posting writes the ledger and the
-- journal entry in one transaction.
--
-- Quantities are in each product's base unit (pos_products.base_uom).

create type public.pos_location_type as enum ('storage', 'transit');
create type public.pos_stock_doc_type as enum ('opening', 'receipt', 'adjustment', 'transfer');
create type public.pos_stock_doc_status as enum ('draft', 'posted', 'in_transit', 'received', 'cancelled');
create type public.pos_move_type as enum ('opening', 'receipt', 'adjustment', 'transfer_out', 'transfer_in', 'sale', 'sale_return');
create type public.pos_adjust_reason as enum ('spoilage', 'damage', 'expired', 'shrinkage', 'count_variance', 'found', 'other');

-- ---------------------------------------------------------------------------
-- Locations: each branch gets a default "Main stock"; each company one
-- "In transit" location used while transfers are on the road.
-- ---------------------------------------------------------------------------
create table public.pos_stock_locations (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.pos_companies (id) on delete cascade,
  branch_id   uuid references public.pos_branches (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  type        public.pos_location_type not null default 'storage',
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  check ((type = 'transit') = (branch_id is null)),
  check (not is_default or type = 'storage')
);
create unique index pos_stock_locations_name_key on public.pos_stock_locations
  (company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create unique index pos_stock_locations_one_default on public.pos_stock_locations (branch_id) where is_default;
create unique index pos_stock_locations_one_transit on public.pos_stock_locations (company_id) where type = 'transit';
create index pos_stock_locations_branch_id_idx on public.pos_stock_locations (branch_id);
alter table public.pos_stock_locations enable row level security;

create table public.pos_lots (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.pos_companies (id) on delete cascade,
  product_id   uuid not null references public.pos_products (id) on delete cascade,
  lot_no       text not null check (length(trim(lot_no)) > 0),
  expiry_date  date,
  created_at   timestamptz not null default now(),
  created_by   uuid default auth.uid(),
  unique (product_id, lot_no)
);
create index pos_lots_expiry_idx on public.pos_lots (company_id, expiry_date);
alter table public.pos_lots enable row level security;

-- Moving-average cost per product (company-wide).
create table public.pos_product_costs (
  product_id  uuid primary key references public.pos_products (id) on delete cascade,
  company_id  uuid not null references public.pos_companies (id) on delete cascade,
  avg_cost    numeric(14, 4) not null default 0 check (avg_cost >= 0),
  updated_at  timestamptz not null default now()
);
create index pos_product_costs_company_id_idx on public.pos_product_costs (company_id);
alter table public.pos_product_costs enable row level security;

-- The ledger. Rows are only ever inserted, by the posting functions.
create table public.pos_stock_moves (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.pos_companies (id) on delete restrict,
  location_id  uuid not null references public.pos_stock_locations (id),
  product_id   uuid not null references public.pos_products (id),
  lot_id       uuid references public.pos_lots (id),
  qty          numeric(14, 3) not null check (qty <> 0),
  unit_cost    numeric(14, 4) not null default 0,
  move_type    public.pos_move_type not null,
  doc_type     text not null,
  doc_id       uuid,
  doc_line_id  uuid,
  created_at   timestamptz not null default now(),
  created_by   uuid default auth.uid()
);
create index pos_stock_moves_product_idx  on public.pos_stock_moves (product_id, created_at desc);
create index pos_stock_moves_location_idx on public.pos_stock_moves (location_id);
create index pos_stock_moves_lot_idx      on public.pos_stock_moves (lot_id);
create index pos_stock_moves_doc_idx      on public.pos_stock_moves (doc_id);
create index pos_stock_moves_company_idx  on public.pos_stock_moves (company_id, created_at desc);
alter table public.pos_stock_moves enable row level security;

-- Running balance per location, product and lot, kept by a trigger on the ledger.
create table public.pos_stock_balances (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.pos_companies (id) on delete cascade,
  location_id  uuid not null references public.pos_stock_locations (id) on delete cascade,
  product_id   uuid not null references public.pos_products (id) on delete cascade,
  lot_id       uuid references public.pos_lots (id) on delete cascade,
  qty          numeric(14, 3) not null default 0,
  updated_at   timestamptz not null default now()
);
create unique index pos_stock_balances_key on public.pos_stock_balances
  (location_id, product_id, coalesce(lot_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index pos_stock_balances_product_idx on public.pos_stock_balances (product_id);
create index pos_stock_balances_lot_idx on public.pos_stock_balances (lot_id);
create index pos_stock_balances_company_idx on public.pos_stock_balances (company_id);
alter table public.pos_stock_balances enable row level security;

-- ---------------------------------------------------------------------------
-- Stock documents
-- ---------------------------------------------------------------------------
create table public.pos_stock_docs (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.pos_companies (id) on delete restrict,
  doc_type          public.pos_stock_doc_type not null,
  status            public.pos_stock_doc_status not null default 'draft',
  doc_no            text,
  doc_date          date not null default current_date,
  branch_id         uuid not null references public.pos_branches (id),
  location_id       uuid not null references public.pos_stock_locations (id),
  to_location_id    uuid references public.pos_stock_locations (id),
  to_branch_id      uuid references public.pos_branches (id),
  supplier_name     text,
  reference         text,
  note              text,
  journal_entry_id  uuid references public.pos_journal_entries (id),
  created_at        timestamptz not null default now(),
  created_by        uuid default auth.uid(),
  updated_at        timestamptz not null default now(),
  posted_at         timestamptz,
  posted_by         uuid,
  received_at       timestamptz,
  received_by       uuid,
  cancelled_at      timestamptz,
  cancelled_by      uuid,
  unique (company_id, doc_no)
);
create index pos_stock_docs_list_idx on public.pos_stock_docs (company_id, created_at desc);
create index pos_stock_docs_branch_idx on public.pos_stock_docs (branch_id);
create index pos_stock_docs_to_branch_idx on public.pos_stock_docs (to_branch_id);
create index pos_stock_docs_location_idx on public.pos_stock_docs (location_id);
create index pos_stock_docs_to_location_idx on public.pos_stock_docs (to_location_id);
create index pos_stock_docs_journal_idx on public.pos_stock_docs (journal_entry_id);
alter table public.pos_stock_docs enable row level security;

create table public.pos_stock_doc_lines (
  id            uuid primary key default gen_random_uuid(),
  doc_id        uuid not null references public.pos_stock_docs (id) on delete cascade,
  company_id    uuid not null references public.pos_companies (id) on delete restrict,
  line_no       int not null default 1,
  product_id    uuid not null references public.pos_products (id),
  qty           numeric(14, 3) not null check (qty <> 0),
  unit_cost     numeric(14, 4) check (unit_cost is null or unit_cost >= 0),
  lot_id        uuid references public.pos_lots (id),
  lot_no        text,
  expiry_date   date,
  reason        public.pos_adjust_reason,
  note          text,
  received_qty  numeric(14, 3)
);
create index pos_stock_doc_lines_doc_idx on public.pos_stock_doc_lines (doc_id);
create index pos_stock_doc_lines_product_idx on public.pos_stock_doc_lines (product_id);
create index pos_stock_doc_lines_lot_idx on public.pos_stock_doc_lines (lot_id);
alter table public.pos_stock_doc_lines enable row level security;

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------
create or replace function pos_private.in_my_branches(p_branch uuid)
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(p_branch = any (pos_private.branch_ids()), false)
$$;

-- Who may create and edit a draft.
create or replace function pos_private.can_edit_doc(p_type public.pos_stock_doc_type, p_branch uuid)
returns boolean
language sql stable set search_path = ''
as $$
  select pos_private.has_role('owner', 'admin')
      or (p_type <> 'opening'
          and pos_private.has_role('branch_manager', 'warehouse')
          and pos_private.in_my_branches(p_branch))
$$;

-- Who may post. Warehouse staff can post stock in and transfers; adjustments
-- need a branch manager, owner or admin; opening stock needs owner or admin.
create or replace function pos_private.can_post_doc(p_type public.pos_stock_doc_type, p_branch uuid)
returns boolean
language sql stable set search_path = ''
as $$
  select pos_private.has_role('owner', 'admin')
      or (p_type <> 'opening' and pos_private.has_role('branch_manager') and pos_private.in_my_branches(p_branch))
      or (p_type in ('receipt', 'transfer') and pos_private.has_role('warehouse') and pos_private.in_my_branches(p_branch))
$$;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------
create or replace function pos_private.location_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.branch_id is not null and not exists (
    select 1 from public.pos_branches b where b.id = new.branch_id and b.company_id = new.company_id) then
    raise exception 'Branch belongs to another company';
  end if;
  return new;
end;
$$;
create trigger pos_stock_locations_guard before insert or update on public.pos_stock_locations
  for each row execute function pos_private.location_guard();

create or replace function pos_private.lot_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  select p.company_id into new.company_id from public.pos_products p where p.id = new.product_id;
  return new;
end;
$$;
create trigger pos_lots_guard before insert or update on public.pos_lots
  for each row execute function pos_private.lot_guard();

create or replace function pos_private.moves_immutable()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'Stock movements cannot be changed or deleted; post an adjustment instead';
end;
$$;
create trigger pos_stock_moves_immutable before update or delete on public.pos_stock_moves
  for each row execute function pos_private.moves_immutable();

create or replace function pos_private.apply_stock_move()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  q  numeric;
  nm text;
  loc text;
begin
  insert into public.pos_stock_balances (company_id, location_id, product_id, lot_id, qty)
  values (new.company_id, new.location_id, new.product_id, new.lot_id, new.qty)
  on conflict (location_id, product_id, coalesce(lot_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set qty = public.pos_stock_balances.qty + excluded.qty, updated_at = now()
  returning qty into q;

  if q < 0 then
    select p.name into nm from public.pos_products p where p.id = new.product_id;
    select l.name into loc from public.pos_stock_locations l where l.id = new.location_id;
    raise exception 'Not enough stock of % in % (short by %)', nm, loc, -q;
  end if;
  return null;
end;
$$;
revoke execute on function pos_private.apply_stock_move() from public, anon, authenticated;
create trigger pos_stock_moves_apply after insert on public.pos_stock_moves
  for each row execute function pos_private.apply_stock_move();

create or replace function pos_private.stock_doc_guard()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  src public.pos_stock_locations;
  dst public.pos_stock_locations;
begin
  if tg_op = 'UPDATE' and old.status <> 'draft' then
    if old.status = 'in_transit' and new.status = 'received'
       and new.doc_type = old.doc_type and new.location_id = old.location_id
       and new.to_location_id = old.to_location_id then
      new.updated_at := now();
      return new;
    end if;
    raise exception 'Posted documents cannot be changed';
  end if;
  if tg_op = 'UPDATE' and new.doc_type <> old.doc_type then
    raise exception 'Document type cannot be changed';
  end if;

  if not exists (select 1 from public.pos_branches b where b.id = new.branch_id and b.company_id = new.company_id) then
    raise exception 'Branch not found';
  end if;
  select * into src from public.pos_stock_locations where id = new.location_id;
  if src.id is null or src.company_id <> new.company_id or src.type <> 'storage' or src.branch_id <> new.branch_id then
    raise exception 'Choose a stock location in the selected branch';
  end if;

  if new.doc_type = 'transfer' then
    select * into dst from public.pos_stock_locations where id = new.to_location_id;
    if dst.id is null or dst.company_id <> new.company_id or dst.type <> 'storage' then
      raise exception 'Choose where the stock is going';
    end if;
    if dst.id = src.id then
      raise exception 'Source and destination must be different locations';
    end if;
    new.to_branch_id := dst.branch_id;
  else
    new.to_location_id := null;
    new.to_branch_id := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
create trigger pos_stock_docs_guard before insert or update on public.pos_stock_docs
  for each row execute function pos_private.stock_doc_guard();

create or replace function pos_private.stock_line_guard()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  st  public.pos_stock_doc_status;
  cid uuid;
begin
  select d.status, d.company_id into st, cid
    from public.pos_stock_docs d where d.id = coalesce(new.doc_id, old.doc_id);

  if st is distinct from 'draft' then
    -- Receiving a transfer only records received_qty.
    if tg_op = 'UPDATE' and st = 'in_transit'
       and (to_jsonb(new) - 'received_qty') = (to_jsonb(old) - 'received_qty') then
      return new;
    end if;
    raise exception 'Lines of a posted document cannot be changed';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  new.company_id := cid;
  if not exists (select 1 from public.pos_products p where p.id = new.product_id and p.company_id = cid) then
    raise exception 'Product not found';
  end if;
  if new.lot_id is not null and not exists (
    select 1 from public.pos_lots l where l.id = new.lot_id and l.product_id = new.product_id) then
    raise exception 'Lot does not belong to this product';
  end if;
  return new;
end;
$$;
create trigger pos_stock_doc_lines_guard before insert or update or delete on public.pos_stock_doc_lines
  for each row execute function pos_private.stock_line_guard();

-- Locations are created automatically for new companies and branches.
create or replace function pos_private.ensure_locations()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'pos_companies' then
    insert into public.pos_stock_locations (company_id, branch_id, name, type)
    values (new.id, null, 'In transit', 'transit')
    on conflict do nothing;
  else
    insert into public.pos_stock_locations (company_id, branch_id, name, type, is_default)
    values (new.company_id, new.id, 'Main stock', 'storage', true)
    on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke execute on function pos_private.ensure_locations() from public, anon, authenticated;
create trigger pos_companies_locations after insert on public.pos_companies
  for each row execute function pos_private.ensure_locations();
create trigger pos_branches_locations after insert on public.pos_branches
  for each row execute function pos_private.ensure_locations();

insert into public.pos_stock_locations (company_id, branch_id, name, type)
select c.id, null, 'In transit', 'transit' from public.pos_companies c
on conflict do nothing;
insert into public.pos_stock_locations (company_id, branch_id, name, type, is_default)
select b.company_id, b.id, 'Main stock', 'storage', true from public.pos_branches b
on conflict do nothing;

-- Audit
create trigger pos_audit_stock_locations after insert or update or delete on public.pos_stock_locations
  for each row execute function pos_private.audit_row();
create trigger pos_audit_stock_docs after insert or update or delete on public.pos_stock_docs
  for each row execute function pos_private.audit_row();
create trigger pos_audit_stock_doc_lines after insert or update or delete on public.pos_stock_doc_lines
  for each row execute function pos_private.audit_row();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
revoke all on public.pos_stock_locations, public.pos_lots, public.pos_product_costs, public.pos_stock_moves,
              public.pos_stock_balances, public.pos_stock_docs, public.pos_stock_doc_lines
  from anon;

create policy "staff read locations" on public.pos_stock_locations
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));
create policy "owner/admin insert locations" on public.pos_stock_locations
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')) and type = 'storage');
create policy "owner/admin update locations" on public.pos_stock_locations
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')))
  with check (company_id = (select pos_private.company_id()));

create policy "staff read lots" on public.pos_lots
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));
create policy "staff read product costs" on public.pos_product_costs
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin', 'accountant', 'branch_manager', 'warehouse')));
create policy "staff read stock moves" on public.pos_stock_moves
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));
create policy "staff read stock balances" on public.pos_stock_balances
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));

create policy "back office reads stock docs" on public.pos_stock_docs
  for select to authenticated
  using (
    company_id = (select pos_private.company_id())
    and ((select pos_private.has_role('owner', 'admin', 'accountant'))
         or ((select pos_private.has_role('branch_manager', 'warehouse'))
             and (pos_private.in_my_branches(branch_id) or pos_private.in_my_branches(to_branch_id))))
  );
create policy "editors create draft docs" on public.pos_stock_docs
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and status = 'draft'
              and pos_private.can_edit_doc(doc_type, branch_id));
create policy "editors update draft docs" on public.pos_stock_docs
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and status = 'draft'
         and pos_private.can_edit_doc(doc_type, branch_id))
  with check (company_id = (select pos_private.company_id()) and status = 'draft'
              and pos_private.can_edit_doc(doc_type, branch_id));

create policy "read lines of visible docs" on public.pos_stock_doc_lines
  for select to authenticated
  using (exists (select 1 from public.pos_stock_docs d where d.id = doc_id));
create policy "editors add lines to drafts" on public.pos_stock_doc_lines
  for insert to authenticated
  with check (exists (select 1 from public.pos_stock_docs d
                       where d.id = doc_id and d.status = 'draft' and pos_private.can_edit_doc(d.doc_type, d.branch_id)));
create policy "editors change lines of drafts" on public.pos_stock_doc_lines
  for update to authenticated
  using (exists (select 1 from public.pos_stock_docs d
                  where d.id = doc_id and d.status = 'draft' and pos_private.can_edit_doc(d.doc_type, d.branch_id)))
  with check (exists (select 1 from public.pos_stock_docs d
                       where d.id = doc_id and d.status = 'draft' and pos_private.can_edit_doc(d.doc_type, d.branch_id)));
create policy "editors remove lines of drafts" on public.pos_stock_doc_lines
  for delete to authenticated
  using (exists (select 1 from public.pos_stock_docs d
                  where d.id = doc_id and d.status = 'draft' and pos_private.can_edit_doc(d.doc_type, d.branch_id)));
