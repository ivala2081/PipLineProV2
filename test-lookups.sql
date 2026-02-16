-- Test if lookup tables exist and have data

SELECT 'transfer_types' as table_name, COUNT(*) as count FROM public.transfer_types
UNION ALL
SELECT 'transfer_categories', COUNT(*) FROM public.transfer_categories
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM public.payment_methods;

-- Show actual data
SELECT 'TYPES:' as section;
SELECT * FROM public.transfer_types;

SELECT 'CATEGORIES:' as section;
SELECT * FROM public.transfer_categories;

SELECT 'PAYMENT METHODS:' as section;
SELECT * FROM public.payment_methods;
