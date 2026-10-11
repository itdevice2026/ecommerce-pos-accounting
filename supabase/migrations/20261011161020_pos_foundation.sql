-- Phase 0 · Foundation: companies, branches, user roles and RLS helpers.
-- Lives in the shared bom-system project, so every object uses the pos_ prefix.
-- Helper functions live in the non-exposed `pos_private` schema so they are not
-- callable via the REST API.

create schema if not exists pos_private;
grant usage on schema pos_private to authenticated, anon;

create type public.pos_app_role as enum
  ('owner', 'admin', 'accountant', 'branch_manager', 'cashier', 'warehouse', 'customer');
create type public.pos_branch_type as enum ('store', 'warehouse', 'online_hub');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.pos_companies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  tin            text,
  vat_registered boolean not null default true,
  address        text,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);
alter table public.pos_companies enable row level security;

create table public.pos_branches (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.pos_companies (id) on delete restrict,
  code        text not null,
  name        text not null,
  type        public.pos_branch_type not null default 'store',
  address     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  unique (company_id, code)
);
alter table public.pos_branches enable row level security;

create table public.pos_user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  company_id  uuid not null references public.pos_companies (id) on delete cascade,
  role        public.pos_app_role not null,
  branch_ids  uuid[] not null default '{}',
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  unique (user_id, company_id)
);
create index pos_user_roles_company_id_idx on public.pos_user_roles (company_id);
alter table public.pos_user_roles enable row level security;

-- ---------------------------------------------------------------------------
-- Identity helpers used by RLS policies.
-- They read the caller's row in pos_user_roles. No custom JWT hook is used,
-- because this project is shared with other apps and a hook failure would block
-- every app's sign-in.
-- ---------------------------------------------------------------------------
create or replace function pos_private.my_role_row()
returns public.pos_user_roles
language sql stable security definer set search_path = ''
as $$
  select ur.*
    from public.pos_user_roles ur
   where ur.user_id = (select auth.uid())
   order by ur.created_at
   limit 1
$$;

create or replace function pos_private.company_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select (pos_private.my_role_row()).company_id
$$;

create or replace function pos_private.app_role()
returns public.pos_app_role
language sql stable security definer set search_path = ''
as $$
  select (pos_private.my_role_row()).role
$$;

create or replace function pos_private.branch_ids()
returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce((pos_private.my_role_row()).branch_ids, '{}')
$$;

create or replace function pos_private.has_role(variadic roles public.pos_app_role[])
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(pos_private.app_role() = any (roles), false)
$$;

create or replace function pos_private.is_staff()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(pos_private.app_role() <> 'customer', false)
$$;

create or replace function pos_private.can_see_branch(p_branch uuid)
returns boolean
language sql stable set search_path = ''
as $$
  select pos_private.has_role('owner', 'admin', 'accountant') or p_branch = any (pos_private.branch_ids())
$$;
