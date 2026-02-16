-- Check if imported transfers have lookup IDs
SELECT
  id,
  full_name,
  transfer_date,
  amount,
  currency,
  -- These should NOT be NULL:
  category_id,
  payment_method_id,
  type_id,
  -- Show the actual category name by joining:
  (SELECT name FROM public.transfer_categories WHERE id = t.category_id) as category_name,
  (SELECT name FROM public.payment_methods WHERE id = t.payment_method_id) as payment_method_name,
  (SELECT name FROM public.transfer_types WHERE id = t.type_id) as type_name
FROM public.transfers t
WHERE full_name = 'SELMAN GÜÇ'  -- From your CSV
ORDER BY created_at DESC
LIMIT 5;
