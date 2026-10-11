-- Phase 0 · Foundation: companies, branches, user roles, JWT helpers, access-token hook
-- Helper functions live in the non-exposed `private` schema so they are not callable via the REST API.

create schema if not exists private;
grant usage on schema private to authenticated, anon;

create type public.app_role as enum
  ('owner', 'admin', 'accountant', 'branch_manager', 'cashier', 'warehouse', 'customer');
create type public.branch_type as enum ('store', 'warehouse', 'online_hub');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.companies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  tin            text,
  vat_registered boolean not null default true,
  address        text,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);
alter table public.companies enable row level security;

create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete restrict,
  code        text not null,
  name        text not null,
  type        public.branch_type not null default 'store',
  address     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  unique (company_id, code)
);
alter table public.branches enable row level security;

create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  role        public.app_role not null,
  branch_ids  uuid[] not null default '{}',
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  unique (user_id, company_id)
);
create index user_roles_company_id_idx on public.user_roles (company_id);
alter table public.user_roles enable row level security;

-- ---------------------------------------------------------------------------
-- Identity helpers used by RLS policies.
-- They read the custom JWT claims added by the access-token hook; if the token
-- predates the hook (or the hook is not enabled yet) they fall back to user_roles.
-- ---------------------------------------------------------------------------
create or replace function private.company_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select case
    when auth.jwt() ? 'company_id' then nullif(auth.jwt() ->> 'company_id', '')::uuid
    else (select ur.company_id from public.user_roles ur
           where ur.user_id = (select auth.uid()) order by ur.created_at limit 1)
  end
$$;

create or replace function private.app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select case
    when auth.jwt() ? 'app_role' then nullif(auth.jwt() ->> 'app_role', '')::public.app_role
    else (select ur.role from public.user_roles ur
           where ur.user_id = (select auth.uid()) order by ur.created_at limit 1)
  end
$$;

create or replace function private.branch_ids()
returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(case
    when auth.jwt() ? 'branch_ids' then
      (select array_agg(x::uuid) from jsonb_array_elements_text(auth.jwt() -> 'branch_ids') as x)
    else (select ur.branch_ids from public.user_roles ur
           where ur.user_id = (select auth.uid()) order by ur.created_at limit 1)
  end, '{}')
$$;

create or replace function private.has_role(variadic roles public.app_role[])
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(private.app_role() = any (roles), false)
$$;

create or replace function private.is_staff()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(private.app_role() <> 'customer', false)
$$;

create or replace function private.can_see_branch(p_branch uuid)
returns boolean
language sql stable set search_path = ''
as $$
  select private.has_role('owner', 'admin', 'accountant') or p_branch = any (private.branch_ids())
$$;

-- ---------------------------------------------------------------------------
-- Custom access-token hook: copies role, company and branches into the JWT.
-- Enable it in the dashboard: Authentication → Hooks → Customize Access Token.
-- ---------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  claims jsonb := event -> 'claims';
  r record;
begin
  select ur.role, ur.company_id, ur.branch_ids into r
    from public.user_roles ur
   where ur.user_id = (event ->> 'user_id')::uuid
   order by ur.created_at
   limit 1;

  if found then
    claims := claims || jsonb_build_object(
      'app_role',   r.role,
      'company_id', r.company_id,
      'branch_ids', to_jsonb(r.branch_ids)
    );
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on table public.user_roles to supabase_auth_admin;

create policy "auth admin reads roles for token hook"
  on public.user_roles for select to supabase_auth_admin using (true);
