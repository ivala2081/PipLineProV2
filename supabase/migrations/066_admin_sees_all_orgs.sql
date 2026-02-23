-- ============================================================================
-- 066: Admin Role Sees All Organizations
--
-- Changes:
--   1. Add private.is_any_org_admin() helper — true if current user has role='admin'
--      in ANY organization (not scoped to a specific org)
--   2. Update organizations_select policy to grant admins full visibility,
--      matching god-level read access on the organizations table
-- ============================================================================

-- ============================================================================
-- 1. Helper: is the current user an admin in any organization?
-- ============================================================================

CREATE OR REPLACE FUNCTION private.is_any_org_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- ============================================================================
-- 2. Update organizations SELECT policy
--    Before: god | own orgs
--    After:  god | any-org-admin (all orgs) | own orgs
-- ============================================================================

DROP POLICY IF EXISTS "organizations_select" ON public.organizations;

CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_any_org_admin())
    OR id IN (SELECT private.get_user_org_ids())
  );
