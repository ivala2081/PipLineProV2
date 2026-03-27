import { parseTurkishDecimal, parseTurkishDate } from '@/lib/csvImport/parseCsv'
import type {
  KasaRow,
  OrderSatisRow,
  OrdRetDepositRow,
  OrdWithdrawalRow,
  CsvDiscrepancy,
  CsvFieldNote,
  CsvSource,
  SystemTransfer,
  SystemDiscrepancy,
  FieldDiff,
  EmployeeAssignment,
} from './types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Normalize meta ID — trim, remove Excel decimal suffix, strip leading zeros */
function normalizeMeta(raw: string): string {
  let s = raw.trim()
  // Excel sometimes exports integer IDs as "12345.0" or "12345.00"
  s = s.replace(/\.0+$/, '')
  // Strip leading zeros: "0012345" → "12345"
  if (/^\d+$/.test(s)) s = s.replace(/^0+/, '') || '0'
  return s
}

/**
 * Normalize date to ISO YYYY-MM-DD.
 * Handles: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD, M/D/YYYY
 */
function normalizeDate(raw: string): string {
  const s = raw.trim()

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)

  // DD.MM.YYYY (Turkish)
  const dotParts = s.split('.')
  if (dotParts.length === 3 && dotParts[2]?.length === 4) {
    return `${dotParts[2]}-${dotParts[1].padStart(2, '0')}-${dotParts[0].padStart(2, '0')}`
  }

  // DD/MM/YYYY or M/D/YYYY
  const slashParts = s.split('/')
  if (slashParts.length === 3 && slashParts[2]?.length === 4) {
    return `${slashParts[2]}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`
  }

  // Fallback: try parseTurkishDate
  return parseTurkishDate(s) || s
}

/** Build a matching key from meta + date */
function buildKey(meta: string, date: string): string {
  return `${normalizeMeta(meta)}|${normalizeDate(date)}`
}

/** Normalize KASA payment method to a standard ID */
function normalizePaymentMethod(raw: string): string {
  const pm = raw.toLowerCase().trim()
  if (pm === 'banka' || pm === 'bank' || pm === 'iban' || pm === 'havale') return 'havale'
  if (pm === 'tether' || pm === 'usdt') return 'tether'
  if (pm === 'kredi kartı' || pm === 'credit card' || pm === 'credit-card') return 'kredi kartı'
  return pm
}

/** Check if KASA payment methods are consistent with CSV payment type */
function comparePaymentMethods(kasaRows: KasaRow[], csvPaymentType: string): CsvFieldNote | null {
  const kasaMethods = [...new Set(kasaRows.map((r) => normalizePaymentMethod(r.paymentMethodName)))]
  const csvPm = csvPaymentType.toLowerCase().trim()

  // CSV "tether/havale" means mixed — both are OK
  if (!csvPm) return null
  const csvParts = csvPm.split('/').map((s) => s.trim())

  const mismatched = kasaMethods.filter((km) => !csvParts.some((cp) => cp === km || cp.includes(km) || km.includes(cp)))
  if (mismatched.length === 0) return null

  return {
    field: 'Ödeme Şekli',
    kasaValue: kasaMethods.join(', '),
    csvValue: csvPm,
  }
}

/** Check if two ISO dates are within dayRange of each other */
function datesWithinRange(isoA: string, isoB: string, dayRange: number): boolean {
  const a = new Date(isoA + 'T00:00:00')
  const b = new Date(isoB + 'T00:00:00')
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return false
  return Math.abs(a.getTime() - b.getTime()) <= dayRange * 86400000
}

/** Check if KASA category is deposit (not withdrawal) — blacklist approach */
function isKasaDeposit(row: KasaRow): boolean {
  const cat = row.categoryName.toUpperCase().trim()
  // Blacklist: known withdrawal categories
  if (cat.includes('ÇEK') || cat.includes('CEK') || cat.includes('WD') || cat.includes('WITHDRAW')) return false
  // Everything else (YATIRIM, DEP, DEPOSIT, or any other) is treated as deposit
  return true
}

/** Check if KASA type is client — blacklist approach (exclude known non-client types) */
function isKasaClient(row: KasaRow): boolean {
  const type = row.typeName.toUpperCase().trim()
  // Blacklist: known non-client types
  if (type.includes('ÖDEME') || type.includes('ODEME') || type.includes('BLOKE') || type.includes('PAYMENT')) return false
  // Everything else is treated as client (MÜŞTERİ, MUSTERI, CLIENT, empty, or any variant)
  return true
}

function getKasaAmountUsd(row: KasaRow): number {
  const currency = row.currency.toUpperCase().trim()
  if (currency === 'USD' || currency === 'USDT') {
    return Math.abs(parseTurkishDecimal(row.amountRaw))
  }
  return 0
}

function getKasaAmountTl(row: KasaRow): number {
  const currency = row.currency.toUpperCase().trim()
  if (currency === 'TL' || currency === 'TRY') {
    return Math.abs(parseTurkishDecimal(row.amountRaw))
  }
  return 0
}

function getKasaDisplayAmount(row: KasaRow): number {
  return getKasaAmountUsd(row) || getKasaAmountTl(row)
}

/* ------------------------------------------------------------------ */
/*  CSV-to-CSV Comparison                                              */
/* ------------------------------------------------------------------ */

export interface CsvCompareResult {
  source: CsvSource
  matched: number
  missingInCsv: CsvDiscrepancy[]
  missingInKasa: CsvDiscrepancy[]
  amountMismatch: CsvDiscrepancy[]
}

/**
 * Build a map of KASA rows keyed by metaId|isoDate for fast lookup.
 * Only includes MÜŞTERİ (client) type rows.
 * depositOnly = true → only YATIRIM, false → only ÇEKİM
 */
function buildKasaMap(kasaRows: KasaRow[], depositOnly: boolean) {
  const map = new Map<string, KasaRow[]>()
  for (const row of kasaRows) {
    if (!isKasaClient(row)) continue
    if (depositOnly !== isKasaDeposit(row)) continue

    const key = buildKey(row.metaId, row.dateRaw)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(row)
  }
  return map
}

/** Check if KASA group SUM matches CSV totals (either TL or USD match is sufficient) */
function groupAmountsMatch(
  candidates: KasaRow[],
  csvTl: number,
  csvUsd: number,
): boolean {
  const kasaTlTotal = candidates.reduce((sum, r) => sum + getKasaAmountTl(r), 0)
  const kasaUsdTotal = candidates.reduce((sum, r) => sum + getKasaAmountUsd(r), 0)
  const tlMatch = kasaTlTotal > 0 && csvTl > 0 && Math.abs(kasaTlTotal - csvTl) < 2
  const usdMatch = kasaUsdTotal > 0 && csvUsd > 0 && Math.abs(kasaUsdTotal - csvUsd) < 2
  // Either currency match is sufficient — handles mixed-currency deposits
  // (e.g. KASA has both TL + USDT rows for same customer on same day)
  if (tlMatch || usdMatch) return true

  // Cross-currency fallback: KASA has one currency, CSV has the other filled.
  // Compare raw KASA total against whichever CSV amount is non-zero.
  const kasaTotal = kasaTlTotal + kasaUsdTotal // only one will be >0
  const csvTotal = csvTl || csvUsd
  if (kasaTotal > 0 && csvTotal > 0 && Math.abs(kasaTotal - csvTotal) < 2) return true

  return false
}

/**
 * SUM-based group matching: sales CSV rows vs KASA groups.
 *
 * KASA may have multiple rows per meta+date (separate transactions for same customer on same day).
 * Sales CSVs show the TOTAL per customer per day in a single row.
 *
 * Matching priority:
 * 1. Exact meta+date match with amount SUM match
 * 2. meta-only match with ±5 day date tolerance (flagged as date-mismatch)
 * 3. No match → missing in KASA
 *
 * Each result includes employee name, manager, and field-level notes.
 */
function matchSalesCsvToKasa<T>(
  salesRows: T[],
  kasaMap: Map<string, KasaRow[]>,
  csvSource: CsvSource,
  getMeta: (row: T) => string,
  getDate: (row: T) => string,
  getTutarTl: (row: T) => number,
  getTutarUsd: (row: T) => number,
  getEmployee: (row: T) => string,
  getManager: (row: T) => string,
  getPaymentType: (row: T) => string,
  getName: (row: T) => string,
): { matched: Set<string>; result: CsvCompareResult } {
  let matchedCount = 0
  const missingInKasa: CsvDiscrepancy[] = []
  const amountMismatch: CsvDiscrepancy[] = []
  const matchedKasaKeys = new Set<string>() // "metaId|date|rowIndex" keys

  // --- Step 1: Group CSV rows by the same key (meta+date) ---
  // Multiple CSV rows can exist for the same customer on the same date.
  // We must compare GROUP SUM vs GROUP SUM, not individual rows.
  interface CsvGroup {
    key: string
    rows: T[]
    totalTl: number
    totalUsd: number
  }
  const csvGroups = new Map<string, CsvGroup>()
  for (const csvRow of salesRows) {
    const meta = getMeta(csvRow)
    const date = getDate(csvRow)
    const key = buildKey(meta, date)
    if (!csvGroups.has(key)) {
      csvGroups.set(key, { key, rows: [], totalTl: 0, totalUsd: 0 })
    }
    const group = csvGroups.get(key)!
    group.rows.push(csvRow)
    group.totalTl += Math.abs(getTutarTl(csvRow))
    group.totalUsd += Math.abs(getTutarUsd(csvRow))
  }

  // Build meta-only index for date-tolerant fallback
  const kasaByMeta = new Map<string, Array<{ mapKey: string; rows: KasaRow[] }>>()
  for (const [mapKey, rows] of kasaMap) {
    const meta = mapKey.split('|')[0]
    if (!kasaByMeta.has(meta)) kasaByMeta.set(meta, [])
    kasaByMeta.get(meta)!.push({ mapKey, rows })
  }

  // Build name-based KASA index for fallback when META ID is empty
  const kasaByName = new Map<string, Array<{ mapKey: string; rows: KasaRow[] }>>()
  for (const [mapKey, rows] of kasaMap) {
    for (const r of rows) {
      const name = r.fullName.toUpperCase().trim()
      if (!name) continue
      if (!kasaByName.has(name)) kasaByName.set(name, [])
      // Avoid duplicates — check if mapKey already added
      const existing = kasaByName.get(name)!
      if (!existing.some((e) => e.mapKey === mapKey)) {
        existing.push({ mapKey, rows })
      }
    }
  }

  // --- Step 2: Match each CSV group against KASA ---
  for (const [key, csvGroup] of csvGroups) {
    const { rows: csvRows, totalTl: csvTl, totalUsd: csvUsd } = csvGroup
    const firstRow = csvRows[0]
    const employee = getEmployee(firstRow)
    const manager = getManager(firstRow)
    const paymentType = csvRows.map((r) => getPaymentType(r)).filter(Boolean).join('/')

    // --- 2a. Exact meta+date match ---
    const allKasaRows = kasaMap.get(key) ?? []
    const candidates = allKasaRows.filter(
      (r) => !matchedKasaKeys.has(`${key}|${r.rowIndex}`),
    )

    if (candidates.length > 0) {
      if (groupAmountsMatch(candidates, csvTl, csvUsd)) {
        const fieldNotes: CsvFieldNote[] = []
        const pmNote = comparePaymentMethods(candidates, paymentType)
        if (pmNote) fieldNotes.push(pmNote)

        matchedCount += csvRows.length
        for (const r of candidates) {
          matchedKasaKeys.add(`${key}|${r.rowIndex}`)
        }
        continue
      }

      // --- 2a-bis. Before reporting amount mismatch, try combining nearby dates (±1 day) ---
      // A single CSV row may represent the sum of multiple KASA rows on slightly different dates
      const metaForCombine = normalizeMeta(getMeta(firstRow))
      const dateForCombine = normalizeDate(getDate(firstRow))
      const metaEntriesForCombine = kasaByMeta.get(metaForCombine) ?? []

      const combinedCandidates: Array<{ mapKey: string; row: KasaRow }> = []
      for (const entry of metaEntriesForCombine) {
        const entryDate = entry.mapKey.split('|')[1]
        if (!datesWithinRange(dateForCombine, entryDate, 1)) continue
        for (const r of entry.rows) {
          if (!matchedKasaKeys.has(`${entry.mapKey}|${r.rowIndex}`)) {
            combinedCandidates.push({ mapKey: entry.mapKey, row: r })
          }
        }
      }

      const combinedRows = combinedCandidates.map((c) => c.row)
      if (combinedRows.length > candidates.length && groupAmountsMatch(combinedRows, csvTl, csvUsd)) {
        // Combined nearby-date rows match the CSV total — consume all
        const combinedDates = [...new Set(combinedCandidates.map((c) => c.mapKey.split('|')[1]))]
        const fieldNotes: CsvFieldNote[] = [
          { field: 'Tarih', kasaValue: combinedDates.join(', '), csvValue: dateForCombine },
        ]
        const pmNote = comparePaymentMethods(combinedRows, paymentType)
        if (pmNote) fieldNotes.push(pmNote)

        amountMismatch.push({
          type: 'date-mismatch',
          csvSource,
          kasaRow: combinedRows[0],
          csvRow: firstRow as never,
          kasaAmount: combinedRows.reduce((s, r) => s + getKasaAmountTl(r), 0) ||
            combinedRows.reduce((s, r) => s + getKasaAmountUsd(r), 0),
          csvAmount: csvTl || csvUsd,
          employeeName: employee,
          managerName: manager,
          fieldNotes,
        })
        for (const c of combinedCandidates) {
          matchedKasaKeys.add(`${c.mapKey}|${c.row.rowIndex}`)
        }
        continue
      }

      // Amount mismatch — no nearby-date combination helps
      const kasaTlTotal = candidates.reduce((sum, r) => sum + getKasaAmountTl(r), 0)
      const kasaUsdTotal = candidates.reduce((sum, r) => sum + getKasaAmountUsd(r), 0)
      const fieldNotes2: CsvFieldNote[] = []
      const pmNote2 = comparePaymentMethods(candidates, paymentType)
      if (pmNote2) fieldNotes2.push(pmNote2)

      amountMismatch.push({
        type: 'amount-mismatch',
        csvSource,
        kasaRow: candidates[0],
        csvRow: firstRow as never,
        kasaAmount: kasaTlTotal || kasaUsdTotal,
        csvAmount: csvTl || csvUsd,
        employeeName: employee,
        managerName: manager,
        fieldNotes: fieldNotes2.length > 0 ? fieldNotes2 : undefined,
      })
      for (const r of candidates) {
        matchedKasaKeys.add(`${key}|${r.rowIndex}`)
      }
      continue
    }

    // --- 2b. Date-tolerant fallback: same meta, nearby date (±1 day) ---
    const normalizedMeta = normalizeMeta(getMeta(firstRow))
    const csvIsoDate = normalizeDate(getDate(firstRow))
    const metaEntries = kasaByMeta.get(normalizedMeta) ?? []
    let nearbyMatch = false

    // First try individual date entries
    for (const entry of metaEntries) {
      const entryDate = entry.mapKey.split('|')[1]
      if (!datesWithinRange(csvIsoDate, entryDate, 1)) continue

      const nearCandidates = entry.rows.filter(
        (r) => !matchedKasaKeys.has(`${entry.mapKey}|${r.rowIndex}`),
      )
      if (nearCandidates.length === 0) continue

      if (groupAmountsMatch(nearCandidates, csvTl, csvUsd)) {
        const fieldNotes: CsvFieldNote[] = [
          { field: 'Tarih', kasaValue: entryDate, csvValue: csvIsoDate },
        ]
        const pmNote = comparePaymentMethods(nearCandidates, paymentType)
        if (pmNote) fieldNotes.push(pmNote)

        amountMismatch.push({
          type: 'date-mismatch',
          csvSource,
          kasaRow: nearCandidates[0],
          csvRow: firstRow as never,
          kasaAmount: nearCandidates.reduce((s, r) => s + getKasaAmountTl(r), 0) ||
            nearCandidates.reduce((s, r) => s + getKasaAmountUsd(r), 0),
          csvAmount: csvTl || csvUsd,
          employeeName: employee,
          managerName: manager,
          fieldNotes,
        })
        for (const r of nearCandidates) {
          matchedKasaKeys.add(`${entry.mapKey}|${r.rowIndex}`)
        }
        nearbyMatch = true
        break
      }
    }

    // Then try combining all nearby-date entries for the same meta
    if (!nearbyMatch) {
      const allNearby: Array<{ mapKey: string; row: KasaRow }> = []
      for (const entry of metaEntries) {
        const entryDate = entry.mapKey.split('|')[1]
        if (!datesWithinRange(csvIsoDate, entryDate, 1)) continue
        for (const r of entry.rows) {
          if (!matchedKasaKeys.has(`${entry.mapKey}|${r.rowIndex}`)) {
            allNearby.push({ mapKey: entry.mapKey, row: r })
          }
        }
      }

      const nearbyRows = allNearby.map((c) => c.row)
      if (nearbyRows.length > 1 && groupAmountsMatch(nearbyRows, csvTl, csvUsd)) {
        const nearbyDates = [...new Set(allNearby.map((c) => c.mapKey.split('|')[1]))]
        const fieldNotes: CsvFieldNote[] = [
          { field: 'Tarih', kasaValue: nearbyDates.join(', '), csvValue: csvIsoDate },
        ]
        const pmNote = comparePaymentMethods(nearbyRows, paymentType)
        if (pmNote) fieldNotes.push(pmNote)

        amountMismatch.push({
          type: 'date-mismatch',
          csvSource,
          kasaRow: nearbyRows[0],
          csvRow: firstRow as never,
          kasaAmount: nearbyRows.reduce((s, r) => s + getKasaAmountTl(r), 0) ||
            nearbyRows.reduce((s, r) => s + getKasaAmountUsd(r), 0),
          csvAmount: csvTl || csvUsd,
          employeeName: employee,
          managerName: manager,
          fieldNotes,
        })
        for (const c of allNearby) {
          matchedKasaKeys.add(`${c.mapKey}|${c.row.rowIndex}`)
        }
        nearbyMatch = true
      }
    }

    if (nearbyMatch) continue

    // --- 2c. Name-based fallback: META ID might be empty in KASA ---
    const csvName = getName(firstRow).toUpperCase().trim()
    if (csvName && normalizedMeta) {
      const nameEntries = kasaByName.get(csvName) ?? []
      for (const entry of nameEntries) {
        const entryDate = entry.mapKey.split('|')[1]
        if (!datesWithinRange(csvIsoDate, entryDate, 1)) continue

        const nameCandidates = entry.rows.filter(
          (r) => !matchedKasaKeys.has(`${entry.mapKey}|${r.rowIndex}`),
        )
        if (nameCandidates.length === 0) continue

        if (groupAmountsMatch(nameCandidates, csvTl, csvUsd)) {
          const fieldNotes: CsvFieldNote[] = [
            { field: 'META ID', kasaValue: nameCandidates[0].metaId || '(boş)', csvValue: normalizedMeta },
          ]
          if (entryDate !== csvIsoDate) {
            fieldNotes.push({ field: 'Tarih', kasaValue: entryDate, csvValue: csvIsoDate })
          }

          amountMismatch.push({
            type: 'date-mismatch',
            csvSource,
            kasaRow: nameCandidates[0],
            csvRow: firstRow as never,
            kasaAmount: nameCandidates.reduce((s, r) => s + getKasaAmountTl(r), 0) ||
              nameCandidates.reduce((s, r) => s + getKasaAmountUsd(r), 0),
            csvAmount: csvTl || csvUsd,
            employeeName: employee,
            managerName: manager,
            fieldNotes,
          })
          for (const r of nameCandidates) {
            matchedKasaKeys.add(`${entry.mapKey}|${r.rowIndex}`)
          }
          nearbyMatch = true
          break
        }
      }
    }

    if (!nearbyMatch) {
      missingInKasa.push({
        type: 'missing-in-kasa',
        csvSource,
        csvRow: firstRow as never,
        csvAmount: csvUsd || csvTl,
        employeeName: employee,
        managerName: manager,
      })
    }
  }

  // Find unmatched KASA rows
  const missingInCsv: CsvDiscrepancy[] = []
  for (const [key, rows] of kasaMap) {
    for (const kasaRow of rows) {
      if (!matchedKasaKeys.has(`${key}|${kasaRow.rowIndex}`)) {
        missingInCsv.push({
          type: 'missing-in-csv',
          csvSource,
          kasaRow,
          kasaAmount: getKasaDisplayAmount(kasaRow),
        })
      }
    }
  }

  return {
    matched: matchedKasaKeys,
    result: {
      source: csvSource,
      matched: matchedCount,
      missingInCsv,
      missingInKasa,
      amountMismatch,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Reverse matching: KASA → CSV for unmatched deposits                */
/* ------------------------------------------------------------------ */

/**
 * For each unmatched KASA deposit, try to find a matching sales CSV row
 * by meta+date tolerance or name+date tolerance (±1 day, amount must match).
 * If found, upgrade from 'missing-in-csv' to 'date-mismatch' with CSV enrichment.
 */
function reverseMatchUnmatchedDeposits(
  unmatchedDeposits: CsvDiscrepancy[],
  orderSatisRows: OrderSatisRow[],
  ordRetRows: OrdRetDepositRow[],
  period: { year: number; month: number },
): CsvDiscrepancy[] {
  interface SalesCsvEntry {
    meta: string
    isoDate: string
    tutarTl: number
    tutarUsd: number
    employeeName: string
    managerName: string
    paymentType: string
    customerName: string
    csvSource: CsvSource
    csvRow: OrderSatisRow | OrdRetDepositRow
  }

  const salesByMeta = new Map<string, SalesCsvEntry[]>()
  const salesByName = new Map<string, SalesCsvEntry[]>()

  function addEntry(entry: SalesCsvEntry) {
    const meta = normalizeMeta(entry.meta)
    if (meta) {
      if (!salesByMeta.has(meta)) salesByMeta.set(meta, [])
      salesByMeta.get(meta)!.push(entry)
    }
    const name = entry.customerName.toUpperCase().trim()
    if (name) {
      if (!salesByName.has(name)) salesByName.set(name, [])
      salesByName.get(name)!.push(entry)
    }
  }

  for (const r of orderSatisRows) {
    addEntry({
      meta: r.meta,
      isoDate: normalizeDate(r.tarih),
      tutarTl: Math.abs(r.tutarTl),
      tutarUsd: Math.abs(r.tutarUsd),
      employeeName: r.mt,
      managerName: r.ekipLideri,
      paymentType: r.odemeTuru,
      customerName: r.musteriAdSoyad,
      csvSource: 'order-satis',
      csvRow: r,
    })
  }

  for (const r of ordRetRows) {
    addEntry({
      meta: r.metaId,
      isoDate: normalizeDate(r.tarih),
      tutarTl: Math.abs(r.tutarTl),
      tutarUsd: Math.abs(r.tutarUsd),
      employeeName: r.ret,
      managerName: r.ekipLideri,
      paymentType: r.odemeTuru,
      customerName: r.musteriAdSoyad,
      csvSource: 'ord-ret-deposit',
      csvRow: r,
    })
  }

  // Period bounds — date tolerance must not cross month boundary
  const periodStart = `${period.year}-${String(period.month).padStart(2, '0')}-01`
  const lastDay = new Date(period.year, period.month, 0).getDate()
  const periodEnd = `${period.year}-${String(period.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  function isWithinPeriod(isoDate: string): boolean {
    return isoDate >= periodStart && isoDate <= periodEnd
  }

  const usedCsvRowIndices = new Set<number>()

  function amountMatches(kasaTl: number, kasaUsd: number, entry: SalesCsvEntry): boolean {
    // Same-currency match
    if (kasaTl > 0 && entry.tutarTl > 0 && Math.abs(kasaTl - entry.tutarTl) < 2) return true
    if (kasaUsd > 0 && entry.tutarUsd > 0 && Math.abs(kasaUsd - entry.tutarUsd) < 2) return true
    // Cross-currency fallback
    const kasaTotal = kasaTl + kasaUsd
    const csvTotal = entry.tutarTl || entry.tutarUsd
    if (kasaTotal > 0 && csvTotal > 0 && Math.abs(kasaTotal - csvTotal) < 2) return true
    return false
  }

  return unmatchedDeposits.map((disc) => {
    const kasaRow = disc.kasaRow
    if (!kasaRow) return disc

    const kasaMeta = normalizeMeta(kasaRow.metaId)
    const kasaIsoDate = normalizeDate(kasaRow.dateRaw)
    const kasaTl = getKasaAmountTl(kasaRow)
    const kasaUsd = getKasaAmountUsd(kasaRow)
    const kasaAmount = kasaTl || kasaUsd

    // --- Try 1: Meta-based match with ±1 day tolerance ---
    if (kasaMeta) {
      const entries = salesByMeta.get(kasaMeta) ?? []
      for (const entry of entries) {
        if (usedCsvRowIndices.has(entry.csvRow.rowIndex)) continue
        if (!datesWithinRange(kasaIsoDate, entry.isoDate, 1)) continue
        if (!isWithinPeriod(entry.isoDate)) continue
        if (!amountMatches(kasaTl, kasaUsd, entry)) continue

        usedCsvRowIndices.add(entry.csvRow.rowIndex)
        const fieldNotes: CsvFieldNote[] = []
        if (kasaIsoDate !== entry.isoDate) {
          fieldNotes.push({ field: 'Tarih', kasaValue: kasaIsoDate, csvValue: entry.isoDate })
        }
        const pmNote = comparePaymentMethods([kasaRow], entry.paymentType)
        if (pmNote) fieldNotes.push(pmNote)

        return {
          type: 'date-mismatch' as const,
          csvSource: entry.csvSource,
          kasaRow,
          csvRow: entry.csvRow as never,
          kasaAmount,
          csvAmount: entry.tutarTl || entry.tutarUsd,
          employeeName: entry.employeeName,
          managerName: entry.managerName,
          fieldNotes: fieldNotes.length > 0 ? fieldNotes : undefined,
        }
      }
    }

    // --- Try 2: Name-based match with ±1 day tolerance ---
    const kasaName = kasaRow.fullName.toUpperCase().trim()
    if (kasaName) {
      const entries = salesByName.get(kasaName) ?? []
      for (const entry of entries) {
        if (usedCsvRowIndices.has(entry.csvRow.rowIndex)) continue
        if (!datesWithinRange(kasaIsoDate, entry.isoDate, 1)) continue
        if (!isWithinPeriod(entry.isoDate)) continue
        if (!amountMatches(kasaTl, kasaUsd, entry)) continue

        usedCsvRowIndices.add(entry.csvRow.rowIndex)
        const fieldNotes: CsvFieldNote[] = [
          { field: 'META ID', kasaValue: kasaMeta || '(boş)', csvValue: normalizeMeta(entry.meta) },
        ]
        if (kasaIsoDate !== entry.isoDate) {
          fieldNotes.push({ field: 'Tarih', kasaValue: kasaIsoDate, csvValue: entry.isoDate })
        }
        const pmNote = comparePaymentMethods([kasaRow], entry.paymentType)
        if (pmNote) fieldNotes.push(pmNote)

        return {
          type: 'date-mismatch' as const,
          csvSource: entry.csvSource,
          kasaRow,
          csvRow: entry.csvRow as never,
          kasaAmount,
          csvAmount: entry.tutarTl || entry.tutarUsd,
          employeeName: entry.employeeName,
          managerName: entry.managerName,
          fieldNotes: fieldNotes.length > 0 ? fieldNotes : undefined,
        }
      }
    }

    // No reverse match found — keep as missing-in-csv
    return disc
  })
}

/* ------------------------------------------------------------------ */
/*  Run all CSV comparisons                                            */
/* ------------------------------------------------------------------ */

export interface AllCsvCompareResults {
  orderSatis: CsvCompareResult
  ordRetDeposit: CsvCompareResult
  ordWithdrawal: CsvCompareResult
  /** KASA MÜŞTERİ deposit rows not matched by either ORDER SATIS or RET DEPOSIT */
  unmatchedKasaDeposits: CsvDiscrepancy[]
  /** Summary counts */
  kasaClientDeposits: number
  kasaClientWithdrawals: number
  kasaNonClient: number
}

export function runAllCsvComparisons(
  kasaRows: KasaRow[],
  orderSatisRows: OrderSatisRow[],
  ordRetRows: OrdRetDepositRow[],
  ordWdRows: OrdWithdrawalRow[],
  period: { year: number; month: number },
): AllCsvCompareResults {
  // Count KASA breakdown
  const kasaClientDeposits = kasaRows.filter((r) => isKasaClient(r) && isKasaDeposit(r)).length
  const kasaClientWithdrawals = kasaRows.filter((r) => isKasaClient(r) && !isKasaDeposit(r)).length
  const kasaNonClient = kasaRows.filter((r) => !isKasaClient(r)).length

  // Build KASA deposit map for both ORDER SATIS and RET DEPOSIT
  const kasaDepositMap = buildKasaMap(kasaRows, true)

  // Step 1: Match ORDER SATIS → KASA deposits
  const orderSatisMatch = matchSalesCsvToKasa(
    orderSatisRows,
    kasaDepositMap,
    'order-satis',
    (r) => r.meta,
    (r) => r.tarih,
    (r) => r.tutarTl,
    (r) => r.tutarUsd,
    (r) => r.mt,
    (r) => r.ekipLideri,
    (r) => r.odemeTuru,
    (r) => r.musteriAdSoyad,
  )

  // Step 2: Build remaining KASA deposit map (exclude already matched by ORDER SATIS)
  const remainingKasaDepositMap = new Map<string, KasaRow[]>()
  for (const [key, rows] of kasaDepositMap) {
    const remaining = rows.filter(
      (r) => !orderSatisMatch.matched.has(`${key}|${r.rowIndex}`),
    )
    if (remaining.length > 0) remainingKasaDepositMap.set(key, remaining)
  }

  // Step 3: Match RET DEPOSIT → remaining KASA deposits
  const ordRetMatch = matchSalesCsvToKasa(
    ordRetRows,
    remainingKasaDepositMap,
    'ord-ret-deposit',
    (r) => r.metaId,
    (r) => r.tarih,
    (r) => r.tutarTl,
    (r) => r.tutarUsd,
    (r) => r.ret,
    (r) => r.ekipLideri,
    (r) => r.odemeTuru,
    (r) => r.musteriAdSoyad,
  )

  // Step 4: Match WITHDRAWAL → KASA withdrawals
  const kasaWithdrawalMap = buildKasaMap(kasaRows, false)
  const ordWdMatch = matchSalesCsvToKasa(
    ordWdRows,
    kasaWithdrawalMap,
    'ord-withdrawal',
    (r) => r.metaId,
    (r) => r.tarih,
    (r) => r.tutarTl,
    (r) => r.tutarUsd,
    (r) => r.ret,
    (r) => r.ekipLideri,
    (r) => r.odemeTuru,
    (r) => r.musteriAdSoyad,
  )

  // Step 5: Find KASA deposits not matched by EITHER ORDER SATIS or RET DEPOSIT
  const allMatchedDepositKeys = new Set([
    ...orderSatisMatch.matched,
    ...ordRetMatch.matched,
  ])
  const unmatchedKasaDeposits: CsvDiscrepancy[] = []
  for (const [key, rows] of kasaDepositMap) {
    for (const kasaRow of rows) {
      if (!allMatchedDepositKeys.has(`${key}|${kasaRow.rowIndex}`)) {
        unmatchedKasaDeposits.push({
          type: 'missing-in-csv',
          csvSource: 'order-satis', // could be either
          kasaRow,
          kasaAmount: getKasaDisplayAmount(kasaRow),
        })
      }
    }
  }

  // Step 6: Reverse match — try to find CSV matches for remaining unmatched KASA deposits
  const resolvedKasaDeposits = reverseMatchUnmatchedDeposits(
    unmatchedKasaDeposits,
    orderSatisRows,
    ordRetRows,
    period,
  )

  // Clean up ORDER SATIS missingInCsv — remove items that were matched by RET DEPOSIT
  const orderSatisResult: CsvCompareResult = {
    ...orderSatisMatch.result,
    // Don't report "missing in CSV" for ORDER SATIS — they might be in RET DEPOSIT
    missingInCsv: [],
  }

  const ordRetResult: CsvCompareResult = {
    ...ordRetMatch.result,
    // Don't report "missing in CSV" for RET DEPOSIT — they might be in ORDER SATIS
    missingInCsv: [],
  }

  return {
    orderSatis: orderSatisResult,
    ordRetDeposit: ordRetResult,
    ordWithdrawal: ordWdMatch.result,
    unmatchedKasaDeposits: resolvedKasaDeposits,
    kasaClientDeposits,
    kasaClientWithdrawals,
    kasaNonClient,
  }
}

/* ------------------------------------------------------------------ */
/*  KASA-to-System Comparison                                          */
/* ------------------------------------------------------------------ */

/**
 * Build a lookup from KASA key (meta|date) → CSV enrichment info.
 * Used by system comparison to show employee/manager from sales CSVs.
 */
export interface CsvEnrichment {
  employeeName: string
  managerName: string
  csvSource: CsvSource
  paymentType: string
}

export function buildCsvEnrichmentMap(
  orderSatisRows: OrderSatisRow[],
  ordRetRows: OrdRetDepositRow[],
  ordWdRows: OrdWithdrawalRow[],
): Map<string, CsvEnrichment> {
  const map = new Map<string, CsvEnrichment>()

  for (const r of orderSatisRows) {
    const key = buildKey(r.meta, r.tarih)
    if (!map.has(key)) {
      map.set(key, {
        employeeName: r.mt,
        managerName: r.ekipLideri,
        csvSource: 'order-satis',
        paymentType: r.odemeTuru,
      })
    }
  }
  for (const r of ordRetRows) {
    const key = buildKey(r.metaId, r.tarih)
    if (!map.has(key)) {
      map.set(key, {
        employeeName: r.ret,
        managerName: r.ekipLideri,
        csvSource: 'ord-ret-deposit',
        paymentType: r.odemeTuru,
      })
    }
  }
  for (const r of ordWdRows) {
    const key = buildKey(r.metaId, r.tarih)
    if (!map.has(key)) {
      map.set(key, {
        employeeName: r.ret,
        managerName: r.ekipLideri,
        csvSource: 'ord-withdrawal',
        paymentType: r.odemeTuru,
      })
    }
  }

  return map
}

export function compareKasaToSystem(
  kasaRows: KasaRow[],
  systemTransfers: SystemTransfer[],
  csvEnrichment?: Map<string, CsvEnrichment>,
): SystemDiscrepancy[] {
  const discrepancies: SystemDiscrepancy[] = []

  // Helper to enrich a discrepancy with CSV info
  function enrich(kasaRow: KasaRow): Partial<SystemDiscrepancy> {
    if (!csvEnrichment) return {}
    const key = buildKey(kasaRow.metaId, kasaRow.dateRaw)
    const info = csvEnrichment.get(key)
    if (!info) return {}
    return {
      employeeName: info.employeeName,
      managerName: info.managerName,
      csvSource: info.csvSource,
      paymentType: info.paymentType,
    }
  }

  // Build system map: meta_id|date → transfers
  const systemMap = new Map<string, SystemTransfer[]>()
  for (const t of systemTransfers) {
    const key = buildKey(t.meta_id || '', t.transfer_date)
    if (!systemMap.has(key)) systemMap.set(key, [])
    systemMap.get(key)!.push(t)
  }

  // Build meta-only system index for date-tolerant fallback
  const systemByMeta = new Map<string, Array<{ key: string; transfers: SystemTransfer[] }>>()
  for (const [mapKey, transfers] of systemMap) {
    const meta = mapKey.split('|')[0]
    if (!meta) continue
    if (!systemByMeta.has(meta)) systemByMeta.set(meta, [])
    systemByMeta.get(meta)!.push({ key: mapKey, transfers })
  }

  // Build name-based system index for fallback
  const systemByName = new Map<string, SystemTransfer[]>()
  for (const t of systemTransfers) {
    const name = t.full_name.toUpperCase().trim()
    if (!name) continue
    if (!systemByName.has(name)) systemByName.set(name, [])
    systemByName.get(name)!.push(t)
  }

  const matchedSystemIds = new Set<string>()

  /** Try to find an amount match in a list of system candidates */
  function findAmountMatch(
    kasaAmount: number,
    candidates: SystemTransfer[],
  ): SystemTransfer | null {
    for (const sysRow of candidates) {
      if (matchedSystemIds.has(sysRow.id)) continue
      if (Math.abs(Math.abs(sysRow.amount) - Math.abs(kasaAmount)) < 2) {
        return sysRow
      }
    }
    return null
  }

  for (const kasaRow of kasaRows) {
    // Skip non-client rows (ÖDEME, BLOKE, etc.) — they don't exist in system
    if (!isKasaClient(kasaRow)) continue

    const key = buildKey(kasaRow.metaId, kasaRow.dateRaw)
    const kasaAmount = parseTurkishDecimal(kasaRow.amountRaw)
    const kasaIsoDate = normalizeDate(kasaRow.dateRaw)
    const kasaMeta = normalizeMeta(kasaRow.metaId)

    // --- 1. Exact meta+date match ---
    const exactMatch = findAmountMatch(kasaAmount, systemMap.get(key) ?? [])
    if (exactMatch) {
      const diffs = compareFields(kasaRow, exactMatch)
      matchedSystemIds.add(exactMatch.id)
      if (diffs.length > 0) {
        discrepancies.push({
          type: 'field-mismatch',
          kasaRow,
          systemRow: exactMatch,
          diffs,
          action: 'update',
          currency: kasaRow.currency,
          ...enrich(kasaRow),
        })
      }
      continue
    }

    // --- 2. Date-tolerant fallback: same meta, ±3 days ---
    let found = false
    if (kasaMeta) {
      const metaEntries = systemByMeta.get(kasaMeta) ?? []
      for (const entry of metaEntries) {
        const entryDate = entry.key.split('|')[1]
        if (!datesWithinRange(kasaIsoDate, entryDate, 3)) continue
        const match = findAmountMatch(kasaAmount, entry.transfers)
        if (match) {
          const diffs = compareFields(kasaRow, match)
          diffs.push({ field: 'date', kasaValue: kasaIsoDate, systemValue: entryDate })
          matchedSystemIds.add(match.id)
          discrepancies.push({
            type: 'field-mismatch',
            kasaRow,
            systemRow: match,
            diffs,
            action: 'skip',
            currency: kasaRow.currency,
            ...enrich(kasaRow),
          })
          found = true
          break
        }
      }
    }
    if (found) continue

    // --- 3. Name-based fallback: same name, ±3 days, amount match ---
    const kasaName = kasaRow.fullName.toUpperCase().trim()
    if (kasaName) {
      const nameCandidates = systemByName.get(kasaName) ?? []
      for (const sysRow of nameCandidates) {
        if (matchedSystemIds.has(sysRow.id)) continue
        const sysDate = normalizeDate(sysRow.transfer_date)
        if (!datesWithinRange(kasaIsoDate, sysDate, 3)) continue
        if (Math.abs(Math.abs(sysRow.amount) - Math.abs(kasaAmount)) < 2) {
          const diffs = compareFields(kasaRow, sysRow)
          if (kasaMeta !== normalizeMeta(sysRow.meta_id || '')) {
            diffs.push({ field: 'meta_id', kasaValue: kasaMeta, systemValue: sysRow.meta_id || '(boş)' })
          }
          matchedSystemIds.add(sysRow.id)
          discrepancies.push({
            type: 'field-mismatch',
            kasaRow,
            systemRow: sysRow,
            diffs,
            action: 'skip',
            currency: kasaRow.currency,
            ...enrich(kasaRow),
          })
          found = true
          break
        }
      }
    }
    if (found) continue

    // --- 4. No match → missing in system ---
    discrepancies.push({
      type: 'missing-in-system',
      kasaRow,
      action: 'insert',
      currency: kasaRow.currency,
      ...enrich(kasaRow),
    })
  }

  // Find system transfers not matched by any KASA row
  for (const t of systemTransfers) {
    if (!matchedSystemIds.has(t.id)) {
      discrepancies.push({
        type: 'missing-in-kasa',
        systemRow: t,
        action: 'skip',
        currency: t.currency,
      })
    }
  }

  return discrepancies
}

function compareFields(kasaRow: KasaRow, sysRow: SystemTransfer): FieldDiff[] {
  const diffs: FieldDiff[] = []

  const kasaCat = kasaRow.categoryName.toUpperCase().trim()
  const isKasaWd = kasaCat === 'ÇEKME' || kasaCat === 'CEKME' || kasaCat === 'ÇEKİM' || kasaCat === 'CEKIM' || kasaCat === 'WD' || kasaCat === 'WITHDRAWAL'
  const isKasaDep = !isKasaWd && (kasaCat === 'YATIRIM' || kasaCat === 'DEP' || kasaCat === 'DEPOSIT')
  const sysCat = sysRow.category_id
  if ((isKasaDep && sysCat !== 'dep') || (!isKasaDep && sysCat !== 'wd')) {
    diffs.push({ field: 'category', kasaValue: isKasaDep ? 'dep' : 'wd', systemValue: sysCat || '' })
  }

  const kasaPm = kasaRow.paymentMethodName.toLowerCase().trim()
  const sysPm = sysRow.payment_method_id || ''
  const kasaPmId =
    kasaPm === 'banka' || kasaPm === 'bank' || kasaPm === 'iban' || kasaPm === 'havale'
      ? 'bank'
      : kasaPm === 'tether' || kasaPm === 'usdt'
        ? 'tether'
        : kasaPm === 'kredi kartı' || kasaPm === 'credit card' || kasaPm === 'credit-card' || kasaPm === 'kk'
          ? 'credit-card'
          : kasaPm
  const sysPmNorm = sysPm === 'kk' ? 'credit-card' : sysPm
  if (kasaPmId !== sysPmNorm) {
    diffs.push({ field: 'payment_method', kasaValue: kasaPmId, systemValue: sysPm })
  }

  // Currency equivalences: TL=TRY, USD=USDT
  const currencyEquiv: Record<string, string> = { TL: 'TRY', TRY: 'TRY', USD: 'USDT', USDT: 'USDT' }
  const kasaCurrency = kasaRow.currency.toUpperCase().trim()
  const sysCurrency = sysRow.currency?.toUpperCase() || ''
  const kasaCurrNorm = currencyEquiv[kasaCurrency] || kasaCurrency
  const sysCurrNorm = currencyEquiv[sysCurrency] || sysCurrency
  if (kasaCurrNorm !== sysCurrNorm) {
    diffs.push({ field: 'currency', kasaValue: kasaCurrency, systemValue: sysCurrency })
  }

  const kasaComm = parseTurkishDecimal(kasaRow.commissionRaw)
  if (Math.abs(kasaComm - Math.abs(sysRow.commission)) > 1) {
    diffs.push({ field: 'commission', kasaValue: kasaComm, systemValue: sysRow.commission })
  }

  return diffs
}

/* ------------------------------------------------------------------ */
/*  Employee Assignment — match CSV employees to system transfers      */
/* ------------------------------------------------------------------ */

interface HrEmployeeRef {
  id: string
  full_name: string
}

/**
 * Build employee assignments: for each system transfer, find the matching
 * CSV row and resolve the employee name to an HR employee ID.
 *
 * CSV employee sources:
 * - ORDER SATIS: MT column → marketing employee (first deposits)
 * - ORD RET DEPOSIT: RET column → retention employee
 * - ORD WITHDRAWAL: RET column → retention employee
 */
export function buildEmployeeAssignments(
  systemTransfers: SystemTransfer[],
  orderSatisRows: OrderSatisRow[],
  ordRetRows: OrdRetDepositRow[],
  ordWdRows: OrdWithdrawalRow[],
  hrEmployees: HrEmployeeRef[],
): EmployeeAssignment[] {
  // Build CSV employee lookup: meta|date → { employeeName, managerName, csvSource }
  interface CsvEmpInfo {
    employeeName: string
    managerName: string
    csvSource: CsvSource
  }
  const csvEmpMap = new Map<string, CsvEmpInfo>()

  // Also build a name-only map for fallback (fullName → CsvEmpInfo[])
  const csvEmpByName = new Map<string, CsvEmpInfo[]>()

  function addCsvEntry(meta: string, date: string, name: string, info: CsvEmpInfo) {
    const key = buildKey(meta, date)
    if (!csvEmpMap.has(key)) csvEmpMap.set(key, info)
    const upperName = name.toUpperCase().trim()
    if (upperName) {
      if (!csvEmpByName.has(upperName)) csvEmpByName.set(upperName, [])
      csvEmpByName.get(upperName)!.push(info)
    }
  }

  for (const r of orderSatisRows) {
    if (r.mt.trim()) {
      addCsvEntry(r.meta, r.tarih, r.musteriAdSoyad, {
        employeeName: r.mt,
        managerName: r.ekipLideri,
        csvSource: 'order-satis',
      })
    }
  }
  for (const r of ordRetRows) {
    if (r.ret.trim()) {
      addCsvEntry(r.metaId, r.tarih, r.musteriAdSoyad, {
        employeeName: r.ret,
        managerName: r.ekipLideri,
        csvSource: 'ord-ret-deposit',
      })
    }
  }
  for (const r of ordWdRows) {
    if (r.ret.trim()) {
      addCsvEntry(r.metaId, r.tarih, r.musteriAdSoyad, {
        employeeName: r.ret,
        managerName: r.ekipLideri,
        csvSource: 'ord-withdrawal',
      })
    }
  }

  // Build HR employee name → id lookup (fuzzy: uppercase, trimmed)
  const hrByName = new Map<string, HrEmployeeRef>()
  for (const emp of hrEmployees) {
    hrByName.set(emp.full_name.toUpperCase().trim(), emp)
  }

  // Match system transfers to CSV employees
  const assignments: EmployeeAssignment[] = []

  for (const t of systemTransfers) {
    const key = buildKey(t.meta_id || '', t.transfer_date)
    let info = csvEmpMap.get(key)

    // Fallback: try ±3 day date tolerance with same meta
    if (!info && t.meta_id) {
      const normalizedMeta = normalizeMeta(t.meta_id)
      const tDate = normalizeDate(t.transfer_date)
      for (const [mapKey, mapInfo] of csvEmpMap) {
        const [mapMeta, mapDate] = mapKey.split('|')
        if (mapMeta === normalizedMeta && datesWithinRange(tDate, mapDate, 3)) {
          info = mapInfo
          break
        }
      }
    }

    // Fallback: try name-based lookup
    if (!info) {
      const tName = t.full_name.toUpperCase().trim()
      const nameInfos = csvEmpByName.get(tName)
      if (nameInfos && nameInfos.length > 0) {
        info = nameInfos[0]
      }
    }

    if (!info) continue // No CSV match for this transfer — skip

    const csvEmpName = info.employeeName.toUpperCase().trim()
    const hrMatch = hrByName.get(csvEmpName)

    // Skip if already correctly assigned
    if (t.employee_id && hrMatch && t.employee_id === hrMatch.id) continue

    assignments.push({
      transferId: t.id,
      metaId: t.meta_id || '',
      fullName: t.full_name,
      transferDate: normalizeDate(t.transfer_date),
      amount: Math.abs(t.amount),
      currency: t.currency,
      csvEmployeeName: info.employeeName,
      csvManagerName: info.managerName,
      resolvedEmployeeId: hrMatch?.id ?? null,
      resolvedEmployeeName: hrMatch?.full_name ?? null,
      currentEmployeeId: t.employee_id,
      selected: hrMatch != null, // auto-select if HR match found
      csvSource: info.csvSource,
    })
  }

  return assignments
}
