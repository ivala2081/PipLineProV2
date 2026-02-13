/**
 * Generate SQL migration to import OCAK CSV data
 * Run: npx tsx scripts/generate-ocak-import.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

interface CsvRow {
  crmId: string;
  metaId: string;
  fullName: string;
  paymentMethod: string;
  company: string;
  date: string;
  category: string;
  amount: string;
  commission: string;
  net: string;
  currency: string;
  psp: string;
  type: string;
}

function parseTurkishDecimal(val: string): number {
  if (!val || val === '') return 0;
  // Remove thousand separators (.) and replace comma with dot
  // Handle negative numbers: "-1.000,00" -> -1000.00
  const cleaned = val.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function parseTurkishDate(val: string): string {
  // DD.MM.YYYY -> YYYY-MM-DD
  const [day, month, year] = val.split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function escapeSQL(val: string): string {
  return val.replace(/'/g, "''");
}

// Read and parse CSV
const csvPath = join(process.cwd(), 'ocak.csv');
const csvContent = readFileSync(csvPath, 'utf-8');

const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_quotes: true,
});

const rows: CsvRow[] = records.map((record: any) => ({
  crmId: record['CRM ID'] || '',
  metaId: record['META ID'] || '',
  fullName: record['AD SOYAD'] || '',
  paymentMethod: record['ÖDEME ŞEKLİ'] || '',
  company: record['ŞİRKET'] || '',
  date: record['TARİH'] || '',
  category: record['KATEGORİ'] || '',
  amount: record['TUTAR'] || '',
  commission: record['KOMİSYON'] || '',
  net: record['NET'] || '',
  currency: record['PARA BİRİMİ'] || '',
  psp: record['KASA'] || '',
  type: record['Tür'] || '',
}));

// Collect unique values for lookups
const paymentMethods = new Set<string>();
const categories = new Set<string>();
const psps = new Set<string>();
const types = new Set<string>();

rows.forEach(row => {
  if (row.paymentMethod) paymentMethods.add(row.paymentMethod);
  if (row.category) categories.add(row.category);
  if (row.psp) psps.add(row.psp);
  if (row.type) types.add(row.type);
});

// Generate SQL
let sql = `-- ============================================================================
-- 026: Import OCAK CSV data to transfers
-- ============================================================================

do $$
declare
  v_org_id uuid;
  v_payment_method_id uuid;
  v_category_id uuid;
  v_psp_id uuid;
  v_type_id uuid;
  v_counter integer := 0;
begin
  -- Get ORDERINVEST organization ID
  select id into v_org_id
  from public.organizations
  where name = 'ORDERINVEST'
  limit 1;

  if v_org_id is null then
    raise exception 'ORDERINVEST organization not found. Please create it first.';
  end if;

  raise notice 'Using organization: %', v_org_id;

  -- ============================================================================
  -- Create lookup data (payment methods, categories, psps, types)
  -- ============================================================================

  -- Payment Methods (ÖDEME ŞEKLİ)
  insert into public.payment_methods (organization_id, name, is_active)
  values 
${Array.from(paymentMethods).map(pm => `    (v_org_id, '${escapeSQL(pm)}', true)`).join(',\n')}
  on conflict (organization_id, name) do nothing;

  -- Transfer Categories (KATEGORİ)
  insert into public.transfer_categories (organization_id, name, is_deposit, is_active)
  values 
${Array.from(categories).map(cat => 
    `    (v_org_id, '${escapeSQL(cat)}', ${cat === 'YATIRIM' ? 'true' : 'false'}, true)`
  ).join(',\n')}
  on conflict (organization_id, name) do nothing;

  -- PSPs (KASA) - all with 1% commission rate
  insert into public.psps (organization_id, name, commission_rate, is_active)
  values 
${Array.from(psps).map(psp => `    (v_org_id, '${escapeSQL(psp)}', 0.01, true)`).join(',\n')}
  on conflict (organization_id, name) do nothing;

  -- Transfer Types (Tür)
  insert into public.transfer_types (organization_id, name, is_active)
  values 
${Array.from(types).map(type => `    (v_org_id, '${escapeSQL(type)}', true)`).join(',\n')}
  on conflict (organization_id, name) do nothing;

  raise notice 'Lookup data created successfully';

  -- ============================================================================
  -- Import transfers from OCAK CSV (${rows.length} rows)
  -- ============================================================================
  
`;

// Generate insert statements
rows.forEach((row, idx) => {
  const amount = parseTurkishDecimal(row.amount);
  const commission = parseTurkishDecimal(row.commission);
  const net = parseTurkishDecimal(row.net);
  const transferDate = parseTurkishDate(row.date);
  
  sql += `  -- Row ${idx + 2}: ${escapeSQL(row.fullName || 'Unknown')}\n`;
  
  // Get lookup IDs
  if (row.paymentMethod) {
    sql += `  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = '${escapeSQL(row.paymentMethod)}';\n`;
  }
  if (row.category) {
    sql += `  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = '${escapeSQL(row.category)}';\n`;
  }
  if (row.psp) {
    sql += `  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '${escapeSQL(row.psp)}';\n`;
  }
  if (row.type) {
    sql += `  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = '${escapeSQL(row.type)}';\n`;
  }
  
  sql += `  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id`;
  
  if (row.crmId) sql += `, crm_id`;
  if (row.metaId) sql += `, meta_id`;
  
  sql += `
  ) values (
    v_org_id, '${escapeSQL(row.fullName)}', v_payment_method_id, '${transferDate}'::timestamptz,
    v_category_id, ${amount}, ${commission}, ${net}, '${row.currency}', v_psp_id, v_type_id`;
  
  if (row.crmId) sql += `, '${escapeSQL(row.crmId)}'`;
  if (row.metaId) sql += `, '${escapeSQL(row.metaId)}'`;
  
  sql += `
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

`;
});

sql += `  raise notice 'Successfully imported % transfers from OCAK CSV', v_counter;

exception
  when others then
    raise notice 'Error at row %: %', v_counter + 2, SQLERRM;
    raise;
end $$;
`;

// Write to migration file with UTF-8 BOM for Windows compatibility
const migrationPath = join(process.cwd(), 'supabase/migrations/026_import_ocak_csv.sql');
const BOM = '\uFEFF';
writeFileSync(migrationPath, BOM + sql, 'utf-8');

console.log(`✅ Generated migration: ${migrationPath}`);
console.log(`📊 Statistics:`);
console.log(`   - ${rows.length} transfers`);
console.log(`   - ${paymentMethods.size} payment methods`);
console.log(`   - ${categories.size} categories`);
console.log(`   - ${psps.size} PSPs`);
console.log(`   - ${types.size} transfer types`);
