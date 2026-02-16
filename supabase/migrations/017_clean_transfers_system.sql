-- ============================================================================
-- Migration 017: Clean Transfers System - Complete Reset
-- ============================================================================
-- Drops ALL existing transfer-related tables and recreates them cleanly
-- ============================================================================

-- --------------------------------------------------------------------------
-- STEP 1: Drop everything related to transfers (safe cleanup)
-- --------------------------------------------------------------------------

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "God users can view all transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can view transfers in their orgs" ON public.transfers;
DROP POLICY IF EXISTS "God users can insert transfers" ON public.transfers;
DROP POLICY IF EXISTS "Admins can insert transfers to their orgs" ON public.transfers;
DROP POLICY IF EXISTS "Operations can insert transfers to their orgs" ON public.transfers;
DROP POLICY IF EXISTS "God users can update transfers" ON public.transfers;
DROP POLICY IF EXISTS "Admins can update transfers in their orgs" ON public.transfers;
DROP POLICY IF EXISTS "Operations can update transfers in their orgs" ON public.transfers;
DROP POLICY IF EXISTS "God users can delete transfers" ON public.transfers;
DROP POLICY IF EXISTS "Admins can delete transfers in their orgs" ON public.transfers;

-- Drop triggers
DROP TRIGGER IF EXISTS on_transfer_updated ON public.transfers;

-- Drop tables (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS public.transfers CASCADE;
DROP TABLE IF EXISTS public.transfer_categories CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.transfer_types CASCADE;

-- Drop any old PSP-related tables if they exist
DROP TABLE IF EXISTS public.psps CASCADE;

-- --------------------------------------------------------------------------
-- STEP 2: Create lookup tables with TEXT primary keys
-- --------------------------------------------------------------------------

-- Transfer Categories (DEP, WD)
CREATE TABLE public.transfer_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_deposit BOOLEAN NOT NULL DEFAULT true,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Methods (Bank, Credit Card, Tether)
CREATE TABLE public.payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transfer Types (Client, Payment, Blocked)
CREATE TABLE public.transfer_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- STEP 3: Seed lookup tables with fixed data
-- --------------------------------------------------------------------------

-- Categories
INSERT INTO public.transfer_categories (id, name, is_deposit, aliases) VALUES
  ('dep', 'DEP', true, ARRAY['dep', 'DEP', 'Dep', 'deposit', 'DEPOSIT', 'Deposit', 'yatırım', 'yatirim', 'Yatırım', 'Yatirim', 'YATIRIM']),
  ('wd', 'WD', false, ARRAY['wd', 'WD', 'Wd', 'withdraw', 'WITHDRAW', 'Withdraw', 'withdrawal', 'WITHDRAWAL', 'Withdrawal', 'çekim', 'cekim', 'Çekim', 'Cekim', 'ÇEKİM', 'CEKIM', 'çekme', 'cekme', 'Çekme', 'Cekme', 'ÇEKME', 'CEKME']);

-- Payment Methods
INSERT INTO public.payment_methods (id, name, aliases) VALUES
  ('bank', 'Bank', ARRAY['bank', 'BANK', 'Bank', 'banka', 'Banka', 'BANKA', 'banks', 'Banks', 'BANKS', 'iban', 'IBAN', 'Iban']),
  ('credit-card', 'Credit Card', ARRAY['credit card', 'CREDIT CARD', 'Credit Card', 'credit-card', 'CREDIT-CARD', 'Credit-Card', 'kredi kartı', 'kredi karti', 'Kredi Kartı', 'Kredi Karti', 'KREDİ KARTI', 'KREDI KARTI', 'card', 'Card', 'CARD']),
  ('tether', 'Tether', ARRAY['tether', 'TETHER', 'Tether', 'usdt', 'USDT', 'Usdt']);

-- Transfer Types
INSERT INTO public.transfer_types (id, name, aliases) VALUES
  ('client', 'Client', ARRAY['client', 'CLIENT', 'Client', 'müşteri', 'musteri', 'Müşteri', 'Musteri', 'MÜŞTERİ', 'MUSTERI', 'customer', 'CUSTOMER']),
  ('payment', 'Payment', ARRAY['payment', 'PAYMENT', 'Payment', 'ödeme', 'odeme', 'Ödeme', 'Odeme', 'ÖDEME', 'ODEME']),
  ('blocked', 'Blocked', ARRAY['blocked', 'BLOCKED', 'Blocked', 'bloke', 'Bloke', 'BLOKE', 'bloke hesap', 'Bloke Hesap', 'BLOKE HESAP', 'engellendi', 'Engellendi', 'ENGELLENDI']);

-- --------------------------------------------------------------------------
-- STEP 4: Create transfers table
-- --------------------------------------------------------------------------

CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Core transfer data
  full_name TEXT NOT NULL,
  transfer_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('TL', 'USD')),

  -- Foreign keys to lookup tables
  category_id TEXT NOT NULL REFERENCES public.transfer_categories(id),
  payment_method_id TEXT NOT NULL REFERENCES public.payment_methods(id),
  type_id TEXT NOT NULL REFERENCES public.transfer_types(id),

  -- Optional IDs for external systems
  crm_id TEXT,
  meta_id TEXT,

  -- Exchange rate and computed amounts
  exchange_rate NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  amount_try NUMERIC(15,2) NOT NULL,
  amount_usd NUMERIC(15,2) NOT NULL,

  -- Audit fields
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- STEP 5: Create indexes for performance
-- --------------------------------------------------------------------------

CREATE INDEX idx_transfers_organization_id ON public.transfers(organization_id);
CREATE INDEX idx_transfers_transfer_date ON public.transfers(transfer_date DESC);
CREATE INDEX idx_transfers_category_id ON public.transfers(category_id);
CREATE INDEX idx_transfers_payment_method_id ON public.transfers(payment_method_id);
CREATE INDEX idx_transfers_type_id ON public.transfers(type_id);
CREATE INDEX idx_transfers_full_name ON public.transfers(full_name);
CREATE INDEX idx_transfers_crm_id ON public.transfers(crm_id) WHERE crm_id IS NOT NULL;
CREATE INDEX idx_transfers_meta_id ON public.transfers(meta_id) WHERE meta_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_transfers_org_date ON public.transfers(organization_id, transfer_date DESC);

-- --------------------------------------------------------------------------
-- STEP 6: Enable RLS on transfers table
-- --------------------------------------------------------------------------

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- STEP 7: RLS Policies for transfers
-- --------------------------------------------------------------------------

-- God users can see all transfers
CREATE POLICY "God users can view all transfers"
  ON public.transfers
  FOR SELECT
  USING (private.is_god());

-- Users can view transfers from their organizations
CREATE POLICY "Users can view transfers in their orgs"
  ON public.transfers
  FOR SELECT
  USING (
    organization_id IN (
    SELECT om.organization_id
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
  )
  );

-- God users can insert transfers to any organization
CREATE POLICY "God users can insert transfers"
  ON public.transfers
  FOR INSERT
  WITH CHECK (private.is_god());

-- Admins can insert transfers to their organizations
CREATE POLICY "Admins can insert transfers to their orgs"
  ON public.transfers
  FOR INSERT
  WITH CHECK (
    private.is_org_admin(organization_id)
  );

-- Operations can insert transfers to their organizations
CREATE POLICY "Operations can insert transfers to their orgs"
  ON public.transfers
  FOR INSERT
  WITH CHECK (
    organization_id IN (
    SELECT om.organization_id
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
  )
  );

-- God users can update any transfer
CREATE POLICY "God users can update transfers"
  ON public.transfers
  FOR UPDATE
  USING (private.is_god())
  WITH CHECK (private.is_god());

-- Admins can update transfers in their organizations
CREATE POLICY "Admins can update transfers in their orgs"
  ON public.transfers
  FOR UPDATE
  USING (
    private.is_org_admin(organization_id)
  )
  WITH CHECK (
    private.is_org_admin(organization_id)
  );

-- Operations can update transfers in their organizations
CREATE POLICY "Operations can update transfers in their orgs"
  ON public.transfers
  FOR UPDATE
  USING (
    organization_id IN (
    SELECT om.organization_id
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
  )
  )
  WITH CHECK (
    organization_id IN (
    SELECT om.organization_id
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
  )
  );

-- God users can delete any transfer
CREATE POLICY "God users can delete transfers"
  ON public.transfers
  FOR DELETE
  USING (private.is_god());

-- Admins can delete transfers in their organizations
CREATE POLICY "Admins can delete transfers in their orgs"
  ON public.transfers
  FOR DELETE
  USING (
    private.is_org_admin(organization_id)
  );

-- --------------------------------------------------------------------------
-- STEP 8: Lookup tables are publicly readable (no RLS needed)
-- --------------------------------------------------------------------------
-- Lookup tables contain fixed data that all users can read.
-- No RLS policies needed as they're not organization-specific.

-- --------------------------------------------------------------------------
-- STEP 9: Updated_at trigger
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_transfer_updated
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------------
-- DONE: Transfers system is ready
-- --------------------------------------------------------------------------
--
-- Summary:
-- ✅ All old transfer tables and policies removed
-- ✅ Lookup tables created and seeded:
--    - Categories: dep (Deposit), wd (Withdrawal)
--    - Payment Methods: bank, credit-card, tether
--    - Types: client, payment, blocked
-- ✅ Transfers table created with proper foreign keys
-- ✅ Indexes created for performance
-- ✅ RLS policies applied
-- ✅ Updated_at trigger configured
--
-- Next steps:
-- 1. Refresh your frontend
-- 2. Import your CSV files
-- --------------------------------------------------------------------------
