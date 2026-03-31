-- ============================================================================
-- 117: Add page:transfer-fix and page:trash to permission system
--
-- Allows admins to toggle access for Transfer Fix page and Trash tab
-- per role via the Security panel.
-- Default: admin + manager only.
-- ============================================================================

-- ============================================================================
-- 1. Update default_permission to include new page entries
-- ============================================================================

CREATE OR REPLACE FUNCTION private.default_permission(
  _role TEXT, _table TEXT, _action TEXT
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    -- ══════════════════════════════════════════════════════
    -- PAGE-LEVEL PERMISSIONS (only select = can view)
    -- ══════════════════════════════════════════════════════

    -- Dashboard: all roles
    WHEN _table = 'page:dashboard' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'page:dashboard' THEN false

    -- Members page: all roles
    WHEN _table = 'page:members' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'page:members' THEN false

    -- AI/Future page: all roles
    WHEN _table = 'page:ai' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'page:ai' THEN false

    -- Transfers page: all roles
    WHEN _table = 'page:transfers' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'page:transfers' THEN false

    -- Transfer Fix page: admin + manager
    WHEN _table = 'page:transfer-fix' AND _action = 'select'
      THEN _role IN ('admin','manager')
    WHEN _table = 'page:transfer-fix' THEN false

    -- Trash page: admin + manager
    WHEN _table = 'page:trash' AND _action = 'select'
      THEN _role IN ('admin','manager')
    WHEN _table = 'page:trash' THEN false

    -- Accounting page: admin, manager, ik
    WHEN _table = 'page:accounting' AND _action = 'select'
      THEN _role IN ('admin','manager','ik')
    WHEN _table = 'page:accounting' THEN false

    -- PSPs page: admin only
    WHEN _table = 'page:psps' AND _action = 'select'
      THEN _role = 'admin'
    WHEN _table = 'page:psps' THEN false

    -- HR page: admin, ik
    WHEN _table = 'page:hr' AND _action = 'select'
      THEN _role IN ('admin','ik')
    WHEN _table = 'page:hr' THEN false

    -- Organizations page: admin only
    WHEN _table = 'page:organizations' AND _action = 'select'
      THEN _role = 'admin'
    WHEN _table = 'page:organizations' THEN false

    -- Security page: admin, manager
    WHEN _table = 'page:security' AND _action = 'select'
      THEN _role IN ('admin','manager')
    WHEN _table = 'page:security' THEN false

    -- Audit page: admin, manager
    WHEN _table = 'page:audit' AND _action = 'select'
      THEN _role IN ('admin','manager')
    WHEN _table = 'page:audit' THEN false

    -- ══════════════════════════════════════════════════════
    -- TABLE-LEVEL PERMISSIONS
    -- ══════════════════════════════════════════════════════

    -- transfers: all org members SELECT/INSERT/UPDATE, admin+manager+ik DELETE
    WHEN _table = 'transfers' AND _action IN ('select','insert','update')
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'transfers' AND _action = 'delete'
      THEN _role IN ('admin','manager','ik')

    -- transfer_audit_log: all org members SELECT only
    WHEN _table = 'transfer_audit_log' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'transfer_audit_log'
      THEN false

    -- psps: all SELECT, admin only INSERT/UPDATE/DELETE
    WHEN _table = 'psps' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'psps'
      THEN _role = 'admin'

    -- psp_commission_rates: all SELECT, admin only INSERT/DELETE
    WHEN _table = 'psp_commission_rates' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'psp_commission_rates'
      THEN _role = 'admin'

    -- psp_settlements: all SELECT, admin only INSERT/UPDATE/DELETE
    WHEN _table = 'psp_settlements' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'psp_settlements'
      THEN _role = 'admin'

    -- accounting_entries: admin+manager+ik all ops
    WHEN _table = 'accounting_entries'
      THEN _role IN ('admin','manager','ik')

    -- accounting_monthly_config: admin+manager+ik all ops
    WHEN _table = 'accounting_monthly_config'
      THEN _role IN ('admin','manager','ik')

    -- hr tables: admin+manager+ik all ops
    WHEN _table IN (
      'hr_employees','hr_employee_documents','hr_bonus_agreements',
      'hr_bonus_payments','hr_attendance','hr_salary_payments',
      'hr_settings','hr_leaves','hr_mt_config','hr_re_config'
    ) THEN _role IN ('admin','manager','ik')

    -- organizations: all SELECT, admin UPDATE, god-only INSERT/DELETE
    WHEN _table = 'organizations' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'organizations' AND _action = 'update'
      THEN _role = 'admin'
    WHEN _table = 'organizations'
      THEN false

    -- organization_members: all SELECT, admin+manager+ik manage
    WHEN _table = 'organization_members' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'organization_members'
      THEN _role IN ('admin','manager','ik')

    -- organization_invitations: admin+manager+ik all ops
    WHEN _table = 'organization_invitations'
      THEN _role IN ('admin','manager','ik')

    ELSE false
  END
$$;

-- ============================================================================
-- 2. Update get_role_permissions_with_defaults to include new entries
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_role_permissions_with_defaults(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result JSONB := '[]'::jsonb;
  _tables TEXT[] := ARRAY[
    'page:dashboard','page:members','page:ai',
    'page:transfers','page:transfer-fix','page:trash',
    'page:accounting','page:psps','page:hr',
    'page:organizations','page:security','page:audit',
    'transfers','transfer_audit_log',
    'psps','psp_commission_rates','psp_settlements',
    'accounting_entries','accounting_monthly_config',
    'hr_employees','hr_employee_documents','hr_bonus_agreements',
    'hr_bonus_payments','hr_attendance','hr_salary_payments',
    'hr_settings','hr_leaves','hr_mt_config','hr_re_config',
    'organizations','organization_members','organization_invitations'
  ];
  _roles TEXT[] := ARRAY['admin','manager','operation','ik'];
  _t TEXT;
  _r TEXT;
  _rp RECORD;
BEGIN
  -- Permission check
  IF NOT (private.is_god() OR private.is_org_admin(_org_id)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  FOR _t IN SELECT unnest(_tables) LOOP
    FOR _r IN SELECT unnest(_roles) LOOP
      SELECT * INTO _rp
      FROM role_permissions
      WHERE organization_id = _org_id
        AND table_name = _t
        AND role = _r;

      IF _rp IS NOT NULL THEN
        _result := _result || jsonb_build_object(
          'table_name', _t,
          'role', _r,
          'can_select', _rp.can_select,
          'can_insert', _rp.can_insert,
          'can_update', _rp.can_update,
          'can_delete', _rp.can_delete,
          'is_custom', true
        );
      ELSE
        _result := _result || jsonb_build_object(
          'table_name', _t,
          'role', _r,
          'can_select', private.default_permission(_r, _t, 'select'),
          'can_insert', private.default_permission(_r, _t, 'insert'),
          'can_update', private.default_permission(_r, _t, 'update'),
          'can_delete', private.default_permission(_r, _t, 'delete'),
          'is_custom', false
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN _result;
END;
$$;

-- ============================================================================
-- 3. Update get_my_page_permissions to include new entries
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_page_permissions(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role TEXT;
  _result JSONB := '[]'::jsonb;
  _pages TEXT[] := ARRAY[
    'page:dashboard','page:members','page:ai',
    'page:transfers','page:transfer-fix','page:trash',
    'page:accounting','page:psps','page:hr',
    'page:organizations','page:security','page:audit'
  ];
  _p TEXT;
  _rp RECORD;
BEGIN
  -- Get calling user's role in this org
  SELECT role INTO _role
  FROM organization_members
  WHERE organization_id = _org_id
    AND user_id = auth.uid();

  -- Not a member -> empty array
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
