-- ============================================================================
-- DEBUG: Check Lookup Tables
-- ============================================================================

-- 1. Check if tables exist
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('transfer_types', 'transfer_categories', 'payment_methods')
ORDER BY tablename;

-- 2. Check row counts
SELECT 'transfer_types' as table_name, COUNT(*) as count FROM public.transfer_types
UNION ALL
SELECT 'transfer_categories', COUNT(*) FROM public.transfer_categories
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM public.payment_methods;

-- 3. Check actual data
SELECT '=== TRANSFER TYPES ===' as info;
SELECT * FROM public.transfer_types ORDER BY id;

SELECT '=== CATEGORIES ===' as info;
SELECT * FROM public.transfer_categories ORDER BY id;

SELECT '=== PAYMENT METHODS ===' as info;
SELECT * FROM public.payment_methods ORDER BY id;

-- 4. Check permissions
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('transfer_types', 'transfer_categories', 'payment_methods')
  AND grantee IN ('authenticated', 'anon', 'postgres')
ORDER BY table_name, grantee;

-- 5. Check RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('transfer_types', 'transfer_categories', 'payment_methods');
