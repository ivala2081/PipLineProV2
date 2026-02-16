-- Check the most recent transfer record
SELECT 
  id,
  full_name,
  payment_method_id,
  category_id,
  type_id,
  transfer_date,
  amount,
  currency
FROM transfers 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if lookup tables have data
SELECT 'Categories:' as table_name, COUNT(*) as count FROM transfer_categories
UNION ALL
SELECT 'Payment Methods:', COUNT(*) FROM payment_methods
UNION ALL
SELECT 'Transfer Types:', COUNT(*) FROM transfer_types;
