-- ============================================================================
-- 045: Accounting Monthly Config (Reconciliation)
-- Stores per-month overrides: DEVİR, KUR, TEYİT entries, BEKL. TAHS
-- ============================================================================

CREATE TABLE public.accounting_monthly_config (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year             int NOT NULL CHECK (year >= 2020 AND year <= 2100),
  month            int NOT NULL CHECK (month >= 1 AND month <= 12),

  -- DEVİR (carry-forward) overrides per register, null = auto-calculate
  devir_usdt       numeric(15,2),
  devir_nakit_tl   numeric(15,2),
  devir_nakit_usd  numeric(15,2),

  -- KUR (TL per USD exchange rate), null = auto-derive from entries
  kur              numeric(10,4),

  -- BEKL. TAHS (expected receivables in USD)
  bekl_tahs        numeric(15,2) DEFAULT 0,

  -- TEYİT entries: [{label, amount, currency}]
  teyit_entries    jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Audit
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, year, month)
);

CREATE INDEX idx_acct_monthly_config_org
  ON public.accounting_monthly_config (organization_id, year, month);

CREATE TRIGGER on_acct_monthly_config_updated
  BEFORE UPDATE ON public.accounting_monthly_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.accounting_monthly_config ENABLE ROW LEVEL SECURITY;

-- RLS: Same as accounting_entries — all org members full CRUD, god bypass
CREATE POLICY "acct_monthly_config_select" ON public.accounting_monthly_config
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "acct_monthly_config_insert" ON public.accounting_monthly_config
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "acct_monthly_config_update" ON public.accounting_monthly_config
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "acct_monthly_config_delete" ON public.accounting_monthly_config
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );
