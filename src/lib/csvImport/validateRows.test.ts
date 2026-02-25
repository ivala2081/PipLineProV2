import type { CsvRawRow } from './types'
import { buildLookupMaps, validateRow, detectMissingLookups, validateAllRows } from './validateRows'
import type { LookupMaps } from './validateRows'

/* ── Test Data Factories ──────────────────────────────── */

function makePm(id: string, name: string, aliases: string[] = []) {
  return { id, name, aliases }
}

function makeCat(id: string, name: string, isDeposit: boolean, aliases: string[] = []) {
  return { id, name, is_deposit: isDeposit, aliases }
}

function makeType(id: string, name: string, aliases: string[] = []) {
  return { id, name, aliases }
}

function makePsp(id: string, name: string) {
  return {
    id,
    name,
    commission_rate: 0,
    is_active: true,
    is_internal: false,
    psp_scope: 'local' as const,
    provider: null,
    provider_app_id: null,
  }
}

function makeRawRow(overrides: Partial<CsvRawRow> = {}): CsvRawRow {
  return {
    rowIndex: 1,
    crmId: 'CRM001',
    metaId: 'META001',
    fullName: 'John Doe',
    iban: 'TR000000000000',
    paymentMethodName: 'Bank Transfer',
    company: 'TestCo',
    dateRaw: '15.01.2024',
    categoryName: 'Yatirim',
    amountRaw: '1.000,00',
    commissionRaw: '0',
    netRaw: '1.000,00',
    currency: 'TL',
    pspName: 'Papara',
    typeName: 'Standard',
    ...overrides,
  }
}

function defaultLookups(): LookupMaps {
  return buildLookupMaps(
    [makePm('pm-1', 'Bank Transfer', ['banka', 'havale'])],
    [makeCat('cat-1', 'Yatirim', true, ['deposit', 'yatırım'])],
    [makeType('type-1', 'Standard', ['standart'])],
    [makePsp('psp-1', 'Papara')],
  )
}

function defaultRates(): Map<string, number> {
  return new Map([['2024-01-15', 32.5]])
}

/* ── buildLookupMaps ──────────────────────────────────── */

describe('buildLookupMaps', () => {
  it('indexes by lowercase name', () => {
    const maps = defaultLookups()
    expect(maps.paymentMethodsByName.get('bank transfer')).toBeDefined()
  })

  it('indexes by aliases', () => {
    const maps = defaultLookups()
    expect(maps.paymentMethodsByName.get('banka')).toBeDefined()
    expect(maps.paymentMethodsByName.get('havale')).toBeDefined()
  })

  it('indexes categories by alias', () => {
    const maps = defaultLookups()
    expect(maps.categoriesByName.get('deposit')).toBeDefined()
  })

  it('indexes PSPs by name', () => {
    const maps = defaultLookups()
    expect(maps.pspsByName.get('papara')).toBeDefined()
  })

  it('returns empty maps for empty arrays', () => {
    const maps = buildLookupMaps([], [], [], [])
    expect(maps.paymentMethodsByName.size).toBe(0)
    expect(maps.categoriesByName.size).toBe(0)
    expect(maps.typesByName.size).toBe(0)
    expect(maps.pspsByName.size).toBe(0)
  })
})

/* ── validateRow ──────────────────────────────────────── */

describe('validateRow', () => {
  it('validates a correct row', () => {
    const result = validateRow(makeRawRow(), defaultLookups(), defaultRates())
    expect(result.isValid).toBe(true)
    expect(result.paymentMethodId).toBe('pm-1')
    expect(result.categoryId).toBe('cat-1')
    expect(result.typeId).toBe('type-1')
    expect(result.pspId).toBe('psp-1')
  })

  it('flags missing payment method', () => {
    const row = makeRawRow({ paymentMethodName: 'Unknown PM' })
    const result = validateRow(row, defaultLookups(), defaultRates())
    expect(result.issues.some((i) => i.field === 'paymentMethod')).toBe(true)
  })

  it('flags missing category', () => {
    const row = makeRawRow({ categoryName: 'Unknown Cat' })
    const result = validateRow(row, defaultLookups(), defaultRates())
    expect(result.issues.some((i) => i.field === 'category')).toBe(true)
  })

  it('flags missing PSP', () => {
    const row = makeRawRow({ pspName: 'UnknownPSP' })
    const result = validateRow(row, defaultLookups(), defaultRates())
    expect(result.issues.some((i) => i.field === 'psp')).toBe(true)
  })

  it('flags missing type', () => {
    const row = makeRawRow({ typeName: 'Unknown Type' })
    const result = validateRow(row, defaultLookups(), defaultRates())
    expect(result.issues.some((i) => i.field === 'type')).toBe(true)
  })

  it('flags invalid date', () => {
    const row = makeRawRow({ dateRaw: 'not-a-date' })
    const result = validateRow(row, defaultLookups(), defaultRates())
    expect(result.issues.some((i) => i.field === 'date')).toBe(true)
  })

  it('uses exchange rate from map', () => {
    const result = validateRow(makeRawRow(), defaultLookups(), defaultRates())
    expect(result.exchangeRate).toBe(32.5)
  })

  it('warns when USD row has no exchange rate', () => {
    const row = makeRawRow({ currency: 'USD', dateRaw: '20.01.2024' })
    const rates = new Map<string, number>() // no rates
    const result = validateRow(row, defaultLookups(), rates)
    expect(result.issues.some((i) => i.field === 'exchangeRate' && i.severity === 'warning')).toBe(
      true,
    )
  })

  it('computes TL amounts correctly', () => {
    const result = validateRow(makeRawRow(), defaultLookups(), defaultRates())
    // TL: amountTry = amount, amountUsd = amount / rate
    expect(result.amountTry).toBe(1000)
    expect(result.amountUsd).toBe(Math.round((1000 / 32.5) * 100) / 100)
  })

  it('computes USD amounts correctly', () => {
    const row = makeRawRow({ currency: 'USD', amountRaw: '100' })
    const result = validateRow(row, defaultLookups(), defaultRates())
    // USD: amountUsd = amount, amountTry = amount * rate
    expect(result.amountUsd).toBe(100)
    expect(result.amountTry).toBe(Math.round(100 * 32.5 * 100) / 100)
  })

  it('detects invalid currency', () => {
    const row = makeRawRow({ currency: 'EUR' })
    const result = validateRow(row, defaultLookups(), defaultRates())
    expect(result.issues.some((i) => i.field === 'currency')).toBe(true)
  })
})

/* ── detectMissingLookups ─────────────────────────────── */

describe('detectMissingLookups', () => {
  it('returns hasMissing false when all found', () => {
    const result = detectMissingLookups([makeRawRow()], defaultLookups())
    expect(result.hasMissing).toBe(false)
  })

  it('detects missing payment method', () => {
    const row = makeRawRow({ paymentMethodName: 'Unknown PM' })
    const result = detectMissingLookups([row], defaultLookups())
    expect(result.hasMissing).toBe(true)
    expect(result.paymentMethods).toContain('Unknown PM')
  })

  it('detects missing PSP', () => {
    const row = makeRawRow({ pspName: 'UnknownPSP' })
    const result = detectMissingLookups([row], defaultLookups())
    expect(result.hasMissing).toBe(true)
    expect(result.psps).toContain('UnknownPSP')
  })

  it('detects missing category', () => {
    const row = makeRawRow({ categoryName: 'Crypto' })
    const result = detectMissingLookups([row], defaultLookups())
    expect(result.categories.some((c) => c.name === 'Crypto')).toBe(true)
  })

  it('detects missing type', () => {
    const row = makeRawRow({ typeName: 'Premium' })
    const result = detectMissingLookups([row], defaultLookups())
    expect(result.types).toContain('Premium')
  })
})

/* ── validateAllRows ──────────────────────────────────── */

describe('validateAllRows', () => {
  it('counts valid and error rows', () => {
    const rows = [
      makeRawRow(),
      makeRawRow({ paymentMethodName: 'Unknown', categoryName: 'Unknown', typeName: 'Unknown' }),
    ]
    const result = validateAllRows(rows, defaultLookups(), defaultRates())
    expect(result.validRows).toBe(1)
    expect(result.errorRows).toBe(1)
    expect(result.totalRows).toBe(2)
  })

  it('detects duplicates against existing transfers', () => {
    const existing = [
      {
        transfer_date: '2024-01-15T00:00:00',
        full_name: 'John Doe',
        amount: 1000,
      },
    ]
    const result = validateAllRows([makeRawRow()], defaultLookups(), defaultRates(), existing)
    expect(result.duplicateRows).toBe(1)
    expect(result.rows[0].isDuplicate).toBe(true)
  })

  it('does not flag duplicates when no existing transfers', () => {
    const result = validateAllRows([makeRawRow()], defaultLookups(), defaultRates())
    expect(result.duplicateRows).toBe(0)
    expect(result.rows[0].isDuplicate).toBe(false)
  })

  it('counts warning rows', () => {
    const row = makeRawRow({ currency: 'USD', dateRaw: '20.01.2024' })
    const result = validateAllRows([row], defaultLookups(), new Map())
    expect(result.warningRows).toBeGreaterThanOrEqual(1)
  })
})
