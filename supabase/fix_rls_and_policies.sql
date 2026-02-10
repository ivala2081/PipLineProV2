-- ============================================================================
-- FIX SCRIPT: Ensures private schema, helper functions, RLS, and policies
-- are all correctly in place. Safe to run multiple times (idempotent).
--
-- Paste this entire script into Supabase SQL Editor and run it.
-- ============================================================================

-- 1. Create private schema (if it doesn't exist)
create schema if not exists private;

-- 2. Create/replace all helper functions

create or replace function private.get_user_system_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select system_role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function private.is_god()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and system_role = 'god'
  )
$$;

create or replace function private.get_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
$$;

create or replace function private.is_org_admin(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = _org_id
      and user_id = auth.uid()
      and role = 'admin'
  )
$$;

-- 3. Enable RLS on all tables (idempotent)
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;

-- 4. Drop ALL existing policies (safe with IF EXISTS)

-- profiles
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;

-- organizations
drop policy if exists "organizations_select" on public.organizations;
drop policy if exists "organizations_insert" on public.organizations;
drop policy if exists "organizations_update" on public.organizations;
drop policy if exists "organizations_delete" on public.organizations;

-- organization_members
drop policy if exists "org_members_select" on public.organization_members;
drop policy if exists "org_members_insert" on public.organization_members;
drop policy if exists "org_members_update" on public.organization_members;
drop policy if exists "org_members_delete" on public.organization_members;

-- organization_invitations
drop policy if exists "org_invitations_select" on public.organization_invitations;
drop policy if exists "org_invitations_insert" on public.organization_invitations;
drop policy if exists "org_invitations_update" on public.organization_invitations;
drop policy if exists "org_invitations_delete" on public.organization_invitations;

-- 5. Recreate ALL policies (from migration 007)

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------

create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_god())
    or (
      id in (
        select user_id
        from public.organization_members
        where organization_id in (select private.get_user_org_ids())
      )
      and system_role != 'god'
    )
  );

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_god())
  )
  with check (
    id = (select auth.uid())
    or (select private.is_god())
  );

create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (false);

create policy "profiles_delete" on public.profiles
  for delete to authenticated
  using (false);

-- --------------------------------------------------------------------------
-- organizations
-- --------------------------------------------------------------------------

create policy "organizations_select" on public.organizations
  for select to authenticated
  using (
    (select private.is_god())
    or id in (select private.get_user_org_ids())
  );

create policy "organizations_insert" on public.organizations
  for insert to authenticated
  with check (
    (select private.is_god())
  );

create policy "organizations_update" on public.organizations
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(id))
  );

create policy "organizations_delete" on public.organizations
  for delete to authenticated
  using ((select private.is_god()));

-- --------------------------------------------------------------------------
-- organization_members
-- --------------------------------------------------------------------------

create policy "org_members_select" on public.organization_members
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "org_members_insert" on public.organization_members
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "org_members_update" on public.organization_members
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "org_members_delete" on public.organization_members
  for delete to authenticated
  using (
    (select private.is_god())
    or (
      (select private.is_org_admin(organization_id))
      and user_id != (select auth.uid())
    )
  );

-- --------------------------------------------------------------------------
-- organization_invitations
-- --------------------------------------------------------------------------

create policy "org_invitations_select" on public.organization_invitations
  for select to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "org_invitations_insert" on public.organization_invitations
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "org_invitations_update" on public.organization_invitations
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "org_invitations_delete" on public.organization_invitations
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- ============================================================================
-- 6. Verification: Check everything is in place
-- ============================================================================

select 'FUNCTIONS' as check_type, routine_name
from information_schema.routines
where routine_schema = 'private'
order by routine_name;

select 'POLICIES' as check_type, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'organizations', 'organization_members', 'organization_invitations')
order by tablename, policyname;

select 'PROFILE' as check_type, id::text, system_role, display_name
from public.profiles
limit 5;
