import type { AccountingEntry } from '@/lib/database.types'

/**
 * Convert ledger entries to CSV format matching the import structure
 */
export function exportLedgerCsv(entries: AccountingEntry[]): string {
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
    const amount = Number(entry.amount).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    // GİREN (IN) or ÇIKAN (OUT)
    const girenAmount = entry.direction === 'in' ? amount : ''
    const girenCurrency = entry.direction === 'in' ? entry.currency : ''
    const cikanAmount = entry.direction === 'out' ? amount : ''
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
    ]
  })

  // Combine headers and rows
  const allRows = [headers, ...rows]

  // Convert to CSV format
  return allRows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const cellStr = String(cell ?? '')
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })
        .join(','),
    )
    .join('\n')
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
