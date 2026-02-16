-- ============================================================================
-- Migration 018: Fix Lookup Table Permissions
-- ============================================================================
-- Grants read access to authenticated users for lookup tables
-- ============================================================================

-- These tables don't need RLS because they contain fixed reference data
-- that all authenticated users should be able to read.

-- Grant SELECT to authenticated users
GRANT SELECT ON public.transfer_categories TO authenticated;
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT SELECT ON public.transfer_types TO authenticated;

-- Also grant to anon for public access (optional, uncomment if needed)
-- GRANT SELECT ON public.transfer_categories TO anon;
-- GRANT SELECT ON public.payment_methods TO anon;
-- GRANT SELECT ON public.transfer_types TO anon;
