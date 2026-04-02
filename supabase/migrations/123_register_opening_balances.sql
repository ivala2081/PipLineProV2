-- ============================================================================
-- 123: Register Opening Balances (manual DEVİR entry)
--
-- Creates register_opening_balances table for manually set opening balances
-- per register per period. Updates get_accounting_summary RPC to use it.
-- ============================================================================


-- ============================================================================
-- 1. register_opening_balances table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.register_opening_balances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  register        TEXT NOT NULL,
  period          TEXT NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  updated_by      UUID REFERENCES auth.users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_opening_org_reg_period
  ON public.register_opening_balances(organization_id, register, period);
CREATE INDEX IF NOT EXISTS idx_reg_opening_org
  ON public.register_opening_balances(organization_id);

ALTER TABLE public.register_opening_balances ENABLE ROW LEVEL SECURITY;

-- SELECT: org members
CREATE POLICY "reg_opening_select" ON public.register_opening_balances
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- INSERT: admin + god
CREATE POLICY "reg_opening_insert" ON public.register_opening_balances
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- UPDATE: admin + god
CREATE POLICY "reg_opening_update" ON public.register_opening_balances
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- DELETE: admin + god
CREATE POLICY "reg_opening_delete" ON public.register_opening_balances
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );


-- ============================================================================
-- 2. Update get_accounting_summary — use register_opening_balances for DEVİR
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

  FOR _reg IN
    SELECT r.id, r.name, r.label, r.currency
    FROM accounting_registers r
    WHERE r.organization_id = p_org_id AND r.is_active = true
    ORDER BY r.sort_order, r.name
  LOOP
    -- Sum entries for this register in the period
    SELECT
      COALESCE(SUM(CASE WHEN e.direction = 'in'  THEN e.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN e.direction = 'out' THEN e.amount ELSE 0 END), 0)
    INTO _total_in, _total_out
    FROM accounting_entries e
    WHERE e.organization_id = p_org_id
      AND (e.register_id = _reg.id OR (e.register_id IS NULL AND e.register = _reg.name))
      AND e.cost_period = p_period;

    _net := _total_in - _total_out;

    -- DEVİR: look up manual opening balance; default 0 if not set
    SELECT COALESCE(ob.opening_balance, 0) INTO _opening
    FROM register_opening_balances ob
    WHERE ob.organization_id = p_org_id
      AND ob.register = _reg.name
      AND ob.period = p_period;

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
