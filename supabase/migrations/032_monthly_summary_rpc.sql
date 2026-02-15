-- ============================================================================
-- Migration 033: Monthly Summary RPC Function
-- ============================================================================
-- Returns pre-aggregated monthly analytics as a single JSON object.
-- Called from the frontend Monthly tab via supabase.rpc('get_monthly_summary').
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  _org_id uuid,
  _year   int,
  _month  int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start_date      date;
  _end_date        date;
  _prev_start_date date;
  _prev_end_date   date;
  _result          json;
BEGIN
  -- Validate org membership
  IF NOT (
    (SELECT private.is_god())
    OR _org_id IN (SELECT private.get_user_org_ids())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  _start_date      := make_date(_year, _month, 1);
  _end_date        := (_start_date + interval '1 month')::date;
  _prev_start_date := (_start_date - interval '1 month')::date;
  _prev_end_date   := _start_date;

  WITH filtered AS (
    SELECT
      t.id,
      t.transfer_date,
      t.amount,
      t.amount_try,
      t.amount_usd,
      t.commission,
      t.net,
      t.currency,
      t.exchange_rate,
      t.full_name,
      t.psp_id,
      t.category_id,
      t.payment_method_id,
      t.type_id,
      tc.is_deposit,
      tc.name   AS category_name,
      p.name    AS psp_name,
      pm.name   AS payment_method_name,
      tt.name   AS type_name
    FROM public.transfers t
    JOIN public.transfer_categories tc ON tc.id = t.category_id
    JOIN public.psps p ON p.id = t.psp_id
    JOIN public.payment_methods pm ON pm.id = t.payment_method_id
    JOIN public.transfer_types tt ON tt.id = t.type_id
    WHERE t.organization_id = _org_id
      AND t.transfer_date >= _start_date::timestamp
      AND t.transfer_date < _end_date::timestamp
      AND lower(tt.name) NOT LIKE '%bloke%'
      AND lower(tt.name) NOT LIKE '%blocked%'
      AND lower(p.name)  NOT LIKE '%bloke%'
  ),

  -- KPI totals
  kpis AS (
    SELECT
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS total_deposits_try,
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_usd) ELSE 0 END), 0) AS total_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS total_withdrawals_try,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_usd) ELSE 0 END), 0) AS total_withdrawals_usd,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%bank%' THEN abs(amount_try) ELSE 0 END), 0) AS total_bank_volume,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%credit%' OR lower(payment_method_name) LIKE '%kredi%' THEN abs(amount_try) ELSE 0 END), 0) AS total_credit_card_volume,
      coalesce(sum(CASE WHEN currency = 'USD' THEN abs(amount) ELSE 0 END), 0) AS total_usdt_volume,
      coalesce(sum(
        CASE WHEN currency = 'USD'
          THEN commission * coalesce(exchange_rate, 1)
          ELSE commission
        END
      ), 0) AS total_commission_try,
      count(*)::int AS transfer_count,
      count(*) FILTER (WHERE is_deposit)::int AS deposit_count,
      count(*) FILTER (WHERE NOT is_deposit)::int AS withdrawal_count
    FROM filtered
  ),

  -- Daily volume (for bar chart)
  daily_volume AS (
    SELECT coalesce(json_agg(row_to_json(dv) ORDER BY dv.day), '[]'::json) AS data
    FROM (
      SELECT
        (transfer_date::date)::text AS day,
        coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS deposits,
        coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS withdrawals
      FROM filtered
      GROUP BY transfer_date::date
    ) dv
  ),

  -- Daily net (for line chart)
  daily_net AS (
    SELECT coalesce(json_agg(row_to_json(dn) ORDER BY dn.day), '[]'::json) AS data
    FROM (
      SELECT
        (transfer_date::date)::text AS day,
        coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0)
        - coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS net
      FROM filtered
      GROUP BY transfer_date::date
    ) dn
  ),

  -- PSP Breakdown
  psp_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(pb) ORDER BY pb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT psp_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY psp_name
    ) pb
  ),

  -- Payment Method Breakdown
  payment_method_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(pmb) ORDER BY pmb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT payment_method_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY payment_method_name
    ) pmb
  ),

  -- Category Breakdown
  category_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(cb) ORDER BY cb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT
        category_name AS name,
        is_deposit,
        sum(abs(amount_try)) AS volume,
        count(*)::int AS count
      FROM filtered GROUP BY category_name, is_deposit
    ) cb
  ),

  -- Currency Split
  currency_split AS (
    SELECT coalesce(json_agg(row_to_json(cs)), '[]'::json) AS data
    FROM (
      SELECT currency, sum(abs(amount_try)) AS volume_try, count(*)::int AS count
      FROM filtered GROUP BY currency
    ) cs
  ),

  -- Commission by PSP
  commission_by_psp AS (
    SELECT coalesce(json_agg(row_to_json(cp) ORDER BY cp.commission DESC), '[]'::json) AS data
    FROM (
      SELECT
        psp_name AS name,
        sum(
          CASE WHEN currency = 'USD'
            THEN commission * coalesce(exchange_rate, 1)
            ELSE commission
          END
        ) AS commission
      FROM filtered GROUP BY psp_name
    ) cp
  ),

  -- Top Customers (top 20 by volume)
  top_customers AS (
    SELECT coalesce(json_agg(row_to_json(tc)), '[]'::json) AS data
    FROM (
      SELECT full_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY full_name
      ORDER BY sum(abs(amount_try)) DESC
      LIMIT 20
    ) tc
  ),

  -- Transfer Type Breakdown
  type_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(tb) ORDER BY tb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT type_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY type_name
    ) tb
  ),

  -- Previous month filtered transfers (for MoM comparison)
  prev_filtered AS (
    SELECT
      t.amount_try,
      t.amount_usd,
      t.amount,
      t.commission,
      t.currency,
      t.exchange_rate,
      tc.is_deposit,
      pm.name AS payment_method_name
    FROM public.transfers t
    JOIN public.transfer_categories tc ON tc.id = t.category_id
    JOIN public.psps p ON p.id = t.psp_id
    JOIN public.payment_methods pm ON pm.id = t.payment_method_id
    JOIN public.transfer_types tt ON tt.id = t.type_id
    WHERE t.organization_id = _org_id
      AND t.transfer_date >= _prev_start_date::timestamp
      AND t.transfer_date < _prev_end_date::timestamp
      AND lower(tt.name) NOT LIKE '%bloke%'
      AND lower(tt.name) NOT LIKE '%blocked%'
      AND lower(p.name)  NOT LIKE '%bloke%'
  ),

  -- Previous month KPIs
  prev_kpis AS (
    SELECT
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS total_deposits_try,
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_usd) ELSE 0 END), 0) AS total_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS total_withdrawals_try,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_usd) ELSE 0 END), 0) AS total_withdrawals_usd,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%bank%' THEN abs(amount_try) ELSE 0 END), 0) AS total_bank_volume,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%credit%' OR lower(payment_method_name) LIKE '%kredi%' THEN abs(amount_try) ELSE 0 END), 0) AS total_credit_card_volume,
      coalesce(sum(CASE WHEN currency = 'USD' THEN abs(amount) ELSE 0 END), 0) AS total_usdt_volume,
      coalesce(sum(
        CASE WHEN currency = 'USD'
          THEN commission * coalesce(exchange_rate, 1)
          ELSE commission
        END
      ), 0) AS total_commission_try,
      count(*)::int AS transfer_count,
      count(*) FILTER (WHERE is_deposit)::int AS deposit_count,
      count(*) FILTER (WHERE NOT is_deposit)::int AS withdrawal_count
    FROM prev_filtered
  ),

  -- Insights (peak day, averages)
  insights AS (
    SELECT
      peak.day AS peak_day,
      peak.total AS peak_day_volume,
      agg.active_days,
      CASE WHEN agg.active_days > 0
        THEN agg.total_volume / agg.active_days
        ELSE 0
      END AS avg_daily_volume,
      CASE WHEN agg.transfer_count > 0
        THEN agg.total_volume / agg.transfer_count
        ELSE 0
      END AS avg_per_transfer
    FROM (
      SELECT
        count(DISTINCT transfer_date::date)::int AS active_days,
        coalesce(sum(abs(amount_try)), 0) AS total_volume,
        count(*)::int AS transfer_count
      FROM filtered
    ) agg
    LEFT JOIN LATERAL (
      SELECT
        (transfer_date::date)::text AS day,
        sum(abs(amount_try)) AS total
      FROM filtered
      GROUP BY transfer_date::date
      ORDER BY sum(abs(amount_try)) DESC
      LIMIT 1
    ) peak ON true
  )

  SELECT json_build_object(
    'kpis',                      (SELECT row_to_json(kpis) FROM kpis),
    'prev_kpis',                 (SELECT CASE WHEN (SELECT transfer_count FROM prev_kpis) > 0 THEN row_to_json(prev_kpis) ELSE NULL END FROM prev_kpis),
    'insights',                  (SELECT row_to_json(insights) FROM insights),
    'daily_volume',              (SELECT data FROM daily_volume),
    'daily_net',                 (SELECT data FROM daily_net),
    'psp_breakdown',             (SELECT data FROM psp_breakdown),
    'payment_method_breakdown',  (SELECT data FROM payment_method_breakdown),
    'category_breakdown',        (SELECT data FROM category_breakdown),
    'currency_split',            (SELECT data FROM currency_split),
    'commission_by_psp',         (SELECT data FROM commission_by_psp),
    'top_customers',             (SELECT data FROM top_customers),
    'type_breakdown',            (SELECT data FROM type_breakdown)
  ) INTO _result;

  RETURN _result;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_monthly_summary(uuid, int, int) TO authenticated;
