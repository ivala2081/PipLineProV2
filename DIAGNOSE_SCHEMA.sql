-- ============================================================================
-- COMPREHENSIVE SCHEMA DIAGNOSTIC
-- ============================================================================
-- Run this entire script in Supabase SQL Editor to see your complete schema
-- ============================================================================

-- 1. CHECK WHICH TABLES EXIST
SELECT '========== EXISTING TABLES ==========' as section;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. ORGANIZATIONS SCHEMA
SELECT '========== organizations SCHEMA ==========' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organizations'
ORDER BY ordinal_position;

-- 3. PROFILES SCHEMA
SELECT '========== profiles SCHEMA ==========' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. PSPS SCHEMA
SELECT '========== psps SCHEMA ==========' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'psps'
ORDER BY ordinal_position;

-- 5. PSP_COMMISSION_RATES SCHEMA
SELECT '========== psp_commission_rates SCHEMA ==========' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'psp_commission_rates'
ORDER BY ordinal_position;

-- 6. PSP_SETTLEMENTS SCHEMA
SELECT '========== psp_settlements SCHEMA ==========' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'psp_settlements'
ORDER BY ordinal_position;

-- 7. TRANSFERS SCHEMA
SELECT '========== transfers SCHEMA ==========' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transfers'
ORDER BY ordinal_position;

-- 8. TRANSFER_TYPES SCHEMA
SELECT '========== transfer_types SCHEMA ==========' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transfer_types'
ORDER BY ordinal_position;

-- 9. TRANSFER_CATEGORIES SCHEMA
SELECT '========== transfer_categories SCHEMA ==========' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transfer_categories'
ORDER BY ordinal_position;

-- 10. PAYMENT_METHODS SCHEMA
SELECT '========== payment_methods SCHEMA ==========' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payment_methods'
ORDER BY ordinal_position;

-- 11. CHECK RPC FUNCTIONS
SELECT '========== RPC FUNCTIONS ==========' as section;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_psp_summary',
    'get_psp_rate_for_date',
    'sync_psp_current_rate',
    'calculate_transfer_commission'
  )
ORDER BY routine_name;

-- 12. CHECK TRIGGERS
SELECT '========== TRIGGERS ==========' as section;
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('transfers', 'psps', 'psp_commission_rates', 'psp_settlements')
ORDER BY event_object_table, trigger_name;

-- 13. CHECK FOREIGN KEYS ON TRANSFERS
SELECT '========== transfers FOREIGN KEYS ==========' as section;
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'transfers'
ORDER BY tc.constraint_name;

-- 14. DATA COUNTS
SELECT '========== DATA COUNTS ==========' as section;
SELECT 'organizations' as table_name, COUNT(*) as row_count FROM public.organizations
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'psps', COUNT(*) FROM public.psps
UNION ALL
SELECT 'transfer_types', COUNT(*) FROM public.transfer_types
UNION ALL
SELECT 'transfer_categories', COUNT(*) FROM public.transfer_categories
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM public.payment_methods
UNION ALL
SELECT 'transfers', COUNT(*) FROM public.transfers
UNION ALL
SELECT 'psp_commission_rates', COUNT(*) FROM public.psp_commission_rates
UNION ALL
SELECT 'psp_settlements', COUNT(*) FROM public.psp_settlements;

-- 15. SAMPLE PSPS DATA (if table exists)
SELECT '========== SAMPLE PSPs ==========' as section;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'psps') THEN
    RAISE NOTICE 'PSPs table exists - see query results above for schema';
  ELSE
    RAISE NOTICE '❌ PSPs table does NOT exist';
  END IF;
END $$;

SELECT id, organization_id, name, commission_rate
FROM public.psps
LIMIT 5;

-- 16. SAMPLE TRANSFER_TYPES DATA
SELECT '========== SAMPLE transfer_types ==========' as section;
SELECT id, name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_types' AND column_name = 'organization_id'
  ) THEN 'HAS org_id' ELSE 'NO org_id' END as org_id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_types' AND column_name = 'is_active'
  ) THEN 'HAS is_active' ELSE 'NO is_active' END as is_active_status
FROM public.transfer_types
LIMIT 5;

-- ============================================================================
-- END OF DIAGNOSTIC
-- ============================================================================
