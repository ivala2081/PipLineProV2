-- ============================================================================
-- Verification Queries for OCAK CSV Import
-- ============================================================================

-- 1. Check total transfers imported
SELECT 
  COUNT(*) as total_transfers,
  MIN(transfer_date) as first_date,
  MAX(transfer_date) as last_date
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST';
-- Expected: 791 transfers, dates from 2026-01-01 to 2026-01-31

-- 2. Currency breakdown with exchange rates
SELECT 
  currency,
  COUNT(*) as count,
  MIN(exchange_rate) as min_rate,
  MAX(exchange_rate) as max_rate,
  ROUND(AVG(exchange_rate), 2) as avg_rate,
  SUM(amount) as total_amount,
  SUM(amount_try) as total_try,
  SUM(amount_usd) as total_usd
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
GROUP BY currency
ORDER BY currency;
-- USD should show rate range 43.05-43.40
-- TL should show rate 1.00

-- 3. Check exchange rates table
SELECT 
  rate_date,
  rate_to_tl,
  source
FROM public.exchange_rates er
JOIN public.organizations o ON er.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
  AND er.currency = 'USD'
ORDER BY rate_date;
-- Expected: 31 rows for January 2026

-- 4. Category breakdown (deposits vs withdrawals)
SELECT 
  tc.name as category,
  tc.is_deposit,
  COUNT(*) as count,
  SUM(t.amount_try) as total_try
FROM public.transfers t
JOIN public.transfer_categories tc ON t.category_id = tc.id
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
GROUP BY tc.name, tc.is_deposit
ORDER BY tc.name;

-- 5. PSP breakdown
SELECT 
  p.name as psp,
  COUNT(*) as count,
  SUM(t.amount_try) as total_try
FROM public.transfers t
JOIN public.psps p ON t.psp_id = p.id
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
GROUP BY p.name
ORDER BY count DESC;

-- 6. Daily summary (shows transfers per day)
SELECT 
  DATE(transfer_date) as date,
  COUNT(*) as count,
  SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END) as usd_total,
  SUM(CASE WHEN currency = 'TL' THEN amount ELSE 0 END) as tl_total,
  SUM(amount_try) as total_try
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
GROUP BY DATE(transfer_date)
ORDER BY date;

-- 7. Check for any transfers missing exchange rates (should be 0)
SELECT COUNT(*) as missing_exchange_rates
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
  AND t.currency = 'USD'
  AND (t.exchange_rate IS NULL OR t.exchange_rate = 0 OR t.amount_try = 0);
-- Expected: 0

-- 8. Commission check (all should be 0 from CSV data)
SELECT 
  COUNT(*) as total_transfers,
  SUM(commission) as total_commission,
  MAX(commission) as max_commission
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST';
-- Expected: total_commission = 0, max_commission = 0

-- 9. Sample transfers to verify data quality
SELECT 
  full_name,
  currency,
  amount,
  exchange_rate,
  amount_try,
  amount_usd,
  transfer_date,
  tc.name as category,
  p.name as psp
FROM public.transfers t
JOIN public.transfer_categories tc ON t.category_id = tc.id
JOIN public.psps p ON t.psp_id = p.id
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
ORDER BY transfer_date DESC
LIMIT 10;
