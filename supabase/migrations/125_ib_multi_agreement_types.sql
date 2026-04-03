-- ============================================================================
-- 125: IB Multi Agreement Types
--
-- Converts agreement_type from single TEXT to TEXT[] array
-- Restructures agreement_details to keyed JSONB: { "salary": {...}, "cpa": {...} }
-- Removes 'hybrid' type (multi-select replaces it)
-- Updates calculate_ib_commission RPC for multi-type support
-- lot_rebate: selectable but NOT auto-calculated in RPC
-- ============================================================================

-- ============================================================================
-- 1. Add agreement_types array column
-- ============================================================================
ALTER TABLE public.ib_partners
  ADD COLUMN IF NOT EXISTS agreement_types TEXT[];

-- ============================================================================
-- 2. Migrate existing data
-- ============================================================================

-- Non-hybrid: wrap single type into array
UPDATE public.ib_partners
SET agreement_types = ARRAY[agreement_type]
WHERE agreement_type != 'hybrid';

-- Hybrid: extract component types from details.components
UPDATE public.ib_partners
SET agreement_types = (
  SELECT COALESCE(
    array_agg(DISTINCT comp->>'type'),
    ARRAY['cpa']
  )
  FROM jsonb_array_elements(
    COALESCE(agreement_details->'components', '[]'::jsonb)
  ) AS comp
  WHERE comp->>'type' IS NOT NULL
)
WHERE agreement_type = 'hybrid';

-- Fallback: if hybrid had empty components, default to cpa
UPDATE public.ib_partners
SET agreement_types = ARRAY['cpa']
WHERE agreement_types IS NULL AND agreement_type = 'hybrid';

-- ============================================================================
-- 3. Restructure agreement_details to keyed format
-- ============================================================================

-- Non-hybrid: { "salary": { amount: ..., currency: ..., period: ... } }
UPDATE public.ib_partners
SET agreement_details = jsonb_build_object(agreement_type, agreement_details)
WHERE agreement_type != 'hybrid';

-- Hybrid: extract components into keyed structure
UPDATE public.ib_partners
SET agreement_details = (
  SELECT COALESCE(
    jsonb_object_agg(comp->>'type', comp - 'type'),
    '{}'::jsonb
  )
  FROM jsonb_array_elements(
    COALESCE(agreement_details->'components', '[]'::jsonb)
  ) AS comp
  WHERE comp->>'type' IS NOT NULL
)
WHERE agreement_type = 'hybrid';

-- ============================================================================
-- 4. Finalize column constraints
-- ============================================================================
ALTER TABLE public.ib_partners
  ALTER COLUMN agreement_types SET NOT NULL;

ALTER TABLE public.ib_partners
  ADD CONSTRAINT chk_agreement_types_valid
  CHECK (
    array_length(agreement_types, 1) >= 1
    AND agreement_types <@ ARRAY['salary','cpa','lot_rebate','revenue_share']
  );

-- ============================================================================
-- 5. Drop old agreement_type column
-- ============================================================================
ALTER TABLE public.ib_partners
  DROP CONSTRAINT IF EXISTS ib_partners_agreement_type_check;

ALTER TABLE public.ib_partners
  DROP COLUMN agreement_type;

-- ============================================================================
-- 6. Update commission unique index for per-type rows
-- ============================================================================
DROP INDEX IF EXISTS idx_ib_commissions_unique_period;

CREATE UNIQUE INDEX idx_ib_commissions_unique_period
  ON ib_commissions(organization_id, ib_partner_id, period_start, period_end, agreement_type);

-- ============================================================================
-- 7. Replace calculate_ib_commission RPC
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
  _type_details   JSONB;
  _type           TEXT;
  _amount         NUMERIC;
  _breakdown      JSONB;
  _ftd_count      INT;
  _results        JSONB := '[]'::jsonb;
  _total_amount   NUMERIC := 0;
  _currency       TEXT := 'USD';
BEGIN
  -- Fetch partner
  SELECT * INTO _partner FROM ib_partners WHERE id = p_ib_partner_id;
  IF _partner IS NULL THEN
    RAISE EXCEPTION 'IB Partner not found';
  END IF;

  -- Permission check
  IF NOT (
    private.is_god()
    OR _partner.organization_id IN (SELECT private.get_user_org_ids())
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  _details := _partner.agreement_details;

  -- Iterate over each agreement type
  FOREACH _type IN ARRAY _partner.agreement_types
  LOOP
    _type_details := COALESCE(_details->_type, '{}'::jsonb);
    _amount := 0;
    _breakdown := '{}'::jsonb;

    CASE _type
      -- ── Salary: fixed amount ──
      WHEN 'salary' THEN
        _amount := COALESCE((_type_details->>'amount')::numeric, 0);
        _currency := COALESCE(_type_details->>'currency', 'USD');
        _breakdown := jsonb_build_object(
          'type', 'salary',
          'fixed_amount', _amount,
          'period', COALESCE(_type_details->>'period', 'monthly'),
          'currency', _currency
        );

      -- ── CPA: count FTDs in period × rate ──
      WHEN 'cpa' THEN
        SELECT COUNT(*) INTO _ftd_count
        FROM ib_referrals
        WHERE ib_partner_id = p_ib_partner_id
          AND is_ftd = true
          AND ftd_date BETWEEN p_period_start AND p_period_end
          AND (
            (_type_details->>'min_ftd_amount') IS NULL
            OR ftd_amount >= (_type_details->>'min_ftd_amount')::numeric
          );

        _amount := _ftd_count * COALESCE((_type_details->>'cpa_amount')::numeric, 0);
        _currency := COALESCE(_type_details->>'currency', 'USD');
        _breakdown := jsonb_build_object(
          'type', 'cpa',
          'ftd_count', _ftd_count,
          'cpa_rate', COALESCE((_type_details->>'cpa_amount')::numeric, 0),
          'min_ftd_amount', (_type_details->>'min_ftd_amount'),
          'total', _amount
        );

      -- ── Lot Rebate: skip (not auto-calculated) ──
      WHEN 'lot_rebate' THEN
        CONTINUE;

      -- ── Revenue Share: percentage of revenue ──
      WHEN 'revenue_share' THEN
        _amount := COALESCE((_type_details->>'total_revenue')::numeric, 0)
                   * COALESCE((_type_details->>'revshare_pct')::numeric, 0) / 100;
        _currency := COALESCE(_type_details->>'currency', 'USD');
        _breakdown := jsonb_build_object(
          'type', 'revenue_share',
          'revshare_pct', COALESCE((_type_details->>'revshare_pct')::numeric, 0),
          'source', COALESCE(_type_details->>'source', 'net_revenue'),
          'total', _amount
        );

      ELSE
        CONTINUE;
    END CASE;

    _total_amount := _total_amount + _amount;

    _results := _results || jsonb_build_object(
      'type', _type,
      'calculated_amount', _amount,
      'breakdown', _breakdown,
      'currency', _currency
    );
  END LOOP;

  RETURN jsonb_build_object(
    'total_amount', _total_amount,
    'types', _results,
    'currency', _currency
  );
END;
$$;
