-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  120: Accounting Overhaul — Registers, Categories, Snapshots, RPCs     ║
-- ║                                                                        ║
-- ║  Tables created:                                                       ║
-- ║    - accounting_registers        (org-specific registers/kasas)         ║
-- ║    - accounting_categories       (expense categories, global+org)       ║
-- ║    - accounting_register_snapshots (daily closing balances)             ║
-- ║                                                                        ║
-- ║  Altered tables:                                                       ║
-- ║    - accounting_entries          (new columns for overhaul)             ║
-- ║                                                                        ║
-- ║  Functions:                                                            ║
-- ║    - seed_default_registers(uuid)                                      ║
-- ║    - get_accounting_summary(uuid, text)                                ║
-- ║    - get_category_breakdown(uuid, text)                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝


-- ============================================================================
-- 1. accounting_registers — Org-specific registers (kasas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accounting_registers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  label           TEXT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'TRY',
  is_system       BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_acct_registers_org_name
  ON public.accounting_registers(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_acct_registers_org
  ON public.accounting_registers(organization_id);

ALTER TABLE public.accounting_registers ENABLE ROW LEVEL SECURITY;

-- SELECT: org members
CREATE POLICY "acct_registers_select" ON public.accounting_registers
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- INSERT: admin + god
CREATE POLICY "acct_registers_insert" ON public.accounting_registers
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- UPDATE: admin + god
CREATE POLICY "acct_registers_update" ON public.accounting_registers
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- DELETE: admin + god, non-system only (enforced in app layer too)
CREATE POLICY "acct_registers_delete" ON public.accounting_registers
  FOR DELETE TO authenticated
  USING (
    NOT is_system
    AND (
      (SELECT private.is_god())
      OR (SELECT private.is_org_admin(organization_id))
    )
  );


-- ============================================================================
-- 2. accounting_categories — Global defaults + org-specific
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accounting_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  label           TEXT NOT NULL,
  icon            TEXT,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_acct_categories_org_name
  ON public.accounting_categories(organization_id, name)
  WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_acct_categories_global_name
  ON public.accounting_categories(name)
  WHERE organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_acct_categories_org
  ON public.accounting_categories(organization_id);

ALTER TABLE public.accounting_categories ENABLE ROW LEVEL SECURITY;

-- SELECT: org members + global (organization_id IS NULL)
CREATE POLICY "acct_categories_select" ON public.accounting_categories
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- INSERT: admin + god, custom only
CREATE POLICY "acct_categories_insert" ON public.accounting_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND (
      (SELECT private.is_god())
      OR (SELECT private.is_org_admin(organization_id))
    )
  );

-- UPDATE: admin + god, custom only
CREATE POLICY "acct_categories_update" ON public.accounting_categories
  FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL
    AND NOT is_system
    AND (
      (SELECT private.is_god())
      OR (SELECT private.is_org_admin(organization_id))
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND NOT is_system
    AND (
      (SELECT private.is_god())
      OR (SELECT private.is_org_admin(organization_id))
    )
  );

-- DELETE: admin + god, custom non-system only
CREATE POLICY "acct_categories_delete" ON public.accounting_categories
  FOR DELETE TO authenticated
  USING (
    organization_id IS NOT NULL
    AND NOT is_system
    AND (
      (SELECT private.is_god())
      OR (SELECT private.is_org_admin(organization_id))
    )
  );


-- ============================================================================
-- 3. Seed global default categories (organization_id IS NULL)
-- ============================================================================
INSERT INTO public.accounting_categories (organization_id, name, label, icon, is_system, sort_order)
VALUES
  (NULL, 'salary',       'Salary',          'Money',          true,  1),
  (NULL, 'ib_payment',   'IB Payment',      'Handshake',      true,  2),
  (NULL, 'bonus',        'Bonus',           'Trophy',         true,  3),
  (NULL, 'office',       'Office Expenses', 'Buildings',      true,  4),
  (NULL, 'conversion',   'Conversion',      'ArrowsLeftRight',true,  5),
  (NULL, 'psp_transfer', 'PSP Transfer',    'ArrowSquareOut', true,  6),
  (NULL, 'legal',        'Legal',           'Scales',         true,  7),
  (NULL, 'hardware',     'Hardware',        'Desktop',        true,  8),
  (NULL, 'marketing',    'Marketing',       'Megaphone',      true,  9),
  (NULL, 'other',        'Other',           'DotsThree',      true, 10)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 4. seed_default_registers — Seed system registers for an org
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_default_registers(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO accounting_registers (organization_id, name, label, currency, is_system, sort_order)
  VALUES
    (p_org_id, 'USDT',      'USDT',      'USD', true, 1),
    (p_org_id, 'NAKIT_TL',  'Nakit TL',  'TRY', true, 2),
    (p_org_id, 'NAKIT_USD', 'Nakit USD', 'USD', true, 3),
    (p_org_id, 'TL_BANKA',  'Banka TL',  'TRY', true, 4),
    (p_org_id, 'TRX',       'TRX',       'USD', true, 5)
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$;


-- ============================================================================
-- 5. ALTER accounting_entries — Add overhaul columns
-- ============================================================================
ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS category_id             UUID REFERENCES public.accounting_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payee                   TEXT,
  ADD COLUMN IF NOT EXISTS register_id             UUID REFERENCES public.accounting_registers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS exchange_rate_used       NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_rate_override   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_entry_id          UUID REFERENCES public.accounting_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type              TEXT,
  ADD COLUMN IF NOT EXISTS source_id                UUID;

-- cost_period already exists on accounting_entries from original schema

CREATE INDEX IF NOT EXISTS idx_acct_entries_category ON public.accounting_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_acct_entries_register_id ON public.accounting_entries(register_id);
CREATE INDEX IF NOT EXISTS idx_acct_entries_linked ON public.accounting_entries(linked_entry_id);
CREATE INDEX IF NOT EXISTS idx_acct_entries_source ON public.accounting_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_acct_entries_payee ON public.accounting_entries(organization_id, payee);
CREATE INDEX IF NOT EXISTS idx_acct_entries_cost_period ON public.accounting_entries(organization_id, cost_period);


-- ============================================================================
-- 6. accounting_register_snapshots — Daily closing balances
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accounting_register_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  register_id     UUID NOT NULL REFERENCES public.accounting_registers(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  total_in        NUMERIC NOT NULL DEFAULT 0,
  total_out       NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  usd_equivalent  NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_acct_snapshots_unique
  ON public.accounting_register_snapshots(organization_id, register_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_acct_snapshots_org
  ON public.accounting_register_snapshots(organization_id);

ALTER TABLE public.accounting_register_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: org members
CREATE POLICY "acct_snapshots_select" ON public.accounting_register_snapshots
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- INSERT: admin + god
CREATE POLICY "acct_snapshots_insert" ON public.accounting_register_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- UPDATE: admin + god
CREATE POLICY "acct_snapshots_update" ON public.accounting_register_snapshots
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );


-- ============================================================================
-- 7. RPC: get_accounting_summary
--    Returns per-register balances + totals for a given cost period
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_accounting_summary(
  p_org_id UUID,
  p_period TEXT  -- YYYY-MM
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _registers JSONB := '[]'::jsonb;
  _reg       RECORD;
  _total_in  NUMERIC;
  _total_out NUMERIC;
  _net       NUMERIC;
  _opening   NUMERIC;
  _portfolio_usd NUMERIC := 0;
  _total_net_usd NUMERIC := 0;
BEGIN
  -- Permission check
  IF NOT (
    (SELECT private.is_god())
    OR p_org_id IN (SELECT private.get_user_org_ids())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Iterate each active register
  FOR _reg IN
    SELECT r.id, r.name, r.label, r.currency
    FROM accounting_registers r
    WHERE r.organization_id = p_org_id AND r.is_active = true
    ORDER BY r.sort_order, r.name
  LOOP
    -- Sum entries in the period for this register
    SELECT
      COALESCE(SUM(CASE WHEN e.direction = 'in'  THEN e.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN e.direction = 'out' THEN e.amount ELSE 0 END), 0)
    INTO _total_in, _total_out
    FROM accounting_entries e
    WHERE e.organization_id = p_org_id
      AND e.register_id = _reg.id
      AND e.cost_period = p_period;

    _net := _total_in - _total_out;

    -- Get opening balance from most recent snapshot before this period
    SELECT COALESCE(s.closing_balance, 0) INTO _opening
    FROM accounting_register_snapshots s
    WHERE s.organization_id = p_org_id
      AND s.register_id = _reg.id
      AND s.snapshot_date < (p_period || '-01')::date
    ORDER BY s.snapshot_date DESC
    LIMIT 1;

    IF _opening IS NULL THEN _opening := 0; END IF;

    _registers := _registers || jsonb_build_object(
      'id',        _reg.id,
      'name',      _reg.name,
      'label',     _reg.label,
      'currency',  _reg.currency,
      'opening',   _opening,
      'incoming',  _total_in,
      'outgoing',  _total_out,
      'net',       _net,
      'closing',   _opening + _net
    );

    -- Accumulate USD-equivalent totals (simplified: assume USD-denominated registers are 1:1)
    _portfolio_usd := _portfolio_usd + (_opening + _net);
    _total_net_usd := _total_net_usd + _net;
  END LOOP;

  RETURN jsonb_build_object(
    'registers',   _registers,
    'totals', jsonb_build_object(
      'portfolio_usd', _portfolio_usd,
      'net_pl',        _total_net_usd,
      'pl_percent',    CASE WHEN _portfolio_usd - _total_net_usd > 0
                        THEN ROUND((_total_net_usd / (_portfolio_usd - _total_net_usd)) * 100, 2)
                        ELSE 0 END
    )
  );
END;
$$;


-- ============================================================================
-- 8. RPC: get_category_breakdown
--    Returns spending breakdown by category for a given period
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_category_breakdown(
  p_org_id UUID,
  p_period TEXT  -- YYYY-MM
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result JSONB := '[]'::jsonb;
  _row    RECORD;
BEGIN
  -- Permission check
  IF NOT (
    (SELECT private.is_god())
    OR p_org_id IN (SELECT private.get_user_org_ids())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR _row IN
    SELECT
      COALESCE(c.name, 'uncategorized') AS category_name,
      COALESCE(c.label, 'Uncategorized') AS category_label,
      COALESCE(c.icon, 'DotsThree') AS category_icon,
      SUM(e.amount) AS total_amount,
      COUNT(*) AS entry_count
    FROM accounting_entries e
    LEFT JOIN accounting_categories c ON c.id = e.category_id
    WHERE e.organization_id = p_org_id
      AND e.cost_period = p_period
      AND e.direction = 'out'
    GROUP BY c.name, c.label, c.icon
    ORDER BY SUM(e.amount) DESC
  LOOP
    _result := _result || jsonb_build_object(
      'category_name',  _row.category_name,
      'category_label', _row.category_label,
      'category_icon',  _row.category_icon,
      'total_amount',   _row.total_amount,
      'entry_count',    _row.entry_count
    );
  END LOOP;

  RETURN _result;
END;
$$;


-- ============================================================================
-- 9. Update permission function — add new tables
-- ============================================================================
CREATE OR REPLACE FUNCTION private.default_permission(
  _role TEXT, _table TEXT, _action TEXT
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    -- ══════════════════════════════════════════════════════
    -- PAGE-LEVEL PERMISSIONS
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

    -- New accounting tables
    WHEN _table = 'accounting_registers' AND _action = 'select'
      THEN _role IN ('admin','manager','ik')
    WHEN _table = 'accounting_registers'
      THEN _role = 'admin'

    WHEN _table = 'accounting_categories' AND _action = 'select'
      THEN _role IN ('admin','manager','ik')
    WHEN _table = 'accounting_categories'
      THEN _role = 'admin'

    WHEN _table = 'accounting_register_snapshots' AND _action = 'select'
      THEN _role IN ('admin','manager','ik')
    WHEN _table = 'accounting_register_snapshots'
      THEN _role = 'admin'

    WHEN _table IN (
      'hr_employees','hr_employee_documents','hr_bonus_agreements',
      'hr_bonus_payments','hr_attendance','hr_salary_payments',
      'hr_settings','hr_leaves','hr_mt_config','hr_re_config',
      'hr_bulk_payments','hr_bulk_payment_items'
    ) THEN _role IN ('admin','manager','ik')

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

-- Update get_role_permissions_with_defaults to include new tables
CREATE OR REPLACE FUNCTION public.get_role_permissions_with_defaults(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result JSONB := '[]'::jsonb;
  _tables TEXT[] := ARRAY[
    'page:dashboard','page:members','page:ai',
    'page:transfers','page:accounting','page:psps','page:hr',
    'page:organizations','page:security','page:audit',
    'page:ib',
    'transfers','transfer_audit_log',
    'psps','psp_commission_rates','psp_settlements',
    'accounting_entries','accounting_monthly_config',
    'accounting_registers','accounting_categories','accounting_register_snapshots',
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
