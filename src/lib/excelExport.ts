import * as XLSX from 'xlsx'

/* ── Types ────────────────────────────────────────────── */

export interface ColumnWidth {
  /** Column index (0-based) */
  index: number
  /** Width in characters */
  width: number
}

export interface ExcelExportOptions {
  /** Array of row objects */
  data: Record<string, unknown>[]
  /** Sheet name (max 31 chars, no special chars) */
  sheetName?: string
  /** Downloaded file name (without extension) */
  filename: string
  /** Optional explicit column widths – when omitted, auto-fit is used */
  columnWidths?: ColumnWidth[]
  /** Header row labels. When omitted the object keys from data[0] are used. */
  headers?: string[]
}

/* ── Helpers ──────────────────────────────────────────── */

/**
 * Compute auto-fit column widths based on header + cell content.
 * Returns an array of `{ wch }` objects suitable for `ws['!cols']`.
 */
function autoFitColumns(headers: string[], rows: unknown[][]): XLSX.ColInfo[] {
  return headers.map((header, colIdx) => {
    let maxLen = header.length

    for (const row of rows) {
      const cell = row[colIdx]
      const cellStr = cell != null ? String(cell) : ''
      if (cellStr.length > maxLen) maxLen = cellStr.length
    }

    // Add a little padding (min 10, max 50)
    const wch = Math.min(Math.max(maxLen + 2, 10), 50)
    return { wch }
  })
}

/**
 * Detect if a value looks like a number (ignoring locale formatting like commas).
 * Returns the parsed number or null.
 */
function tryParseNumber(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || value.trim() === '') return null

  // Strip thousand separators (both . and , variants) and try parsing
  // Turkish format: 1.234,56 → 1234.56
  // English format: 1,234.56 → 1234.56
  const cleaned = value.replace(/\s/g, '')

  // If it contains both . and , figure out the decimal separator
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Turkish: 1.234,56 (dot = thousands, comma = decimal)
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastComma > lastDot) {
      // Turkish format
      const n = Number(cleaned.replace(/\./g, '').replace(',', '.'))
      return isNaN(n) ? null : n
    } else {
      // English format
      const n = Number(cleaned.replace(/,/g, ''))
      return isNaN(n) ? null : n
    }
  }

  // Only commas – could be TR decimal or EN thousands
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    // If one comma and digits after it are 1-2, treat as decimal
    const parts = cleaned.split(',')
    if (parts.length === 2 && parts[1].length <= 2) {
      const n = Number(cleaned.replace(',', '.'))
      return isNaN(n) ? null : n
    }
  }

  const n = Number(cleaned.replace(/,/g, ''))
  return isNaN(n) ? null : n
}

/**
 * Check if a string looks like a date (YYYY-MM-DD or DD/MM/YYYY patterns).
 */
function isDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false
  // ISO date: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true
  // DD/MM/YYYY or DD.MM.YYYY
  if (/^\d{2}[/.]\d{2}[/.]\d{4}$/.test(value)) return true
  return false
}

/* ── Main export function ─────────────────────────────── */

/**
 * Creates an .xlsx file from an array of data and triggers a browser download.
 *
 * Usage:
 * ```ts
 * exportToExcel({
 *   data: [{ Name: 'Alice', Age: 30 }],
 *   filename: 'report',
 *   sheetName: 'Users',
 * })
 * ```
 */
export function exportToExcel({
  data,
  sheetName = 'Sheet1',
  filename,
  columnWidths,
  headers,
}: ExcelExportOptions): void {
  if (!data.length) return

  // Resolve headers
  const keys = Object.keys(data[0])
  const headerRow = headers ?? keys

  // Build raw rows (array of arrays)
  const rawRows = data.map((row) =>
    keys.map((key) => {
      const val = row[key]
      if (val == null) return ''

      // Try to preserve numbers
      const num = tryParseNumber(val)
      if (num !== null) return num

      return String(val)
    }),
  )

  // Create worksheet from AoA (array of arrays)
  const wsData = [headerRow, ...rawRows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Apply number formatting for cells that are numbers
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr]
      if (!cell) continue

      if (typeof cell.v === 'number') {
        // Format with 2 decimal places for financial data
        cell.t = 'n'
        cell.z = '#,##0.00'
      }

      // Format date strings as Excel dates
      const originalVal = data[R - 1]?.[keys[C]]
      if (isDateString(originalVal)) {
        // Keep as string but with date-like format
        cell.t = 's'
      }
    }
  }

  // Column widths
  if (columnWidths?.length) {
    const cols: XLSX.ColInfo[] = []
    for (const cw of columnWidths) {
      cols[cw.index] = { wch: cw.width }
    }
    ws['!cols'] = cols
  } else {
    ws['!cols'] = autoFitColumns(headerRow, rawRows)
  }

  // Create workbook and append sheet
  const wb = XLSX.utils.book_new()
  // Sanitize sheet name (max 31 chars, no []:*?/\)
  const safeName = sheetName.replace(/[[\]:*?/\\]/g, '').slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, safeName)

  // Write and trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/* ── Multi-sheet export ──────────────────────────────── */

export interface SheetConfig {
  /** Sheet name (max 31 chars, no special chars) */
  name: string
  /** Column headers for the sheet */
  headers: string[]
  /** Data rows – each inner array matches headers order */
  rows: (string | number | null)[][]
}

/**
 * Creates a multi-sheet .xlsx workbook and triggers a browser download.
 * Each entry in `sheets` becomes a separate sheet with auto-width columns
 * and number formatting.
 *
 * Usage:
 * ```ts
 * exportMultiSheetExcel({
 *   sheets: [
 *     { name: 'Deposits', headers: ['Date', 'Amount'], rows: [['2026-01-15', 1500]] },
 *     { name: 'Withdrawals', headers: ['Date', 'Amount'], rows: [['2026-01-16', 800]] },
 *   ],
 *   fileName: 'monthly-report',
 * })
 * ```
 */
export function exportMultiSheetExcel(config: { sheets: SheetConfig[]; fileName: string }): void {
  const { sheets, fileName } = config
  if (!sheets.length) return

  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    // Normalize null → '' and coerce numbers
    const typedRows = sheet.rows.map((row) =>
      row.map((cell) => {
        if (cell == null) return ''
        if (typeof cell === 'number') return cell
        const num = tryParseNumber(cell)
        return num !== null ? num : cell
      }),
    )

    const wsData: (string | number)[][] = [sheet.headers, ...typedRows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Number formatting
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = ws[addr]
        if (!cell) continue
        if (typeof cell.v === 'number') {
          cell.t = 'n'
          cell.z = '#,##0.00'
        }
      }
    }

    // Auto-fit column widths
    ws['!cols'] = autoFitColumns(
      sheet.headers,
      typedRows.map((r) => r as unknown[]),
    )

    // Sanitize sheet name (max 31 chars, no []:*?/\)
    const safeName = sheet.name.replace(/[[\]:*?/\\]/g, '').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, safeName)
  }

  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

/* ── Convenience: download from pre-built rows ────────── */

/**
 * Simplified export that takes headers + row arrays directly.
 * Useful when you already have the data in tabular form (like CSV exporters).
 */
export function exportToExcelFromRows({
  headers,
  rows,
  sheetName = 'Sheet1',
  filename,
  columnWidths,
}: {
  headers: string[]
  rows: (string | number)[][]
  sheetName?: string
  filename: string
  columnWidths?: ColumnWidth[]
}): void {
  if (!rows.length && !headers.length) return

  // Build raw rows with type coercion
  const typedRows = rows.map((row) =>
    row.map((cell) => {
      if (typeof cell === 'number') return cell
      const num = tryParseNumber(cell)
      return num !== null ? num : cell
    }),
  )

  const wsData: (string | number)[][] = [headers, ...typedRows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Number formatting
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr]
      if (!cell) continue
      if (typeof cell.v === 'number') {
        cell.t = 'n'
        cell.z = '#,##0.00'
      }
    }
  }

  // Column widths
  if (columnWidths?.length) {
    const cols: XLSX.ColInfo[] = []
    for (const cw of columnWidths) {
      cols[cw.index] = { wch: cw.width }
    }
    ws['!cols'] = cols
  } else {
    ws['!cols'] = autoFitColumns(
      headers,
      typedRows.map((r) => r as unknown[]),
    )
  }

  const wb = XLSX.utils.book_new()
  const safeName = sheetName.replace(/[[\]:*?/\\]/g, '').slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, safeName)

  XLSX.writeFile(wb, `${filename}.xlsx`)
}
