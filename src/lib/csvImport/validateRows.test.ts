import { describe, it, expect } from 'vitest'
import { buildLookupMaps, validateRow, detectMissingLookups, validateAllRows } from './validateRows'
import { parseTurkishDecimal, parseTurkishDate } from './parseCsv'
import type { Psp, TransferCategory, PaymentMethod, TransferType } from '@/lib/database.types'
import type { CsvRawRow } from './types'

describe('parseTurkishDecimal', () => {
  it('should parse Turkish decimal format with thousand separators', () => {
    expect(parseTurkishDecimal('1.000,00')).toBe(1000)
    expect(parseTurkishDecimal('12.900,50')).toBe(12900.5)
    expect(parseTurkishDecimal('1.234.567,89')).toBe(1234567.89)
  })

  it('should parse negative Turkish decimals', () => {
    expect(parseTurkishDecimal('-1.000,00')).toBe(-1000)
    expect(parseTurkishDecimal('-435,75')).toBe(-435.75)
  })

  it('should parse plain integers without separators', () => {
    expect(parseTurkishDecimal('435')).toBe(435)
    expect(parseTurkishDecimal('1000')).toBe(1000)
  })

  it('should handle edge cases', () => {
    expect(parseTurkishDecimal('')).toBe(0)
    expect(parseTurkishDecimal('   ')).toBe(0)
    expect(parseTurkishDecimal('0')).toBe(0)
    expect(parseTurkishDecimal('0,00')).toBe(0)
  })

  it('should return 0 for invalid input', () => {
    expect(parseTurkishDecimal('abc')).toBe(0)
    expect(parseTurkishDecimal('$100')).toBe(0)
  })
})

describe('parseTurkishDate', () => {
  it('should parse DD.MM.YYYY format to ISO date', () => {
    expect(parseTurkishDate('15.02.2026')).toBe('2026-02-15')
    expect(parseTurkishDate('01.01.2024')).toBe('2024-01-01')
    expect(parseTurkishDate('31.12.2025')).toBe('2025-12-31')
  })

  it('should handle single digit day/month', () => {
    expect(parseTurkishDate('1.1.2024')).toBe('2024-01-01')
    expect(parseTurkishDate('5.9.2025')).toBe('2025-09-05')
  })

  it('should return empty string for invalid dates', () => {
    expect(parseTurkishDate('')).toBe('')
    expect(parseTurkishDate('2024-01-01')).toBe('') // Wrong format
    expect(parseTurkishDate('15/02/2024')).toBe('') // Wrong separator
    expect(parseTurkishDate('15.02')).toBe('') // Missing year
  })
})

describe('buildLookupMaps', () => {
  const mockPaymentMethods: PaymentMethod[] = [
    {
      id: 'pm-1',
      organization_id: 'org-1',
      name: 'Bank Transfer',
      aliases: ['Banka Transferi', 'Wire'],
      created_at: '2024-01-01',
    },
    {
      id: 'pm-2',
      organization_id: 'org-1',
      name: 'Credit Card',
      aliases: ['Kredi Kartı'],
      created_at: '2024-01-01',
    },
  ]

  const mockCategories: TransferCategory[] = [
    {
      id: 'cat-1',
      organization_id: 'org-1',
      name: 'Deposit',
      aliases: ['YATIRIM', 'Yatırım'],
      is_deposit: true,
      created_at: '2024-01-01',
    },
    {
      id: 'cat-2',
      organization_id: 'org-1',
      name: 'Withdrawal',
      aliases: ['ÇEKIM', 'Çekim'],
      is_deposit: false,
      created_at: '2024-01-01',
    },
  ]

  const mockPsps: Psp[] = [
    {
      id: 'psp-1',
      organization_id: 'org-1',
      name: 'PaymentCo',
      commission_rate: 0.025,
      is_active: true,
      created_at: '2024-01-01',
    },
  ]

  const mockTypes: TransferType[] = [
    {
      id: 'type-1',
      organization_id: 'org-1',
      name: 'Online',
      aliases: ['Çevrimiçi'],
      created_at: '2024-01-01',
    },
  ]

  it('should build lookup maps with names as keys (lowercase)', () => {
    const maps = buildLookupMaps(mockPaymentMethods, mockCategories, mockPsps, mockTypes)

    expect(maps.paymentMethodsByName.get('bank transfer')).toBeDefined()
    expect(maps.paymentMethodsByName.get('credit card')).toBeDefined()
    expect(maps.categoriesByName.get('deposit')).toBeDefined()
    expect(maps.pspsByName.get('paymentco')).toBeDefined()
    expect(maps.typesByName.get('online')).toBeDefined()
  })

  it('should include aliases in lookup maps', () => {
    const maps = buildLookupMaps(mockPaymentMethods, mockCategories, mockPsps, mockTypes)

    expect(maps.paymentMethodsByName.get('banka transferi')).toBeDefined()
    expect(maps.paymentMethodsByName.get('wire')).toBeDefined()
    expect(maps.categoriesByName.get('yatirim')).toBeDefined()
    expect(maps.categoriesByName.get('çekim')).toBeDefined()
    expect(maps.typesByName.get('çevrimiçi')).toBeDefined()
  })

  it('should map aliases to the same entity', () => {
    const maps = buildLookupMaps(mockPaymentMethods, mockCategories, mockPsps, mockTypes)

    const pm1 = maps.paymentMethodsByName.get('bank transfer')
    const pm2 = maps.paymentMethodsByName.get('banka transferi')
    expect(pm1).toBe(pm2) // Same reference
    expect(pm1?.id).toBe('pm-1')
  })
})

describe('validateRow', () => {
  const mockLookupMaps = buildLookupMaps(
    [
      {
        id: 'pm-1',
        organization_id: 'org-1',
        name: 'Bank Transfer',
        aliases: ['Banka Transferi'],
        created_at: '2024-01-01',
      },
    ],
    [
      {
        id: 'cat-1',
        organization_id: 'org-1',
        name: 'Deposit',
        aliases: ['YATIRIM'],
        is_deposit: true,
        created_at: '2024-01-01',
      },
    ],
    [
      {
        id: 'psp-1',
        organization_id: 'org-1',
        name: 'PaymentCo',
        commission_rate: 0.025,
        is_active: true,
        created_at: '2024-01-01',
      },
    ],
    [
      {
        id: 'type-1',
        organization_id: 'org-1',
        name: 'Online',
        aliases: [],
        created_at: '2024-01-01',
      },
    ],
  )

  const exchangeRates = new Map([['2026-02-15', 35.5]])

  const validRawRow: CsvRawRow = {
    rowIndex: 1,
    crmId: '12345',
    metaId: 'META-001',
    fullName: 'John Doe',
    iban: 'TR1234567890',
    paymentMethodName: 'Bank Transfer',
    company: 'Test Co',
    dateRaw: '15.02.2026',
    categoryName: 'Deposit',
    amountRaw: '1.000,00',
    commissionRaw: '25,00',
    netRaw: '975,00',
    currency: 'TL',
    pspName: 'PaymentCo',
    typeName: 'Online',
  }

  it('should validate a valid row successfully', () => {
    const result = validateRow(validRawRow, mockLookupMaps, exchangeRates)

    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(result.fullName).toBe('John Doe')
    expect(result.amount).toBe(1000)
    expect(result.commission).toBe(25)
    expect(result.net).toBe(975)
    expect(result.currency).toBe('TL')
    expect(result.transferDate).toBe('2026-02-15T00:00:00')
    expect(result.paymentMethodId).toBe('pm-1')
    expect(result.categoryId).toBe('cat-1')
    expect(result.pspId).toBe('psp-1')
    expect(result.typeId).toBe('type-1')
  })

  it('should match using aliases', () => {
    const rowWithAlias: CsvRawRow = {
      ...validRawRow,
      paymentMethodName: 'Banka Transferi', // Turkish alias
      categoryName: 'YATIRIM', // Turkish alias
    }

    const result = validateRow(rowWithAlias, mockLookupMaps, exchangeRates)

    expect(result.isValid).toBe(true)
    expect(result.paymentMethodId).toBe('pm-1')
    expect(result.categoryId).toBe('cat-1')
  })

  it('should detect missing full name', () => {
    const rowWithoutName: CsvRawRow = { ...validRawRow, fullName: '' }

    const result = validateRow(rowWithoutName, mockLookupMaps, exchangeRates)

    expect(result.isValid).toBe(false)
    expect(result.issues).toContainEqual({
      field: 'fullName',
      message: 'Name is required',
      severity: 'error',
    })
  })

  it('should detect missing payment method', () => {
    const rowWithInvalidPM: CsvRawRow = {
      ...validRawRow,
      paymentMethodName: 'NonExistent',
    }

    const result = validateRow(rowWithInvalidPM, mockLookupMaps, exchangeRates)

    expect(result.isValid).toBe(false)
    expect(result.issues).toContainEqual({
      field: 'paymentMethod',
      message: 'Payment method "NonExistent" not found',
      severity: 'error',
    })
    expect(result.paymentMethodId).toBeNull()
  })

  it('should detect invalid currency', () => {
    const rowWithInvalidCurrency: CsvRawRow = {
      ...validRawRow,
      currency: 'EUR',
    }

    const result = validateRow(rowWithInvalidCurrency, mockLookupMaps, exchangeRates)

    expect(result.isValid).toBe(false)
    expect(result.issues).toContainEqual({
      field: 'currency',
      message: 'Invalid currency "EUR"',
      severity: 'error',
    })
  })

  it('should detect invalid date format', () => {
    const rowWithInvalidDate: CsvRawRow = {
      ...validRawRow,
      dateRaw: '2026-02-15', // Wrong format (ISO instead of Turkish)
    }

    const result = validateRow(rowWithInvalidDate, mockLookupMaps, exchangeRates)

    expect(result.isValid).toBe(false)
    expect(result.issues).toContainEqual({
      field: 'date',
      message: 'Invalid date "2026-02-15"',
      severity: 'error',
    })
  })

  it('should warn when exchange rate is missing for USD', () => {
    const rowWithMissingRate: CsvRawRow = {
      ...validRawRow,
      dateRaw: '20.02.2026', // Date without exchange rate
      currency: 'USD',
    }

    const result = validateRow(rowWithMissingRate, mockLookupMaps, exchangeRates)

    expect(result.isValid).toBe(true) // Still valid, just a warning
    expect(result.issues).toContainEqual({
      field: 'exchangeRate',
      message: 'No exchange rate for 2026-02-20',
      severity: 'warning',
    })
  })

  it('should calculate commission rate snapshot for deposits', () => {
    const result = validateRow(validRawRow, mockLookupMaps, exchangeRates)

    // commission = 25, amount = 1000
    // rate = 25 / 1000 = 0.025
    expect(result.commissionRateSnapshot).toBe(0.025)
  })

  it('should calculate currency conversions for TL', () => {
    const result = validateRow(validRawRow, mockLookupMaps, exchangeRates)

    expect(result.amountTry).toBe(1000)
    expect(result.amountUsd).toBe(28.17) // 1000 / 35.5 ≈ 28.17
  })

  it('should calculate currency conversions for USD', () => {
    const usdRow: CsvRawRow = {
      ...validRawRow,
      currency: 'USD',
      amountRaw: '100,00',
    }

    const result = validateRow(usdRow, mockLookupMaps, exchangeRates)

    expect(result.amountUsd).toBe(100)
    expect(result.amountTry).toBe(3550) // 100 * 35.5 = 3550
  })
})

describe('detectMissingLookups', () => {
  const mockLookupMaps = buildLookupMaps(
    [
      {
        id: 'pm-1',
        organization_id: 'org-1',
        name: 'Bank Transfer',
        aliases: [],
        created_at: '2024-01-01',
      },
    ],
    [
      {
        id: 'cat-1',
        organization_id: 'org-1',
        name: 'Deposit',
        aliases: [],
        is_deposit: true,
        created_at: '2024-01-01',
      },
    ],
    [
      {
        id: 'psp-1',
        organization_id: 'org-1',
        name: 'PaymentCo',
        commission_rate: 0.025,
        is_active: true,
        created_at: '2024-01-01',
      },
    ],
    [
      {
        id: 'type-1',
        organization_id: 'org-1',
        name: 'Online',
        aliases: [],
        created_at: '2024-01-01',
      },
    ],
  )

  it('should detect missing payment methods', () => {
    const rawRows: CsvRawRow[] = [
      {
        rowIndex: 1,
        crmId: '',
        metaId: '',
        fullName: 'John',
        iban: '',
        paymentMethodName: 'Credit Card', // Missing
        company: '',
        dateRaw: '15.02.2026',
        categoryName: 'Deposit',
        amountRaw: '100',
        commissionRaw: '0',
        netRaw: '100',
        currency: 'TL',
        pspName: 'PaymentCo',
        typeName: 'Online',
      },
    ]

    const result = detectMissingLookups(rawRows, mockLookupMaps)

    expect(result.hasMissing).toBe(true)
    expect(result.paymentMethods).toContain('Credit Card')
  })

  it('should detect missing categories with deposit flag', () => {
    const rawRows: CsvRawRow[] = [
      {
        rowIndex: 1,
        crmId: '',
        metaId: '',
        fullName: 'John',
        iban: '',
        paymentMethodName: 'Bank Transfer',
        company: '',
        dateRaw: '15.02.2026',
        categoryName: 'YATIRIM', // Missing (uppercase)
        amountRaw: '100',
        commissionRaw: '0',
        netRaw: '100',
        currency: 'TL',
        pspName: 'PaymentCo',
        typeName: 'Online',
      },
    ]

    const result = detectMissingLookups(rawRows, mockLookupMaps)

    expect(result.hasMissing).toBe(true)
    expect(result.categories).toContainEqual({ name: 'YATIRIM', isDeposit: true })
  })

  it('should return empty arrays when all lookups exist', () => {
    const rawRows: CsvRawRow[] = [
      {
        rowIndex: 1,
        crmId: '',
        metaId: '',
        fullName: 'John',
        iban: '',
        paymentMethodName: 'Bank Transfer',
        company: '',
        dateRaw: '15.02.2026',
        categoryName: 'Deposit',
        amountRaw: '100',
        commissionRaw: '0',
        netRaw: '100',
        currency: 'TL',
        pspName: 'PaymentCo',
        typeName: 'Online',
      },
    ]

    const result = detectMissingLookups(rawRows, mockLookupMaps)

    expect(result.hasMissing).toBe(false)
    expect(result.paymentMethods).toHaveLength(0)
    expect(result.categories).toHaveLength(0)
    expect(result.psps).toHaveLength(0)
    expect(result.types).toHaveLength(0)
  })
})

describe('validateAllRows', () => {
  const mockLookupMaps = buildLookupMaps(
    [
      {
        id: 'pm-1',
        organization_id: 'org-1',
        name: 'Bank Transfer',
        aliases: [],
        created_at: '2024-01-01',
      },
    ],
    [
      {
        id: 'cat-1',
        organization_id: 'org-1',
        name: 'Deposit',
        aliases: [],
        is_deposit: true,
        created_at: '2024-01-01',
      },
    ],
    [
      {
        id: 'psp-1',
        organization_id: 'org-1',
        name: 'PaymentCo',
        commission_rate: 0.025,
        is_active: true,
        created_at: '2024-01-01',
      },
    ],
    [
      {
        id: 'type-1',
        organization_id: 'org-1',
        name: 'Online',
        aliases: [],
        created_at: '2024-01-01',
      },
    ],
  )

  const exchangeRates = new Map([['2026-02-15', 35.5]])

  it('should validate multiple rows and count stats', () => {
    const rawRows: CsvRawRow[] = [
      {
        rowIndex: 1,
        crmId: '',
        metaId: '',
        fullName: 'John Doe',
        iban: '',
        paymentMethodName: 'Bank Transfer',
        company: '',
        dateRaw: '15.02.2026',
        categoryName: 'Deposit',
        amountRaw: '1.000,00',
        commissionRaw: '25,00',
        netRaw: '975,00',
        currency: 'TL',
        pspName: 'PaymentCo',
        typeName: 'Online',
      },
      {
        rowIndex: 2,
        crmId: '',
        metaId: '',
        fullName: '', // Invalid: missing name
        iban: '',
        paymentMethodName: 'Bank Transfer',
        company: '',
        dateRaw: '15.02.2026',
        categoryName: 'Deposit',
        amountRaw: '500,00',
        commissionRaw: '12,50',
        netRaw: '487,50',
        currency: 'TL',
        pspName: 'PaymentCo',
        typeName: 'Online',
      },
    ]

    const result = validateAllRows(rawRows, mockLookupMaps, exchangeRates)

    expect(result.totalRows).toBe(2)
    expect(result.validRows).toBe(1)
    expect(result.errorRows).toBe(1)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].isValid).toBe(true)
    expect(result.rows[1].isValid).toBe(false)
  })

  it('should detect duplicate transfers', () => {
    const rawRows: CsvRawRow[] = [
      {
        rowIndex: 1,
        crmId: '',
        metaId: '',
        fullName: 'John Doe',
        iban: '',
        paymentMethodName: 'Bank Transfer',
        company: '',
        dateRaw: '15.02.2026',
        categoryName: 'Deposit',
        amountRaw: '1.000,00',
        commissionRaw: '25,00',
        netRaw: '975,00',
        currency: 'TL',
        pspName: 'PaymentCo',
        typeName: 'Online',
      },
    ]

    const existingTransfers = [
      {
        transfer_date: '2026-02-15T00:00:00',
        full_name: 'John Doe',
        amount: 1000,
      },
    ]

    const result = validateAllRows(rawRows, mockLookupMaps, exchangeRates, existingTransfers)

    expect(result.duplicateRows).toBe(1)
    expect(result.rows[0].isDuplicate).toBe(true)
    expect(result.rows[0].issues).toContainEqual({
      field: 'duplicate',
      message: 'Possible duplicate: same date, name, and amount',
      severity: 'warning',
    })
  })

  it('should not flag as duplicate if amount differs', () => {
    const rawRows: CsvRawRow[] = [
      {
        rowIndex: 1,
        crmId: '',
        metaId: '',
        fullName: 'John Doe',
        iban: '',
        paymentMethodName: 'Bank Transfer',
        company: '',
        dateRaw: '15.02.2026',
        categoryName: 'Deposit',
        amountRaw: '1.000,00',
        commissionRaw: '25,00',
        netRaw: '975,00',
        currency: 'TL',
        pspName: 'PaymentCo',
        typeName: 'Online',
      },
    ]

    const existingTransfers = [
      {
        transfer_date: '2026-02-15T00:00:00',
        full_name: 'John Doe',
        amount: 2000, // Different amount
      },
    ]

    const result = validateAllRows(rawRows, mockLookupMaps, exchangeRates, existingTransfers)

    expect(result.duplicateRows).toBe(0)
    expect(result.rows[0].isDuplicate).toBe(false)
  })
})
