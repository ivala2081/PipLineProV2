import type { AccountingEntry } from '@/lib/database.types'
import { exportToExcelFromRows } from '@/lib/excelExport'

/**
 * Export ledger entries to an Excel (.xlsx) file.
 * Mirrors exportLedgerCsv but with proper Excel formatting.
 */
export function exportLedgerXlsx(entries: AccountingEntry[], filename: string): void {
  const headers = [
    'AÇIKLAMA',
    'TÜR',
    'GİREN MİKTAR',
    'GİREN TÜR',
    'ÇIKAN MİKTAR',
    'ÇIKAN TÜR',
    'MALİYET DÖNEMİ',
    'TARİH',
    'ÖDEME DÖNEMİ',
    'KASA',
  ]

  const rows = entries.map((entry) => {
    const amount = Number(entry.amount)

    // GIREN (IN) or CIKAN (OUT)
    const girenAmount: string | number = entry.direction === 'in' ? amount : ''
    const girenCurrency = entry.direction === 'in' ? entry.currency : ''
    const cikanAmount: string | number = entry.direction === 'out' ? amount : ''
    const cikanCurrency = entry.direction === 'out' ? entry.currency : ''

    // Entry type
    const entryType = entry.entry_type === 'ODEME' ? 'ÖDEME' : 'TRANSFER'

    // Register mapping
    const register =
      entry.register === 'NAKIT_TL'
        ? 'NAKİT TL'
        : entry.register === 'NAKIT_USD'
          ? 'NAKİT USD'
          : entry.register

    return [
      entry.description,
      entryType,
      girenAmount,
      girenCurrency,
      cikanAmount,
      cikanCurrency,
      entry.cost_period || '',
      entry.entry_date,
      entry.payment_period || '',
      register,
    ] as (string | number)[]
  })

  exportToExcelFromRows({
    headers,
    rows,
    sheetName: 'Ledger',
    filename,
  })
}
