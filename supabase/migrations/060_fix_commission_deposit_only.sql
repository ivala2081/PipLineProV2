-- 060_fix_commission_deposit_only.sql
-- Fixes get_monthly_summary to count commission for DEPOSITS ONLY,
-- matching the behaviour of get_psp_summary (migration 055).
--
-- Changes vs 057:
--   • total_commission_try  — add WHEN is_deposit guard
--   • commission_usd        — add WHEN is_deposit guard
--   • daily commission_try  — add WHEN is_deposit guard
--   • daily commission_usd  — add WHEN is_deposit guard
--   • commission_by_psp     — add WHEN is_deposit guard
--   • prev_kpis total_commission_try — add WHEN is_deposit guard
--   • prev_kpis commission_usd       — add WHEN is_deposit guard

CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  _org_id uuid,
  _year   int,
  _month  int
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _start_date      date;
  _end_date        date;
  _prev_start_date date;
  _prev_end_date   date;
  _result          json;
BEGIN
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
      t.id, t.transfer_date, t.amount, t.amount_try, t.amount_usd,
      t.commission, t.net, t.currency, t.exchange_rate,
      t.full_name, t.psp_id, t.category_id, t.payment_method_id, t.type_id,
      tc.is_deposit,
      tc.name AS category_name,
      p.name  AS psp_name,
      pm.name AS payment_method_name,
      tt.name AS type_name
    FROM public.transfers t
    JOIN public.transfer_categories tc ON tc.id = t.category_id
    LEFT JOIN public.psps p ON p.id = t.psp_id
    JOIN public.payment_methods pm ON pm.id = t.payment_method_id
    JOIN public.transfer_types tt ON tt.id = t.type_id
    WHERE t.organization_id = _org_id
      AND t.transfer_date >= _start_date::timestamp
      AND t.transfer_date <  _end_date::timestamp
      AND lower(tt.name) NOT LIKE '%bloke%'
      AND lower(tt.name) NOT LIKE '%blocked%'
      AND (p.name IS NULL OR lower(p.name) NOT LIKE '%bloke%')
  ),

  -- ── Monthly KPIs ─────────────────────────────────────────────────────────

  kpis_base AS (
    SELECT
      -- Deposits / withdrawals in TRY and USD
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0)                        AS total_deposits_try,
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_usd) ELSE 0 END), 0)                        AS total_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0)                    AS total_withdrawals_try,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_usd) ELSE 0 END), 0)                    AS total_withdrawals_usd,
      -- Volume by payment method
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%bank%'
                        THEN abs(amount_try) ELSE 0 END), 0)                                        AS total_bank_volume,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%credit%'
                          OR lower(payment_method_name) LIKE '%kredi%'
                        THEN abs(amount_try) ELSE 0 END), 0)                                        AS total_credit_card_volume,
      -- USDT gross volume (face value, always positive – kept for backward compat)
      coalesce(sum(CASE WHEN currency = 'USD' THEN abs(amount) ELSE 0 END), 0)                      AS total_usdt_volume,
      -- Commission in TRY — DEPOSITS ONLY (mirrors get_psp_summary)
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission * coalesce(exchange_rate, 1)
                        WHEN is_deposit THEN commission
                        ELSE 0 END), 0)                                                             AS total_commission_try,
      -- Counts
      count(*)::int                                                                                   AS transfer_count,
      count(*) FILTER (WHERE is_deposit)::int                                                        AS deposit_count,
      count(*) FILTER (WHERE NOT is_deposit)::int                                                    AS withdrawal_count,
      -- Per-direction USDT breakdown (USD face value)
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0)   AS usdt_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0)   AS usdt_withdrawals_usd,
      -- Per-direction Bank+CC breakdown (non-USDT via stored amount_usd)
      coalesce(sum(CASE WHEN is_deposit     AND currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0) AS bank_cc_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit AND currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0) AS bank_cc_withdrawals_usd,
      -- Net USDT (can be negative when withdrawals > deposits)
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0) -
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0)   AS usdt_net,
      -- Commission expressed in USD — DEPOSITS ONLY (mirrors get_psp_summary)
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission
                        WHEN is_deposit
                        THEN commission / NULLIF(coalesce(exchange_rate, 1), 0)
                        ELSE 0 END), 0)                                                             AS commission_usd,
      -- Gross non-USDT volume in USD (sum of stored amount_usd for TRY transfers)
      coalesce(sum(CASE WHEN currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0)                 AS bank_usd_gross
    FROM filtered
  ),

  kpis AS (
    SELECT *,
      bank_usd_gross + usdt_net                                                                      AS usd_cevirim,
      bank_usd_gross + usdt_net - commission_usd                                                     AS kom_son_usd,
      CASE WHEN bank_usd_gross + usdt_net > 0
           THEN commission_usd / (bank_usd_gross + usdt_net) * 100
           ELSE 0 END                                                                                AS finans_pct
    FROM kpis_base
  ),

  -- ── Daily charts (existing – unchanged) ──────────────────────────────────

  daily_volume AS (
    SELECT coalesce(json_agg(row_to_json(dv) ORDER BY dv.day), '[]'::json) AS data
    FROM (
      SELECT (transfer_date::date)::text AS day,
             coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0)     AS deposits,
             coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS withdrawals
      FROM filtered GROUP BY transfer_date::date
    ) dv
  ),

  daily_net AS (
    SELECT coalesce(json_agg(row_to_json(dn) ORDER BY dn.day), '[]'::json) AS data
    FROM (
      SELECT (transfer_date::date)::text AS day,
             coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0)
             - coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS net
      FROM filtered GROUP BY transfer_date::date
    ) dn
  ),

  -- ── Daily detailed breakdown ──────────────────────────────────────────────

  daily_details_raw AS (
    SELECT
      (transfer_date::date)::text AS day,
      -- BANKA: gross TRY (non-USDT), all payment methods combined
      coalesce(sum(CASE WHEN currency != 'USD' THEN abs(amount_try) ELSE 0 END), 0)     AS bank_try,
      -- KK: credit-card subset of bank_try
      coalesce(sum(CASE WHEN (lower(payment_method_name) LIKE '%credit%'
                              OR lower(payment_method_name) LIKE '%kredi%')
                             AND currency != 'USD'
                        THEN abs(amount_try) ELSE 0 END), 0)                            AS kk_try,
      -- Commission in TRY — DEPOSITS ONLY
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission * coalesce(exchange_rate, 1)
                        WHEN is_deposit THEN commission
                        ELSE 0 END), 0)                                                 AS commission_try,
      -- Net USDT (can be negative)
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0) -
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0) AS usdt_net,
      -- Gross non-USDT in USD (via stored amount_usd)
      coalesce(sum(CASE WHEN currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0)     AS bank_usd,
      -- Commission in USD — DEPOSITS ONLY
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission
                        WHEN is_deposit
                        THEN commission / NULLIF(coalesce(exchange_rate, 1), 0)
                        ELSE 0 END), 0)                                                 AS commission_usd,
      -- Average TRY/USD exchange rate for the day (NULL when no TRY transfers)
      round(avg(CASE WHEN currency != 'USD' AND exchange_rate > 0
                     THEN exchange_rate END)::numeric, 2)                               AS avg_rate
    FROM filtered
    GROUP BY transfer_date::date
  ),

  daily_details_calc AS (
    SELECT *,
      bank_usd + usdt_net                                                    AS usd_cevirim,
      bank_usd + usdt_net - commission_usd                                   AS kom_son_usd,
      CASE WHEN bank_usd + usdt_net > 0
           THEN commission_usd / (bank_usd + usdt_net) * 100
           ELSE NULL END                                                      AS finans_pct
    FROM daily_details_raw
  ),

  daily_detailed AS (
    SELECT coalesce(json_agg(row_to_json(dd) ORDER BY dd.day), '[]'::json) AS data
    FROM daily_details_calc dd
  ),

  -- ── Breakdown aggregates ──────────────────────────────────────────────────

  psp_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(pb) ORDER BY pb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT psp_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered WHERE psp_name IS NOT NULL GROUP BY psp_name
    ) pb
  ),

  payment_method_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(pmb) ORDER BY pmb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT payment_method_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY payment_method_name
    ) pmb
  ),

  category_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(cb) ORDER BY cb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT category_name AS name, is_deposit, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY category_name, is_deposit
    ) cb
  ),

  currency_split AS (
    SELECT coalesce(json_agg(row_to_json(cs)), '[]'::json) AS data
    FROM (
      SELECT currency, sum(abs(amount_try)) AS volume_try, count(*)::int AS count
      FROM filtered GROUP BY currency
    ) cs
  ),

  commission_by_psp AS (
    SELECT coalesce(json_agg(row_to_json(cp) ORDER BY cp.commission DESC), '[]'::json) AS data
    FROM (
      SELECT psp_name AS name,
             -- DEPOSITS ONLY (mirrors get_psp_summary)
             sum(CASE WHEN is_deposit AND currency = 'USD'
                      THEN commission * coalesce(exchange_rate, 1)
                      WHEN is_deposit THEN commission
                      ELSE 0 END) AS commission
      FROM filtered WHERE psp_name IS NOT NULL GROUP BY psp_name
    ) cp
  ),

  top_customers AS (
    SELECT coalesce(json_agg(row_to_json(tc)), '[]'::json) AS data
    FROM (
      SELECT full_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY full_name ORDER BY sum(abs(amount_try)) DESC LIMIT 20
    ) tc
  ),

  type_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(tb) ORDER BY tb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT type_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY type_name
    ) tb
  ),

  -- ── Previous month KPIs ───────────────────────────────────────────────────

  prev_filtered AS (
    SELECT t.amount_try, t.amount_usd, t.amount, t.commission, t.currency, t.exchange_rate,
           tc.is_deposit, pm.name AS payment_method_name
    FROM public.transfers t
    JOIN public.transfer_categories tc ON tc.id = t.category_id
    LEFT JOIN public.psps p ON p.id = t.psp_id
    JOIN public.payment_methods pm ON pm.id = t.payment_method_id
    JOIN public.transfer_types tt ON tt.id = t.type_id
    WHERE t.organization_id = _org_id
      AND t.transfer_date >= _prev_start_date::timestamp
      AND t.transfer_date <  _prev_end_date::timestamp
      AND lower(tt.name) NOT LIKE '%bloke%'
      AND lower(tt.name) NOT LIKE '%blocked%'
      AND (p.name IS NULL OR lower(p.name) NOT LIKE '%bloke%')
  ),

  prev_kpis_base AS (
    SELECT
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0)                        AS total_deposits_try,
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_usd) ELSE 0 END), 0)                        AS total_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0)                    AS total_withdrawals_try,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_usd) ELSE 0 END), 0)                    AS total_withdrawals_usd,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%bank%'
                        THEN abs(amount_try) ELSE 0 END), 0)                                        AS total_bank_volume,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%credit%'
                          OR lower(payment_method_name) LIKE '%kredi%'
                        THEN abs(amount_try) ELSE 0 END), 0)                                        AS total_credit_card_volume,
      coalesce(sum(CASE WHEN currency = 'USD' THEN abs(amount) ELSE 0 END), 0)                      AS total_usdt_volume,
      -- DEPOSITS ONLY
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission * coalesce(exchange_rate, 1)
                        WHEN is_deposit THEN commission
                        ELSE 0 END), 0)                                                             AS total_commission_try,
      count(*)::int                                                                                   AS transfer_count,
      count(*) FILTER (WHERE is_deposit)::int                                                        AS deposit_count,
      count(*) FILTER (WHERE NOT is_deposit)::int                                                    AS withdrawal_count,
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0)   AS usdt_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0)   AS usdt_withdrawals_usd,
      coalesce(sum(CASE WHEN is_deposit     AND currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0) AS bank_cc_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit AND currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0) AS bank_cc_withdrawals_usd,
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0) -
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0)   AS usdt_net,
      -- DEPOSITS ONLY
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission
                        WHEN is_deposit
                        THEN commission / NULLIF(coalesce(exchange_rate, 1), 0)
                        ELSE 0 END), 0)                                                             AS commission_usd,
      coalesce(sum(CASE WHEN currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0)                 AS bank_usd_gross
    FROM prev_filtered
  ),

  prev_kpis AS (
    SELECT *,
      bank_usd_gross + usdt_net                                                                      AS usd_cevirim,
      bank_usd_gross + usdt_net - commission_usd                                                     AS kom_son_usd,
      CASE WHEN bank_usd_gross + usdt_net > 0
           THEN commission_usd / (bank_usd_gross + usdt_net) * 100
           ELSE 0 END                                                                                AS finans_pct
    FROM prev_kpis_base
  ),

  -- ── Insights ─────────────────────────────────────────────────────────────

  insights AS (
    SELECT
      peak.day AS peak_day,
      peak.total AS peak_day_volume,
      agg.active_days,
      CASE WHEN agg.active_days > 0 THEN agg.total_volume / agg.active_days ELSE 0 END AS avg_daily_volume,
      CASE WHEN agg.transfer_count > 0 THEN agg.total_volume / agg.transfer_count ELSE 0 END AS avg_per_transfer
    FROM (
      SELECT count(DISTINCT transfer_date::date)::int AS active_days,
             coalesce(sum(abs(amount_try)), 0) AS total_volume,
             count(*)::int AS transfer_count
      FROM filtered
    ) agg
    LEFT JOIN LATERAL (
      SELECT (transfer_date::date)::text AS day, sum(abs(amount_try)) AS total
      FROM filtered GROUP BY transfer_date::date ORDER BY sum(abs(amount_try)) DESC LIMIT 1
    ) peak ON true
  )

  SELECT json_build_object(
    'kpis',                     (SELECT row_to_json(k) FROM kpis k),
    'prev_kpis',                (SELECT CASE WHEN (SELECT transfer_count FROM prev_kpis) > 0
                                             THEN row_to_json(pk) ELSE NULL END
                                 FROM prev_kpis pk),
    'insights',                 (SELECT row_to_json(ins) FROM insights ins),
    'daily_volume',             (SELECT data FROM daily_volume),
    'daily_net',                (SELECT data FROM daily_net),
    'daily_detailed',           (SELECT data FROM daily_detailed),
    'psp_breakdown',            (SELECT data FROM psp_breakdown),
    'payment_method_breakdown', (SELECT data FROM payment_method_breakdown),
    'category_breakdown',       (SELECT data FROM category_breakdown),
    'currency_split',           (SELECT data FROM currency_split),
    'commission_by_psp',        (SELECT data FROM commission_by_psp),
    'top_customers',            (SELECT data FROM top_customers),
    'type_breakdown',           (SELECT data FROM type_breakdown)
  ) INTO _result;

  RETURN _result;
END;
$$;
