-- ============================================================================
-- 036: Exclude "Blocked" transfers from PSP summary (SAFE)
-- ============================================================================

-- Drop existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.get_psp_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_psp_summary(_org_id uuid)
RETURNS TABLE (
  psp_id          uuid,
  psp_name        text,
  commission_rate numeric,
  is_active       boolean,
  total_deposits  numeric,
  total_withdrawals numeric,
  total_commission numeric,
  total_net       numeric,
  total_settlements numeric,
  last_settlement_date date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id                                    AS psp_id,
    p.name                                  AS psp_name,
    p.commission_rate,
    p.is_active,
    COALESCE(t.total_deposits, 0)           AS total_deposits,
    COALESCE(t.total_withdrawals, 0)        AS total_withdrawals,
    COALESCE(t.total_commission, 0)         AS total_commission,
    COALESCE(t.total_net, 0)                AS total_net,
    COALESCE(s.total_settlements, 0)        AS total_settlements,
    s.last_settlement_date
  FROM public.psps p
  LEFT JOIN LATERAL (
    SELECT
      SUM(CASE WHEN tc.is_deposit THEN tr.amount ELSE 0 END)         AS total_deposits,
      SUM(CASE WHEN NOT tc.is_deposit THEN ABS(tr.amount) ELSE 0 END) AS total_withdrawals,
      SUM(tr.commission)                                              AS total_commission,
      SUM(tr.net)                                                     AS total_net
    FROM public.transfers tr
    JOIN public.transfer_categories tc ON tc.id = tr.category_id
    JOIN public.transfer_types tt ON tt.id = tr.type_id
    WHERE tr.psp_id = p.id
      AND LOWER(tt.name) NOT LIKE '%blocked%'
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT
      SUM(ps.amount)            AS total_settlements,
      MAX(ps.settlement_date)   AS last_settlement_date
    FROM public.psp_settlements ps
    WHERE ps.psp_id = p.id
  ) s ON true
  WHERE p.organization_id = _org_id
  ORDER BY p.name;
$$;

SELECT '✅ Migration 036 complete - get_psp_summary now excludes blocked transfers' AS status;
