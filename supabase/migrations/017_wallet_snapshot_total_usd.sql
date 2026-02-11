-- ============================================================================
-- 017: Add total_usd column to wallet_snapshots for balance tracking charts
-- ============================================================================

alter table public.wallet_snapshots
  add column total_usd numeric(18,2) not null default 0;
