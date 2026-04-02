-- ============================================================================
-- 122: Fix get_accounting_summary + get_category_breakdown RPCs
--
-- Root cause: The RPCs filter on register_id (UUID FK) but imported/legacy
-- entries only have the text register column populated (register_id is NULL).
-- Fix: match on EITHER register_id = _reg.id OR register = _reg.name.
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
    -- Match on register_id (new entries) OR register text name (legacy/imported entries)
    SELECT
      COALESCE(SUM(CASE WHEN e.direction = 'in'  THEN e.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN e.direction = 'out' THEN e.amount ELSE 0 END), 0)
    INTO _total_in, _total_out
    FROM accounting_entries e
    WHERE e.organization_id = p_org_id
      AND (e.register_id = _reg.id OR (e.register_id IS NULL AND e.register = _reg.name))
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

    -- Accumulate USD-equivalent totals
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


-- Also fix get_category_breakdown to use the same fallback pattern
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
