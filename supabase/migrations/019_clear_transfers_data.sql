-- ============================================================================
-- Clear All Imported Transfer Data
-- ============================================================================
-- This migration removes all existing transfer records
-- Run this if you need to reset the transfers table
-- ============================================================================

-- Delete all transfers (RLS policies will still apply during deletion)
DELETE FROM public.transfers;

-- ============================================================================
-- DONE: All transfer data has been removed
-- Note: The transfers table structure remains intact
-- ============================================================================
