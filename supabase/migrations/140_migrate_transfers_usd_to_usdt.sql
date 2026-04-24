-- ============================================================================
-- 140: Migrate transfers.currency from 'USD' to 'USDT' (all orgs)
-- ----------------------------------------------------------------------------
-- Context:
--   Migration 080 (migrate_tether_to_usdt) moved Tether-PSP transfers from
--   'USD' → 'USDT', but KPI RPCs kept checking currency = 'USD' as the "USDT"
--   bucket. The 2026 CSV re-import (migration 136) then wrote fresh rows back
--   as 'USD', which kept the dashboard correct but broke the Transfers page
--   Daily Summary (which checks currency = 'USDT').
--
--   This migration aligns everything on 'USDT':
--     1. Data: transfers.currency 'USD' → 'USDT' (every remaining row)
--     2. RPC : get_monthly_summary rewritten to use currency = 'USDT'
--
--   Scope is transfers only. exchange_rates stays on 'USD' (it records the
--   USD/TL FX rate, not a transfer currency). HR salary_currency stays on
--   'USD' (real cash USD salaries, unrelated to transfer crypto).
-- ============================================================================

BEGIN;

-- ── 1. Data migration ───────────────────────────────────────────────────────
DO $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.transfers
     SET currency = 'USDT'
   WHERE currency = 'USD';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'transfers re-labelled USD → USDT: %', v_updated;
END $$;

-- ── 2. RPC: get_monthly_summary — flip USD→USDT bucket checks ──────────────
CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  _org_id uuid,
  _year   int,
  _month  int
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET timezone = 'Europe/Istanbul'
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
      tt.name AS type_name,
      tt.exclude_from_net
    FROM public.transfers t
    JOIN public.transfer_categories tc ON tc.id = t.category_id
    LEFT JOIN public.psps p ON p.id = t.psp_id
    JOIN public.payment_methods pm ON pm.id = t.payment_method_id
    JOIN public.transfer_types tt ON tt.id = t.type_id
    WHERE t.organization_id = _org_id
      AND t.transfer_date >= _start_date::timestamp
      AND t.transfer_date <  _end_date::timestamp
      AND NOT tt.is_excluded
      AND t.deleted_at IS NULL
  ),

  kpis_base AS (
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
      coalesce(sum(CASE WHEN currency = 'USDT' THEN abs(amount) ELSE 0 END), 0)                     AS total_usdt_volume,
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USDT'
                        THEN commission * coalesce(exchange_rate, 1)
                        WHEN is_deposit THEN commission
                        ELSE 0 END), 0)                                                             AS total_commission_try,
      count(*)::int                                                                                   AS transfer_count,
      count(*) FILTER (WHERE is_deposit)::int                                                        AS deposit_count,
      count(*) FILTER (WHERE NOT is_deposit)::int                                                    AS withdrawal_count,
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0)  AS usdt_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0)  AS usdt_withdrawals_usd,
      coalesce(sum(CASE WHEN is_deposit     AND currency != 'USDT' THEN abs(amount_usd) ELSE 0 END), 0) AS bank_cc_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit AND currency != 'USDT' THEN abs(amount_usd) ELSE 0 END), 0) AS bank_cc_withdrawals_usd,
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0) -
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0)  AS usdt_net,
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USDT'
                        THEN commission
                        WHEN is_deposit
                        THEN commission / NULLIF(coalesce(exchange_rate, 1), 0)
                        ELSE 0 END), 0)                                                             AS commission_usd,
      coalesce(sum(CASE WHEN currency != 'USDT' THEN abs(amount_usd) ELSE 0 END), 0)                AS bank_usd_gross
    FROM filtered
    WHERE NOT exclude_from_net
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

  daily_volume AS (
    SELECT coalesce(json_agg(row_to_json(dv) ORDER BY dv.day), '[]'::json) AS data
    FROM (
      SELECT (transfer_date::date)::text AS day,
             coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0)     AS deposits,
             coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS withdrawals
      FROM filtered WHERE NOT exclude_from_net GROUP BY transfer_date::date
    ) dv
  ),

  daily_net AS (
    SELECT coalesce(json_agg(row_to_json(dn) ORDER BY dn.day), '[]'::json) AS data
    FROM (
      SELECT (transfer_date::date)::text AS day,
             coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0)
             - coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS net
      FROM filtered WHERE NOT exclude_from_net GROUP BY transfer_date::date
    ) dn
  ),

  daily_details_raw AS (
    SELECT
      (transfer_date::date)::text AS day,
      coalesce(sum(CASE WHEN currency != 'USDT' THEN abs(amount_try) ELSE 0 END), 0)    AS bank_try,
      coalesce(sum(CASE WHEN (lower(payment_method_name) LIKE '%credit%'
                              OR lower(payment_method_name) LIKE '%kredi%')
                             AND currency != 'USDT'
                        THEN abs(amount_try) ELSE 0 END), 0)                            AS kk_try,
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USDT'
                        THEN commission * coalesce(exchange_rate, 1)
                        WHEN is_deposit THEN commission
                        ELSE 0 END), 0)                                                 AS commission_try,
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0) -
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0) AS usdt_net,
      coalesce(sum(CASE WHEN currency != 'USDT' THEN abs(amount_usd) ELSE 0 END), 0)    AS bank_usd,
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USDT'
                        THEN commission
                        WHEN is_deposit
                        THEN commission / NULLIF(coalesce(exchange_rate, 1), 0)
                        ELSE 0 END), 0)                                                 AS commission_usd,
      round(avg(CASE WHEN currency != 'USDT' AND exchange_rate > 0
                     THEN exchange_rate END)::numeric, 2)                               AS avg_rate
    FROM filtered
    WHERE NOT exclude_from_net
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
             sum(CASE WHEN is_deposit AND currency = 'USDT'
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

  prev_filtered AS (
    SELECT t.amount_try, t.amount_usd, t.amount, t.commission, t.currency, t.exchange_rate,
           tc.is_deposit, pm.name AS payment_method_name, tt.exclude_from_net
    FROM public.transfers t
    JOIN public.transfer_categories tc ON tc.id = t.category_id
    LEFT JOIN public.psps p ON p.id = t.psp_id
    JOIN public.payment_methods pm ON pm.id = t.payment_method_id
    JOIN public.transfer_types tt ON tt.id = t.type_id
    WHERE t.organization_id = _org_id
      AND t.transfer_date >= _prev_start_date::timestamp
      AND t.transfer_date <  _prev_end_date::timestamp
      AND NOT tt.is_excluded
      AND t.deleted_at IS NULL
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
      coalesce(sum(CASE WHEN currency = 'USDT' THEN abs(amount) ELSE 0 END), 0)                     AS total_usdt_volume,
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USDT'
                        THEN commission * coalesce(exchange_rate, 1)
                        WHEN is_deposit THEN commission
                        ELSE 0 END), 0)                                                             AS total_commission_try,
      count(*)::int                                                                                   AS transfer_count,
      count(*) FILTER (WHERE is_deposit)::int                                                        AS deposit_count,
      count(*) FILTER (WHERE NOT is_deposit)::int                                                    AS withdrawal_count,
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0)  AS usdt_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0)  AS usdt_withdrawals_usd,
      coalesce(sum(CASE WHEN is_deposit     AND currency != 'USDT' THEN abs(amount_usd) ELSE 0 END), 0) AS bank_cc_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit AND currency != 'USDT' THEN abs(amount_usd) ELSE 0 END), 0) AS bank_cc_withdrawals_usd,
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0) -
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USDT' THEN abs(amount) ELSE 0 END), 0)  AS usdt_net,
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USDT'
                        THEN commission
                        WHEN is_deposit
                        THEN commission / NULLIF(coalesce(exchange_rate, 1), 0)
                        ELSE 0 END), 0)                                                             AS commission_usd,
      coalesce(sum(CASE WHEN currency != 'USDT' THEN abs(amount_usd) ELSE 0 END), 0)                AS bank_usd_gross
    FROM prev_filtered
    WHERE NOT exclude_from_net
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
      WHERE NOT exclude_from_net
    ) agg
    LEFT JOIN LATERAL (
      SELECT (transfer_date::date)::text AS day, sum(abs(amount_try)) AS total
      FROM filtered WHERE NOT exclude_from_net GROUP BY transfer_date::date ORDER BY sum(abs(amount_try)) DESC LIMIT 1
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

COMMIT;
