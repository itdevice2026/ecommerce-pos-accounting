-- Phase 1 · Catalog: categories, products, variants (sellable units) and prices.
--
-- A product is what you stock (e.g. "Pork Liempo"). A variant is how it is sold
-- and scanned (e.g. "per kg" with a scale PLU, or "500 g pack" with a barcode).
-- Prices are per variant and channel (POS or online), VAT-inclusive, with an
-- optional branch override and an effective date.

create type public.pos_sold_by as enum ('piece', 'weight');
create type public.pos_channel as enum ('pos', 'online');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.pos_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.pos_companies (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  parent_id   uuid references public.pos_categories (id) on delete set null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  unique (company_id, name)
);
create index pos_categories_parent_id_idx on public.pos_categories (parent_id);
alter table public.pos_categories enable row level security;

create table public.pos_products (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.pos_companies (id) on delete cascade,
  sku            text not null check (length(trim(sku)) > 0),
  name           text not null check (length(trim(name)) > 0),
  description    text,
  category_id    uuid references public.pos_categories (id) on delete set null,
  sold_by        public.pos_sold_by not null default 'piece',
  base_uom       text not null default 'pc',
  tax_code_id    uuid references public.pos_tax_codes (id),
  track_stock    boolean not null default true,
  track_lots     boolean not null default false,
  reorder_point  numeric(14, 3) check (reorder_point is null or reorder_point >= 0),
  image_url      text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid(),
  updated_at     timestamptz not null default now(),
  unique (company_id, sku)
);
create index pos_products_category_id_idx on public.pos_products (category_id);
create index pos_products_tax_code_id_idx on public.pos_products (tax_code_id);
create index pos_products_name_idx on public.pos_products (company_id, lower(name));
alter table public.pos_products enable row level security;

create table public.pos_product_variants (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.pos_companies (id) on delete cascade,
  product_id          uuid not null references public.pos_products (id) on delete cascade,
  name                text not null check (length(trim(name)) > 0),
  barcode             text,
  plu                 text,
  uom                 text not null default 'pc',
  conversion_to_base  numeric(14, 6) not null default 1 check (conversion_to_base > 0),
  is_default          boolean not null default false,
  is_active           boolean not null default true,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index pos_product_variants_product_id_idx on public.pos_product_variants (product_id);
create unique index pos_product_variants_barcode_key on public.pos_product_variants (company_id, barcode) where barcode is not null;
create unique index pos_product_variants_plu_key on public.pos_product_variants (company_id, plu) where plu is not null;
create unique index pos_product_variants_one_default on public.pos_product_variants (product_id) where is_default;
alter table public.pos_product_variants enable row level security;

create table public.pos_prices (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.pos_companies (id) on delete cascade,
  variant_id  uuid not null references public.pos_product_variants (id) on delete cascade,
  channel     public.pos_channel not null,
  branch_id   uuid references public.pos_branches (id) on delete cascade,
  price       numeric(14, 2) not null check (price >= 0),
  valid_from  date not null default current_date,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid()
);
create unique index pos_prices_key on public.pos_prices
  (variant_id, channel, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), valid_from);
create index pos_prices_branch_id_idx on public.pos_prices (branch_id);
create index pos_prices_company_id_idx on public.pos_prices (company_id);
alter table public.pos_prices enable row level security;

-- ---------------------------------------------------------------------------
-- Integrity: child rows always carry their parent's company; updated_at.
-- ---------------------------------------------------------------------------
create or replace function pos_private.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger pos_products_touch before update on public.pos_products
  for each row execute function pos_private.touch_updated_at();
create trigger pos_product_variants_touch before update on public.pos_product_variants
  for each row execute function pos_private.touch_updated_at();

create or replace function pos_private.catalog_company_guard()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  parent_company uuid;
begin
  if tg_table_name = 'pos_product_variants' then
    select company_id into parent_company from public.pos_products where id = new.product_id;
  elsif tg_table_name = 'pos_prices' then
    select company_id into parent_company from public.pos_product_variants where id = new.variant_id;
    if new.branch_id is not null and not exists (
      select 1 from public.pos_branches b where b.id = new.branch_id and b.company_id = parent_company) then
      raise exception 'Branch belongs to another company';
    end if;
  elsif tg_table_name = 'pos_products' then
    if new.category_id is not null and not exists (
      select 1 from public.pos_categories c where c.id = new.category_id and c.company_id = new.company_id) then
      raise exception 'Category belongs to another company';
    end if;
    if new.tax_code_id is not null and not exists (
      select 1 from public.pos_tax_codes t where t.id = new.tax_code_id and t.company_id = new.company_id) then
      raise exception 'Tax code belongs to another company';
    end if;
    return new;
  end if;
  new.company_id := parent_company;
  return new;
end;
$$;

create trigger pos_products_company_guard before insert or update on public.pos_products
  for each row execute function pos_private.catalog_company_guard();
create trigger pos_product_variants_company_guard before insert or update on public.pos_product_variants
  for each row execute function pos_private.catalog_company_guard();
create trigger pos_prices_company_guard before insert or update on public.pos_prices
  for each row execute function pos_private.catalog_company_guard();

-- Audit
create trigger pos_audit_categories after insert or update or delete on public.pos_categories
  for each row execute function pos_private.audit_row();
create trigger pos_audit_products after insert or update or delete on public.pos_products
  for each row execute function pos_private.audit_row();
create trigger pos_audit_product_variants after insert or update or delete on public.pos_product_variants
  for each row execute function pos_private.audit_row();
create trigger pos_audit_prices after insert or update or delete on public.pos_prices
  for each row execute function pos_private.audit_row();

-- ---------------------------------------------------------------------------
-- RLS: all staff read the catalog; owner/admin maintain it.
-- No delete policies: deactivate instead, so sales history keeps its products.
-- ---------------------------------------------------------------------------
revoke all on public.pos_categories, public.pos_products, public.pos_product_variants, public.pos_prices from anon;

create policy "staff read categories" on public.pos_categories
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));
create policy "owner/admin insert categories" on public.pos_categories
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')));
create policy "owner/admin update categories" on public.pos_categories
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')))
  with check (company_id = (select pos_private.company_id()));

create policy "staff read products" on public.pos_products
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));
create policy "owner/admin insert products" on public.pos_products
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')));
create policy "owner/admin update products" on public.pos_products
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')))
  with check (company_id = (select pos_private.company_id()));

create policy "staff read variants" on public.pos_product_variants
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));
create policy "owner/admin insert variants" on public.pos_product_variants
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')));
create policy "owner/admin update variants" on public.pos_product_variants
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')))
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')));

create policy "staff read prices" on public.pos_prices
  for select to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.is_staff()));
create policy "owner/admin insert prices" on public.pos_prices
  for insert to authenticated
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')));
create policy "owner/admin update prices" on public.pos_prices
  for update to authenticated
  using (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')))
  with check (company_id = (select pos_private.company_id()) and (select pos_private.has_role('owner', 'admin')));

-- Variant and price rows take company_id from their parent (guard trigger runs
-- before the RLS check), so the company match above also blocks writes against
-- another company's products. pos_save_product checks ownership up front too:
create or replace function pos_private.assert_own_product(p_product uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.pos_products p
                  where p.id = p_product and p.company_id = pos_private.company_id()) then
    raise exception 'Product not found';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- pos_save_product: create or update a product, its variants and their base
-- prices in one transaction. Runs as the caller (security invoker), so the
-- RLS policies above decide whether they may save.
--
-- p = {
--   id?, sku, name, description?, category_id?, sold_by, base_uom, tax_code_id?,
--   track_stock, track_lots, reorder_point?, is_active,
--   variants: [{ id?, name, barcode?, plu?, uom, conversion_to_base, is_default,
--                is_active, pos_price?, online_price? }]
-- }
-- Variants missing from the list are deactivated (never deleted).
-- A changed price is recorded as a new row effective today.
-- ---------------------------------------------------------------------------
create or replace function public.pos_save_product(p jsonb)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  cid    uuid := pos_private.company_id();
  pid    uuid := nullif(p ->> 'id', '')::uuid;
  v      jsonb;
  vid    uuid;
  keep   uuid[] := '{}';
  ch     public.pos_channel;
  amount numeric;
  current_price numeric;
  defaults int;
begin
  if cid is null then
    raise exception 'Not linked to a company';
  end if;
  if jsonb_typeof(p -> 'variants') <> 'array' or jsonb_array_length(p -> 'variants') = 0 then
    raise exception 'Add at least one variant';
  end if;
  select count(*) into defaults from jsonb_array_elements(p -> 'variants') x
   where coalesce((x ->> 'is_default')::boolean, false);
  if defaults <> 1 then
    raise exception 'Mark exactly one variant as the default';
  end if;

  if pid is null then
    insert into public.pos_products (company_id, sku, name, description, category_id, sold_by, base_uom,
                                     tax_code_id, track_stock, track_lots, reorder_point, is_active)
    values (cid, trim(p ->> 'sku'), trim(p ->> 'name'), nullif(trim(p ->> 'description'), ''),
            nullif(p ->> 'category_id', '')::uuid, coalesce(p ->> 'sold_by', 'piece')::public.pos_sold_by,
            coalesce(nullif(p ->> 'base_uom', ''), 'pc'), nullif(p ->> 'tax_code_id', '')::uuid,
            coalesce((p ->> 'track_stock')::boolean, true), coalesce((p ->> 'track_lots')::boolean, false),
            nullif(p ->> 'reorder_point', '')::numeric, coalesce((p ->> 'is_active')::boolean, true))
    returning id into pid;
  else
    perform pos_private.assert_own_product(pid);
    update public.pos_products set
      sku = trim(p ->> 'sku'),
      name = trim(p ->> 'name'),
      description = nullif(trim(p ->> 'description'), ''),
      category_id = nullif(p ->> 'category_id', '')::uuid,
      sold_by = coalesce(p ->> 'sold_by', 'piece')::public.pos_sold_by,
      base_uom = coalesce(nullif(p ->> 'base_uom', ''), 'pc'),
      tax_code_id = nullif(p ->> 'tax_code_id', '')::uuid,
      track_stock = coalesce((p ->> 'track_stock')::boolean, true),
      track_lots = coalesce((p ->> 'track_lots')::boolean, false),
      reorder_point = nullif(p ->> 'reorder_point', '')::numeric,
      is_active = coalesce((p ->> 'is_active')::boolean, true)
    where id = pid;
    if not found then
      raise exception 'You are not allowed to edit products';
    end if;
    -- Clear the default flag first so the one-default index allows the swap.
    update public.pos_product_variants set is_default = false where product_id = pid and is_default;
  end if;

  for v in select * from jsonb_array_elements(p -> 'variants') loop
    vid := nullif(v ->> 'id', '')::uuid;
    if vid is null then
      insert into public.pos_product_variants (product_id, name, barcode, plu, uom, conversion_to_base,
                                               is_default, is_active, sort_order)
      values (pid, trim(v ->> 'name'), nullif(trim(v ->> 'barcode'), ''), nullif(trim(v ->> 'plu'), ''),
              coalesce(nullif(v ->> 'uom', ''), 'pc'), coalesce(nullif(v ->> 'conversion_to_base', '')::numeric, 1),
              coalesce((v ->> 'is_default')::boolean, false), coalesce((v ->> 'is_active')::boolean, true),
              cardinality(keep))
      returning id into vid;
    else
      update public.pos_product_variants set
        name = trim(v ->> 'name'),
        barcode = nullif(trim(v ->> 'barcode'), ''),
        plu = nullif(trim(v ->> 'plu'), ''),
        uom = coalesce(nullif(v ->> 'uom', ''), 'pc'),
        conversion_to_base = coalesce(nullif(v ->> 'conversion_to_base', '')::numeric, 1),
        is_default = coalesce((v ->> 'is_default')::boolean, false),
        is_active = coalesce((v ->> 'is_active')::boolean, true),
        sort_order = cardinality(keep)
      where id = vid and product_id = pid;
      if not found then
        raise exception 'Variant % does not belong to this product', vid;
      end if;
    end if;
    keep := keep || vid;

    foreach ch in array array['pos', 'online']::public.pos_channel[] loop
      amount := nullif(v ->> (ch::text || '_price'), '')::numeric;
      continue when amount is null;
      select pr.price into current_price
        from public.pos_prices pr
       where pr.variant_id = vid and pr.channel = ch and pr.branch_id is null and pr.valid_from <= current_date
       order by pr.valid_from desc limit 1;
      if current_price is distinct from amount then
        insert into public.pos_prices (variant_id, channel, price, valid_from)
        values (vid, ch, amount, current_date)
        on conflict (variant_id, channel, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), valid_from)
        do update set price = excluded.price;
      end if;
    end loop;
  end loop;

  update public.pos_product_variants set is_active = false, is_default = false
   where product_id = pid and not (id = any (keep));

  return pid;
end;
$$;
revoke execute on function public.pos_save_product(jsonb) from public, anon;
grant execute on function public.pos_save_product(jsonb) to authenticated;

-- Current base price per variant and channel (no branch override), for lists.
create or replace view public.pos_current_prices
with (security_invoker = true)
as
select distinct on (pr.variant_id, pr.channel)
       pr.variant_id, pr.channel, pr.price, pr.valid_from
  from public.pos_prices pr
 where pr.branch_id is null and pr.valid_from <= current_date
 order by pr.variant_id, pr.channel, pr.valid_from desc;
revoke all on public.pos_current_prices from anon;
grant select on public.pos_current_prices to authenticated;
