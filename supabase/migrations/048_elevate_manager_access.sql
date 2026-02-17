-- ============================================================================
-- 048: Elevate Manager Role Access
--
-- Give admin/manager org roles the same access as god (hidden) for:
--   1. Organizations INSERT — allow org admins/managers to create orgs
--   2. Login attempts SELECT — allow org admins/managers to read all attempts
--   3. God audit log SELECT — allow org admins/managers to read audit logs
--   4. Update add_organization_member RPC to accept 'manager' role
-- ============================================================================

-- ============================================================================
-- 1. Organizations INSERT — allow org admins/managers (is_org_admin checks any org)
-- ============================================================================

DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- 2. Login attempts — allow admin/manager to read all login attempts
-- ============================================================================

DROP POLICY IF EXISTS "God admins can read all login attempts" ON public.login_attempts;
CREATE POLICY "Admins can read all login attempts" ON public.login_attempts
  FOR SELECT TO authenticated
  USING (
    private.is_god()
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- 3. God audit log — allow admin/manager to read audit logs (skip if table missing)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'god_audit_log') THEN
    DROP POLICY IF EXISTS "god_audit_log_select" ON public.god_audit_log;
    CREATE POLICY "god_audit_log_select" ON public.god_audit_log
      FOR SELECT TO authenticated
      USING (
        private.is_god()
        OR EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'manager')
        )
      );
  END IF;
END;
$$;

-- ============================================================================
-- 4. Update add_organization_member RPC to accept 'manager' role
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
  if not (private.is_god() or private.is_org_admin(_org_id)) then
    raise exception 'Permission denied: you must be a god or org admin/manager';
  end if;

  -- 2. Validate role
  if _role not in ('admin', 'manager', 'operation') then
    raise exception 'Invalid role: must be admin, manager, or operation';
  end if;

  -- 3. Check if user already exists
  select id into _user_id
  from auth.users
  where email = lower(trim(_email));

  -- 4. If user doesn't exist, create via invite (returns new user id)
  if _user_id is null then
    _user_id := (
      select id from auth.users where email = lower(trim(_email))
    );
    if _user_id is null then
      raise exception 'User not found with email: %', _email;
    end if;
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
