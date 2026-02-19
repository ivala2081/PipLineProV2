-- ============================================================================
-- 052: Fix get_psp_ledger — commission deposits-only + correct withdrawal net
-- ============================================================================
-- Business rule confirmed: commissions are charged on DEPOSITS only.
-- Withdrawals go through at face value (commission = 0).
--
-- Root cause of the bug:
--   • get_psp_ledger used sum(tr.commission) for ALL transfers.
--   • Migration 047 also set non-zero commission on withdrawal transfers
--     that had net=0, inflating the commission total.
--
-- Fix:
--   1. total_commission = deposit commissions only
--   2. total_net:
--        - withdrawals → always tr.amount (raw, no commission deducted)
--        - deposits    → stored net if non-zero, else amount - commission
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
      tr.transfer_date::date                                                    AS day,
      sum(CASE WHEN tc.is_deposit THEN abs(tr.amount) ELSE 0 END)              AS total_deposits,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END)          AS total_withdrawals,

      -- Commission: deposits only (withdrawals have no commission in this system)
      sum(CASE WHEN tc.is_deposit THEN tr.commission ELSE 0 END)               AS total_commission,

      -- Net:
      --   Withdrawals → always raw amount (tr.amount is negative for outgoing),
      --                 ignoring any commission incorrectly stored by migration 047.
      --   Deposits    → use stored net if non-zero; fallback: amount - commission.
      sum(CASE
        WHEN NOT tc.is_deposit THEN tr.amount
        WHEN tr.net != 0        THEN tr.net
        ELSE                         tr.amount - tr.commission
      END)                                                                       AS total_net,

      count(*)                                                                   AS transfer_count
    FROM public.transfers tr
    JOIN public.transfer_categories tc ON tc.id = tr.category_id
    JOIN public.transfer_types      tt ON tt.id = tr.type_id
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
