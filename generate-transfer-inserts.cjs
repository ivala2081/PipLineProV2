#!/usr/bin/env node
/**
 * Generate SQL INSERT statements from OCAK and SUBAT transfer CSV files
 * This bypasses the UI import and creates direct SQL inserts
 */

const fs = require('fs');
const path = require('path');

// Lookup mappings (hardcoded from transferLookups.ts)
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

// Check if a value looks like a date
function isTurkishDate(val) {
  return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(val.trim());
}

// Check if a value is a pure Turkish decimal
function isPureTurkishDecimal(val) {
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('₺') || trimmed.startsWith('$')) return false;
  if (trimmed.endsWith('%')) return false;
  return /^-?[\d.,]+$/.test(trimmed);
}

// Parse a single CSV file
function parseCsvFile(csvText) {
  const lines = csvText.split('\n');
  const rows = lines.map(line => {
    // Simple CSV parsing (handle quoted fields)
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields;
  });

  // Find header row (look for "CRM ID" in first column)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i][0]?.trim() === 'CRM ID') {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Could not find header row (CRM ID)');
  }

  const dataRows = rows.slice(headerIndex + 1);

  // Extract exchange rates (col 15 = date, col 23 = rate)
  const exchangeRates = new Map();
  for (const row of dataRows) {
    if (row.length <= 23) continue;
    const dateCell = (row[15] || '').trim();
    const rateCell = (row[23] || '').trim();
    if (!isTurkishDate(dateCell)) continue;
    if (!isPureTurkishDecimal(rateCell)) continue;
    const rate = parseTurkishDecimal(rateCell);
    if (rate > 0) {
      const isoDate = parseTurkishDate(dateCell);
      if (isoDate) exchangeRates.set(isoDate, rate);
    }
  }

  // Extract transfer data (columns 0-13)
  const transfers = [];
  for (const row of dataRows) {
    const fullName = (row[2] || '').trim();
    if (!fullName) continue; // Skip empty rows

    const dateRaw = (row[6] || '').trim();
    const date = parseTurkishDate(dateRaw);
    if (!date) continue; // Skip invalid dates

    const categoryName = (row[7] || '').trim().toUpperCase();
    const paymentMethodName = (row[4] || '').trim();
    const typeName = (row[13] || '').trim().toUpperCase();
    const amountRaw = (row[8] || '').trim();
    const currencyRaw = (row[11] || '').trim().toUpperCase();

    const amount = parseTurkishDecimal(amountRaw);
    const currency = currencyRaw === 'USD' ? 'USD' : 'TL';
    const exchangeRate = exchangeRates.get(date) || 1;

    // Map to lookup IDs
    const categoryId = LOOKUP_IDS.categories[categoryName];
    const paymentMethodId = LOOKUP_IDS.paymentMethods[paymentMethodName] ||
                           LOOKUP_IDS.paymentMethods[paymentMethodName.toUpperCase()];
    const typeId = LOOKUP_IDS.types[typeName];

    if (!categoryId || !paymentMethodId || !typeId) {
      console.warn(`Skipping row: ${fullName} - missing lookup mapping`, {
        categoryName,
        paymentMethodName,
        typeName,
        categoryId,
        paymentMethodId,
        typeId
      });
      continue;
    }

    // Calculate TRY and USD amounts
    let amountTry, amountUsd;
    if (currency === 'TL') {
      amountTry = amount;
      amountUsd = exchangeRate > 1 ? Math.round((amount / exchangeRate) * 100) / 100 : 0;
    } else {
      amountUsd = amount;
      amountTry = Math.round(amount * exchangeRate * 100) / 100;
    }

    const isDeposit = categoryId === 'dep';

    transfers.push({
      fullName,
      crmId: (row[0] || '').trim() || null,
      metaId: (row[1] || '').trim() || null,
      paymentMethodId,
      categoryId,
      isDeposit,
      typeId,
      transferDate: `${date}T00:00:00`,
      amount,
      currency,
      exchangeRate,
      amountTry,
      amountUsd,
    });
  }

  return { transfers, exchangeRates };
}

// Generate SQL INSERT statements
function generateInsertSql(transfers, orgId) {
  const values = transfers.map(t => {
    const fullName = t.fullName.replace(/'/g, "''"); // Escape quotes
    const crmId = t.crmId ? `'${t.crmId}'` : 'NULL';
    const metaId = t.metaId ? `'${t.metaId}'` : 'NULL';

    return `(
  '${orgId}',
  '${fullName}',
  ${crmId},
  ${metaId},
  '${t.paymentMethodId}',
  '${t.categoryId}',
  ${t.isDeposit},
  '${t.typeId}',
  '${t.transferDate}',
  ${t.amount},
  '${t.currency}',
  ${t.exchangeRate},
  ${t.amountTry},
  ${t.amountUsd}
)`;
  });

  return `-- Generated transfer inserts
-- Total: ${transfers.length} records

INSERT INTO public.transfers (
  organization_id,
  full_name,
  crm_id,
  meta_id,
  payment_method_id,
  category_id,
  is_deposit,
  type_id,
  transfer_date,
  amount,
  currency,
  exchange_rate,
  amount_try,
  amount_usd
) VALUES
${values.join(',\n')};
`;
}

// Main
async function main() {
  console.log('🔄 Parsing OCAK transfers...');
  const ocakCsv = fs.readFileSync('ocaktransfer.csv', 'utf-8');
  const ocakResult = parseCsvFile(ocakCsv);
  console.log(`✅ OCAK: ${ocakResult.transfers.length} transfers, ${ocakResult.exchangeRates.size} exchange rates`);

  console.log('\n🔄 Parsing SUBAT transfers...');
  const subatCsv = fs.readFileSync('subattransfer.csv', 'utf-8');
  const subatResult = parseCsvFile(subatCsv);
  console.log(`✅ SUBAT: ${subatResult.transfers.length} transfers, ${subatResult.exchangeRates.size} exchange rates`);

  // Combine all transfers
  const allTransfers = [...ocakResult.transfers, ...subatResult.transfers];
  console.log(`\n📊 Total transfers: ${allTransfers.length}`);

  // Generate SQL (you'll need to provide your organization_id)
  console.log('\n⚠️  Please edit the SQL file to replace YOUR_ORG_ID with your actual organization UUID');
  const sql = generateInsertSql(allTransfers, 'YOUR_ORG_ID');

  fs.writeFileSync('insert-transfers.sql', sql);
  console.log('\n✅ SQL file generated: insert-transfers.sql');
  console.log('\nNext steps:');
  console.log('1. Edit insert-transfers.sql and replace YOUR_ORG_ID with your organization UUID');
  console.log('2. Run the SQL in Supabase SQL Editor');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
