-- Quick check: Do lookup tables exist?
SELECT
  'transfer_categories' as table_name,
  COUNT(*) as row_count,
  string_agg(name, ', ') as values
FROM public.transfer_categories
UNION ALL
SELECT
  'payment_methods',
  COUNT(*),
  string_agg(name, ', ')
FROM public.payment_methods
UNION ALL
SELECT
  'transfer_types',
  COUNT(*),
  string_agg(name, ', ')
FROM public.transfer_types;
