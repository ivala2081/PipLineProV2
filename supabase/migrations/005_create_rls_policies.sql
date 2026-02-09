-- ============================================================================
-- 005: Private schema, security definer helpers, and ALL RLS policies
-- ============================================================================

-- Private schema (not exposed by PostgREST / Supabase client)
create schema if not exists private;

-- ============================================================================
-- Security Definer Helper Functions
-- These bypass RLS (avoiding infinite recursion) and are cached per-statement.
-- ============================================================================

-- Returns system_role of the current authenticated user
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

-- Returns true if the current user is a god admin
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

-- Returns all organization IDs the current user belongs to
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

-- ============================================================================
-- RLS Policies: profiles
-- ============================================================================

-- SELECT: users see own profile; gods see all
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_god())
  );

-- UPDATE: users update own profile; gods update any
-- NOTE: system_role changes are protected by application logic,
-- not RLS (since gods need to promote/demote users).
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

-- INSERT: handled by trigger only; block direct inserts
create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (false);

-- DELETE: no one deletes profiles (cascade from auth.users handles this)
create policy "profiles_delete" on public.profiles
  for delete to authenticated
  using (false);

-- ============================================================================
-- RLS Policies: organizations
-- ============================================================================

-- SELECT: gods see all; members see their own orgs
create policy "organizations_select" on public.organizations
  for select to authenticated
  using (
    (select private.is_god())
    or id in (select private.get_user_org_ids())
  );

-- INSERT: gods only
create policy "organizations_insert" on public.organizations
  for insert to authenticated
  with check (
    (select private.is_god())
  );

-- UPDATE: gods only
create policy "organizations_update" on public.organizations
  for update to authenticated
  using ((select private.is_god()))
  with check ((select private.is_god()));

-- DELETE: gods only
create policy "organizations_delete" on public.organizations
  for delete to authenticated
  using ((select private.is_god()));

-- ============================================================================
-- RLS Policies: organization_members
-- ============================================================================

-- SELECT: gods see all; users see co-members in their own orgs
create policy "org_members_select" on public.organization_members
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

-- INSERT: gods only
create policy "org_members_insert" on public.organization_members
  for insert to authenticated
  with check (
    (select private.is_god())
  );

-- UPDATE: gods only
create policy "org_members_update" on public.organization_members
  for update to authenticated
  using ((select private.is_god()))
  with check ((select private.is_god()));

-- DELETE: gods only
create policy "org_members_delete" on public.organization_members
  for delete to authenticated
  using ((select private.is_god()));

-- ============================================================================
-- RLS Policies: organization_invitations
-- ============================================================================

-- ALL operations: gods only
create policy "org_invitations_select" on public.organization_invitations
  for select to authenticated
  using ((select private.is_god()));

create policy "org_invitations_insert" on public.organization_invitations
  for insert to authenticated
  with check ((select private.is_god()));

create policy "org_invitations_update" on public.organization_invitations
  for update to authenticated
  using ((select private.is_god()))
  with check ((select private.is_god()));

create policy "org_invitations_delete" on public.organization_invitations
  for delete to authenticated
  using ((select private.is_god()));
