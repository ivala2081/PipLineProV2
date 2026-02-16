-- ============================================================================
-- 035: PSP Settlements (SAFE VERSION - Won't fail if already exists)
-- ============================================================================

-- Table: psp_settlements (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.psp_settlements (
  id               uuid primary key default gen_random_uuid(),
  psp_id           uuid not null references public.psps (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  settlement_date  date not null,
  amount           numeric(15,2) not null check (amount > 0),
  currency         text not null check (currency in ('TL', 'USD')),
  notes            text,
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_psp_settlements_psp
  ON public.psp_settlements (psp_id, settlement_date desc);

CREATE INDEX IF NOT EXISTS idx_psp_settlements_org
  ON public.psp_settlements (organization_id);

-- Trigger
DROP TRIGGER IF EXISTS on_psp_settlement_updated ON public.psp_settlements;
CREATE TRIGGER on_psp_settlement_updated
  BEFORE UPDATE ON public.psp_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.psp_settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "psp_settlements_select" ON public.psp_settlements;
CREATE POLICY "psp_settlements_select" ON public.psp_settlements
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "psp_settlements_insert" ON public.psp_settlements;
CREATE POLICY "psp_settlements_insert" ON public.psp_settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

DROP POLICY IF EXISTS "psp_settlements_update" ON public.psp_settlements;
CREATE POLICY "psp_settlements_update" ON public.psp_settlements
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

DROP POLICY IF EXISTS "psp_settlements_delete" ON public.psp_settlements;
CREATE POLICY "psp_settlements_delete" ON public.psp_settlements
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- ============================================================================
-- RPC: get_psp_summary – aggregated PSP data for dashboard
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
    WHERE tr.psp_id = p.id
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

-- ============================================================================
-- ✅ DONE
-- ============================================================================
SELECT '✅ Migration 035 complete - psp_settlements table and get_psp_summary RPC ready' AS status;
