import Papa from 'papaparse'
import { parseTurkishDecimal, parseTurkishDate } from '@/lib/csvImport/parseCsv'
import type { OrderSatisRow, OrdRetDepositRow, OrdWithdrawalRow, Period } from './types'

/**
 * Parse ORDER SATIS CSV (first deposits).
 * Header row: #REF!, Dönem, Tarih, KAYNAK, DATA, MT, EKİP LİDERİ, Müşteri Ad Soyad, META, Ödeme Türü, Tutar TL, Tutar USD, Kur, ...
 */
export function parseOrderSatisCsv(csvText: string): OrderSatisRow[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  })

  const allRows = result.data

  // Find header row by looking for "Tarih" in the first few columns
  let headerIdx = -1
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i]
    if (!row) continue
    const hasTargetCol = row.some(
      (cell) => cell?.trim() === 'Tarih' || cell?.trim() === 'Dönem',
    )
    if (hasTargetCol) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) {
    throw new Error('ORDER SATIS: Header row not found. Expected "Tarih" or "Dönem" column.')
  }

  const dataRows = allRows.slice(headerIdx + 1)
  const rows: OrderSatisRow[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (!row) continue
    const musteriAdSoyad = (row[7] ?? '').trim()
    const meta = (row[8] ?? '').trim()
    // Skip empty rows
    if (!musteriAdSoyad && !meta) continue

    const tarihRaw = (row[2] ?? '').trim()
    const tarih = parseTurkishDate(tarihRaw) || tarihRaw

    rows.push({
      rowIndex: headerIdx + 1 + i + 1,
      donem: (row[1] ?? '').trim(),
      tarih,
      kaynak: (row[3] ?? '').trim(),
      data: (row[4] ?? '').trim(),
      mt: (row[5] ?? '').trim(),
      ekipLideri: (row[6] ?? '').trim(),
      musteriAdSoyad,
      meta,
      odemeTuru: (row[9] ?? '').trim(),
      tutarTl: parseTurkishDecimal((row[10] ?? '').replace(/[₺$#REF!]/g, '')),
      tutarUsd: parseTurkishDecimal((row[11] ?? '').replace(/[₺$#REF!]/g, '')),
      kur: parseTurkishDecimal((row[12] ?? '').replace(/[₺$]/g, '')),
    })
  }

  return rows
}

/**
 * Parse ORD RET DEPOSIT CSV (retention re-deposits).
 * Header row: <a, AY, Tarih, RET, KAYNAK, DATA, EKİP LİDERİ, MT, Müşteri Ad Soyad, META ID, Ödeme Türü, Tutar TL, Tutar USD
 */
export function parseOrdRetDepositCsv(csvText: string): OrdRetDepositRow[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  })

  const allRows = result.data

  // Find header row by looking for "AY" column
  let headerIdx = -1
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i]
    if (!row) continue
    const hasAy = row.some((cell) => cell?.trim() === 'AY')
    const hasTarih = row.some((cell) => cell?.trim() === 'Tarih')
    if (hasAy && hasTarih) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) {
    throw new Error('ORD RET DEPOSIT: Header row not found. Expected "AY" and "Tarih" columns.')
  }

  const dataRows = allRows.slice(headerIdx + 1)
  const rows: OrdRetDepositRow[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (!row) continue
    const musteriAdSoyad = (row[8] ?? '').trim()
    const metaId = (row[9] ?? '').trim()
    if (!musteriAdSoyad && !metaId) continue

    const tarihRaw = (row[2] ?? '').trim()
    const tarih = parseTurkishDate(tarihRaw) || tarihRaw

    rows.push({
      rowIndex: headerIdx + 1 + i + 1,
      ay: (row[1] ?? '').trim(),
      tarih,
      ret: (row[3] ?? '').trim(),
      kaynak: (row[4] ?? '').trim(),
      data: (row[5] ?? '').trim(),
      ekipLideri: (row[6] ?? '').trim(),
      mt: (row[7] ?? '').trim(),
      musteriAdSoyad,
      metaId,
      odemeTuru: (row[10] ?? '').trim(),
      tutarTl: parseTurkishDecimal((row[11] ?? '').replace(/[₺$#REF!]/g, '')),
      tutarUsd: parseTurkishDecimal((row[12] ?? '').replace(/[₺$#REF!]/g, '')),
    })
  }

  return rows
}

/**
 * Parse ORD WITHDRAWAL CSV (withdrawals).
 * Header row: SATIŞ KANALI, AY, Tarih, RET, KAYNAK, DATA, EKİP LİDERİ, MT, Müşteri Ad Soyad, META ID, Ödeme Türü, Tutar TL, Tutar USD, Kur
 */
export function parseOrdWithdrawalCsv(csvText: string): OrdWithdrawalRow[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  })

  const allRows = result.data

  // Find header row
  let headerIdx = -1
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i]
    if (!row) continue
    const firstCell = (row[0] ?? '').trim().toUpperCase()
    if (firstCell.includes('SATI') || firstCell === 'SATIŞ KANALI') {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) {
    throw new Error('ORD WITHDRAWAL: Header row not found. Expected "SATIŞ KANALI" column.')
  }

  const dataRows = allRows.slice(headerIdx + 1)
  const rows: OrdWithdrawalRow[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (!row) continue
    const musteriAdSoyad = (row[8] ?? '').trim()
    const metaId = (row[9] ?? '').trim()
    if (!musteriAdSoyad && !metaId) continue

    const tarihRaw = (row[2] ?? '').trim()
    const tarih = parseTurkishDate(tarihRaw) || tarihRaw

    rows.push({
      rowIndex: headerIdx + 1 + i + 1,
      satisKanali: (row[0] ?? '').trim(),
      ay: (row[1] ?? '').trim(),
      tarih,
      ret: (row[3] ?? '').trim(),
      kaynak: (row[4] ?? '').trim(),
      data: (row[5] ?? '').trim(),
      ekipLideri: (row[6] ?? '').trim(),
      mt: (row[7] ?? '').trim(),
      musteriAdSoyad,
      metaId,
      odemeTuru: (row[10] ?? '').trim(),
      tutarTl: parseTurkishDecimal((row[11] ?? '').replace(/[₺$#REF!]/g, '')),
      tutarUsd: parseTurkishDecimal((row[12] ?? '').replace(/[₺$#REF!]/g, '')),
      kur: parseTurkishDecimal((row[13] ?? '').replace(/[₺$]/g, '')),
    })
  }

  return rows
}

/** Helper to get metaId from any sales CSV row */
export function getSalesRowMeta(row: OrderSatisRow | OrdRetDepositRow | OrdWithdrawalRow): string {
  if ('meta' in row) return row.meta
  return row.metaId
}

/** Helper to get date from any sales CSV row */
export function getSalesRowDate(row: OrderSatisRow | OrdRetDepositRow | OrdWithdrawalRow): string {
  return row.tarih
}

/** Helper to get name from any sales CSV row */
export function getSalesRowName(row: OrderSatisRow | OrdRetDepositRow | OrdWithdrawalRow): string {
  return row.musteriAdSoyad
}

/** Helper to get USD amount from any sales CSV row */
export function getSalesRowAmountUsd(
  row: OrderSatisRow | OrdRetDepositRow | OrdWithdrawalRow,
): number {
  return row.tutarUsd
}

/** Helper to get TL amount from any sales CSV row */
export function getSalesRowAmountTl(
  row: OrderSatisRow | OrdRetDepositRow | OrdWithdrawalRow,
): number {
  return row.tutarTl
}

/** Helper to get employee name: MT for first deposits, RET for retention/withdrawal */
export function getSalesRowEmployee(
  row: OrderSatisRow | OrdRetDepositRow | OrdWithdrawalRow,
): string {
  if ('meta' in row) return row.mt // OrderSatisRow → Marketing person
  return row.ret // OrdRetDepositRow / OrdWithdrawalRow → Retention person
}

/** Helper to get manager/team leader from any sales CSV row */
export function getSalesRowManager(
  row: OrderSatisRow | OrdRetDepositRow | OrdWithdrawalRow,
): string {
  return row.ekipLideri
}

/** Helper to get payment type from any sales CSV row */
export function getSalesRowPaymentType(
  row: OrderSatisRow | OrdRetDepositRow | OrdWithdrawalRow,
): string {
  return row.odemeTuru
}

/* ------------------------------------------------------------------ */
/*  Period filtering — filter sales CSVs to selected month             */
/* ------------------------------------------------------------------ */

/**
 * Turkish month abbreviations used in donem/ay columns.
 * ORDER SATIS donem: "MRT26", ORD RET/WITHDRAWAL ay: "MART 26" or "MRT26"
 */
const TURKISH_MONTH_ABBRS: Record<number, string[]> = {
  1: ['OCA', 'OCK', 'OCAK', 'JAN'],
  2: ['ŞUB', 'ŞBT', 'SUB', 'SBT', 'ŞUBAT', 'SUBAT', 'FEB'],
  3: ['MRT', 'MART', 'MAR'],
  4: ['NİS', 'NSN', 'NIS', 'NİSAN', 'NISAN', 'APR'],
  5: ['MAY', 'MYS', 'MAYIS'],
  6: ['HAZ', 'HZRN', 'HAZİRAN', 'HAZIRAN', 'JUN'],
  7: ['TEM', 'TMMZ', 'TEMMUZ', 'JUL'],
  8: ['AĞU', 'AGSTS', 'AGU', 'AĞUSTOS', 'AGUSTOS', 'AUG'],
  9: ['EYL', 'EYLL', 'EYLÜL', 'EYLUL', 'SEP'],
  10: ['EKİ', 'EKM', 'EKI', 'EKİM', 'EKIM', 'OCT'],
  11: ['KAS', 'KSM', 'KASIM', 'NOV'],
  12: ['ARA', 'ARLK', 'ARALIK', 'DEC'],
}

/**
 * Check if a donem/ay string matches the given period.
 * Supports formats: "MRT26", "MART 26", "MART26", "MRT 26", "MART2026",
 * "03/2026", "3/26", "2026-03", "03.2026"
 */
function donemMatchesPeriod(donem: string, period: Period): boolean {
  if (!donem) return false
  const upper = donem.toUpperCase().replace(/\s+/g, '').trim()
  const yearSuffix2 = String(period.year % 100) // "26"
  const yearFull = String(period.year) // "2026"
  const monthPad = String(period.month).padStart(2, '0') // "03"
  const monthRaw = String(period.month) // "3"

  const abbrs = TURKISH_MONTH_ABBRS[period.month]
  if (!abbrs) return false

  // Turkish abbreviation + year: "MRT26", "MART26", "MRT2026", "MART2026"
  for (const abbr of abbrs) {
    if (upper === abbr + yearSuffix2) return true
    if (upper === abbr + yearFull) return true
  }

  // Numeric formats: "03/2026", "3/2026", "03/26", "3/26"
  if (upper === monthPad + '/' + yearFull || upper === monthRaw + '/' + yearFull) return true
  if (upper === monthPad + '/' + yearSuffix2 || upper === monthRaw + '/' + yearSuffix2) return true
  // "2026-03"
  if (upper === yearFull + '-' + monthPad) return true
  // "03.2026"
  if (upper === monthPad + '.' + yearFull || upper === monthRaw + '.' + yearFull) return true

  return false
}

/**
 * Fallback: check if a date string falls within the exact month.
 * Handles ISO (YYYY-MM-DD), Turkish (DD.MM.YYYY), slash (DD/MM/YYYY).
 */
function isInExactMonth(dateStr: string, period: Period): boolean {
  if (!dateStr) return false

  // ISO: YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    return Number(isoMatch[1]) === period.year && Number(isoMatch[2]) === period.month
  }

  // Turkish dot: DD.MM.YYYY
  const dotMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (dotMatch) {
    return Number(dotMatch[3]) === period.year && Number(dotMatch[2]) === period.month
  }

  // Slash: DD/MM/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashMatch) {
    return Number(slashMatch[3]) === period.year && Number(slashMatch[2]) === period.month
  }

  return false
}

export function filterOrderSatisByPeriod(rows: OrderSatisRow[], period: Period): OrderSatisRow[] {
  return rows.filter((r) => donemMatchesPeriod(r.donem, period) || isInExactMonth(r.tarih, period))
}

export function filterOrdRetDepositByPeriod(rows: OrdRetDepositRow[], period: Period): OrdRetDepositRow[] {
  return rows.filter((r) => donemMatchesPeriod(r.ay, period) || isInExactMonth(r.tarih, period))
}

export function filterOrdWithdrawalByPeriod(rows: OrdWithdrawalRow[], period: Period): OrdWithdrawalRow[] {
  return rows.filter((r) => donemMatchesPeriod(r.ay, period) || isInExactMonth(r.tarih, period))
}

