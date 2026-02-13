-- 034: Performance indexes, constraints, and data integrity fixes
-- Run in Supabase SQL Editor after all previous migrations.

-- ── Composite indexes for common query patterns ──────────────────────

-- Transfers: org + date is the primary listing query
CREATE INDEX IF NOT EXISTS idx_transfers_org_date
  ON transfers (organization_id, transfer_date DESC);

-- Transfers: org + category for filtered views
CREATE INDEX IF NOT EXISTS idx_transfers_org_category
  ON transfers (organization_id, category_id);

-- Accounting entries: org + date
CREATE INDEX IF NOT EXISTS idx_accounting_entries_org_date
  ON accounting_entries (organization_id, entry_date DESC);

-- Transfer audit: transfer_id for detail lookups
CREATE INDEX IF NOT EXISTS idx_transfer_audit_transfer
  ON transfer_audit (transfer_id, created_at DESC);

-- Wallet snapshots: wallet + date for history
CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_wallet_date
  ON wallet_snapshots (wallet_id, snapshot_date DESC);

-- Organization members: user lookup across orgs
CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON organization_members (user_id);

-- Organization invitations: email lookup
CREATE INDEX IF NOT EXISTS idx_org_invitations_email
  ON organization_invitations (email);

-- ── CHECK constraints ────────────────────────────────────────────────

-- Ensure transfer amounts are non-negative (raw input)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transfers_amount_positive'
  ) THEN
    ALTER TABLE transfers ADD CONSTRAINT chk_transfers_amount_positive
      CHECK (amount >= 0);
  END IF;
END $$;

-- Ensure commission is non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transfers_commission_nonneg'
  ) THEN
    ALTER TABLE transfers ADD CONSTRAINT chk_transfers_commission_nonneg
      CHECK (commission >= 0);
  END IF;
END $$;

-- Ensure accounting entry amounts are positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_accounting_amount_positive'
  ) THEN
    ALTER TABLE accounting_entries ADD CONSTRAINT chk_accounting_amount_positive
      CHECK (amount > 0);
  END IF;
END $$;

-- Ensure wallets chain is one of supported chains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallets_chain_valid'
  ) THEN
    ALTER TABLE wallets ADD CONSTRAINT chk_wallets_chain_valid
      CHECK (chain IN ('tron', 'ethereum', 'bsc', 'bitcoin', 'solana'));
  END IF;
END $$;
