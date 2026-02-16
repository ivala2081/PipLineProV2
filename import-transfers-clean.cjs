#!/usr/bin/env node
/**
 * Import transfers from transfers.csv
 * - Uses column 6 for transfer date
 * - Uses column 16 for exchange rate (carry forward if empty)
 * - Takes absolute value of amounts (no negatives in DB)
 * - Extracts unique PSP names for manual addition
 */

const fs = require('fs');

// Lookup mappings (from transferLookups.ts)
const LOOKUP_IDS = {
  categories: {
    'YATIRIM': 'dep',
    'ÇEKME': 'wd',
    'CEKME': 'wd',
  },
  paymentMethods: {
    'BANKA': 'bank',
    'IBAN': 'bank',
    'Tether': 'tether',
    'TETHER': 'tether',
  },
  types: {
    'MÜŞTERİ': 'client',
    'MUSTERI': 'client',
    'ÖDEME': 'payment',
    'ODEME': 'payment',
    'BLOKE HESAP': 'blocked',
    'BLOKE': 'blocked',
  },
};

// Parse Turkish decimal: "1.000,00" → 1000.00
function parseTurkishDecimal(val) {
  if (!val || val.trim() === '') return 0;
  const cleaned = val.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parse Turkish date: "DD.MM.YYYY" → "YYYY-MM-DD"
function parseTurkishDate(val) {
  const parts = val.trim().split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Simple CSV parser
function parseCSV(text) {
  const lines = text.split('\n');
  const rows = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }

  return rows;
}

// Main parsing function
function parseTransfersCSV(csvText) {
  const rows = parseCSV(csvText);

  // Find header row
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (rows[i][0] === 'CRM ID') {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Could not find header row (CRM ID)');
  }

  const dataRows = rows.slice(headerIndex + 1);
  const transfers = [];
  const pspNames = new Set();
  let lastKnownRate = 1.0; // Default starting rate
  let skippedCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    // Column 2: Full Name (required)
    const fullName = (row[2] || '').trim();
    if (!fullName) {
      skippedCount++;
      continue;
    }

    // Column 6: Transfer Date (required)
    const dateRaw = (row[6] || '').trim();
    const date = parseTurkishDate(dateRaw);
    if (!date) {
      console.warn(`Row ${i + 1}: Invalid date "${dateRaw}" for ${fullName}`);
      skippedCount++;
      continue;
    }

    // Column 16: Exchange Rate (kur) - use previous if empty
    const kurRaw = (row[16] || '').trim();
    let exchangeRate = lastKnownRate;
    if (kurRaw) {
      const parsed = parseTurkishDecimal(kurRaw);
      if (parsed > 0) {
        exchangeRate = parsed;
        lastKnownRate = parsed; // Update for next iteration
      }
    }

    // Column 7: Category
    const categoryName = (row[7] || '').trim().toUpperCase();
    const categoryId = LOOKUP_IDS.categories[categoryName];
    if (!categoryId) {
      console.warn(`Row ${i + 1}: Unknown category "${categoryName}" for ${fullName}`);
      skippedCount++;
      continue;
    }

    // Column 4: Payment Method
    const paymentMethodName = (row[4] || '').trim();
    const paymentMethodId = LOOKUP_IDS.paymentMethods[paymentMethodName] ||
                           LOOKUP_IDS.paymentMethods[paymentMethodName.toUpperCase()];
    if (!paymentMethodId) {
      console.warn(`Row ${i + 1}: Unknown payment method "${paymentMethodName}" for ${fullName}`);
      skippedCount++;
      continue;
    }

    // Column 13: Type
    const typeName = (row[13] || '').trim().toUpperCase();
    const typeId = LOOKUP_IDS.types[typeName];
    if (!typeId) {
      console.warn(`Row ${i + 1}: Unknown type "${typeName}" for ${fullName}`);
      skippedCount++;
      continue;
    }

    // Column 8: Amount (take absolute value)
    const amountRaw = (row[8] || '').trim();
    const amountSigned = parseTurkishDecimal(amountRaw);
    const amount = Math.abs(amountSigned); // Always positive in DB

    if (amount === 0) {
      console.warn(`Row ${i + 1}: Zero amount for ${fullName}`);
      skippedCount++;
      continue;
    }

    // Column 11: Currency
    const currencyRaw = (row[11] || '').trim().toUpperCase();
    const currency = currencyRaw === 'USD' ? 'USD' : 'TL';

    // Calculate TRY and USD amounts
    let amountTry, amountUsd;
    if (currency === 'TL') {
      amountTry = amount;
      amountUsd = exchangeRate > 1 ? Math.round((amount / exchangeRate) * 100) / 100 : 0;
    } else {
      amountUsd = amount;
      amountTry = Math.round(amount * exchangeRate * 100) / 100;
    }

    // Column 12: PSP Name (KASA)
    const pspName = (row[12] || '').trim();
    if (pspName) {
      pspNames.add(pspName);
    }

    // Add transfer
    transfers.push({
      fullName,
      crmId: (row[0] || '').trim() || null,
      metaId: (row[1] || '').trim() || null,
      paymentMethodId,
      categoryId,
      typeId,
      transferDate: `${date}T00:00:00`,
      amount,
      currency,
      exchangeRate,
      amountTry,
      amountUsd,
      pspName, // For reference only
    });
  }

  return {
    transfers,
    pspNames: Array.from(pspNames).sort(),
    skippedCount,
  };
}

// Generate SQL INSERT statements with PSP mapping
function generateInsertSql(transfers, orgId) {
  const values = transfers.map(t => {
    const fullName = t.fullName.replace(/'/g, "''"); // Escape quotes
    const pspName = t.pspName ? t.pspName.replace(/'/g, "''") : '';
    const crmId = t.crmId ? `'${t.crmId}'` : 'NULL';
    const metaId = t.metaId ? `'${t.metaId}'` : 'NULL';

    return `  (
    '${fullName}',
    '${t.transferDate}',
    ${t.amount},
    '${t.currency}',
    '${t.categoryId}',
    '${t.paymentMethodId}',
    '${t.typeId}',
    ${crmId},
    ${metaId},
    ${t.exchangeRate},
    ${t.amountTry},
    ${t.amountUsd},
    ${pspName ? `'${pspName}'` : 'NULL'}
  )`;
  });

  return `-- ============================================================================
-- Import Transfers from transfers.csv
-- Total: ${transfers.length} records
-- IMPORTANT: Run migration 046_add_psps_to_transfers.sql FIRST
-- ============================================================================

-- Import transfers with PSP mapping using CTE
WITH org AS (
  SELECT id FROM public.organizations WHERE name = '${orgId}' LIMIT 1
),
psp_map AS (
  SELECT id, name FROM public.psps WHERE organization_id = (SELECT id FROM org)
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
  amount_usd,
  psp_id
)
SELECT
  org.id,
  t.full_name::text,
  t.transfer_date::timestamptz,
  t.amount::numeric(15,2),
  t.currency::text,
  t.category_id::text,
  t.payment_method_id::text,
  t.type_id::text,
  t.crm_id::text,
  t.meta_id::text,
  t.exchange_rate::numeric(10,4),
  t.amount_try::numeric(15,2),
  t.amount_usd::numeric(15,2),
  (SELECT id FROM psp_map WHERE name = t.psp_name LIMIT 1)
FROM org
CROSS JOIN (VALUES
${values.join(',\n')}
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
  amount_usd,
  psp_name
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
  COUNT(DISTINCT psp_id) as unique_psps_used,
  ROUND(SUM(amount_try), 2) as total_try,
  ROUND(SUM(amount_usd), 2) as total_usd
FROM public.transfers
WHERE organization_id = (SELECT id FROM public.organizations WHERE name = '${orgId}');
`;
}

// Main
async function main() {
  console.log('📄 Reading transfers.csv...');
  const csvText = fs.readFileSync('transfers.csv', 'utf-8');

  console.log('🔄 Parsing CSV...');
  const result = parseTransfersCSV(csvText);

  console.log(`\n✅ Parsed ${result.transfers.length} valid transfers`);
  console.log(`⚠️  Skipped ${result.skippedCount} invalid/empty rows`);

  console.log(`\n📋 Found ${result.pspNames.length} unique PSP names:`);
  result.pspNames.forEach((name, idx) => {
    console.log(`   ${idx + 1}. ${name}`);
  });

  // Save PSP names list
  fs.writeFileSync('psp-names.txt', result.pspNames.join('\n'));
  console.log('\n💾 PSP names saved to: psp-names.txt');

  // Generate SQL for ORDERINVEST organization
  const sql = generateInsertSql(result.transfers, 'ORDERINVEST');
  fs.writeFileSync('insert-transfers-orderinvest.sql', sql);
  console.log('✅ SQL file generated: insert-transfers-orderinvest.sql');

  console.log('\n📊 Summary:');
  console.log(`   Total transfers: ${result.transfers.length}`);
  console.log(`   Unique PSPs: ${result.pspNames.length}`);
  console.log(`   Skipped rows: ${result.skippedCount}`);

  // Sample breakdown
  const byCategory = {};
  const byCurrency = {};
  result.transfers.forEach(t => {
    byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + 1;
    byCurrency[t.currency] = (byCurrency[t.currency] || 0) + 1;
  });

  console.log('\n📈 By Category:');
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`   ${cat.toUpperCase()}: ${count}`);
  });

  console.log('\n💵 By Currency:');
  Object.entries(byCurrency).forEach(([curr, count]) => {
    console.log(`   ${curr}: ${count}`);
  });

  console.log('\n✅ Done! Next steps:');
  console.log('1. Run migration 046_add_psps_to_transfers.sql in Supabase SQL Editor');
  console.log('2. Run insert-transfers-orderinvest.sql in Supabase SQL Editor');
  console.log('3. Check verification query results for confirmation');
  console.log('\n📊 Expected Results:');
  console.log(`   - ${result.transfers.length} transfers imported`);
  console.log(`   - 7 PSPs created for ORDERINVEST organization`);
  console.log(`   - All transfers mapped to their respective PSPs`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
