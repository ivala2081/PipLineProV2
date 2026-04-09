-- ============================================================================
-- 134: IB — Open write access to all org members (not just admin/god)
--
-- Previously only is_god() or is_org_admin() could INSERT/UPDATE/DELETE
-- on ib_partners, ib_referrals, ib_commissions, ib_payments.
-- Now any org member (operation, manager, ik, admin) can perform these ops.
-- ============================================================================

-- ── ib_partners ──

DROP POLICY IF EXISTS "ib_partners_insert" ON public.ib_partners;
CREATE POLICY "ib_partners_insert" ON public.ib_partners
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "ib_partners_update" ON public.ib_partners;
CREATE POLICY "ib_partners_update" ON public.ib_partners
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "ib_partners_delete" ON public.ib_partners;
CREATE POLICY "ib_partners_delete" ON public.ib_partners
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- ── ib_referrals ──

DROP POLICY IF EXISTS "ib_referrals_insert" ON public.ib_referrals;
CREATE POLICY "ib_referrals_insert" ON public.ib_referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "ib_referrals_update" ON public.ib_referrals;
CREATE POLICY "ib_referrals_update" ON public.ib_referrals
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "ib_referrals_delete" ON public.ib_referrals;
CREATE POLICY "ib_referrals_delete" ON public.ib_referrals
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- ── ib_commissions ──

DROP POLICY IF EXISTS "ib_commissions_insert" ON public.ib_commissions;
CREATE POLICY "ib_commissions_insert" ON public.ib_commissions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "ib_commissions_update" ON public.ib_commissions;
CREATE POLICY "ib_commissions_update" ON public.ib_commissions
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "ib_commissions_delete" ON public.ib_commissions;
CREATE POLICY "ib_commissions_delete" ON public.ib_commissions
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- ── ib_payments ──

DROP POLICY IF EXISTS "ib_payments_insert" ON public.ib_payments;
CREATE POLICY "ib_payments_insert" ON public.ib_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "ib_payments_delete" ON public.ib_payments;
CREATE POLICY "ib_payments_delete" ON public.ib_payments
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- ── Update default_permission to reflect the change ──

CREATE OR REPLACE FUNCTION private.default_permission(
  _role TEXT, _table TEXT, _action TEXT
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    -- ══════════════════════════════════════════════════════
    -- PAGE-LEVEL PERMISSIONS (only select = can view)
    -- ══════════════════════════════════════════════════════

    WHEN _table = 'page:dashboard' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'page:dashboard' THEN false

    WHEN _table = 'page:members' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'page:members' THEN false

    WHEN _table = 'page:ai' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'page:ai' THEN false

    WHEN _table = 'page:transfers' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'page:transfers' THEN false

    WHEN _table = 'page:accounting' AND _action = 'select'
      THEN _role IN ('admin','manager','ik')
    WHEN _table = 'page:accounting' THEN false

    WHEN _table = 'page:psps' AND _action = 'select'
      THEN _role = 'admin'
    WHEN _table = 'page:psps' THEN false

    WHEN _table = 'page:hr' AND _action = 'select'
      THEN _role IN ('admin','ik')
    WHEN _table = 'page:hr' THEN false

    WHEN _table = 'page:organizations' AND _action = 'select'
      THEN _role = 'admin'
    WHEN _table = 'page:organizations' THEN false

    WHEN _table = 'page:security' AND _action = 'select'
      THEN _role IN ('admin','manager')
    WHEN _table = 'page:security' THEN false

    WHEN _table = 'page:audit' AND _action = 'select'
      THEN _role IN ('admin','manager')
    WHEN _table = 'page:audit' THEN false

    -- IB page: all roles can view
    WHEN _table = 'page:ib' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'page:ib' THEN false

    -- ══════════════════════════════════════════════════════
    -- TABLE-LEVEL PERMISSIONS
    -- ══════════════════════════════════════════════════════

    WHEN _table = 'transfers' AND _action IN ('select','insert','update')
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'transfers' AND _action = 'delete'
      THEN _role IN ('admin','manager','ik')

    WHEN _table = 'transfer_audit_log' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'transfer_audit_log'
      THEN false

    WHEN _table = 'psps' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'psps'
      THEN _role = 'admin'

    WHEN _table = 'psp_commission_rates' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'psp_commission_rates'
      THEN _role = 'admin'

    WHEN _table = 'psp_settlements' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'psp_settlements'
      THEN _role = 'admin'

    WHEN _table = 'accounting_entries'
      THEN _role IN ('admin','manager','ik')

    WHEN _table = 'accounting_monthly_config'
      THEN _role IN ('admin','manager','ik')

    WHEN _table IN (
      'hr_employees','hr_employee_documents','hr_bonus_agreements',
      'hr_bonus_payments','hr_attendance','hr_salary_payments',
      'hr_settings','hr_leaves','hr_mt_config','hr_re_config',
      'hr_bulk_payments','hr_bulk_payment_items'
    ) THEN _role IN ('admin','manager','ik')

    -- IB tables: all roles can SELECT + INSERT + UPDATE + DELETE
    WHEN _table IN ('ib_partners','ib_referrals','ib_commissions','ib_payments')
      THEN _role IN ('admin','manager','operation','ik')

    WHEN _table = 'organizations' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'organizations' AND _action = 'update'
      THEN _role = 'admin'
    WHEN _table = 'organizations'
      THEN false

    WHEN _table = 'organization_members' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'organization_members'
      THEN _role IN ('admin','manager','ik')

    WHEN _table = 'organization_invitations'
      THEN _role IN ('admin','manager','ik')

    ELSE false
  END
$$;

-- ── Rebuild get_role_permissions_with_defaults (MUST preserve all page:* entries) ──

CREATE OR REPLACE FUNCTION public.get_role_permissions_with_defaults(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result JSONB := '[]'::jsonb;
  _tables TEXT[] := ARRAY[
    -- Page entries
    'page:dashboard','page:members','page:ai',
    'page:transfers','page:accounting','page:psps','page:hr',
    'page:organizations','page:security','page:audit',
    'page:ib',
    -- Table entries
    'transfers','transfer_audit_log',
    'psps','psp_commission_rates','psp_settlements',
    'accounting_entries','accounting_monthly_config',
    'hr_employees','hr_employee_documents','hr_bonus_agreements',
    'hr_bonus_payments','hr_attendance','hr_salary_payments',
    'hr_settings','hr_leaves','hr_mt_config','hr_re_config',
    'hr_bulk_payments','hr_bulk_payment_items',
    'ib_partners','ib_referrals','ib_commissions','ib_payments',
    'organizations','organization_members','organization_invitations'
  ];
  _roles TEXT[] := ARRAY['admin','manager','operation','ik'];
  _t TEXT;
  _r TEXT;
  _rp RECORD;
BEGIN
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
