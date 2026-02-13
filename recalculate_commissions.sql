-- ============================================================================
-- Manual Script: Recalculate Commissions After Changing PSP Rates
-- ============================================================================
-- 
-- Run this script whenever you change PSP commission rates to update
-- existing transfers with the new rates.
--
-- This will:
-- 1. Update commissions for all DEPOSIT (YATIRIM) transfers based on current PSP rates
-- 2. Set commission = 0 for all WITHDRAWAL (ÇEKME) transfers (by design)
-- 3. Show you a summary of the results
--
-- ============================================================================

select * from public.recalculate_commissions_by_name('ORDERINVEST');

-- Or if you know the organization UUID:
-- select * from public.recalculate_commissions('your-org-uuid-here');
