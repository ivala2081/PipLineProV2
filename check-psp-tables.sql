-- Check what PSP-related tables and functions exist

-- Check tables
SELECT
  'Tables' as type,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('psps', 'psp_commission_rates', 'psp_settlements')
ORDER BY table_name;

-- Check PSP columns
SELECT
  'PSPs Columns' as type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'psps'
ORDER BY ordinal_position;

-- Check transfers columns related to PSP
SELECT
  'Transfers PSP Columns' as type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transfers'
  AND column_name IN ('psp_id', 'commission', 'net', 'commission_rate_snapshot')
ORDER BY ordinal_position;

-- Check functions
SELECT
  'Functions' as type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_psp_summary', 'sync_psp_current_rate', 'get_psp_rate_for_date')
ORDER BY routine_name;

-- Check existing PSPs
SELECT
  'Existing PSPs' as type,
  id,
  organization_id,
  name,
  commission_rate,
  is_active
FROM public.psps
ORDER BY name;
