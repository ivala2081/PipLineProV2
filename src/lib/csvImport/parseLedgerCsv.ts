import Papa from 'papaparse'
import { parseTurkishDecimal, parseTurkishDate } from './parseCsv'
import type { LedgerParsedRow, LedgerImportParseResult, LedgerValidationIssue } from './ledgerTypes'

/* ── Constants ──────────────────────────────────────── */

const VALID_ENTRY_TYPES = new Set(['ODEME', 'TRANSFER'])
const VALID_CURRENCIES = new Set(['TL', 'USD', 'USDT'])
const VALID_REGISTERS = new Set(['USDT', 'NAKIT_TL', 'NAKIT_USD'])

/** Map CSV entry type values to DB enum */
const ENTRY_TYPE_MAP: Record<string, 'ODEME' | 'TRANSFER'> = {
  ÖDEME: 'ODEME',
  ÖDEMDE: 'ODEME', // common typo
  ODEME: 'ODEME',
  TRANSFER: 'TRANSFER',
}

/** Map CSV register values to DB enum */
const REGISTER_MAP: Record<string, 'USDT' | 'NAKIT_TL' | 'NAKIT_USD'> = {
  USDT: 'USDT',
  'NAKİT TL': 'NAKIT_TL',
  'NAKIT TL': 'NAKIT_TL',
  'NAKİT USD': 'NAKIT_USD',
  'NAKIT USD': 'NAKIT_USD',
  TRX: 'USDT', // map TRX to USDT
}

/** Map CSV currency values to DB enum */
const CURRENCY_MAP: Record<string, 'TL' | 'USD' | 'USDT'> = {
  TL: 'TL',
  USD: 'USD',
  USDT: 'USDT',
  'NAKİT TL': 'TL',
  'NAKİT TL ': 'TL',
  'NAKIT TL': 'TL',
}

/* ── Helpers ────────────────────────────────────────── */

/** Strip currency symbols ($, ₺) from a raw amount string */
function stripCurrencySymbols(val: string): string {
  return val.replace(/[$₺]/g, '').trim()
}

/** Normalize a raw currency string to a DB currency value */
function normalizeCurrency(raw: string): string {
  const trimmed = raw.trim().toUpperCase()
  return CURRENCY_MAP[trimmed] ?? CURRENCY_MAP[raw.trim()] ?? trimmed
}

/** Normalize a raw register string to a DB register value */
function normalizeRegister(raw: string): string {
  const trimmed = raw.trim()
  // Try exact match first, then uppercase
  return REGISTER_MAP[trimmed] ?? REGISTER_MAP[trimmed.toUpperCase()] ?? trimmed.toUpperCase()
}

/** Normalize a raw entry type string to a DB entry type value */
function normalizeEntryType(raw: string): string {
  const trimmed = raw.trim().toUpperCase()
  return ENTRY_TYPE_MAP[trimmed] ?? ENTRY_TYPE_MAP[raw.trim()] ?? trimmed
}

/* ── Row Validation ─────────────────────────────────── */

function validateRow(rowIndex: number, cols: string[]): LedgerParsedRow | null {
  const issues: LedgerValidationIssue[] = []

  const description = (cols[0] ?? '').trim()
  if (!description) return null // skip empty rows

  // Entry type
  const rawType = (cols[1] ?? '').trim()
  const entryType = normalizeEntryType(rawType)
  if (!VALID_ENTRY_TYPES.has(entryType)) {
    issues.push({
      field: 'entry_type',
      message: `Unknown type "${rawType}"`,
      severity: 'error',
    })
  }
  if (rawType.toUpperCase() === 'ÖDEMDE') {
    issues.push({
      field: 'entry_type',
      message: `Typo corrected: "${rawType}" → "ÖDEME"`,
      severity: 'warning',
    })
  }

  // Determine direction + amount + currency from IN/OUT columns
  const rawInAmount = stripCurrencySymbols((cols[2] ?? '').trim())
  const rawInCurrency = (cols[3] ?? '').trim()
  const rawOutAmount = stripCurrencySymbols((cols[4] ?? '').trim())
  const rawOutCurrency = (cols[5] ?? '').trim()

  let direction: 'in' | 'out' = 'out'
  let amount = 0
  let rawCurrency = ''

  if (rawInAmount && parseTurkishDecimal(rawInAmount) > 0) {
    direction = 'in'
    amount = parseTurkishDecimal(rawInAmount)
    rawCurrency = rawInCurrency
  } else if (rawOutAmount && parseTurkishDecimal(rawOutAmount) > 0) {
    direction = 'out'
    amount = parseTurkishDecimal(rawOutAmount)
    rawCurrency = rawOutCurrency
  } else {
    issues.push({
      field: 'amount',
      message: 'No valid amount found in GİREN or ÇIKAN columns',
      severity: 'error',
    })
  }

  if (amount <= 0 && issues.every((i) => i.field !== 'amount')) {
    issues.push({
      field: 'amount',
      message: 'Amount must be positive',
      severity: 'error',
    })
  }

  // Currency
  const currency = normalizeCurrency(rawCurrency)
  if (!VALID_CURRENCIES.has(currency)) {
    issues.push({
      field: 'currency',
      message: `Unknown currency "${rawCurrency}" → "${currency}"`,
      severity: 'error',
    })
  }

  // Date
  const rawDate = (cols[7] ?? '').trim()
  const entryDate = parseTurkishDate(rawDate)
  if (!entryDate) {
    issues.push({
      field: 'entry_date',
      message: `Invalid date "${rawDate}"`,
      severity: 'error',
    })
  }

  // Register
  const rawRegister = (cols[9] ?? '').trim()
  const register = normalizeRegister(rawRegister)
  if (!VALID_REGISTERS.has(register)) {
    issues.push({
      field: 'register',
      message: `Unknown register "${rawRegister}"`,
      severity: 'error',
    })
  }

  // Cost period & payment period
  const costPeriod = (cols[6] ?? '').trim()
  const paymentPeriod = (cols[8] ?? '').trim()

  const isValid = issues.every((i) => i.severity !== 'error')

  return {
    rowIndex,
    description,
    entryType: (isValid ? entryType : entryType) as 'ODEME' | 'TRANSFER',
    direction,
    amount,
    currency: currency as 'TL' | 'USD' | 'USDT',
    costPeriod,
    entryDate,
    paymentPeriod,
    register: register as 'USDT' | 'NAKIT_TL' | 'NAKIT_USD',
    issues,
    isValid,
  }
}

/* ── Main Parser ────────────────────────────────────── */

/**
 * Parse a ledger CSV file (Google Sheets export).
 *
 * Expected structure:
 * - Rows 1–15: Summary/header area (skipped)
 * - Row 16: Column headers starting with AÇIKLAMA
 * - Rows 17+: Data entries
 */
export function parseLedgerCsv(csvText: string): LedgerImportParseResult {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  })

  const allRows = result.data

  // Find the header row by scanning for AÇIKLAMA in first column
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(allRows.length, 25); i++) {
    const firstCell = (allRows[i]?.[0] ?? '').trim().toUpperCase()
    if (firstCell === 'AÇIKLAMA') {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not find header row. Expected "AÇIKLAMA" in first column.')
  }

  const dataRows = allRows.slice(headerRowIndex + 1)

  // Parse and validate each data row
  const rows: LedgerParsedRow[] = []
  let totalRawRows = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (!row || row.every((cell) => !cell?.trim())) continue // skip fully empty rows

    totalRawRows++
    const parsed = validateRow(headerRowIndex + 1 + i + 1, row)
    if (parsed) rows.push(parsed)
  }

  const validRows = rows.filter((r) => r.isValid).length
  const errorRows = rows.filter((r) => !r.isValid).length
  const warningRows = rows.filter((r) => r.isValid && r.issues.length > 0).length

  return { rows, totalRawRows, validRows, errorRows, warningRows }
}
