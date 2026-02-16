-- Check if lookup tables exist and have data
SELECT 'transfer_categories' as table_name, COUNT(*) as row_count FROM public.transfer_categories
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM public.payment_methods
UNION ALL
SELECT 'transfer_types', COUNT(*) FROM public.transfer_types;

-- Show all categories with aliases
SELECT id, name, is_deposit, aliases FROM public.transfer_categories;

-- Show all payment methods with aliases
SELECT id, name, aliases FROM public.payment_methods;

-- Show all transfer types with aliases
SELECT id, name, aliases FROM public.transfer_types;
