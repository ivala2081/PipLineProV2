import type {
  Currency,
  Psp,
  TransferCategory,
  PaymentMethod,
  TransferType,
} from '@/lib/database.types'
import type {
  CsvRawRow,
  ResolvedTransferRow,
  ValidationIssue,
  ImportParseResult,
} from './types'
import { parseTurkishDecimal, parseTurkishDate } from './parseCsv'

/* ------------------------------------------------------------------ */
/*  Lookup maps (indexed by name + aliases)                            */
/* ------------------------------------------------------------------ */

export interface LookupMaps {
  paymentMethodsByName: Map<string, PaymentMethod>
  categoriesByName: Map<string, TransferCategory>
  pspsByName: Map<string, Psp>
  typesByName: Map<string, TransferType>
}

/**
 * Build lookup maps keyed by lowercase name AND every alias.
 * This allows CSV values in any language to match system entries
 * as long as the alias is configured in the database.
 */
export function buildLookupMaps(
  paymentMethods: PaymentMethod[],
  categories: TransferCategory[],
  psps: Psp[],
  transferTypes: TransferType[],
): LookupMaps {
  const pm = new Map<string, PaymentMethod>()
  for (const m of paymentMethods) {
    pm.set(m.name.toLowerCase(), m)
    for (const alias of m.aliases ?? []) pm.set(alias.toLowerCase(), m)
  }

  const cat = new Map<string, TransferCategory>()
  for (const c of categories) {
    cat.set(c.name.toLowerCase(), c)
    for (const alias of c.aliases ?? []) cat.set(alias.toLowerCase(), c)
  }

  const p = new Map<string, Psp>()
  for (const psp of psps) p.set(psp.name.toLowerCase(), psp)

  const t = new Map<string, TransferType>()
  for (const type of transferTypes) {
    t.set(type.name.toLowerCase(), type)
    for (const alias of type.aliases ?? []) t.set(alias.toLowerCase(), type)
  }

  return {
    paymentMethodsByName: pm,
    categoriesByName: cat,
    pspsByName: p,
    typesByName: t,
  }
}

/* ------------------------------------------------------------------ */
/*  Single row validation                                              */
/* ------------------------------------------------------------------ */

export function validateRow(
  raw: CsvRawRow,
  lookupMaps: LookupMaps,
  exchangeRates: Map<string, number>,
): ResolvedTransferRow {
  const issues: ValidationIssue[] = []

  // Full name
  const fullName = raw.fullName.trim()
  if (!fullName) {
    issues.push({ field: 'fullName', message: 'Name is required', severity: 'error' })
  }

  // Payment method (matches by name or alias)
  const pm = lookupMaps.paymentMethodsByName.get(raw.paymentMethodName.toLowerCase())
  if (!pm) {
    issues.push({
      field: 'paymentMethod',
      message: `Payment method "${raw.paymentMethodName}" not found`,
      severity: 'error',
    })
  }

  // Category (matches by name or alias)
  const cat = lookupMaps.categoriesByName.get(raw.categoryName.toLowerCase())
  if (!cat) {
    issues.push({
      field: 'category',
      message: `Category "${raw.categoryName}" not found`,
      severity: 'error',
    })
  }
  const isDeposit = cat?.is_deposit ?? raw.categoryName.toUpperCase() === 'YATIRIM'

  // PSP
  const psp = lookupMaps.pspsByName.get(raw.pspName.toLowerCase())
  if (!psp) {
    issues.push({
      field: 'psp',
      message: `PSP "${raw.pspName}" not found`,
      severity: 'error',
    })
  }

  // Type (matches by name or alias)
  const type = lookupMaps.typesByName.get(raw.typeName.toLowerCase())
  if (!type) {
    issues.push({
      field: 'type',
      message: `Type "${raw.typeName}" not found`,
      severity: 'error',
    })
  }

  // Date
  const isoDate = parseTurkishDate(raw.dateRaw)
  if (!isoDate) {
    issues.push({
      field: 'date',
      message: `Invalid date "${raw.dateRaw}"`,
      severity: 'error',
    })
  }
  const transferDate = isoDate ? `${isoDate}T00:00:00` : ''

  // Amount (pre-computed and signed in CSV)
  const amount = parseTurkishDecimal(raw.amountRaw)
  if (amount === 0 && raw.amountRaw.trim() !== '0') {
    issues.push({
      field: 'amount',
      message: `Cannot parse amount "${raw.amountRaw}"`,
      severity: 'error',
    })
  }

  // Commission
  const commission = parseTurkishDecimal(raw.commissionRaw)

  // Net
  const net = parseTurkishDecimal(raw.netRaw)

  // Currency
  const currency = raw.currency.toUpperCase() as Currency
  if (currency !== 'TL' && currency !== 'USD') {
    issues.push({
      field: 'currency',
      message: `Invalid currency "${raw.currency}"`,
      severity: 'error',
    })
  }

  // Exchange rate
  let exchangeRate = 1
  if (isoDate) {
    const rate = exchangeRates.get(isoDate)
    if (rate) {
      exchangeRate = rate
    } else if (currency === 'USD') {
      issues.push({
        field: 'exchangeRate',
        message: `No exchange rate for ${isoDate}`,
        severity: 'warning',
      })
    }
  }

  // Compute TRY/USD amounts
  let amountTry: number
  let amountUsd: number
  if (currency === 'TL') {
    amountTry = amount
    amountUsd = exchangeRate > 1
      ? Math.round((amount / exchangeRate) * 100) / 100
      : 0
  } else {
    amountUsd = amount
    amountTry = Math.round(amount * exchangeRate * 100) / 100
  }

  // Commission rate snapshot
  const absAmount = Math.abs(amount)
  const commissionRateSnapshot = isDeposit && absAmount > 0
    ? Math.round((Math.abs(commission) / absAmount) * 10000) / 10000
    : 0

  const hasError = issues.some((i) => i.severity === 'error')

  return {
    rowIndex: raw.rowIndex,
    raw,
    fullName,
    crmId: raw.crmId || null,
    metaId: raw.metaId || null,
    paymentMethodId: pm?.id ?? null,
    categoryId: cat?.id ?? null,
    isDeposit,
    pspId: psp?.id ?? null,
    typeId: type?.id ?? null,
    transferDate,
    amount,
    commission,
    net,
    currency: (currency === 'TL' || currency === 'USD') ? currency : 'TL',
    exchangeRate,
    amountTry,
    amountUsd,
    commissionRateSnapshot,
    issues,
    isValid: !hasError,
    isDuplicate: false,
  }
}

/* ------------------------------------------------------------------ */
/*  Missing lookups detection                                          */
/* ------------------------------------------------------------------ */

export interface MissingLookups {
  paymentMethods: string[]
  categories: Array<{ name: string; isDeposit: boolean }>
  psps: string[]
  types: string[]
  hasMissing: boolean
}

export function detectMissingLookups(
  rawRows: CsvRawRow[],
  lookupMaps: LookupMaps,
): MissingLookups {
  const pmSet = new Set<string>()
  const catSet = new Map<string, boolean>()
  const pspSet = new Set<string>()
  const typeSet = new Set<string>()

  for (const raw of rawRows) {
    // Lookup maps already include aliases as keys, so direct lookup works
    const pmKey = raw.paymentMethodName.toLowerCase()
    if (pmKey && !lookupMaps.paymentMethodsByName.has(pmKey)) {
      pmSet.add(raw.paymentMethodName)
    }

    const catKey = raw.categoryName.toLowerCase()
    if (catKey && !lookupMaps.categoriesByName.has(catKey)) {
      catSet.set(raw.categoryName, raw.categoryName.toUpperCase() === 'YATIRIM')
    }

    const pspKey = raw.pspName.toLowerCase()
    if (pspKey && !lookupMaps.pspsByName.has(pspKey)) {
      pspSet.add(raw.pspName)
    }

    const typeKey = raw.typeName.toLowerCase()
    if (typeKey && !lookupMaps.typesByName.has(typeKey)) {
      typeSet.add(raw.typeName)
    }
  }

  const paymentMethods = Array.from(pmSet)
  const categories = Array.from(catSet.entries()).map(([name, isDeposit]) => ({
    name,
    isDeposit,
  }))
  const psps = Array.from(pspSet)
  const types = Array.from(typeSet)

  return {
    paymentMethods,
    categories,
    psps,
    types,
    hasMissing:
      paymentMethods.length > 0 ||
      categories.length > 0 ||
      psps.length > 0 ||
      types.length > 0,
  }
}

/* ------------------------------------------------------------------ */
/*  Batch validation                                                   */
/* ------------------------------------------------------------------ */

export interface ExistingTransfer {
  transfer_date: string
  full_name: string
  amount: number
}

export function validateAllRows(
  rawRows: CsvRawRow[],
  lookupMaps: LookupMaps,
  exchangeRates: Map<string, number>,
  existingTransfers?: ExistingTransfer[],
): ImportParseResult {
  const rows: ResolvedTransferRow[] = []
  let validRows = 0
  let errorRows = 0
  let warningRows = 0
  let duplicateRows = 0

  for (const raw of rawRows) {
    const resolved = validateRow(raw, lookupMaps, exchangeRates)

    // Duplicate detection
    if (existingTransfers && resolved.isValid) {
      const rowDateKey = resolved.transferDate.slice(0, 10)
      const dup = existingTransfers.some(
        (e) =>
          e.transfer_date.slice(0, 10) === rowDateKey &&
          e.full_name.toLowerCase() === resolved.fullName.toLowerCase() &&
          Math.abs(e.amount - resolved.amount) < 0.01,
      )
      if (dup) {
        resolved.isDuplicate = true
        resolved.issues.push({
          field: 'duplicate',
          message: 'Possible duplicate: same date, name, and amount',
          severity: 'warning',
        })
        duplicateRows++
      }
    }

    if (resolved.isValid) {
      validRows++
    } else {
      errorRows++
    }
    if (resolved.issues.some((i) => i.severity === 'warning')) {
      warningRows++
    }

    rows.push(resolved)
  }

  return {
    rows,
    exchangeRates,
    totalRows: rawRows.length,
    validRows,
    errorRows,
    warningRows,
    duplicateRows,
  }
}
