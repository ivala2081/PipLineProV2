-- ============================================================================
-- 117: IB (Introducing Broker) Management
--
-- Creates 4 tables: ib_partners, ib_referrals, ib_commissions, ib_payments
-- Adds accounting integration trigger + FK on accounting_entries
-- Updates permission functions for page:ib + IB tables
-- Creates calculate_ib_commission RPC
-- ============================================================================

-- ============================================================================
-- 1. ib_partners — The IB/affiliate entity
-- ============================================================================
CREATE TABLE public.ib_partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  contact_email     TEXT,
  contact_phone     TEXT,
  referral_code     TEXT NOT NULL,
  agreement_type    TEXT NOT NULL CHECK (agreement_type IN ('salary','cpa','lot_rebate','revenue_share','hybrid')),
  agreement_details JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','terminated')),
  notes             TEXT,
  created_by        UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ib_partners_org_code ON ib_partners(organization_id, referral_code);
CREATE INDEX idx_ib_partners_org ON ib_partners(organization_id);
CREATE INDEX idx_ib_partners_status ON ib_partners(organization_id, status);

-- ============================================================================
-- 2. ib_referrals — Links a client to the IB who referred them
-- ============================================================================
CREATE TABLE public.ib_referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ib_partner_id   UUID NOT NULL REFERENCES public.ib_partners(id) ON DELETE CASCADE,
  client_name     TEXT NOT NULL,
  ftd_date        DATE,
  ftd_amount      NUMERIC,
  is_ftd          BOOLEAN NOT NULL DEFAULT false,
  lots_traded     NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','ftd','active','churned')),
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ib_referrals_partner ON ib_referrals(organization_id, ib_partner_id);
CREATE INDEX idx_ib_referrals_client ON ib_referrals(organization_id, client_name);
CREATE INDEX idx_ib_referrals_status ON ib_referrals(organization_id, status);

-- ============================================================================
-- 3. ib_commissions — Calculated or manually entered commission records
-- ============================================================================
CREATE TABLE public.ib_commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ib_partner_id     UUID NOT NULL REFERENCES public.ib_partners(id) ON DELETE CASCADE,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  agreement_type    TEXT NOT NULL,
  calculated_amount NUMERIC NOT NULL DEFAULT 0,
  override_amount   NUMERIC,
  override_reason   TEXT,
  final_amount      NUMERIC GENERATED ALWAYS AS (COALESCE(override_amount, calculated_amount)) STORED,
  currency          TEXT NOT NULL DEFAULT 'USD',
  breakdown         JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','paid')),
  confirmed_at      TIMESTAMPTZ,
  confirmed_by      UUID REFERENCES public.profiles(id),
  notes             TEXT,
  created_by        UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ib_commissions_unique_period
  ON ib_commissions(organization_id, ib_partner_id, period_start, period_end);
CREATE INDEX idx_ib_commissions_partner ON ib_commissions(organization_id, ib_partner_id);
CREATE INDEX idx_ib_commissions_status ON ib_commissions(organization_id, status);

-- ============================================================================
-- 4. ib_payments — Actual payment records
-- ============================================================================
CREATE TABLE public.ib_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ib_partner_id   UUID NOT NULL REFERENCES public.ib_partners(id) ON DELETE CASCADE,
  ib_commission_id UUID REFERENCES public.ib_commissions(id) ON DELETE SET NULL,
  amount          NUMERIC NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  register        TEXT NOT NULL CHECK (register IN ('USDT','NAKIT_TL','NAKIT_USD','TRX')),
  payment_method  TEXT,
  reference       TEXT,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ib_payments_partner ON ib_payments(organization_id, ib_partner_id);
CREATE INDEX idx_ib_payments_date ON ib_payments(organization_id, payment_date);

-- ============================================================================
-- 5. Accounting integration — FK on accounting_entries + auto-create trigger
-- ============================================================================
ALTER TABLE public.accounting_entries
  ADD COLUMN ib_payment_id UUID REFERENCES public.ib_payments(id) ON DELETE SET NULL;

CREATE INDEX idx_accounting_entries_ib_payment ON accounting_entries(ib_payment_id);

-- Trigger function: auto-create accounting entry on IB payment insert
CREATE OR REPLACE FUNCTION public.create_ib_payment_accounting_entry()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _partner_name TEXT;
BEGIN
  SELECT name INTO _partner_name FROM ib_partners WHERE id = NEW.ib_partner_id;

  INSERT INTO accounting_entries (
    organization_id, entry_type, direction, amount, currency,
    register, description, entry_date, ib_payment_id, created_by
  ) VALUES (
    NEW.organization_id,
    'ODEME',
    'out',
    NEW.amount,
    NEW.currency,
    NEW.register,
    COALESCE(NEW.description, 'IB Payment: ' || COALESCE(_partner_name, 'Unknown')),
    NEW.payment_date,
    NEW.id,
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ib_payment_accounting
  AFTER INSERT ON ib_payments
  FOR EACH ROW
  EXECUTE FUNCTION create_ib_payment_accounting_entry();

-- ============================================================================
-- 6. updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_ib_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ib_partners
  FOR EACH ROW EXECUTE FUNCTION set_ib_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ib_referrals
  FOR EACH ROW EXECUTE FUNCTION set_ib_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ib_commissions
  FOR EACH ROW EXECUTE FUNCTION set_ib_updated_at();

-- ============================================================================
-- 7. RLS policies
-- ============================================================================
ALTER TABLE ib_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_payments ENABLE ROW LEVEL SECURITY;

-- ib_partners: SELECT for all org roles, write for admin+god
CREATE POLICY "ib_partners_select" ON public.ib_partners
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "ib_partners_insert" ON public.ib_partners
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "ib_partners_update" ON public.ib_partners
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "ib_partners_delete" ON public.ib_partners
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- ib_referrals: SELECT for all, write for admin+god
CREATE POLICY "ib_referrals_select" ON public.ib_referrals
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "ib_referrals_insert" ON public.ib_referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "ib_referrals_update" ON public.ib_referrals
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "ib_referrals_delete" ON public.ib_referrals
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- ib_commissions: SELECT for all, write for admin+god
CREATE POLICY "ib_commissions_select" ON public.ib_commissions
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "ib_commissions_insert" ON public.ib_commissions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "ib_commissions_update" ON public.ib_commissions
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "ib_commissions_delete" ON public.ib_commissions
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- ib_payments: SELECT for all, write for admin+god
CREATE POLICY "ib_payments_select" ON public.ib_payments
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "ib_payments_insert" ON public.ib_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "ib_payments_delete" ON public.ib_payments
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- ============================================================================
-- 8. RPC: calculate_ib_commission
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_ib_commission(
  p_ib_partner_id UUID,
  p_period_start  DATE,
  p_period_end    DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _partner        RECORD;
  _details        JSONB;
  _amount         NUMERIC := 0;
  _breakdown      JSONB := '{}'::jsonb;
  _ftd_count      INT := 0;
  _total_lots     NUMERIC := 0;
  _components     JSONB;
  _comp           JSONB;
  _comp_amount    NUMERIC;
  _comp_breakdown JSONB;
  _comp_results   JSONB := '[]'::jsonb;
  i               INT;
BEGIN
  -- Fetch partner
  SELECT * INTO _partner FROM ib_partners WHERE id = p_ib_partner_id;
  IF _partner IS NULL THEN
    RAISE EXCEPTION 'IB Partner not found';
  END IF;

  -- Permission check: must be org member or god
  IF NOT (
    private.is_god()
    OR _partner.organization_id IN (SELECT private.get_user_org_ids())
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  _details := _partner.agreement_details;

  CASE _partner.agreement_type
    -- ── Salary: fixed amount ──
    WHEN 'salary' THEN
      _amount := COALESCE((_details->>'amount')::numeric, 0);
      _breakdown := jsonb_build_object(
        'type', 'salary',
        'fixed_amount', _amount,
        'period', COALESCE(_details->>'period', 'monthly'),
        'currency', COALESCE(_details->>'currency', 'USD')
      );

    -- ── CPA: count FTDs in period × rate ──
    WHEN 'cpa' THEN
      SELECT COUNT(*) INTO _ftd_count
      FROM ib_referrals
      WHERE ib_partner_id = p_ib_partner_id
        AND is_ftd = true
        AND ftd_date BETWEEN p_period_start AND p_period_end
        AND (
          (_details->>'min_ftd_amount') IS NULL
          OR ftd_amount >= (_details->>'min_ftd_amount')::numeric
        );

      _amount := _ftd_count * COALESCE((_details->>'cpa_amount')::numeric, 0);
      _breakdown := jsonb_build_object(
        'type', 'cpa',
        'ftd_count', _ftd_count,
        'cpa_rate', COALESCE((_details->>'cpa_amount')::numeric, 0),
        'min_ftd_amount', (_details->>'min_ftd_amount'),
        'total', _amount
      );

    -- ── Lot Rebate: sum lots × rate ──
    WHEN 'lot_rebate' THEN
      SELECT COALESCE(SUM(lots_traded), 0) INTO _total_lots
      FROM ib_referrals
      WHERE ib_partner_id = p_ib_partner_id
        AND organization_id = _partner.organization_id;

      _amount := _total_lots * COALESCE((_details->>'rebate_per_lot')::numeric, 0);
      _breakdown := jsonb_build_object(
        'type', 'lot_rebate',
        'total_lots', _total_lots,
        'rebate_per_lot', COALESCE((_details->>'rebate_per_lot')::numeric, 0),
        'total', _amount
      );

    -- ── Revenue Share: percentage of revenue (manual input via breakdown) ──
    WHEN 'revenue_share' THEN
      -- Revenue share requires manual revenue input; calculate from agreement_details
      _amount := COALESCE((_details->>'total_revenue')::numeric, 0)
                 * COALESCE((_details->>'revshare_pct')::numeric, 0) / 100;
      _breakdown := jsonb_build_object(
        'type', 'revenue_share',
        'revshare_pct', COALESCE((_details->>'revshare_pct')::numeric, 0),
        'source', COALESCE(_details->>'source', 'net_revenue'),
        'total', _amount
      );

    -- ── Hybrid: sum of components ──
    WHEN 'hybrid' THEN
      _components := COALESCE(_details->'components', '[]'::jsonb);
      _amount := 0;

      FOR i IN 0 .. jsonb_array_length(_components) - 1 LOOP
        _comp := _components->i;
        _comp_amount := 0;

        CASE _comp->>'type'
          WHEN 'salary' THEN
            _comp_amount := COALESCE((_comp->>'amount')::numeric, 0);
            _comp_breakdown := jsonb_build_object('type','salary','amount',_comp_amount);

          WHEN 'cpa' THEN
            SELECT COUNT(*) INTO _ftd_count
            FROM ib_referrals
            WHERE ib_partner_id = p_ib_partner_id
              AND is_ftd = true
              AND ftd_date BETWEEN p_period_start AND p_period_end;
            _comp_amount := _ftd_count * COALESCE((_comp->>'cpa_amount')::numeric, 0);
            _comp_breakdown := jsonb_build_object('type','cpa','ftd_count',_ftd_count,'rate',(_comp->>'cpa_amount')::numeric,'total',_comp_amount);

          WHEN 'lot_rebate' THEN
            SELECT COALESCE(SUM(lots_traded), 0) INTO _total_lots
            FROM ib_referrals
            WHERE ib_partner_id = p_ib_partner_id;
            _comp_amount := _total_lots * COALESCE((_comp->>'rebate_per_lot')::numeric, 0);
            _comp_breakdown := jsonb_build_object('type','lot_rebate','lots',_total_lots,'rate',(_comp->>'rebate_per_lot')::numeric,'total',_comp_amount);

          WHEN 'revenue_share' THEN
            _comp_amount := COALESCE((_comp->>'total_revenue')::numeric, 0)
                           * COALESCE((_comp->>'revshare_pct')::numeric, 0) / 100;
            _comp_breakdown := jsonb_build_object('type','revenue_share','pct',(_comp->>'revshare_pct')::numeric,'total',_comp_amount);

          ELSE
            _comp_breakdown := jsonb_build_object('type','unknown','total',0);
        END CASE;

        _amount := _amount + _comp_amount;
        _comp_results := _comp_results || _comp_breakdown;
      END LOOP;

      _breakdown := jsonb_build_object(
        'type', 'hybrid',
        'components', _comp_results,
        'total', _amount
      );

    ELSE
      RAISE EXCEPTION 'Unknown agreement type: %', _partner.agreement_type;
  END CASE;

  RETURN jsonb_build_object(
    'calculated_amount', _amount,
    'breakdown', _breakdown,
    'currency', COALESCE(_details->>'currency', 'USD')
  );
END;
$$;

-- ============================================================================
-- 9. Update permission functions
-- ============================================================================

-- 9A. default_permission — add page:ib + IB table entries
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

    -- IB tables: all roles SELECT, admin-only write
    WHEN _table IN ('ib_partners','ib_referrals','ib_commissions','ib_payments')
      AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table IN ('ib_partners','ib_referrals','ib_commissions','ib_payments')
      THEN _role = 'admin'

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

-- 9B. get_role_permissions_with_defaults — add IB entries to _tables array
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

-- 9C. get_my_page_permissions — add page:ib to _pages array
CREATE OR REPLACE FUNCTION public.get_my_page_permissions(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role TEXT;
  _result JSONB := '[]'::jsonb;
  _pages TEXT[] := ARRAY[
    'page:dashboard','page:members','page:ai',
    'page:transfers','page:accounting','page:psps','page:hr',
    'page:organizations','page:security','page:audit',
    'page:ib'
  ];
  _p TEXT;
  _rp RECORD;
BEGIN
  SELECT role INTO _role
  FROM organization_members
  WHERE organization_id = _org_id
    AND user_id = auth.uid();

  IF _role IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR _p IN SELECT unnest(_pages) LOOP
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
