-- ============================================================================
-- 055: Fix get_psp_summary — deposit-only commission + PSP rate fallback
-- ============================================================================
-- Same root cause as migrations 052-054 for get_psp_ledger:
--   • sum(tr.commission) included withdrawal transfers that migration 047
--     incorrectly stamped with non-zero commission.
--   • CSV-imported transfers have commission=0, net=0, snapshot=null —
--     so p.commission_rate is the final fallback.
--
-- Fix:
--   1. total_commission = deposits only, same 5-level fallback as 054
--   2. total_net: withdrawals → tr.amount (raw), deposits → stored net or derived
-- ============================================================================

-- Add currency column if migration 050 was not yet applied
ALTER TABLE public.psps
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TL';

DROP FUNCTION IF EXISTS public.get_psp_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_psp_summary(_org_id uuid)
RETURNS TABLE (
  psp_id            uuid,
  psp_name          text,
  commission_rate   numeric,
  is_active         boolean,
  is_internal       boolean,
  currency          text,
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

      -- Commission: deposits only, with PSP rate as final fallback
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

      -- Net: withdrawals → raw amount; deposits → stored net or derived
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
      AND lower(tt.name) NOT LIKE '%blocked%'
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
