-- 115_align_psp_summary_with_ledger.sql
-- Aligns get_psp_summary net/commission calculation with get_psp_ledger.
--
-- Problem: get_psp_summary had complex fallback logic that recalculated
-- commission from PSP rates when tr.commission = 0 AND tr.net = 0.
-- This produced different totals than get_psp_ledger, causing the
-- Outstanding Balance stat card to mismatch the ledger's running balance.
--
-- Fix: Use the same simple formula as get_psp_ledger:
--   commission = tr.commission (deposits only)
--   net = tr.net (with fallback to amount ± commission only when net = 0)

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
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET timezone = 'Europe/Istanbul'
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
      sum(CASE WHEN tc.is_deposit THEN abs(tr.amount) ELSE 0 END)      AS total_deposits,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END)  AS total_withdrawals,
      sum(CASE WHEN tc.is_deposit THEN tr.commission ELSE 0 END)       AS total_commission,
      sum(
        CASE
          WHEN tr.net != 0 OR tr.amount = 0 THEN tr.net
          WHEN tc.is_deposit                 THEN tr.amount - tr.commission
          ELSE                                    tr.amount + tr.commission
        END
      )                                                                 AS total_net
    FROM public.transfers          tr
    JOIN public.transfer_categories tc ON tc.id = tr.category_id
    JOIN public.transfer_types      tt ON tt.id = tr.type_id
    WHERE tr.psp_id = p.id
      AND NOT coalesce(tt.is_excluded, false)
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

GRANT EXECUTE ON FUNCTION public.get_psp_summary(uuid) TO authenticated;
