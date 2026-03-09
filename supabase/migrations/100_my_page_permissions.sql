-- ============================================================================
-- 100: get_my_page_permissions — accessible by ALL authenticated org members
--
-- Returns only the current user's page-level permissions.
-- Unlike get_role_permissions_with_defaults (admin-only), this function
-- can be called by any org member to check their own page access.
-- ============================================================================

-- ⚠️  NOTE: Migration 101 extends this function to 10 pages.
--    If you CREATE OR REPLACE this function in a later migration,
--    make sure to include ALL pages from _pages array in 101.
CREATE OR REPLACE FUNCTION public.get_my_page_permissions(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role TEXT;
  _result JSONB := '[]'::jsonb;
  _pages TEXT[] := ARRAY['page:dashboard','page:members','page:ai'];
  _p TEXT;
  _rp RECORD;
BEGIN
  -- Get calling user's role in this org
  SELECT role INTO _role
  FROM organization_members
  WHERE organization_id = _org_id
    AND user_id = auth.uid();

  -- Not a member → empty array
  IF _role IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR _p IN SELECT unnest(_pages) LOOP
    -- Check for custom override first
    SELECT * INTO _rp
    FROM role_permissions
    WHERE organization_id = _org_id
      AND table_name = _p
      AND role = _role;

    IF _rp IS NOT NULL THEN
      _result := _result || jsonb_build_object(
        'page', _p,
        'can_access', _rp.can_select
      );
    ELSE
      _result := _result || jsonb_build_object(
        'page', _p,
        'can_access', private.default_permission(_role, _p, 'select')
      );
    END IF;
  END LOOP;

  RETURN _result;
END;
$$;
