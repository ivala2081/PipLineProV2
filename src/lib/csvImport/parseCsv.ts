import Papa from 'papaparse'
import type { CsvRawRow } from './types'

/**
 * Parse a Turkish-format decimal string to a number.
 * "1.000,00" → 1000.00, "-12.900,00" → -12900.00, "435" → 435
 */
export function parseTurkishDecimal(val: string): number {
  if (!val || val.trim() === '') return 0
  const cleaned = val.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Parse a Turkish-format date string to an ISO date.
 * "DD.MM.YYYY" → "YYYY-MM-DD"
 */
export function parseTurkishDate(val: string): string {
  const parts = val.trim().split('.')
  if (parts.length !== 3) return ''
  const [day, month, year] = parts
  if (!day || !month || !year) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/** Check if a value looks like a DD.MM.YYYY date */
function isTurkishDate(val: string): boolean {
  return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(val.trim())
}

/** Check if a value is a pure Turkish decimal (no currency prefix) */
function isPureTurkishDecimal(val: string): boolean {
  const trimmed = val.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('₺') || trimmed.startsWith('$')) return false
  if (trimmed.endsWith('%')) return false
  return /^-?[\d.,]+$/.test(trimmed)
}

/**
 * Parse an entire CSV file text. Handles the complex Google Sheets format:
 * - Skips summary rows at top (before the header)
 * - Finds the header row by looking for "CRM ID" in column 0
 * - Extracts the 14 core transfer columns (indices 0–13)
 * - Extracts daily exchange rates from the summary section (col 15 = date, col 23 = rate)
 */
export function parseCsvFile(csvText: string): {
  rows: CsvRawRow[]
  exchangeRates: Map<string, number>
  headerRowIndex: number
  totalRawRows: number
} {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  })

  const allRows = result.data

  // Find the header row
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const firstCell = (allRows[i]?.[0] ?? '').trim()
    if (firstCell === 'CRM ID') {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not find header row. Expected "CRM ID" in first column.')
  }

  const dataRows = allRows.slice(headerRowIndex + 1)

  // Extract exchange rates from daily summary section
  const exchangeRates = new Map<string, number>()
  for (const row of dataRows) {
    if (row.length <= 23) continue
    const dateCell = (row[15] ?? '').trim()
    const rateCell = (row[23] ?? '').trim()
    if (!isTurkishDate(dateCell)) continue
    if (!isPureTurkishDecimal(rateCell)) continue
    const rate = parseTurkishDecimal(rateCell)
    if (rate > 0) {
      const isoDate = parseTurkishDate(dateCell)
      if (isoDate) exchangeRates.set(isoDate, rate)
    }
  }

  // Extract core transfer data (columns 0–13)
  const rows: CsvRawRow[] = []
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const fullName = (row[2] ?? '').trim()
    // Skip rows with empty full_name (likely empty/summary rows)
    if (!fullName) continue

    rows.push({
      rowIndex: headerRowIndex + 1 + i + 1, // 1-based CSV line number
      crmId: (row[0] ?? '').trim(),
      metaId: (row[1] ?? '').trim(),
      fullName,
      iban: (row[3] ?? '').trim(),
      paymentMethodName: (row[4] ?? '').trim(),
      company: (row[5] ?? '').trim(),
      dateRaw: (row[6] ?? '').trim(),
      categoryName: (row[7] ?? '').trim(),
      amountRaw: (row[8] ?? '').trim(),
      commissionRaw: (row[9] ?? '').trim(),
      netRaw: (row[10] ?? '').trim(),
      currency: (row[11] ?? '').trim(),
      pspName: (row[12] ?? '').trim(),
      typeName: (row[13] ?? '').trim(),
    })
  }

  return {
    rows,
    exchangeRates,
    headerRowIndex,
    totalRawRows: dataRows.length,
  }
}
