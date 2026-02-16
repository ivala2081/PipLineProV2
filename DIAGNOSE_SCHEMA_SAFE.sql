-- ============================================================================
-- SAFE SCHEMA DIAGNOSTIC (Won't fail on missing columns)
-- ============================================================================

-- 1. TABLES THAT EXIST
SELECT '========== TABLES ==========' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. ALL COLUMNS IN PUBLIC SCHEMA
SELECT '========== ALL COLUMNS ==========' as info;
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  CASE WHEN column_default IS NOT NULL THEN 'has default' ELSE '' END as has_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations', 'profiles', 'organization_members', 'organization_invitations',
    'psps', 'psp_commission_rates', 'psp_settlements',
    'transfers', 'transfer_types', 'transfer_categories', 'payment_methods',
    'accounting_entries', 'wallets', 'wallet_snapshots'
  )
ORDER BY table_name, ordinal_position;

-- 3. CRITICAL COLUMNS CHECK
SELECT '========== CRITICAL COLUMNS CHECK ==========' as info;
SELECT
  'transfers.commission' as column_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'commission'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT
  'transfers.net',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'net'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'transfers.commission_rate_snapshot',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'commission_rate_snapshot'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'transfer_types.organization_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_types' AND column_name = 'organization_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'transfer_types.is_active',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_types' AND column_name = 'is_active'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'transfer_types.aliases',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_types' AND column_name = 'aliases'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'transfer_categories.organization_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_categories' AND column_name = 'organization_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'payment_methods.organization_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'organization_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'psps.is_active',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'psps' AND column_name = 'is_active'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'psps.is_internal',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'psps' AND column_name = 'is_internal'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'psps.organization_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'psps' AND column_name = 'organization_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- 4. RPC FUNCTIONS
SELECT '========== RPC FUNCTIONS ==========' as info;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_psp_summary',
    'get_psp_rate_for_date',
    'sync_psp_current_rate',
    'calculate_transfer_commission',
    'seed_org_lookups'
  )
ORDER BY routine_name;

-- 5. TRIGGERS
SELECT '========== TRIGGERS ==========' as info;
SELECT
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. DATA COUNTS
SELECT '========== DATA COUNTS ==========' as info;
SELECT 'organizations' as table_name, COUNT(*) as count FROM public.organizations
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
SELECT 'transfers', COUNT(*) FROM public.transfers;

-- ============================================================================
-- DONE
-- ============================================================================
