#!/usr/bin/env node
/**
 * Convert insert-transfers.sql to use ORDERINVEST org dynamically
 */

const fs = require('fs');

console.log('🔄 Reading insert-transfers.sql...');
const sql = fs.readFileSync('insert-transfers.sql', 'utf-8');

// Extract the VALUES part
const valuesMatch = sql.match(/VALUES\s+([\s\S]+);/);
if (!valuesMatch) {
  console.error('❌ Could not find VALUES section in SQL file');
  process.exit(1);
}

let valuesSection = valuesMatch[1].trim();

// Remove the first column (org.id) from each value tuple
// Replace:   ('YOUR_ORG_ID', 'name', ...)  ->  ('name', ...)
valuesSection = valuesSection.replace(/\(\s*'YOUR_ORG_ID',\s*/g, '(');

// Count how many value groups we have
const valueCount = (valuesSection.match(/\),\s*\(/g) || []).length + 1;

console.log(`✅ Found ${valueCount} transfer records`);

// Build the final SQL with CTE
const finalSql = `-- ============================================================================
-- Import Transfers for ORDERINVEST Organization
-- Total: ${valueCount} records
-- Source: transfers.csv (January & February 2026)
-- ============================================================================

-- First, clear any existing transfers for this organization (optional)
-- UNCOMMENT the line below if you want to clear existing data first:
-- DELETE FROM public.transfers WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'ORDERINVEST');

-- Import transfers using CTE to get org_id dynamically
WITH org AS (
  SELECT id FROM public.organizations WHERE name = 'ORDERINVEST' LIMIT 1
)
INSERT INTO public.transfers (
  organization_id,
  full_name,
  transfer_date,
  amount,
  currency,
  category_id,
  payment_method_id,
  type_id,
  crm_id,
  meta_id,
  exchange_rate,
  amount_try,
  amount_usd
)
SELECT
  org.id,
  t.*
FROM org
CROSS JOIN (VALUES
${valuesSection}
) AS t(
  full_name,
  transfer_date,
  amount,
  currency,
  category_id,
  payment_method_id,
  type_id,
  crm_id,
  meta_id,
  exchange_rate,
  amount_try,
  amount_usd
)
WHERE org.id IS NOT NULL;

-- ============================================================================
-- Verification Query
-- ============================================================================
SELECT
  '✅ Import Complete' as status,
  COUNT(*) as total_transfers,
  SUM(CASE WHEN category_id = 'dep' THEN 1 ELSE 0 END) as deposits,
  SUM(CASE WHEN category_id = 'wd' THEN 1 ELSE 0 END) as withdrawals,
  SUM(CASE WHEN currency = 'TL' THEN 1 ELSE 0 END) as tl_count,
  SUM(CASE WHEN currency = 'USD' THEN 1 ELSE 0 END) as usd_count,
  ROUND(SUM(amount_try), 2) as total_try,
  ROUND(SUM(amount_usd), 2) as total_usd
FROM public.transfers
WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'ORDERINVEST');
`;

fs.writeFileSync('insert-transfers-orderinvest.sql', finalSql);
console.log('✅ Created insert-transfers-orderinvest.sql');
console.log('\n📋 Ready to import!');
console.log('   Open insert-transfers-orderinvest.sql in Supabase SQL Editor and run it');
console.log('\n💡 Expected results:');
console.log('   - 1,147 total transfers');
console.log('   - 900 deposits + 247 withdrawals');
console.log('   - 796 TL + 351 USD transfers');
