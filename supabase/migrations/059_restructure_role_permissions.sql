-- ============================================================================
-- 059: Restructure Role Permissions — Differentiate Manager from Admin
--
-- Changes:
--   1. Revert is_org_admin() to check only 'admin' (undo migration 045)
--   2. Create is_org_admin_or_manager() for shared admin+manager access
--   3. Update member/invitation policies to use is_org_admin_or_manager()
--   4. Update transfer DELETE policy to use is_org_admin_or_manager()
--   5. Restrict accounting policies to admin+manager (exclude operation)
--   6. Revert organizations INSERT to god-only (undo migration 048)
--   7. Update add_organization_member RPC: manager cannot assign admin role
--
-- After this migration:
--   - PSPs, PSP rates, PSP settlements: admin-only (via is_org_admin)
--   - Organizations UPDATE: admin-only (via is_org_admin)
--   - Organizations INSERT: god-only
--   - Member/invitation management: admin + manager (via is_org_admin_or_manager)
--   - Transfer DELETE: admin + manager
--   - Accounting: admin + manager
--   - Login attempts / audit log: admin + manager (unchanged from 048)
-- ============================================================================

-- ============================================================================
-- 1. Revert is_org_admin() to check ONLY admin role
-- ============================================================================

CREATE OR REPLACE FUNCTION private.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- ============================================================================
-- 2. Create is_org_admin_or_manager() for shared access
-- ============================================================================

CREATE OR REPLACE FUNCTION private.is_org_admin_or_manager(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'manager')
  )
$$;

-- ============================================================================
-- 3. Update organization_members policies → is_org_admin_or_manager
-- ============================================================================

DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
CREATE POLICY "org_members_insert" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "org_members_update" ON public.organization_members;
CREATE POLICY "org_members_update" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "org_members_delete" ON public.organization_members;
CREATE POLICY "org_members_delete" ON public.organization_members
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (
      (SELECT private.is_org_admin_or_manager(organization_id))
      AND user_id != (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 4. Update organization_invitations policies → is_org_admin_or_manager
-- ============================================================================

DROP POLICY IF EXISTS "org_invitations_select" ON public.organization_invitations;
CREATE POLICY "org_invitations_select" ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "org_invitations_insert" ON public.organization_invitations;
CREATE POLICY "org_invitations_insert" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "org_invitations_update" ON public.organization_invitations;
CREATE POLICY "org_invitations_update" ON public.organization_invitations
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "org_invitations_delete" ON public.organization_invitations;
CREATE POLICY "org_invitations_delete" ON public.organization_invitations
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

-- ============================================================================
-- 5. Update transfers DELETE policy → is_org_admin_or_manager
-- ============================================================================

DROP POLICY IF EXISTS "transfers_delete_admin" ON public.transfers;
CREATE POLICY "transfers_delete_admin_or_manager" ON public.transfers
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

-- ============================================================================
-- 6. Restrict accounting_entries to admin + manager (exclude operation)
-- ============================================================================

DROP POLICY IF EXISTS "acct_entries_select" ON public.accounting_entries;
CREATE POLICY "acct_entries_select" ON public.accounting_entries
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "acct_entries_insert" ON public.accounting_entries;
CREATE POLICY "acct_entries_insert" ON public.accounting_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "acct_entries_update" ON public.accounting_entries;
CREATE POLICY "acct_entries_update" ON public.accounting_entries
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "acct_entries_delete" ON public.accounting_entries;
CREATE POLICY "acct_entries_delete" ON public.accounting_entries
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

-- ============================================================================
-- 7. Restrict accounting_monthly_config to admin + manager (exclude operation)
-- ============================================================================

DROP POLICY IF EXISTS "acct_config_select" ON public.accounting_monthly_config;
CREATE POLICY "acct_config_select" ON public.accounting_monthly_config
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "acct_config_insert" ON public.accounting_monthly_config;
CREATE POLICY "acct_config_insert" ON public.accounting_monthly_config
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "acct_config_update" ON public.accounting_monthly_config;
CREATE POLICY "acct_config_update" ON public.accounting_monthly_config
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "acct_config_delete" ON public.accounting_monthly_config;
CREATE POLICY "acct_config_delete" ON public.accounting_monthly_config
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

-- ============================================================================
-- 8. Revert organizations INSERT to god-only (undo migration 048)
-- ============================================================================

DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
  );

-- ============================================================================
-- 9. Update add_organization_member RPC — manager cannot assign admin role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_organization_member(
  _org_id uuid,
  _email text,
  _role text DEFAULT 'operation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _user_id uuid;
  _created boolean := false;
begin
  -- 1. Permission check: caller must be god or admin/manager of the target org
  if not (private.is_god() or private.is_org_admin_or_manager(_org_id)) then
    raise exception 'Permission denied: you must be a god or org admin/manager';
  end if;

  -- 2. Validate role
  if _role not in ('admin', 'manager', 'operation') then
    raise exception 'Invalid role: must be admin, manager, or operation';
  end if;

  -- 3. Manager cannot assign admin role (only god and admin can)
  if not private.is_god() and not private.is_org_admin(_org_id) then
    if _role = 'admin' then
      raise exception 'Managers cannot assign the admin role';
    end if;
  end if;

  -- 4. Check if user already exists
  select id into _user_id
  from auth.users
  where email = lower(trim(_email));

  if _user_id is null then
    raise exception 'User not found with email: %', _email;
  end if;

  -- 5. Check for existing membership
  if exists (
    select 1 from public.organization_members
    where organization_id = _org_id and user_id = _user_id
  ) then
    raise exception 'User is already a member of this organization';
  end if;

  -- 6. Insert membership
  insert into public.organization_members (organization_id, user_id, role)
  values (_org_id, _user_id, _role);

  _created := true;

  return jsonb_build_object(
    'success', true,
    'user_id', _user_id,
    'created', _created
  );

exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
end;
$$;
