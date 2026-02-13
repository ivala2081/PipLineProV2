import { readFileSync } from 'fs';
import { join } from 'path';

// Parse helpers
function parseTurkishDecimal(val: string): number {
  if (!val || val === '') return 0;
  // Handle 1.000,00 format
  // Remove dots (thousands) then replace comma with dot (decimal)
  // But wait, the previous parse might have been simplistic.
  // Example: "6.558,00" -> "6558.00"
  // Example: "-15.000,00" -> "-15000.00"
  
  // Remove all dots
  let cleaned = val.replace(/\./g, '');
  // Replace comma with dot
  cleaned = cleaned.replace(',', '.');
  return parseFloat(cleaned);
}

// Read Sheet Data
const sheetPath = join(process.cwd(), 'jan30_sheet.txt');
const sheetContent = readFileSync(sheetPath, 'utf-8');
const sheetLines = sheetContent.split('\n').filter(l => l.trim());

// Initialize totals
let totalTLDeposit = 0;
let totalTLWithdrawal = 0;
let totalTLCommission = 0;

let totalUSDDeposit = 0;
let totalUSDWithdrawal = 0;
let totalUSDCommission = 0; // If any

let countTL = 0;
let countUSD = 0;

console.log('--- Processing Rows ---');

sheetDataLoop:
for (const line of sheetLines) {
  const parts = line.split('\t');
  // Expected indices based on previous file write:
  // 46791	42842	UĞURCAN UYSAL	IBAN	BANKA	ORDER	30.01.2026	YATIRIM	6.558,00	787	5.771,04	TL	#72 CRYPPAY	MÜŞTERİ
  // 0: CRM, 1: META, 2: NAME, 3: METHOD, 4: TYPE?, 5: COMP, 6: DATE, 7: CAT, 8: AMOUNT, 9: COMM, 10: NET, 11: CUR, 12: PSP, 13: TYPE
  
  // Checking column counts
  if (parts.length < 12) continue;

  const category = parts[7]?.trim(); // YATIRIM or ÇEKME
  const amountStr = parts[8]?.trim();
  const commStr = parts[9]?.trim();
  const currency = parts[11]?.trim();

  const amount = parseTurkishDecimal(amountStr);
  const comm = parseTurkishDecimal(commStr);

  if (currency === 'TL') {
    if (category === 'YATIRIM') {
      totalTLDeposit += amount;
    } else if (category === 'ÇEKME') {
      totalTLWithdrawal += amount;
    }
    totalTLCommission += comm;
    countTL++;
  } else if (currency === 'USD') {
    if (category === 'YATIRIM') {
      totalUSDDeposit += amount;
    } else if (category === 'ÇEKME') {
      totalUSDWithdrawal += amount;
    }
    totalUSDCommission += comm;
    countUSD++;
  }
}

// Formatting helper
const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

console.log('\n--- Daily Summary for 30.01.2026 ---');
console.log(`Total Bank (TL Deposits): ₺${fmt(totalTLDeposit)}`);
console.log(`Total Bank Withdrawals:   ₺${fmt(totalTLWithdrawal)}`);
console.log(`Net Bank (TL):            ₺${fmt(totalTLDeposit + totalTLWithdrawal)}`);
console.log(`Total TL Commissions:     ₺${fmt(totalTLCommission)}`);
console.log('');
console.log(`Total Tether (USD Deposits): $${fmt(totalUSDDeposit)}`);
console.log(`Total Tether Withdrawals:    $${fmt(totalUSDWithdrawal)}`);
console.log(`Net Tether (USD):            $${fmt(totalUSDDeposit + totalUSDWithdrawal)}`);
console.log(`Total USD Commissions:       $${fmt(totalUSDCommission)}`);
