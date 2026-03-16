-- 112_bugfixes.sql
-- Fixes the following confirmed bugs:
--   BUG-03: get_monthly_summary lost timezone setting (dropped in migration 110)
--   BUG-04: get_psp_summary reverted to string-based blocked filtering (migration 067)
--   BUG-05: get_psp_monthly_summary includes withdrawal commission
--   BUG-06: god_audit_log DELETE triggers return NEW instead of OLD
--   BUG-13: verify_org_pin rate limiting is non-functional (counts login attempts, not PIN failures)

-- ═══════════════════════════════════════════════════════════════════════
-- BUG-03: Restore SET timezone = 'Europe/Istanbul' on get_monthly_summary
-- Migration 110 recreated this function but dropped the timezone setting
-- that migration 065 added. Daily grouping reverts to UTC without it.
-- ═══════════════════════════════════════════════════════════════════════

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
      coalesce(sum(CASE WHEN currency = 'USD' THEN abs(amount) ELSE 0 END), 0)                      AS total_usdt_volume,
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
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission
                        WHEN is_deposit
                        THEN commission / NULLIF(coalesce(exchange_rate, 1), 0)
                        ELSE 0 END), 0)                                                             AS commission_usd,
      coalesce(sum(CASE WHEN currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0)                 AS bank_usd_gross
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
      coalesce(sum(CASE WHEN currency != 'USD' THEN abs(amount_try) ELSE 0 END), 0)     AS bank_try,
      coalesce(sum(CASE WHEN (lower(payment_method_name) LIKE '%credit%'
                              OR lower(payment_method_name) LIKE '%kredi%')
                             AND currency != 'USD'
                        THEN abs(amount_try) ELSE 0 END), 0)                            AS kk_try,
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission * coalesce(exchange_rate, 1)
                        WHEN is_deposit THEN commission
                        ELSE 0 END), 0)                                                 AS commission_try,
      coalesce(sum(CASE WHEN is_deposit     AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0) -
      coalesce(sum(CASE WHEN NOT is_deposit AND currency = 'USD' THEN abs(amount) ELSE 0 END), 0) AS usdt_net,
      coalesce(sum(CASE WHEN currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0)     AS bank_usd,
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission
                        WHEN is_deposit
                        THEN commission / NULLIF(coalesce(exchange_rate, 1), 0)
                        ELSE 0 END), 0)                                                 AS commission_usd,
      round(avg(CASE WHEN currency != 'USD' AND exchange_rate > 0
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
      coalesce(sum(CASE WHEN currency = 'USD' THEN abs(amount) ELSE 0 END), 0)                      AS total_usdt_volume,
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
      coalesce(sum(CASE WHEN is_deposit AND currency = 'USD'
                        THEN commission
                        WHEN is_deposit
                        THEN commission / NULLIF(coalesce(exchange_rate, 1), 0)
                        ELSE 0 END), 0)                                                             AS commission_usd,
      coalesce(sum(CASE WHEN currency != 'USD' THEN abs(amount_usd) ELSE 0 END), 0)                 AS bank_usd_gross
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


-- ═══════════════════════════════════════════════════════════════════════
-- BUG-04: get_psp_summary — replace string-based blocked filtering
-- with the is_excluded flag (reverted in migration 067)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_psp_summary(_org_id uuid)
RETURNS TABLE (
  psp_id            uuid,
  psp_name          text,
  commission_rate   numeric,
  is_active         boolean,
  is_internal       boolean,
  currency          text,
  psp_scope         text,
  provider          text,
  total_deposits    numeric,
  total_withdrawals numeric,
  total_commission  numeric,
  total_net         numeric,
  total_settlements numeric,
  last_settlement_date date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id                              AS psp_id,
    p.name                            AS psp_name,
    p.commission_rate,
    p.is_active,
    p.is_internal,
    p.currency,
    p.psp_scope,
    p.provider,
    coalesce(t.total_deposits, 0)     AS total_deposits,
    coalesce(t.total_withdrawals, 0)  AS total_withdrawals,
    coalesce(t.total_commission, 0)   AS total_commission,
    coalesce(t.total_net, 0)          AS total_net,
    coalesce(s.total_settlements, 0)  AS total_settlements,
    s.last_settlement_date
  FROM public.psps p
  LEFT JOIN LATERAL (
    SELECT
      sum(CASE WHEN tc.is_deposit THEN abs(tr.amount) ELSE 0 END)     AS total_deposits,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END)  AS total_withdrawals,

      sum(CASE WHEN tc.is_deposit THEN
        CASE
          WHEN tr.commission != 0
            THEN tr.commission
          WHEN tr.net != 0
            THEN GREATEST(0, tr.amount - tr.net)
          ELSE
            ROUND(
              abs(tr.amount) * COALESCE(
                tr.commission_rate_snapshot,
                (SELECT pcr.commission_rate
                 FROM public.psp_commission_rates pcr
                 WHERE pcr.psp_id = tr.psp_id
                   AND pcr.effective_from <= tr.transfer_date::date
                 ORDER BY pcr.effective_from DESC
                 LIMIT 1),
                p.commission_rate
              ),
              2
            )
        END
        ELSE 0
      END)                                                               AS total_commission,

      sum(CASE
        WHEN NOT tc.is_deposit THEN tr.amount
        WHEN tr.net != 0        THEN tr.net
        ELSE
          tr.amount - ROUND(
            abs(tr.amount) * COALESCE(
              tr.commission_rate_snapshot,
              (SELECT pcr.commission_rate
               FROM public.psp_commission_rates pcr
               WHERE pcr.psp_id = tr.psp_id
                 AND pcr.effective_from <= tr.transfer_date::date
               ORDER BY pcr.effective_from DESC
               LIMIT 1),
              p.commission_rate
            ),
            2
          )
      END)                                                               AS total_net

    FROM public.transfers          tr
    JOIN public.transfer_categories tc ON tc.id = tr.category_id
    JOIN public.transfer_types      tt ON tt.id = tr.type_id
    WHERE tr.psp_id = p.id
      AND NOT tt.is_excluded
      AND tr.deleted_at IS NULL
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT
      sum(ps.amount)          AS total_settlements,
      max(ps.settlement_date) AS last_settlement_date
    FROM public.psp_settlements ps
    WHERE ps.psp_id = p.id
  ) s ON true
  WHERE p.organization_id = _org_id
  ORDER BY p.name;
$$;


-- ═══════════════════════════════════════════════════════════════════════
-- BUG-05: get_psp_monthly_summary — commission should only count deposits
-- Previously used sum(abs(tr.commission)) which included withdrawal commission
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_psp_monthly_summary(_psp_id uuid, _org_id uuid)
RETURNS TABLE (
  month           int,
  year            int,
  month_label     text,
  deposit_total   numeric,
  withdrawal_total numeric,
  commission_total numeric,
  net_total       numeric,
  settlement_total numeric,
  transfer_count  bigint,
  deposit_count   bigint,
  withdrawal_count bigint,
  avg_daily_volume numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET timezone = 'Europe/Istanbul'
AS $$
  WITH monthly_transfers AS (
    SELECT
      EXTRACT(MONTH FROM tr.transfer_date)::int AS month,
      EXTRACT(YEAR FROM tr.transfer_date)::int  AS year,
      sum(CASE WHEN tc.is_deposit THEN abs(tr.amount) ELSE 0 END) AS deposit_total,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END) AS withdrawal_total,
      sum(CASE WHEN tc.is_deposit THEN abs(tr.commission) ELSE 0 END) AS commission_total,
      sum(tr.net) AS net_total,
      count(*) AS transfer_count,
      count(*) FILTER (WHERE tc.is_deposit) AS deposit_count,
      count(*) FILTER (WHERE NOT tc.is_deposit) AS withdrawal_count,
      count(DISTINCT tr.transfer_date::date) AS active_days
    FROM public.transfers tr
    JOIN public.transfer_categories tc ON tc.id = tr.category_id
    JOIN public.transfer_types tt ON tt.id = tr.type_id
    WHERE tr.psp_id = _psp_id
      AND tr.organization_id = _org_id
      AND NOT coalesce(tt.is_excluded, false)
      AND tr.deleted_at IS NULL
    GROUP BY EXTRACT(MONTH FROM tr.transfer_date), EXTRACT(YEAR FROM tr.transfer_date)
  ),
  monthly_settlements AS (
    SELECT
      EXTRACT(MONTH FROM ps.settlement_date)::int AS month,
      EXTRACT(YEAR FROM ps.settlement_date)::int  AS year,
      sum(ps.amount) AS settlement_total
    FROM public.psp_settlements ps
    WHERE ps.psp_id = _psp_id
      AND ps.organization_id = _org_id
    GROUP BY EXTRACT(MONTH FROM ps.settlement_date), EXTRACT(YEAR FROM ps.settlement_date)
  )
  SELECT
    coalesce(mt.month, ms.month) AS month,
    coalesce(mt.year, ms.year) AS year,
    to_char(make_date(coalesce(mt.year, ms.year), coalesce(mt.month, ms.month), 1), 'Mon YYYY') AS month_label,
    coalesce(mt.deposit_total, 0) AS deposit_total,
    coalesce(mt.withdrawal_total, 0) AS withdrawal_total,
    coalesce(mt.commission_total, 0) AS commission_total,
    coalesce(mt.net_total, 0) AS net_total,
    coalesce(ms.settlement_total, 0) AS settlement_total,
    coalesce(mt.transfer_count, 0) AS transfer_count,
    coalesce(mt.deposit_count, 0) AS deposit_count,
    coalesce(mt.withdrawal_count, 0) AS withdrawal_count,
    CASE WHEN coalesce(mt.active_days, 0) > 0
      THEN round((coalesce(mt.deposit_total, 0) + coalesce(mt.withdrawal_total, 0)) / mt.active_days, 2)
      ELSE 0
    END AS avg_daily_volume
  FROM monthly_transfers mt
  FULL OUTER JOIN monthly_settlements ms ON mt.month = ms.month AND mt.year = ms.year
  ORDER BY coalesce(mt.year, ms.year) DESC, coalesce(mt.month, ms.month) DESC;
$$;


-- ═══════════════════════════════════════════════════════════════════════
-- BUG-06: audit_organization_changes and audit_org_member_changes
-- DELETE branch returns NEW (which is NULL for AFTER DELETE triggers)
-- instead of OLD — god audit logs are not created for deletions
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.audit_organization_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT private.is_god() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    PERFORM public.log_god_action(
      'CREATE_ORGANIZATION',
      'organizations',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.log_god_action(
      'UPDATE_ORGANIZATION',
      'organizations',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.log_god_action(
      'DELETE_ORGANIZATION',
      'organizations',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_org_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT private.is_god() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    PERFORM public.log_god_action(
      'ADD_ORG_MEMBER',
      'organization_members',
      NEW.user_id,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.log_god_action(
      'UPDATE_ORG_MEMBER',
      'organization_members',
      NEW.user_id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.log_god_action(
      'REMOVE_ORG_MEMBER',
      'organization_members',
      OLD.user_id,
      to_jsonb(OLD),
      NULL
    );
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════
-- BUG-13: verify_org_pin — rate limiting is non-functional because
-- failed PIN attempts are never logged to login_attempts. The existing
-- should_rate_limit_device only counts login_attempts rows.
-- Fix: log a failed PIN attempt into login_attempts so the existing
-- rate limiter picks it up.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.verify_org_pin(
  p_organization_id UUID,
  p_pin             TEXT,
  p_device_id       TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_stored_hash TEXT;
  v_result      BOOLEAN;
BEGIN
  -- Rate limit: reuse existing should_rate_limit_device (5 failed / 15 min)
  IF p_device_id IS NOT NULL THEN
    IF public.should_rate_limit_device(p_device_id, 5, 15) THEN
      RAISE EXCEPTION 'RATE_LIMITED';
    END IF;
  END IF;

  SELECT pin_hash INTO v_stored_hash
  FROM public.organization_pins
  WHERE organization_id = p_organization_id;

  -- No PIN set for this org
  IF v_stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- bcrypt comparison
  v_result := (v_stored_hash = extensions.crypt(p_pin, v_stored_hash));

  -- Log failed attempts so rate limiter can count them
  IF NOT v_result AND p_device_id IS NOT NULL THEN
    INSERT INTO public.login_attempts (
      device_id, success, error_type, ip_address
    ) VALUES (
      p_device_id, false, 'pin_verify_failed', '0.0.0.0'
    );
  END IF;

  RETURN v_result;
END;
$$;
