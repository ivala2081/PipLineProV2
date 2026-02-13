import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

// Parse helpers
function parseTurkishDecimal(val: string): number {
  if (!val || val === '') return 0;
  // Handle 1.000,00 format
  const cleaned = val.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function normalizeName(name: string): string {
  return name.trim().toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/\s+/g, ' ');
}

// 1. Read System CSV
const csvPath = join(process.cwd(), 'ocak.csv');
const csvContent = readFileSync(csvPath, 'utf-8');
const csvRecords = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

const systemData = csvRecords
  .filter((r: any) => r['TARİH'] === '30.01.2026')
  .map((r: any) => ({
    crmId: r['CRM ID'],
    metaId: r['META ID'],
    name: r['AD SOYAD'],
    amount: parseTurkishDecimal(r['TUTAR']),
    currency: r['PARA BİRİMİ'],
    category: r['KATEGORİ'],
    type: r['Tür'],
    raw: r
  }));

// 2. Read Sheet Data
const sheetPath = join(process.cwd(), 'jan30_sheet.txt');
const sheetContent = readFileSync(sheetPath, 'utf-8');
const sheetLines = sheetContent.split('\n').filter(l => l.trim());

const sheetData = sheetLines.map(line => {
  const parts = line.split('\t');
  // Handle potentially missing columns or weird formatting
  // Expected: CRM, META, NAME, IBAN, PAYMENT, COMPANY, DATE, CAT, AMOUNT, COMM, NET, CUR, PSP, TYPE
  // Index:    0    1      2     3     4        5       6     7    8       9     10   11   12   13
  
  // Note: some lines start with empty tab for missing ID
  
  return {
    crmId: parts[0]?.trim() || '',
    metaId: parts[1]?.trim() || '',
    name: parts[2]?.trim() || '',
    amount: parseTurkishDecimal(parts[8]),
    currency: parts[11]?.trim() || '',
    category: parts[7]?.trim() || '',
    type: parts[13]?.trim() || '',
    rawLine: line
  };
});

console.log(`System Records: ${systemData.length}`);
console.log(`Sheet Records: ${sheetData.length}`);

// 3. Compare
const systemMatched = new Set<number>();
const sheetMatched = new Set<number>();

const discrepancies: string[] = [];

// Try to match sheet rows to system rows
sheetData.forEach((sheetRow, sheetIdx) => {
  // Find match in system data
  // Criteria: Name match (normalized) AND Amount match AND Currency match
  
  const normSheetName = normalizeName(sheetRow.name);
  
  const matches = systemData.map((sysRow, sysIdx) => {
    if (systemMatched.has(sysIdx)) return null;
    
    const normSysName = normalizeName(sysRow.name);
    
    // Exact amount match
    const amountMatch = Math.abs(sysRow.amount - sheetRow.amount) < 0.01;
    const nameMatch = normSysName === normSheetName;
    const currencyMatch = sysRow.currency === sheetRow.currency;
    
    if (amountMatch && nameMatch && currencyMatch) {
      return sysIdx;
    }
    return null;
  }).filter(idx => idx !== null);
  
  if (matches.length > 0) {
    // Take the first match
    const matchIdx = matches[0] as number;
    systemMatched.add(matchIdx);
    sheetMatched.add(sheetIdx);
    
    // Check for ID discrepancies
    const sysRow = systemData[matchIdx];
    if (sysRow.crmId !== sheetRow.crmId || sysRow.metaId !== sheetRow.metaId) {
      discrepancies.push(`ID Mismatch for ${sheetRow.name} (${sheetRow.amount} ${sheetRow.currency}):
  System: CRM='${sysRow.crmId}', META='${sysRow.metaId}'
  Sheet:  CRM='${sheetRow.crmId}', META='${sheetRow.metaId}'`);
    }
  } else {
    discrepancies.push(`Sheet record not found in System: ${sheetRow.name} - ${sheetRow.amount} ${sheetRow.currency} (CRM: ${sheetRow.crmId}, META: ${sheetRow.metaId})`);
  }
});

// Check for system records not matched
systemData.forEach((sysRow, sysIdx) => {
  if (!systemMatched.has(sysIdx)) {
    discrepancies.push(`System record not found in Sheet: ${sysRow.name} - ${sysRow.amount} ${sysRow.currency} (CRM: ${sysRow.crmId}, META: ${sysRow.metaId})`);
  }
});

console.log('\n--- Discrepancies ---');
if (discrepancies.length === 0) {
  console.log('No discrepancies found. Data matches perfectly.');
} else {
  discrepancies.forEach(d => console.log(d));
}
