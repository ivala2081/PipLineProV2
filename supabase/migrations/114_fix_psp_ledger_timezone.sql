-- 114_fix_psp_ledger_timezone.sql
-- Fixes get_psp_ledger:
--   1. Missing SET timezone = 'Europe/Istanbul' — transfer_date::date was grouping
--      in UTC, shifting transfers entered between 00:00–02:59 Istanbul to the
--      previous day. This caused daily totals to mismatch the UI.
--   2. Missing deleted_at IS NULL — soft-deleted transfers were still counted.
--   3. Using old LIKE '%blocked%' instead of tt.is_excluded flag.

CREATE OR REPLACE FUNCTION public.get_psp_ledger(_psp_id uuid, _org_id uuid)
RETURNS TABLE (
  day               date,
  total_deposits    numeric,
  total_withdrawals numeric,
  total_commission  numeric,
  total_net         numeric,
  total_settlement  numeric,
  transfer_count    bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET timezone = 'Europe/Istanbul'
AS $$
  WITH transfer_by_day AS (
    SELECT
      tr.transfer_date::date                                                    AS day,
      sum(CASE WHEN tc.is_deposit THEN abs(tr.amount) ELSE 0 END)              AS total_deposits,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END)          AS total_withdrawals,
      sum(CASE WHEN tc.is_deposit THEN tr.commission ELSE 0 END)               AS total_commission,
      sum(
        CASE
          WHEN tr.net != 0 OR tr.amount = 0 THEN tr.net
          WHEN tc.is_deposit                  THEN tr.amount - tr.commission
          ELSE                                     tr.amount + tr.commission
        END
      )                                                                          AS total_net,
      count(*)                                                                   AS transfer_count
    FROM public.transfers tr
    JOIN public.transfer_categories tc ON tc.id = tr.category_id
    JOIN public.transfer_types      tt ON tt.id = tr.type_id
    WHERE tr.psp_id          = _psp_id
      AND tr.organization_id = _org_id
      AND NOT coalesce(tt.is_excluded, false)
      AND tr.deleted_at IS NULL
    GROUP BY tr.transfer_date::date
  ),

  settlement_by_day AS (
    SELECT
      ps.settlement_date           AS day,
      sum(ps.amount)               AS total_settlement
    FROM public.psp_settlements ps
    WHERE ps.psp_id          = _psp_id
      AND ps.organization_id = _org_id
    GROUP BY ps.settlement_date
  )

  SELECT
    d.day,
    coalesce(t.total_deposits,    0) AS total_deposits,
    coalesce(t.total_withdrawals, 0) AS total_withdrawals,
    coalesce(t.total_commission,  0) AS total_commission,
    coalesce(t.total_net,         0) AS total_net,
    coalesce(s.total_settlement,  0) AS total_settlement,
    coalesce(t.transfer_count,    0) AS transfer_count
  FROM (
    SELECT day FROM transfer_by_day
    UNION
    SELECT day FROM settlement_by_day
  ) d
  LEFT JOIN transfer_by_day  t ON t.day = d.day
  LEFT JOIN settlement_by_day s ON s.day = d.day
  ORDER BY d.day;
$$;

GRANT EXECUTE ON FUNCTION public.get_psp_ledger(uuid, uuid) TO authenticated;
