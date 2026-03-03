-- ============================================================================
-- 082: Dynamic base currency
--
-- Context:
--   Organizations now have a configurable base_currency (ISO 4217). This
--   migration:
--     1. Drops all hardcoded currency CHECK constraints so any ISO code is valid
--     2. Migrates all existing 'TL' values → 'TRY' (ISO 4217 for Turkish Lira)
--     3. Updates DEFAULT 'TL' → 'TRY' on affected columns
--     4. Renames exchange_rates.rate_to_tl → rate_to_base (semantically generic)
--     5. Recreates update_month_exchange_rate() RPC with updated column/currency refs
-- ============================================================================

-- ── 1. Drop currency CHECK constraints robustly (any constraint name) ────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM   pg_constraint
    WHERE  contype = 'c'
      AND  conrelid IN (
             'public.transfers'::regclass,
             'public.psp_settlements'::regclass,
             'public.accounting_entries'::regclass
           )
      AND  conname ILIKE '%currency%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END;
$$;

-- ── 2. Migrate 'TL' → 'TRY' in all affected tables ─────────────────────────
UPDATE public.transfers          SET currency = 'TRY' WHERE currency = 'TL';
UPDATE public.psps               SET currency = 'TRY' WHERE currency = 'TL';
UPDATE public.psp_settlements    SET currency = 'TRY' WHERE currency = 'TL';
UPDATE public.accounting_entries SET currency = 'TRY' WHERE currency = 'TL';

-- ── 3. Update DEFAULT values ─────────────────────────────────────────────────
ALTER TABLE public.transfers ALTER COLUMN currency SET DEFAULT 'TRY';
ALTER TABLE public.psps      ALTER COLUMN currency SET DEFAULT 'TRY';

-- ── 4. Rename rate_to_tl → rate_to_base ──────────────────────────────────────
ALTER TABLE public.exchange_rates RENAME COLUMN rate_to_tl TO rate_to_base;

-- ── 5. Recreate RPC: replace 'TL' → 'TRY' and rate_to_tl → rate_to_base ─────
CREATE OR REPLACE FUNCTION public.update_month_exchange_rate(
  _org_id   uuid,
  _year     int,
  _month    int,
  _new_rate numeric
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _start_date  date;
  _end_date    date;
  _base_count  int;
  _usd_count   int;
BEGIN
  -- Validate org membership
  IF NOT (
    (SELECT private.is_god())
    OR _org_id IN (SELECT private.get_user_org_ids())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Validate rate
  IF _new_rate IS NULL OR _new_rate <= 0 THEN
    RAISE EXCEPTION 'Invalid exchange rate';
  END IF;

  _start_date := make_date(_year, _month, 1);
  _end_date   := (_start_date + interval '1 month')::date;

  -- Update base-currency (TRY) transfers: recalculate amount_usd
  UPDATE public.transfers
  SET exchange_rate = _new_rate,
      amount_usd   = ROUND(amount / _new_rate, 2)
  WHERE organization_id = _org_id
    AND transfer_date >= _start_date::timestamp
    AND transfer_date <  _end_date::timestamp
    AND currency = 'TRY';

  GET DIAGNOSTICS _base_count = ROW_COUNT;

  -- Update USD transfers: recalculate amount_try
  UPDATE public.transfers
  SET exchange_rate = _new_rate,
      amount_try   = ROUND(amount * _new_rate, 2)
  WHERE organization_id = _org_id
    AND transfer_date >= _start_date::timestamp
    AND transfer_date <  _end_date::timestamp
    AND currency = 'USD';

  GET DIAGNOSTICS _usd_count = ROW_COUNT;

  -- Upsert exchange_rates for each distinct day in the month that has transfers
  INSERT INTO public.exchange_rates (organization_id, currency, rate_to_base, rate_date, source)
  SELECT DISTINCT
    _org_id,
    'USD',
    _new_rate,
    (transfer_date::date),
    'monthly_bulk'
  FROM public.transfers
  WHERE organization_id = _org_id
    AND transfer_date >= _start_date::timestamp
    AND transfer_date <  _end_date::timestamp
  ON CONFLICT (organization_id, currency, rate_date)
  DO UPDATE SET rate_to_base = EXCLUDED.rate_to_base, source = EXCLUDED.source;

  RETURN json_build_object(
    'success',       true,
    'base_updated',  _base_count,
    'usd_updated',   _usd_count,
    'new_rate',      _new_rate
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_month_exchange_rate(uuid, int, int, numeric) TO authenticated;
