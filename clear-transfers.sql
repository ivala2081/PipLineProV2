-- ============================================================================
-- Clear All Imported Transfer Data
-- ============================================================================
-- This will DELETE all records from the transfers table
-- Use with caution!
-- ============================================================================

-- Check current count before deletion
SELECT 'Before deletion:' as status, COUNT(*) as transfer_count FROM public.transfers;

-- Delete all transfers
DELETE FROM public.transfers;

-- Check count after deletion
SELECT 'After deletion:' as status, COUNT(*) as transfer_count FROM public.transfers;

-- ============================================================================
-- DONE: All transfer data has been removed
-- ============================================================================
