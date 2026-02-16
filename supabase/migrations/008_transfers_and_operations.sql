-- ============================================================================
-- 008: Transfers, PSPs, Accounting — Complete Schema
-- ============================================================================
-- Single migration for all operational tables.
-- Safe to run on a fresh DB or after dropping old tables.
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CLEANUP — drop old objects if they exist                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- NOTE: No need to DROP TRIGGER separately.
-- DROP TABLE ... CASCADE automatically removes triggers on that table.

-- Functions
DROP FUNCTION IF EXISTS public.handle_transfer_audit_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_transfer_audit_update() CASCADE;
DROP FUNCTION IF EXISTS public.sync_psp_current_rate() CASCADE;
DROP FUNCTION IF EXISTS public.sync_psp_current_rate_on_delete() CASCADE;
DROP FUNCTION IF EXISTS public.get_psp_rate_for_date(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_psp_summary(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_monthly_summary(uuid, int, int) CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_commissions(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.seed_org_lookups() CASCADE;

-- Tables (reverse dependency order)
DROP TABLE IF EXISTS public.accounting_monthly_config CASCADE;
DROP TABLE IF EXISTS public.wallet_snapshots CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.accounting_entries CASCADE;
DROP TABLE IF EXISTS public.transfer_audit_log CASCADE;
DROP TABLE IF EXISTS public.transfers CASCADE;
DROP TABLE IF EXISTS public.psp_settlements CASCADE;
DROP TABLE IF EXISTS public.psp_commission_rates CASCADE;
DROP TABLE IF EXISTS public.exchange_rates CASCADE;
DROP TABLE IF EXISTS public.transfer_types CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.transfer_categories CASCADE;
DROP TABLE IF EXISTS public.psps CASCADE;

DROP TYPE IF EXISTS public.currency CASCADE;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0. UTILITY — handle_updated_at trigger function                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. GLOBAL LOOKUP TABLES — TEXT PK, no org_id, no RLS                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Transfer Categories (DEP = deposit, WD = withdrawal)
CREATE TABLE public.transfer_categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  is_deposit BOOLEAN NOT NULL DEFAULT true,
  aliases    TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Methods (Bank, Credit Card, Tether)
CREATE TABLE public.payment_methods (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  aliases    TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transfer Types (Client, Payment, Blocked)
CREATE TABLE public.transfer_types (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  aliases    TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed lookup data
INSERT INTO public.transfer_categories (id, name, is_deposit, aliases) VALUES
  ('dep', 'DEP', true,  ARRAY['dep','DEP','Dep','deposit','DEPOSIT','Deposit','yatırım','yatirim','Yatırım','Yatirim','YATIRIM']),
  ('wd',  'WD',  false, ARRAY['wd','WD','Wd','withdraw','WITHDRAW','Withdraw','withdrawal','WITHDRAWAL','Withdrawal','çekim','cekim','Çekim','Cekim','ÇEKİM','CEKIM','çekme','cekme','Çekme','Cekme','ÇEKME','CEKME'])
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_deposit = EXCLUDED.is_deposit, aliases = EXCLUDED.aliases;

INSERT INTO public.payment_methods (id, name, aliases) VALUES
  ('bank',        'Bank',        ARRAY['bank','BANK','Bank','banka','Banka','BANKA','banks','Banks','BANKS','iban','IBAN','Iban']),
  ('credit-card', 'Credit Card', ARRAY['credit card','CREDIT CARD','Credit Card','credit-card','CREDIT-CARD','Credit-Card','kredi kartı','kredi karti','Kredi Kartı','Kredi Karti','KREDİ KARTI','KREDI KARTI','card','Card','CARD']),
  ('tether',      'Tether',      ARRAY['tether','TETHER','Tether','usdt','USDT','Usdt'])
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, aliases = EXCLUDED.aliases;

INSERT INTO public.transfer_types (id, name, aliases) VALUES
  ('client',  'Client',  ARRAY['client','CLIENT','Client','müşteri','musteri','Müşteri','Musteri','MÜŞTERİ','MUSTERI','customer','CUSTOMER']),
  ('payment', 'Payment', ARRAY['payment','PAYMENT','Payment','ödeme','odeme','Ödeme','Odeme','ÖDEME','ODEME']),
  ('blocked', 'Blocked', ARRAY['blocked','BLOCKED','Blocked','bloke','Bloke','BLOKE','bloke hesap','Bloke Hesap','BLOKE HESAP','engellendi','Engellendi','ENGELLENDI'])
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, aliases = EXCLUDED.aliases;

-- Grant read access to authenticated users
GRANT SELECT ON public.transfer_categories TO authenticated;
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT SELECT ON public.transfer_types TO authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. PSPs (Payment Service Providers) — org-specific, UUID PK           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.psps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0100,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_internal     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_psps_org ON public.psps(organization_id);

CREATE TRIGGER on_psp_updated
  BEFORE UPDATE ON public.psps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.psps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psps_select" ON public.psps
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "psps_insert" ON public.psps
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "psps_update" ON public.psps
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "psps_delete" ON public.psps
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. PSP COMMISSION RATES — rate history per PSP                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.psp_commission_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psp_id          UUID NOT NULL REFERENCES public.psps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,4) NOT NULL,
  effective_from  DATE NOT NULL,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_psp_rates_psp ON public.psp_commission_rates(psp_id, effective_from DESC);
CREATE INDEX idx_psp_rates_org ON public.psp_commission_rates(organization_id);

ALTER TABLE public.psp_commission_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psp_rates_select" ON public.psp_commission_rates
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "psp_rates_insert" ON public.psp_commission_rates
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "psp_rates_delete" ON public.psp_commission_rates
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- Sync current rate to psps.commission_rate on insert
CREATE OR REPLACE FUNCTION public.sync_psp_current_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.psps
  SET commission_rate = NEW.commission_rate
  WHERE id = NEW.psp_id
    AND NOT EXISTS (
      SELECT 1 FROM public.psp_commission_rates
      WHERE psp_id = NEW.psp_id
        AND effective_from > NEW.effective_from
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_psp_rate_inserted
  AFTER INSERT ON public.psp_commission_rates
  FOR EACH ROW EXECUTE FUNCTION public.sync_psp_current_rate();

-- Sync current rate on delete (fall back to previous rate)
CREATE OR REPLACE FUNCTION public.sync_psp_current_rate_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  _latest_rate NUMERIC(5,4);
BEGIN
  SELECT commission_rate INTO _latest_rate
  FROM public.psp_commission_rates
  WHERE psp_id = OLD.psp_id
  ORDER BY effective_from DESC
  LIMIT 1;

  UPDATE public.psps
  SET commission_rate = COALESCE(_latest_rate, 0.0100)
  WHERE id = OLD.psp_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_psp_rate_deleted
  AFTER DELETE ON public.psp_commission_rates
  FOR EACH ROW EXECUTE FUNCTION public.sync_psp_current_rate_on_delete();

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. PSP SETTLEMENTS — settlement tracking per PSP                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.psp_settlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psp_id          UUID NOT NULL REFERENCES public.psps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  settlement_date DATE NOT NULL,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL CHECK (currency IN ('TL', 'USD')),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_psp_settlements_psp ON public.psp_settlements(psp_id, settlement_date DESC);
CREATE INDEX idx_psp_settlements_org ON public.psp_settlements(organization_id);

CREATE TRIGGER on_psp_settlement_updated
  BEFORE UPDATE ON public.psp_settlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.psp_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psp_settlements_select" ON public.psp_settlements
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "psp_settlements_insert" ON public.psp_settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

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

CREATE POLICY "psp_settlements_delete" ON public.psp_settlements
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. EXCHANGE RATES — historical rate storage                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  currency        TEXT NOT NULL DEFAULT 'USD',
  rate_to_tl      NUMERIC(10,4) NOT NULL,
  rate_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  source          TEXT NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, currency, rate_date)
);

CREATE INDEX idx_exchange_rates_org ON public.exchange_rates(organization_id, rate_date DESC);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_rates_select" ON public.exchange_rates
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "exchange_rates_insert" ON public.exchange_rates
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "exchange_rates_update" ON public.exchange_rates
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. TRANSFERS — main transfers table                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Core
  full_name       TEXT NOT NULL,
  transfer_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount          NUMERIC(15,2) NOT NULL,
  commission      NUMERIC(15,2) NOT NULL DEFAULT 0,
  net             NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'TL' CHECK (currency IN ('TL', 'USD')),

  -- Foreign keys
  category_id       TEXT NOT NULL REFERENCES public.transfer_categories(id),
  payment_method_id TEXT NOT NULL REFERENCES public.payment_methods(id),
  type_id           TEXT NOT NULL REFERENCES public.transfer_types(id),
  psp_id            UUID REFERENCES public.psps(id) ON DELETE SET NULL,

  -- External IDs
  crm_id  TEXT,
  meta_id TEXT,

  -- Exchange rate & computed amounts
  exchange_rate            NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  amount_try               NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_usd               NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate_snapshot  NUMERIC(5,4),

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transfers_org          ON public.transfers(organization_id);
CREATE INDEX idx_transfers_date         ON public.transfers(transfer_date DESC);
CREATE INDEX idx_transfers_org_date     ON public.transfers(organization_id, transfer_date DESC);
CREATE INDEX idx_transfers_category     ON public.transfers(category_id);
CREATE INDEX idx_transfers_payment      ON public.transfers(payment_method_id);
CREATE INDEX idx_transfers_type         ON public.transfers(type_id);
CREATE INDEX idx_transfers_psp          ON public.transfers(psp_id);
CREATE INDEX idx_transfers_name         ON public.transfers(full_name);
CREATE INDEX idx_transfers_crm          ON public.transfers(crm_id)  WHERE crm_id  IS NOT NULL;
CREATE INDEX idx_transfers_meta         ON public.transfers(meta_id) WHERE meta_id IS NOT NULL;

CREATE TRIGGER on_transfer_updated
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- SELECT: god + org members
CREATE POLICY "transfers_select_god" ON public.transfers
  FOR SELECT TO authenticated
  USING ((SELECT private.is_god()));

CREATE POLICY "transfers_select_member" ON public.transfers
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT private.get_user_org_ids()));

-- INSERT: god + admin + operation (org members)
CREATE POLICY "transfers_insert_god" ON public.transfers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_god()));

CREATE POLICY "transfers_insert_member" ON public.transfers
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT private.get_user_org_ids()));

-- UPDATE: god + admin + operation (org members)
CREATE POLICY "transfers_update_god" ON public.transfers
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_god()))
  WITH CHECK ((SELECT private.is_god()));

CREATE POLICY "transfers_update_member" ON public.transfers
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT private.get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT private.get_user_org_ids()));

-- DELETE: god + admin only
CREATE POLICY "transfers_delete_god" ON public.transfers
  FOR DELETE TO authenticated
  USING ((SELECT private.is_god()));

CREATE POLICY "transfers_delete_admin" ON public.transfers
  FOR DELETE TO authenticated
  USING ((SELECT private.is_org_admin(organization_id)));

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  7. TRANSFER AUDIT LOG                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.transfer_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id     UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN ('created', 'updated')),
  performed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changes         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_transfer ON public.transfer_audit_log(transfer_id);
CREATE INDEX idx_audit_org      ON public.transfer_audit_log(organization_id);

ALTER TABLE public.transfer_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON public.transfer_audit_log
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- INSERT only via trigger (no direct insert policy needed for users)
CREATE POLICY "audit_insert_system" ON public.transfer_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Audit trigger: INSERT
CREATE OR REPLACE FUNCTION public.handle_transfer_audit_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.transfer_audit_log (transfer_id, organization_id, action, performed_by)
  VALUES (NEW.id, NEW.organization_id, 'created', NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_transfer_created
  AFTER INSERT ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_transfer_audit_insert();

-- Audit trigger: UPDATE
CREATE OR REPLACE FUNCTION public.handle_transfer_audit_update()
RETURNS TRIGGER AS $$
DECLARE
  _changes JSONB := '{}'::jsonb;
BEGIN
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    _changes := _changes || jsonb_build_object('full_name', jsonb_build_object('old', OLD.full_name, 'new', NEW.full_name));
  END IF;
  IF OLD.amount IS DISTINCT FROM NEW.amount THEN
    _changes := _changes || jsonb_build_object('amount', jsonb_build_object('old', OLD.amount, 'new', NEW.amount));
  END IF;
  IF OLD.currency IS DISTINCT FROM NEW.currency THEN
    _changes := _changes || jsonb_build_object('currency', jsonb_build_object('old', OLD.currency, 'new', NEW.currency));
  END IF;
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    _changes := _changes || jsonb_build_object('category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id));
  END IF;
  IF OLD.psp_id IS DISTINCT FROM NEW.psp_id THEN
    _changes := _changes || jsonb_build_object('psp_id', jsonb_build_object('old', OLD.psp_id, 'new', NEW.psp_id));
  END IF;
  IF OLD.commission IS DISTINCT FROM NEW.commission THEN
    _changes := _changes || jsonb_build_object('commission', jsonb_build_object('old', OLD.commission, 'new', NEW.commission));
  END IF;

  IF _changes != '{}'::jsonb THEN
    INSERT INTO public.transfer_audit_log (transfer_id, organization_id, action, performed_by, changes)
    VALUES (NEW.id, NEW.organization_id, 'updated', auth.uid(), _changes);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_transfer_updated_audit
  AFTER UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_transfer_audit_update();

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  8. ACCOUNTING ENTRIES (Ledger)                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.accounting_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  entry_type      TEXT NOT NULL CHECK (entry_type IN ('ODEME', 'TRANSFER')),
  direction       TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount          NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  currency        TEXT NOT NULL CHECK (currency IN ('TL', 'USD', 'USDT')),
  cost_period     TEXT,
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_period  TEXT,
  register        TEXT NOT NULL CHECK (register IN ('USDT', 'NAKIT_TL', 'NAKIT_USD', 'TRX')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_acct_entries_org  ON public.accounting_entries(organization_id);
CREATE INDEX idx_acct_entries_date ON public.accounting_entries(entry_date DESC);
CREATE INDEX idx_acct_entries_reg  ON public.accounting_entries(register);

CREATE TRIGGER on_accounting_entry_updated
  BEFORE UPDATE ON public.accounting_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acct_entries_select" ON public.accounting_entries
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "acct_entries_insert" ON public.accounting_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "acct_entries_update" ON public.accounting_entries
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "acct_entries_delete" ON public.accounting_entries
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  9. WALLETS — crypto wallet tracking                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  address         TEXT NOT NULL,
  chain           TEXT NOT NULL CHECK (chain IN ('tron', 'ethereum', 'bsc', 'bitcoin', 'solana')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, address, chain)
);

CREATE INDEX idx_wallets_org ON public.wallets(organization_id);

CREATE TRIGGER on_wallet_updated
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select" ON public.wallets
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "wallets_insert" ON public.wallets
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "wallets_update" ON public.wallets
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "wallets_delete" ON public.wallets
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  10. WALLET SNAPSHOTS — daily balance snapshots                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.wallet_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  balances        JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_usd       NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, snapshot_date)
);

CREATE INDEX idx_snapshots_wallet ON public.wallet_snapshots(wallet_id, snapshot_date DESC);
CREATE INDEX idx_snapshots_org    ON public.wallet_snapshots(organization_id);

ALTER TABLE public.wallet_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_select" ON public.wallet_snapshots
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "snapshots_insert" ON public.wallet_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "snapshots_update" ON public.wallet_snapshots
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "snapshots_delete" ON public.wallet_snapshots
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  11. ACCOUNTING MONTHLY CONFIG (Reconciliation)                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE public.accounting_monthly_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year            INT NOT NULL CHECK (year >= 2020 AND year <= 2100),
  month           INT NOT NULL CHECK (month >= 1 AND month <= 12),
  devir_usdt      NUMERIC(15,2),
  devir_nakit_tl  NUMERIC(15,2),
  devir_nakit_usd NUMERIC(15,2),
  kur             NUMERIC(10,4),
  bekl_tahs       NUMERIC(15,2) DEFAULT 0,
  teyit_entries   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, year, month)
);

CREATE INDEX idx_acct_config_org ON public.accounting_monthly_config(organization_id, year, month);

CREATE TRIGGER on_acct_monthly_config_updated
  BEFORE UPDATE ON public.accounting_monthly_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.accounting_monthly_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acct_config_select" ON public.accounting_monthly_config
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "acct_config_insert" ON public.accounting_monthly_config
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "acct_config_update" ON public.accounting_monthly_config
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "acct_config_delete" ON public.accounting_monthly_config
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  12. RPC: get_psp_summary — PSP dashboard aggregation                  ║
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
      sum(CASE WHEN tc.is_deposit THEN tr.amount ELSE 0 END)          AS total_deposits,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END) AS total_withdrawals,
      sum(tr.commission)                                                AS total_commission,
      sum(tr.net)                                                       AS total_net
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

GRANT EXECUTE ON FUNCTION public.get_psp_summary(uuid) TO authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  13. RPC: get_monthly_summary — monthly analytics                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  _org_id uuid,
  _year   int,
  _month  int
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _start_date      date;
  _end_date        date;
  _prev_start_date date;
  _prev_end_date   date;
  _result          json;
BEGIN
  -- Validate org membership
  IF NOT (
    (SELECT private.is_god())
    OR _org_id IN (SELECT private.get_user_org_ids())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  _start_date      := make_date(_year, _month, 1);
  _end_date        := (_start_date + interval '1 month')::date;
  _prev_start_date := (_start_date - interval '1 month')::date;
  _prev_end_date   := _start_date;

  WITH filtered AS (
    SELECT
      t.id, t.transfer_date, t.amount, t.amount_try, t.amount_usd,
      t.commission, t.net, t.currency, t.exchange_rate,
      t.full_name, t.psp_id, t.category_id, t.payment_method_id, t.type_id,
      tc.is_deposit,
      tc.name AS category_name,
      p.name  AS psp_name,
      pm.name AS payment_method_name,
      tt.name AS type_name
    FROM public.transfers t
    JOIN public.transfer_categories tc ON tc.id = t.category_id
    LEFT JOIN public.psps p ON p.id = t.psp_id
    JOIN public.payment_methods pm ON pm.id = t.payment_method_id
    JOIN public.transfer_types tt ON tt.id = t.type_id
    WHERE t.organization_id = _org_id
      AND t.transfer_date >= _start_date::timestamp
      AND t.transfer_date <  _end_date::timestamp
      AND lower(tt.name) NOT LIKE '%bloke%'
      AND lower(tt.name) NOT LIKE '%blocked%'
      AND (p.name IS NULL OR lower(p.name) NOT LIKE '%bloke%')
  ),

  kpis AS (
    SELECT
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS total_deposits_try,
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_usd) ELSE 0 END), 0) AS total_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS total_withdrawals_try,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_usd) ELSE 0 END), 0) AS total_withdrawals_usd,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%bank%' THEN abs(amount_try) ELSE 0 END), 0) AS total_bank_volume,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%credit%' OR lower(payment_method_name) LIKE '%kredi%' THEN abs(amount_try) ELSE 0 END), 0) AS total_credit_card_volume,
      coalesce(sum(CASE WHEN currency = 'USD' THEN abs(amount) ELSE 0 END), 0) AS total_usdt_volume,
      coalesce(sum(CASE WHEN currency = 'USD' THEN commission * coalesce(exchange_rate, 1) ELSE commission END), 0) AS total_commission_try,
      count(*)::int AS transfer_count,
      count(*) FILTER (WHERE is_deposit)::int AS deposit_count,
      count(*) FILTER (WHERE NOT is_deposit)::int AS withdrawal_count
    FROM filtered
  ),

  daily_volume AS (
    SELECT coalesce(json_agg(row_to_json(dv) ORDER BY dv.day), '[]'::json) AS data
    FROM (
      SELECT (transfer_date::date)::text AS day,
             coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS deposits,
             coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS withdrawals
      FROM filtered GROUP BY transfer_date::date
    ) dv
  ),

  daily_net AS (
    SELECT coalesce(json_agg(row_to_json(dn) ORDER BY dn.day), '[]'::json) AS data
    FROM (
      SELECT (transfer_date::date)::text AS day,
             coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0)
             - coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS net
      FROM filtered GROUP BY transfer_date::date
    ) dn
  ),

  psp_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(pb) ORDER BY pb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT psp_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered WHERE psp_name IS NOT NULL GROUP BY psp_name
    ) pb
  ),

  payment_method_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(pmb) ORDER BY pmb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT payment_method_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY payment_method_name
    ) pmb
  ),

  category_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(cb) ORDER BY cb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT category_name AS name, is_deposit, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY category_name, is_deposit
    ) cb
  ),

  currency_split AS (
    SELECT coalesce(json_agg(row_to_json(cs)), '[]'::json) AS data
    FROM (
      SELECT currency, sum(abs(amount_try)) AS volume_try, count(*)::int AS count
      FROM filtered GROUP BY currency
    ) cs
  ),

  commission_by_psp AS (
    SELECT coalesce(json_agg(row_to_json(cp) ORDER BY cp.commission DESC), '[]'::json) AS data
    FROM (
      SELECT psp_name AS name,
             sum(CASE WHEN currency = 'USD' THEN commission * coalesce(exchange_rate, 1) ELSE commission END) AS commission
      FROM filtered WHERE psp_name IS NOT NULL GROUP BY psp_name
    ) cp
  ),

  top_customers AS (
    SELECT coalesce(json_agg(row_to_json(tc)), '[]'::json) AS data
    FROM (
      SELECT full_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY full_name ORDER BY sum(abs(amount_try)) DESC LIMIT 20
    ) tc
  ),

  type_breakdown AS (
    SELECT coalesce(json_agg(row_to_json(tb) ORDER BY tb.volume DESC), '[]'::json) AS data
    FROM (
      SELECT type_name AS name, sum(abs(amount_try)) AS volume, count(*)::int AS count
      FROM filtered GROUP BY type_name
    ) tb
  ),

  prev_filtered AS (
    SELECT t.amount_try, t.amount_usd, t.amount, t.commission, t.currency, t.exchange_rate,
           tc.is_deposit, pm.name AS payment_method_name
    FROM public.transfers t
    JOIN public.transfer_categories tc ON tc.id = t.category_id
    LEFT JOIN public.psps p ON p.id = t.psp_id
    JOIN public.payment_methods pm ON pm.id = t.payment_method_id
    JOIN public.transfer_types tt ON tt.id = t.type_id
    WHERE t.organization_id = _org_id
      AND t.transfer_date >= _prev_start_date::timestamp
      AND t.transfer_date <  _prev_end_date::timestamp
      AND lower(tt.name) NOT LIKE '%bloke%'
      AND lower(tt.name) NOT LIKE '%blocked%'
      AND (p.name IS NULL OR lower(p.name) NOT LIKE '%bloke%')
  ),

  prev_kpis AS (
    SELECT
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS total_deposits_try,
      coalesce(sum(CASE WHEN is_deposit THEN abs(amount_usd) ELSE 0 END), 0) AS total_deposits_usd,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_try) ELSE 0 END), 0) AS total_withdrawals_try,
      coalesce(sum(CASE WHEN NOT is_deposit THEN abs(amount_usd) ELSE 0 END), 0) AS total_withdrawals_usd,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%bank%' THEN abs(amount_try) ELSE 0 END), 0) AS total_bank_volume,
      coalesce(sum(CASE WHEN lower(payment_method_name) LIKE '%credit%' OR lower(payment_method_name) LIKE '%kredi%' THEN abs(amount_try) ELSE 0 END), 0) AS total_credit_card_volume,
      coalesce(sum(CASE WHEN currency = 'USD' THEN abs(amount) ELSE 0 END), 0) AS total_usdt_volume,
      coalesce(sum(CASE WHEN currency = 'USD' THEN commission * coalesce(exchange_rate, 1) ELSE commission END), 0) AS total_commission_try,
      count(*)::int AS transfer_count,
      count(*) FILTER (WHERE is_deposit)::int AS deposit_count,
      count(*) FILTER (WHERE NOT is_deposit)::int AS withdrawal_count
    FROM prev_filtered
  ),

  insights AS (
    SELECT
      peak.day AS peak_day,
      peak.total AS peak_day_volume,
      agg.active_days,
      CASE WHEN agg.active_days > 0 THEN agg.total_volume / agg.active_days ELSE 0 END AS avg_daily_volume,
      CASE WHEN agg.transfer_count > 0 THEN agg.total_volume / agg.transfer_count ELSE 0 END AS avg_per_transfer
    FROM (
      SELECT count(DISTINCT transfer_date::date)::int AS active_days,
             coalesce(sum(abs(amount_try)), 0) AS total_volume,
             count(*)::int AS transfer_count
      FROM filtered
    ) agg
    LEFT JOIN LATERAL (
      SELECT (transfer_date::date)::text AS day, sum(abs(amount_try)) AS total
      FROM filtered GROUP BY transfer_date::date ORDER BY sum(abs(amount_try)) DESC LIMIT 1
    ) peak ON true
  )

  SELECT json_build_object(
    'kpis',                     (SELECT row_to_json(kpis) FROM kpis),
    'prev_kpis',                (SELECT CASE WHEN (SELECT transfer_count FROM prev_kpis) > 0 THEN row_to_json(prev_kpis) ELSE NULL END FROM prev_kpis),
    'insights',                 (SELECT row_to_json(insights) FROM insights),
    'daily_volume',             (SELECT data FROM daily_volume),
    'daily_net',                (SELECT data FROM daily_net),
    'psp_breakdown',            (SELECT data FROM psp_breakdown),
    'payment_method_breakdown', (SELECT data FROM payment_method_breakdown),
    'category_breakdown',       (SELECT data FROM category_breakdown),
    'currency_split',           (SELECT data FROM currency_split),
    'commission_by_psp',        (SELECT data FROM commission_by_psp),
    'top_customers',            (SELECT data FROM top_customers),
    'type_breakdown',           (SELECT data FROM type_breakdown)
  ) INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_summary(uuid, int, int) TO authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  DONE                                                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Tables created:
--   1. transfer_categories  (global, TEXT PK)
--   2. payment_methods      (global, TEXT PK)
--   3. transfer_types       (global, TEXT PK)
--   4. psps                 (org-specific, UUID PK)
--   5. psp_commission_rates (org-specific, UUID PK)
--   6. psp_settlements      (org-specific, UUID PK)
--   7. exchange_rates       (org-specific, UUID PK)
--   8. transfers            (org-specific, UUID PK)
--   9. transfer_audit_log   (org-specific, UUID PK)
--  10. accounting_entries   (org-specific, UUID PK)
--  11. wallets              (org-specific, UUID PK)
--  12. wallet_snapshots     (org-specific, UUID PK)
--  13. accounting_monthly_config (org-specific, UUID PK)
--
-- Functions:
--   - get_psp_summary(_org_id)
--   - get_monthly_summary(_org_id, _year, _month)
--   - handle_updated_at() (trigger)
--   - handle_transfer_audit_insert() (trigger)
--   - handle_transfer_audit_update() (trigger)
--   - sync_psp_current_rate() (trigger)
--   - sync_psp_current_rate_on_delete() (trigger)
