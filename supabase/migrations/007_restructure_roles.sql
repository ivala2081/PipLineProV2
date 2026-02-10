-- ============================================================================
-- 007: Role Restructuring — Admin / Operation + God Hiding
--
-- Changes:
--   1. Rename 'member' → 'operation' in org_members and org_invitations
--   2. Add private.is_org_admin() helper
--   3. Drop all RLS policies from 005, recreate with:
--      - Org admins can manage members + invitations within their org
--      - God profiles hidden from non-gods
-- ============================================================================

-- ============================================================================
-- 1. Rename 'member' → 'operation'
-- ============================================================================

-- Update existing rows first
update public.organization_members set role = 'operation' where role = 'member';
update public.organization_invitations set role = 'operation' where role = 'member';

-- Recreate CHECK constraints
alter table public.organization_members drop constraint organization_members_role_check;
alter table public.organization_members
  add constraint organization_members_role_check check (role in ('admin', 'operation'));
alter table public.organization_members alter column role set default 'operation';

alter table public.organization_invitations drop constraint organization_invitations_role_check;
alter table public.organization_invitations
  add constraint organization_invitations_role_check check (role in ('admin', 'operation'));

-- ============================================================================
-- 2. New helper: is current user an admin of a given org?
-- ============================================================================

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

-- ============================================================================
-- 3. Drop ALL existing RLS policies (from migration 005)
-- ============================================================================

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

-- ============================================================================
-- 4. Recreate RLS Policies
-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------

-- SELECT: own profile, gods see all, co-members visible (god profiles hidden from non-gods)
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

-- UPDATE: own profile or god
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

-- INSERT: trigger only
create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (false);

-- DELETE: no one (cascade from auth.users)
create policy "profiles_delete" on public.profiles
  for delete to authenticated
  using (false);

-- --------------------------------------------------------------------------
-- organizations
-- --------------------------------------------------------------------------

-- SELECT: gods see all; members see their own orgs
create policy "organizations_select" on public.organizations
  for select to authenticated
  using (
    (select private.is_god())
    or id in (select private.get_user_org_ids())
  );

-- INSERT: gods only (they create new orgs)
create policy "organizations_insert" on public.organizations
  for insert to authenticated
  with check (
    (select private.is_god())
  );

-- UPDATE: gods or org admins
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

-- DELETE: gods only
create policy "organizations_delete" on public.organizations
  for delete to authenticated
  using ((select private.is_god()));

-- --------------------------------------------------------------------------
-- organization_members
-- --------------------------------------------------------------------------

-- SELECT: gods see all; co-members see their own orgs
create policy "org_members_select" on public.organization_members
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

-- INSERT: gods or org admins of the target org
create policy "org_members_insert" on public.organization_members
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- UPDATE: gods or org admins of the target org
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

-- DELETE: gods or org admins (but admins cannot delete themselves)
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

-- SELECT: gods or org admins
create policy "org_invitations_select" on public.organization_invitations
  for select to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- INSERT: gods or org admins
create policy "org_invitations_insert" on public.organization_invitations
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- UPDATE: gods or org admins
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

-- DELETE: gods or org admins
create policy "org_invitations_delete" on public.organization_invitations
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );
