-- ============================================================================
-- 054: Fix get_psp_ledger — use PSP rate when transfer data is empty
-- ============================================================================
-- Diagnostic revealed: transfers have commission=0, net=0, AND
-- commission_rate_snapshot=null (CSV imports with no commission data).
--
-- Solution: add the PSP's own commission_rate (and historical rate table)
-- as the final fallback.  Rate lookup chain (same as migration 047):
--   1. tr.commission_rate_snapshot
--   2. psp_commission_rates (historical, effective_from <= transfer_date)
--   3. psps.commission_rate (current rate, last resort)
-- ============================================================================

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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH transfer_by_day AS (
    SELECT
      tr.transfer_date::date                                              AS day,
      sum(CASE WHEN tc.is_deposit THEN abs(tr.amount) ELSE 0 END)        AS total_deposits,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END)    AS total_withdrawals,

      -- ── Commission (deposits only) ──────────────────────────────
      -- Fallback chain: stored → derived from net → snapshot rate → historical rate → PSP current rate
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
      END)                                                                AS total_commission,

      -- ── Net ─────────────────────────────────────────────────────
      -- Withdrawals → raw amount (no commission)
      -- Deposits    → stored net, else amount minus computed commission
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
      END)                                                                AS total_net,

      count(*)                                                            AS transfer_count

    FROM public.transfers          tr
    JOIN public.transfer_categories tc ON tc.id = tr.category_id
    JOIN public.transfer_types      tt ON tt.id = tr.type_id
    JOIN public.psps                 p ON p.id  = tr.psp_id
    WHERE tr.psp_id          = _psp_id
      AND tr.organization_id = _org_id
      AND lower(tt.name) NOT LIKE '%blocked%'
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
  LEFT JOIN transfer_by_day   t ON t.day = d.day
  LEFT JOIN settlement_by_day s ON s.day = d.day
  ORDER BY d.day;
$$;

GRANT EXECUTE ON FUNCTION public.get_psp_ledger(uuid, uuid) TO authenticated;
