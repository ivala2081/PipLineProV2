-- ============================================================================
-- 097: Role Permissions Configuration Table + Helper Functions + RPCs
--
-- Creates a configurable permission system:
--   1. role_permissions table (per org/table/role permission config)
--   2. private.default_permission() - encodes current hardcoded defaults
--   3. private.has_role_permission() - checks config with fallback to defaults
--   4. get_role_permissions_with_defaults() RPC - returns all perms for frontend
--   5. upsert_role_permissions() RPC - bulk save permissions
-- ============================================================================

-- ============================================================================
-- 1. role_permissions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_name      TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin','manager','operation','ik')),
  can_select      BOOLEAN NOT NULL DEFAULT false,
  can_insert      BOOLEAN NOT NULL DEFAULT false,
  can_update      BOOLEAN NOT NULL DEFAULT false,
  can_delete      BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, table_name, role)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_org ON public.role_permissions(organization_id);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS: god + org admin can read
CREATE POLICY "role_perms_select" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- RLS: god + org admin can insert
CREATE POLICY "role_perms_insert" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- RLS: god + org admin can update
CREATE POLICY "role_perms_update" ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- RLS: god + org admin can delete
CREATE POLICY "role_perms_delete" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- ============================================================================
-- 2. private.default_permission() - encodes current hardcoded RLS behavior
-- ============================================================================

CREATE OR REPLACE FUNCTION private.default_permission(
  _role TEXT, _table TEXT, _action TEXT
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
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
-- 3. private.has_role_permission() - checks config with fallback to defaults
-- ============================================================================

CREATE OR REPLACE FUNCTION private.has_role_permission(
  _org_id UUID, _table TEXT, _action TEXT
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    LEFT JOIN public.role_permissions rp
      ON rp.organization_id = om.organization_id
      AND rp.table_name = _table
      AND rp.role = om.role
    WHERE om.organization_id = _org_id
      AND om.user_id = auth.uid()
      AND (
        CASE WHEN rp.id IS NOT NULL THEN
          CASE _action
            WHEN 'select' THEN rp.can_select
            WHEN 'insert' THEN rp.can_insert
            WHEN 'update' THEN rp.can_update
            WHEN 'delete' THEN rp.can_delete
            ELSE false
          END
        ELSE
          private.default_permission(om.role, _table, _action)
        END
      )
  )
$$;

-- ============================================================================
-- 4. get_role_permissions_with_defaults() RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_role_permissions_with_defaults(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result JSONB := '[]'::jsonb;
  _tables TEXT[] := ARRAY[
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
-- 5. upsert_role_permissions() RPC - bulk save
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_role_permissions(
  _org_id UUID,
  _permissions JSONB
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Permission check
  IF NOT (private.is_god() OR private.is_org_admin(_org_id)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO role_permissions (organization_id, table_name, role, can_select, can_insert, can_update, can_delete, updated_by, updated_at)
  SELECT
    _org_id,
    (j->>'table_name')::TEXT,
    (j->>'role')::TEXT,
    (j->>'can_select')::BOOLEAN,
    (j->>'can_insert')::BOOLEAN,
    (j->>'can_update')::BOOLEAN,
    (j->>'can_delete')::BOOLEAN,
    auth.uid(),
    now()
  FROM jsonb_array_elements(_permissions) AS j
  ON CONFLICT (organization_id, table_name, role) DO UPDATE SET
    can_select = EXCLUDED.can_select,
    can_insert = EXCLUDED.can_insert,
    can_update = EXCLUDED.can_update,
    can_delete = EXCLUDED.can_delete,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
END;
$$;
