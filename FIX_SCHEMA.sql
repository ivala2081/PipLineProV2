-- ============================================================================
-- COMPREHENSIVE SCHEMA FIX
-- ============================================================================
-- This script will fix common schema issues and add missing columns
-- Run this BEFORE attempting migrations 035-038
-- ============================================================================

-- ============================================================================
-- PART 1: Fix Lookup Tables - Add organization_id if missing
-- ============================================================================

-- Check and add organization_id to transfer_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_types' AND column_name = 'organization_id'
  ) THEN
    RAISE NOTICE '❌ transfer_types is missing organization_id - THIS IS A CRITICAL ISSUE';
    RAISE NOTICE '⚠️  This table needs to be recreated with organization_id';
    RAISE EXCEPTION 'Cannot proceed - transfer_types needs organization_id column';
  ELSE
    RAISE NOTICE '✅ transfer_types has organization_id';
  END IF;
END $$;

-- Check and add organization_id to transfer_categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_categories' AND column_name = 'organization_id'
  ) THEN
    RAISE NOTICE '❌ transfer_categories is missing organization_id';
    RAISE EXCEPTION 'Cannot proceed - transfer_categories needs organization_id column';
  ELSE
    RAISE NOTICE '✅ transfer_categories has organization_id';
  END IF;
END $$;

-- Check and add organization_id to payment_methods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'organization_id'
  ) THEN
    RAISE NOTICE '❌ payment_methods is missing organization_id';
    RAISE EXCEPTION 'Cannot proceed - payment_methods needs organization_id column';
  ELSE
    RAISE NOTICE '✅ payment_methods has organization_id';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Fix Transfers Table - Add commission and net columns
-- ============================================================================

-- Add commission column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'commission'
  ) THEN
    RAISE NOTICE '➕ Adding commission column to transfers';
    ALTER TABLE public.transfers
      ADD COLUMN commission NUMERIC(15,2) NOT NULL DEFAULT 0;
  ELSE
    RAISE NOTICE '✅ transfers has commission column';
  END IF;
END $$;

-- Add net column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'net'
  ) THEN
    RAISE NOTICE '➕ Adding net column to transfers';
    ALTER TABLE public.transfers
      ADD COLUMN net NUMERIC(15,2) NOT NULL DEFAULT 0;
  ELSE
    RAISE NOTICE '✅ transfers has net column';
  END IF;
END $$;

-- Add commission_rate_snapshot column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'commission_rate_snapshot'
  ) THEN
    RAISE NOTICE '➕ Adding commission_rate_snapshot column to transfers';
    ALTER TABLE public.transfers
      ADD COLUMN commission_rate_snapshot NUMERIC(5,4);
  ELSE
    RAISE NOTICE '✅ transfers has commission_rate_snapshot column';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Add Aliases Columns to Lookup Tables
-- ============================================================================

-- Add aliases to transfer_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_types' AND column_name = 'aliases'
  ) THEN
    RAISE NOTICE '➕ Adding aliases column to transfer_types';
    ALTER TABLE public.transfer_types
      ADD COLUMN aliases text[] NOT NULL DEFAULT '{}';
  ELSE
    RAISE NOTICE '✅ transfer_types has aliases column';
  END IF;
END $$;

-- Add aliases to transfer_categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_categories' AND column_name = 'aliases'
  ) THEN
    RAISE NOTICE '➕ Adding aliases column to transfer_categories';
    ALTER TABLE public.transfer_categories
      ADD COLUMN aliases text[] NOT NULL DEFAULT '{}';
  ELSE
    RAISE NOTICE '✅ transfer_categories has aliases column';
  END IF;
END $$;

-- Add aliases to payment_methods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'aliases'
  ) THEN
    RAISE NOTICE '➕ Adding aliases column to payment_methods';
    ALTER TABLE public.payment_methods
      ADD COLUMN aliases text[] NOT NULL DEFAULT '{}';
  ELSE
    RAISE NOTICE '✅ payment_methods has aliases column';
  END IF;
END $$;

-- ============================================================================
-- PART 4: Add is_internal to PSPs
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'psps' AND column_name = 'is_internal'
  ) THEN
    RAISE NOTICE '➕ Adding is_internal column to psps';
    ALTER TABLE public.psps
      ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT false;
  ELSE
    RAISE NOTICE '✅ psps has is_internal column';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Create Trigger for Auto-Calculating Commission/Net
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_transfer_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate commission from snapshot rate (or PSP current rate if no snapshot)
  IF NEW.commission_rate_snapshot IS NOT NULL THEN
    NEW.commission := ROUND(NEW.amount * NEW.commission_rate_snapshot, 2);
  ELSIF NEW.psp_id IS NOT NULL THEN
    -- Use PSP's current commission rate if no snapshot
    SELECT ROUND(NEW.amount * commission_rate, 2) INTO NEW.commission
    FROM public.psps
    WHERE id = NEW.psp_id;
  ELSE
    NEW.commission := 0;
  END IF;

  -- Calculate net amount
  NEW.net := NEW.amount - NEW.commission;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_commission_trigger ON public.transfers;

-- Create trigger to auto-calculate on insert/update
CREATE TRIGGER calculate_commission_trigger
  BEFORE INSERT OR UPDATE OF amount, commission_rate_snapshot, psp_id ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_transfer_commission();

RAISE NOTICE '✅ Trigger calculate_commission_trigger created';

-- ============================================================================
-- PART 6: Update Existing Transfers with Calculated Values
-- ============================================================================

DO $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.transfers t
  SET
    commission = CASE
      WHEN commission_rate_snapshot IS NOT NULL THEN ROUND(amount * commission_rate_snapshot, 2)
      WHEN psp_id IS NOT NULL THEN (
        SELECT ROUND(amount * p.commission_rate, 2)
        FROM public.psps p
        WHERE p.id = t.psp_id
      )
      ELSE 0
    END,
    net = amount - CASE
      WHEN commission_rate_snapshot IS NOT NULL THEN ROUND(amount * commission_rate_snapshot, 2)
      WHEN psp_id IS NOT NULL THEN (
        SELECT ROUND(amount * p.commission_rate, 2)
        FROM public.psps p
        WHERE p.id = t.psp_id
      )
      ELSE 0
    END
  WHERE commission = 0 AND net = 0;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % transfer records with calculated commission/net', updated_count;
END $$;

-- ============================================================================
-- PART 7: Final Validation
-- ============================================================================

SELECT '========== SCHEMA VALIDATION ==========' as section;

-- Check all required columns exist
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'commission')
    THEN '✅ transfers.commission'
    ELSE '❌ transfers.commission MISSING'
  END as check_1
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'net')
    THEN '✅ transfers.net'
    ELSE '❌ transfers.net MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfer_types' AND column_name = 'organization_id')
    THEN '✅ transfer_types.organization_id'
    ELSE '❌ transfer_types.organization_id MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfer_types' AND column_name = 'aliases')
    THEN '✅ transfer_types.aliases'
    ELSE '❌ transfer_types.aliases MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'psps' AND column_name = 'is_internal')
    THEN '✅ psps.is_internal'
    ELSE '❌ psps.is_internal MISSING'
  END;

-- ============================================================================
-- ✅ SCHEMA FIX COMPLETE
-- ============================================================================
-- You can now proceed with running migrations 035-038
-- ============================================================================
