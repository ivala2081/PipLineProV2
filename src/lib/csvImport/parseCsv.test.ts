import { parseTurkishDecimal, parseTurkishDate, parseCsvFile } from './parseCsv'

describe('parseTurkishDecimal', () => {
  it('parses standard thousand separator', () => {
    expect(parseTurkishDecimal('1.000,00')).toBe(1000)
  })

  it('parses large number', () => {
    expect(parseTurkishDecimal('12.900,50')).toBe(12900.5)
  })

  it('parses number without separators', () => {
    expect(parseTurkishDecimal('435')).toBe(435)
  })

  it('parses negative number', () => {
    expect(parseTurkishDecimal('-12.900,00')).toBe(-12900)
  })

  it('returns 0 for empty string', () => {
    expect(parseTurkishDecimal('')).toBe(0)
  })

  it('returns 0 for whitespace-only', () => {
    expect(parseTurkishDecimal('  ')).toBe(0)
  })

  it('returns 0 for non-numeric', () => {
    expect(parseTurkishDecimal('abc')).toBe(0)
  })

  it('parses decimal without thousands', () => {
    expect(parseTurkishDecimal('50,75')).toBe(50.75)
  })
})

describe('parseTurkishDate', () => {
  it('parses standard DD.MM.YYYY format', () => {
    expect(parseTurkishDate('15.01.2024')).toBe('2024-01-15')
  })

  it('pads single-digit day and month', () => {
    expect(parseTurkishDate('5.3.2024')).toBe('2024-03-05')
  })

  it('returns empty for invalid format (2 parts)', () => {
    expect(parseTurkishDate('15.01')).toBe('')
  })

  it('returns empty for empty string', () => {
    expect(parseTurkishDate('')).toBe('')
  })

  it('trims whitespace', () => {
    expect(parseTurkishDate(' 15.01.2024 ')).toBe('2024-01-15')
  })

  it('handles end of year', () => {
    expect(parseTurkishDate('31.12.2024')).toBe('2024-12-31')
  })
})

describe('parseCsvFile', () => {
  const buildCsv = (headerRow: string, dataRows: string[]): string => {
    return [headerRow, ...dataRows].join('\n')
  }

  const HEADER =
    'CRM ID,Meta ID,Full Name,IBAN,Payment Method,Company,Date,Category,Amount,Commission,Net,Currency,PSP,Type'

  it('finds header row by "CRM ID"', () => {
    const csv = buildCsv(HEADER, [
      'CRM001,META001,John Doe,TR123,Bank,TestCo,15.01.2024,Yatirim,"1.000,00",0,"1.000,00",TL,Papara,Standard',
    ])
    const result = parseCsvFile(csv)
    expect(result.headerRowIndex).toBe(0)
  })

  it('finds header row with summary rows before it', () => {
    const csv = [
      'Summary row 1',
      'Summary row 2',
      HEADER,
      'CRM001,META001,John Doe,TR123,Bank,TestCo,15.01.2024,Yatirim,"1.000,00",0,"1.000,00",TL,Papara,Standard',
    ].join('\n')
    const result = parseCsvFile(csv)
    expect(result.headerRowIndex).toBe(2)
  })

  it('extracts data rows after header', () => {
    const csv = buildCsv(HEADER, [
      'CRM001,META001,John Doe,TR123,Bank,TestCo,15.01.2024,Yatirim,"1.000,00",0,"1.000,00",TL,Papara,Standard',
      'CRM002,META002,Jane Smith,TR456,Card,TestCo,16.01.2024,Cekme,"500,00",0,"500,00",USD,Papara,VIP',
    ])
    const result = parseCsvFile(csv)
    expect(result.rows).toHaveLength(2)
  })

  it('skips rows with empty full_name', () => {
    const csv = buildCsv(HEADER, [
      'CRM001,META001,John Doe,TR123,Bank,TestCo,15.01.2024,Yatirim,"1.000,00",0,"1.000,00",TL,Papara,Standard',
      'CRM002,META002,,TR456,Card,TestCo,16.01.2024,Cekme,"500,00",0,"500,00",USD,Papara,VIP',
    ])
    const result = parseCsvFile(csv)
    expect(result.rows).toHaveLength(1)
  })

  it('throws on missing header row', () => {
    const csv = 'No header here\nJust data,values'
    expect(() => parseCsvFile(csv)).toThrow('Could not find header row')
  })

  it('maps all 14 columns correctly', () => {
    const csv = buildCsv(HEADER, [
      'CRM001,META001,John Doe,TR123,Bank Transfer,TestCo,15.01.2024,Yatirim,"1.000,00","50,00","950,00",TL,Papara,Standard',
    ])
    const result = parseCsvFile(csv)
    const row = result.rows[0]
    expect(row.crmId).toBe('CRM001')
    expect(row.metaId).toBe('META001')
    expect(row.fullName).toBe('John Doe')
    expect(row.iban).toBe('TR123')
    expect(row.paymentMethodName).toBe('Bank Transfer')
    expect(row.company).toBe('TestCo')
    expect(row.dateRaw).toBe('15.01.2024')
    expect(row.categoryName).toBe('Yatirim')
    expect(row.currency).toBe('TL')
    expect(row.pspName).toBe('Papara')
    expect(row.typeName).toBe('Standard')
  })

  it('extracts exchange rates from extended columns', () => {
    // Build a row with exchange rate data in columns 15 (date) and 23 (rate)
    const cols = new Array(24).fill('')
    cols[0] = 'CRM001'
    cols[2] = 'John Doe'
    cols[15] = '15.01.2024'
    cols[23] = '"32,50"'
    const dataRow = cols.join(',')
    const csv = buildCsv(HEADER, [dataRow])
    const result = parseCsvFile(csv)
    expect(result.exchangeRates.get('2024-01-15')).toBe(32.5)
  })

  it('returns totalRawRows count', () => {
    const csv = buildCsv(HEADER, [
      'CRM001,META001,John Doe,TR123,Bank,TestCo,15.01.2024,Yatirim,"1.000,00",0,"1.000,00",TL,Papara,Standard',
      ',,,,,,,,,,,,,,',
    ])
    const result = parseCsvFile(csv)
    expect(result.totalRawRows).toBe(2)
  })
})
