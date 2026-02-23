-- 063_get_psp_monthly_summary.sql
-- Monthly aggregation of transfers + settlements for a specific PSP

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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH monthly_transfers AS (
    SELECT
      EXTRACT(MONTH FROM tr.transfer_date)::int AS month,
      EXTRACT(YEAR FROM tr.transfer_date)::int  AS year,
      sum(CASE WHEN tc.is_deposit THEN abs(tr.amount) ELSE 0 END) AS deposit_total,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END) AS withdrawal_total,
      sum(abs(tr.commission)) AS commission_total,
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

GRANT EXECUTE ON FUNCTION public.get_psp_monthly_summary(uuid, uuid) TO authenticated;
