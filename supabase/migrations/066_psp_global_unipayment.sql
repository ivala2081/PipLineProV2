-- ============================================================================
-- 066: PSP Local/Global Split + UniPayment Integration
-- Adds psp_scope (local/global) and provider columns to PSPs.
-- Adds external_transaction_id to transfers for dedup on API syncs.
-- Creates unipayment_sync_log for tracking sync state.
-- Updates get_psp_summary RPC to expose new columns.
-- ============================================================================

-- ── 1. Add scope & provider columns to psps ─────────────────────────────────

ALTER TABLE public.psps
  ADD COLUMN IF NOT EXISTS psp_scope TEXT NOT NULL DEFAULT 'local'
    CHECK (psp_scope IN ('local', 'global')),
  ADD COLUMN IF NOT EXISTS provider TEXT NULL
    CHECK (provider IS NULL OR provider IN ('unipayment'));

-- Enforce: one UniPayment PSP per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_psps_one_unipayment_per_org
  ON public.psps (organization_id)
  WHERE provider = 'unipayment';

-- ── 2. Add external_transaction_id to transfers ─────────────────────────────

ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS external_transaction_id TEXT NULL;

-- Prevent duplicate synced transactions within an org
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_ext_txn_id
  ON public.transfers (organization_id, external_transaction_id)
  WHERE external_transaction_id IS NOT NULL;

-- ── 3. Create unipayment_sync_log table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.unipayment_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psp_id          UUID NOT NULL REFERENCES public.psps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_txn_id     TEXT NULL,
  sync_status     TEXT NOT NULL DEFAULT 'idle'
    CHECK (sync_status IN ('idle', 'running', 'error')),
  error_message   TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (psp_id)
);

ALTER TABLE public.unipayment_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read sync log
CREATE POLICY "unipayment_sync_log_select"
  ON public.unipayment_sync_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = unipayment_sync_log.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- RLS: admin/manager/god can insert/update sync log
CREATE POLICY "unipayment_sync_log_write"
  ON public.unipayment_sync_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = unipayment_sync_log.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'manager', 'god')
    )
  );

-- ── 4. Update get_psp_summary to include psp_scope and provider ─────────────

DROP FUNCTION IF EXISTS public.get_psp_summary(uuid);

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
