-- ============================================================================
-- 047: Fix PSP commissions — recalculate stored commission/net for transfers
-- ============================================================================
-- Transfers imported via CSV had commission=0 and net=0 (DB defaults).
-- This migration:
--   1. Recalculates commission and net for all affected transfers
--   2. Updates get_psp_summary to be robust against missing net values
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. Recalculate commission and net for transfers with missing values   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Use the commission_rate_snapshot if available, otherwise look up
-- the historical rate from psp_commission_rates, and fall back to psps.commission_rate.
UPDATE public.transfers t
SET
  commission_rate_snapshot = COALESCE(
    t.commission_rate_snapshot,
    (
      SELECT pcr.commission_rate
      FROM public.psp_commission_rates pcr
      WHERE pcr.psp_id = t.psp_id
        AND pcr.effective_from <= t.transfer_date::date
      ORDER BY pcr.effective_from DESC
      LIMIT 1
    ),
    p.commission_rate
  ),
  commission = ROUND(
    ABS(t.amount) * COALESCE(
      t.commission_rate_snapshot,
      (
        SELECT pcr.commission_rate
        FROM public.psp_commission_rates pcr
        WHERE pcr.psp_id = t.psp_id
          AND pcr.effective_from <= t.transfer_date::date
        ORDER BY pcr.effective_from DESC
        LIMIT 1
      ),
      p.commission_rate
    ),
    2
  ),
  net = t.amount - CASE
    WHEN tc.is_deposit THEN
      ROUND(
        ABS(t.amount) * COALESCE(
          t.commission_rate_snapshot,
          (
            SELECT pcr.commission_rate
            FROM public.psp_commission_rates pcr
            WHERE pcr.psp_id = t.psp_id
              AND pcr.effective_from <= t.transfer_date::date
            ORDER BY pcr.effective_from DESC
            LIMIT 1
          ),
          p.commission_rate
        ),
        2
      )
    ELSE
      -ROUND(
        ABS(t.amount) * COALESCE(
          t.commission_rate_snapshot,
          (
            SELECT pcr.commission_rate
            FROM public.psp_commission_rates pcr
            WHERE pcr.psp_id = t.psp_id
              AND pcr.effective_from <= t.transfer_date::date
            ORDER BY pcr.effective_from DESC
            LIMIT 1
          ),
          p.commission_rate
        ),
        2
      )
  END
FROM public.psps p
JOIN public.transfer_categories tc ON tc.id = t.category_id
WHERE t.psp_id = p.id
  AND t.net = 0
  AND t.amount != 0;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. Update get_psp_summary to recompute net from amount + commission  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.get_psp_summary(_org_id uuid)
RETURNS TABLE (
  psp_id           uuid,
  psp_name         text,
  commission_rate  numeric,
  is_active        boolean,
  is_internal      boolean,
  total_deposits   numeric,
  total_withdrawals numeric,
  total_commission numeric,
  total_net        numeric,
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
    coalesce(t.total_deposits, 0)     AS total_deposits,
    coalesce(t.total_withdrawals, 0)  AS total_withdrawals,
    coalesce(t.total_commission, 0)   AS total_commission,
    coalesce(t.total_net, 0)          AS total_net,
    coalesce(s.total_settlements, 0)  AS total_settlements,
    s.last_settlement_date
  FROM public.psps p
  LEFT JOIN LATERAL (
    SELECT
      sum(CASE WHEN tc.is_deposit THEN abs(tr.amount) ELSE 0 END) AS total_deposits,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END) AS total_withdrawals,
      sum(tr.commission)  AS total_commission,
      sum(
        CASE
          WHEN tr.net != 0 OR tr.amount = 0 THEN tr.net
          WHEN tc.is_deposit THEN tr.amount - tr.commission
          ELSE tr.amount + tr.commission
        END
      ) AS total_net
    FROM public.transfers tr
    JOIN public.transfer_categories tc ON tc.id = tr.category_id
    JOIN public.transfer_types tt ON tt.id = tr.type_id
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
