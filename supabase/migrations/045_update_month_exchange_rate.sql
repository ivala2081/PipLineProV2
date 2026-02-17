-- ============================================================================
-- 045: RPC to bulk-update exchange rate for a given month
-- ============================================================================
-- Updates all transfers in a month with a new USD/TRY rate and recalculates
-- amount_try (for USD transfers) and amount_usd (for TL transfers).
-- Also upserts the exchange_rates table entries for each day in the month.
-- ============================================================================

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
  _tl_count    int;
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

  -- Update TL transfers: recalculate amount_usd
  UPDATE public.transfers
  SET exchange_rate = _new_rate,
      amount_usd   = ROUND(amount / _new_rate, 2)
  WHERE organization_id = _org_id
    AND transfer_date >= _start_date::timestamp
    AND transfer_date <  _end_date::timestamp
    AND currency = 'TL';

  GET DIAGNOSTICS _tl_count = ROW_COUNT;

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
  INSERT INTO public.exchange_rates (organization_id, currency, rate_to_tl, rate_date, source)
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
  DO UPDATE SET rate_to_tl = EXCLUDED.rate_to_tl, source = EXCLUDED.source;

  RETURN json_build_object(
    'success', true,
    'tl_updated', _tl_count,
    'usd_updated', _usd_count,
    'new_rate', _new_rate
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_month_exchange_rate(uuid, int, int, numeric) TO authenticated;
