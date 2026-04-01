-- ============================================================================
-- 119: IB Partner Extended Fields
--
-- Adds social media, payment preference, contract dates, and logo
-- columns to ib_partners. No RLS changes needed — new columns inherit
-- existing row-level policies.
-- ============================================================================

ALTER TABLE public.ib_partners
  ADD COLUMN IF NOT EXISTS company_name             TEXT,
  ADD COLUMN IF NOT EXISTS website                  TEXT,
  ADD COLUMN IF NOT EXISTS telegram                 TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp                 TEXT,
  ADD COLUMN IF NOT EXISTS instagram                TEXT,
  ADD COLUMN IF NOT EXISTS twitter                  TEXT,
  ADD COLUMN IF NOT EXISTS linkedin                 TEXT,
  ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT CHECK (preferred_payment_method IN ('crypto', 'iban')),
  ADD COLUMN IF NOT EXISTS iban                     TEXT,
  ADD COLUMN IF NOT EXISTS crypto_wallet_address    TEXT,
  ADD COLUMN IF NOT EXISTS crypto_network           TEXT,
  ADD COLUMN IF NOT EXISTS contract_start_date      DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date        DATE,
  ADD COLUMN IF NOT EXISTS logo_url                 TEXT;
