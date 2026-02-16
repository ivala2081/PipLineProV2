-- ============================================================================
-- 999: COMPLETE REMOVAL — Transfers, Accounting, PSPs, and all related data
-- ============================================================================
-- WARNING: This migration PERMANENTLY DELETES all transfer, accounting, and
-- PSP data along with their lookup tables, audit logs, and related functions.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Drop all triggers first
-- --------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_transfer_created ON public.transfers;
DROP TRIGGER IF EXISTS on_transfer_updated_audit ON public.transfers;
DROP TRIGGER IF EXISTS on_transfer_updated ON public.transfers;
DROP TRIGGER IF EXISTS on_psp_updated ON public.psps;
DROP TRIGGER IF EXISTS on_psp_rate_inserted ON public.psp_commission_rates;
DROP TRIGGER IF EXISTS on_psp_rate_deleted ON public.psp_commission_rates;
DROP TRIGGER IF EXISTS on_psp_settlement_updated ON public.psp_settlements;
DROP TRIGGER IF EXISTS on_transfer_category_updated ON public.transfer_categories;
DROP TRIGGER IF EXISTS on_payment_method_updated ON public.payment_methods;
DROP TRIGGER IF EXISTS on_transfer_type_updated ON public.transfer_types;
DROP TRIGGER IF EXISTS on_accounting_entry_updated ON public.accounting_entries;
DROP TRIGGER IF EXISTS on_wallet_updated ON public.wallets;
DROP TRIGGER IF EXISTS on_acct_monthly_config_updated ON public.accounting_monthly_config;

-- --------------------------------------------------------------------------
-- 2. Drop all functions related to transfers and accounting
-- --------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.handle_transfer_audit_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_transfer_audit_update() CASCADE;
DROP FUNCTION IF EXISTS public.sync_psp_current_rate() CASCADE;
DROP FUNCTION IF EXISTS public.sync_psp_current_rate_on_delete() CASCADE;
DROP FUNCTION IF EXISTS public.get_psp_rate_for_date(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_psp_summary(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_commissions(uuid) CASCADE;

-- --------------------------------------------------------------------------
-- 3. Drop all tables (in reverse dependency order)
-- --------------------------------------------------------------------------

-- Accounting tables
DROP TABLE IF EXISTS public.accounting_monthly_config CASCADE;
DROP TABLE IF EXISTS public.wallet_snapshots CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.accounting_entries CASCADE;

-- Transfer-related tables
DROP TABLE IF EXISTS public.transfer_audit_log CASCADE;
DROP TABLE IF EXISTS public.transfers CASCADE;
DROP TABLE IF EXISTS public.psp_settlements CASCADE;
DROP TABLE IF EXISTS public.psp_commission_rates CASCADE;
DROP TABLE IF EXISTS public.exchange_rates CASCADE;

-- Lookup tables
DROP TABLE IF EXISTS public.transfer_types CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.transfer_categories CASCADE;
DROP TABLE IF EXISTS public.psps CASCADE;

-- --------------------------------------------------------------------------
-- 4. Drop enum types
-- --------------------------------------------------------------------------

DROP TYPE IF EXISTS public.currency CASCADE;

-- --------------------------------------------------------------------------
-- 5. Update seed_org_lookups function to remove PSP/transfer seeding
-- --------------------------------------------------------------------------

-- This function is used when new organizations are created
-- We need to update it to NOT seed transfer/PSP related lookup data
CREATE OR REPLACE FUNCTION public.seed_org_lookups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Empty function body - no longer seeds any transfer/PSP lookups
  -- This trigger remains in case you want to add other org initialization
  -- logic in the future, or you can drop this trigger entirely if not needed
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- DONE: All transfers, accounting, and PSP data has been removed
-- --------------------------------------------------------------------------
