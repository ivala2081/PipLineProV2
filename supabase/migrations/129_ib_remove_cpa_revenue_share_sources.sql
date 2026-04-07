-- ============================================================================
-- 129: Remove CPA agreement type + new Revenue Share sources
--
-- 1. Drops 'cpa' from ib_partners.agreement_types CHECK constraint
-- 2. Strips 'cpa' from existing agreement_types arrays and agreement_details
--    Partners that only had 'cpa' get migrated to ['revenue_share'] with empty
--    details so they remain valid (re-configuration required by the user).
-- 3. Migrates legacy revenue_share.source values:
--      'spread'      -> 'first_deposit'
--      'commission'  -> 'first_deposit'
--      'net_revenue' -> 'net_revenue'  (unchanged)
-- 4. Replaces calculate_ib_commission RPC:
--      - removes the CPA branch
--      - revenue_share now reads transfers in the period:
--          first_deposit -> SUM(amount_usd) of deposits from this IB where
--                           transfers.is_first_deposit = true
--          net_revenue   -> SUM(amount_usd) of ALL deposits from this IB
--                           (first deposit + retention)
--        result = sum * revshare_pct / 100
--
-- Historical ib_commissions rows with agreement_type = 'cpa' are preserved for
-- audit purposes — only the live ib_partners configuration is cleaned up.
-- ============================================================================

-- ============================================================================
-- 1. Drop the existing CHECK constraint so we can mutate the data
-- ============================================================================
ALTER TABLE public.ib_partners
  DROP CONSTRAINT IF EXISTS chk_agreement_types_valid;

-- ============================================================================
-- 2. Remove 'cpa' from agreement_types arrays
-- ============================================================================
UPDATE public.ib_partners
SET agreement_types = ARRAY(
  SELECT t FROM unnest(agreement_types) AS t WHERE t <> 'cpa'
)
WHERE 'cpa' = ANY(agreement_types);

-- ============================================================================
-- 3. Strip 'cpa' from agreement_details JSONB
-- ============================================================================
UPDATE public.ib_partners
SET agreement_details = agreement_details - 'cpa'
WHERE agreement_details ? 'cpa';

-- ============================================================================
-- 4. Partners that ended up with empty agreement_types
--    -> assign ['revenue_share'] with default details so the row stays valid
-- ============================================================================
UPDATE public.ib_partners
SET
  agreement_types   = ARRAY['revenue_share'],
  agreement_details = COALESCE(agreement_details, '{}'::jsonb)
                      || jsonb_build_object(
                          'revenue_share',
                          jsonb_build_object('revshare_pct', 0, 'source', 'first_deposit')
                        )
WHERE agreement_types IS NULL OR array_length(agreement_types, 1) IS NULL;

-- ============================================================================
-- 5. Migrate legacy revenue_share.source values
--    'spread' / 'commission' -> 'first_deposit'  (no longer supported)
--    'net_revenue'           -> 'net_revenue'    (unchanged)
-- ============================================================================
UPDATE public.ib_partners
SET agreement_details = jsonb_set(
      agreement_details,
      '{revenue_share,source}',
      to_jsonb('first_deposit'::text),
      true
    )
WHERE agreement_details ? 'revenue_share'
  AND COALESCE(agreement_details #>> '{revenue_share,source}', '') NOT IN ('first_deposit', 'net_revenue');

-- ============================================================================
-- 6. Re-add CHECK constraint without 'cpa'
-- ============================================================================
ALTER TABLE public.ib_partners
  ADD CONSTRAINT chk_agreement_types_valid
  CHECK (
    array_length(agreement_types, 1) >= 1
    AND agreement_types <@ ARRAY['salary','lot_rebate','revenue_share']
  );

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
  _results        JSONB := '[]'::jsonb;
  _total_amount   NUMERIC := 0;
  _currency       TEXT := 'USD';
  _source         TEXT;
  _pct            NUMERIC;
  _base_total     NUMERIC;
  _deposit_count  INT;
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

      -- ── Lot Rebate: skip (not auto-calculated) ──
      WHEN 'lot_rebate' THEN
        CONTINUE;

      -- ── Revenue Share: % of deposits brought in by this IB ──
      WHEN 'revenue_share' THEN
        _pct      := COALESCE((_type_details->>'revshare_pct')::numeric, 0);
        _source   := COALESCE(_type_details->>'source', 'first_deposit');
        _currency := 'USD'; -- transfers.amount_usd is normalized to USD

        IF _source = 'first_deposit' THEN
          -- Only first deposits (not yet retention) tied to this IB
          SELECT
            COALESCE(SUM(t.amount_usd), 0),
            COUNT(*)
          INTO _base_total, _deposit_count
          FROM transfers t
          JOIN transfer_categories c ON c.id = t.category_id
          WHERE t.organization_id = _partner.organization_id
            AND t.ib_partner_id   = p_ib_partner_id
            AND c.is_deposit      = true
            AND t.is_first_deposit = true
            AND t.transfer_date::date BETWEEN p_period_start AND p_period_end;
        ELSE
          -- 'net_revenue' = ALL deposits from this IB (first deposit + retention)
          SELECT
            COALESCE(SUM(t.amount_usd), 0),
            COUNT(*)
          INTO _base_total, _deposit_count
          FROM transfers t
          JOIN transfer_categories c ON c.id = t.category_id
          WHERE t.organization_id = _partner.organization_id
            AND t.ib_partner_id   = p_ib_partner_id
            AND c.is_deposit      = true
            AND t.transfer_date::date BETWEEN p_period_start AND p_period_end;
        END IF;

        _amount := _base_total * _pct / 100;

        _breakdown := jsonb_build_object(
          'type',          'revenue_share',
          'source',        _source,
          'revshare_pct',  _pct,
          'base_total',    _base_total,
          'deposit_count', _deposit_count,
          'currency',      _currency,
          'total',         _amount
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
