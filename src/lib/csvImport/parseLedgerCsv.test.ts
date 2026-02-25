import { parseLedgerCsv } from './parseLedgerCsv'

function buildLedgerCsv(dataRows: string[]): string {
  // 10-column structure: AÇIKLAMA, TÜR, GİREN MİKTAR, GİREN PARA, ÇIKAN MİKTAR, ÇIKAN PARA, DÖNEM, TARİH, ÖDEME DÖN, KASA
  const header =
    'AÇIKLAMA,TÜR,GİREN MİKTAR,GİREN PARA,ÇIKAN MİKTAR,ÇIKAN PARA,DÖNEM,TARİH,ÖDEME DÖN,KASA'
  return [header, ...dataRows].join('\n')
}

function validOutRow(overrides: Record<number, string> = {}): string {
  const cols = [
    'Test Payment', // 0: AÇIKLAMA
    'ÖDEME', // 1: TÜR
    '', // 2: GİREN MİKTAR
    '', // 3: GİREN PARA
    '"1.000,00"', // 4: ÇIKAN MİKTAR
    'TL', // 5: ÇIKAN PARA
    '2024-01', // 6: DÖNEM
    '15.01.2024', // 7: TARİH
    '2024-01', // 8: ÖDEME DÖN
    'NAKİT TL', // 9: KASA
  ]
  for (const [idx, val] of Object.entries(overrides)) {
    cols[Number(idx)] = val
  }
  return cols.join(',')
}

describe('parseLedgerCsv', () => {
  it('parses a valid ledger CSV', () => {
    const csv = buildLedgerCsv([validOutRow()])
    const result = parseLedgerCsv(csv)
    expect(result.validRows).toBeGreaterThan(0)
    expect(result.errorRows).toBe(0)
  })

  it('finds header by AÇIKLAMA', () => {
    const csv = buildLedgerCsv([validOutRow()])
    // Does not throw
    expect(() => parseLedgerCsv(csv)).not.toThrow()
  })

  it('throws on missing header', () => {
    const csv = 'No header here\nJust,data'
    expect(() => parseLedgerCsv(csv)).toThrow('Could not find header row')
  })

  it('normalizes ÖDEME to ODEME', () => {
    const csv = buildLedgerCsv([validOutRow({ 1: 'ÖDEME' })])
    const result = parseLedgerCsv(csv)
    expect(result.rows[0].entryType).toBe('ODEME')
  })

  it('normalizes ÖDEMDE typo to ODEME with warning', () => {
    const csv = buildLedgerCsv([validOutRow({ 1: 'ÖDEMDE' })])
    const result = parseLedgerCsv(csv)
    expect(result.rows[0].entryType).toBe('ODEME')
    const typoWarning = result.rows[0].issues.find(
      (i) => i.severity === 'warning' && i.field === 'entry_type',
    )
    expect(typoWarning).toBeDefined()
  })

  it('normalizes TRANSFER entry type', () => {
    const csv = buildLedgerCsv([validOutRow({ 1: 'TRANSFER' })])
    const result = parseLedgerCsv(csv)
    expect(result.rows[0].entryType).toBe('TRANSFER')
  })

  it('flags unknown entry type', () => {
    const csv = buildLedgerCsv([validOutRow({ 1: 'REFUND' })])
    const result = parseLedgerCsv(csv)
    const issue = result.rows[0].issues.find(
      (i) => i.severity === 'error' && i.field === 'entry_type',
    )
    expect(issue).toBeDefined()
  })

  it('determines direction IN from GİREN column', () => {
    const csv = buildLedgerCsv([validOutRow({ 2: '"500,00"', 3: 'USD', 4: '', 5: '' })])
    const result = parseLedgerCsv(csv)
    expect(result.rows[0].direction).toBe('in')
    expect(result.rows[0].amount).toBe(500)
  })

  it('determines direction OUT from ÇIKAN column', () => {
    const csv = buildLedgerCsv([validOutRow()])
    const result = parseLedgerCsv(csv)
    expect(result.rows[0].direction).toBe('out')
  })

  it('normalizes NAKİT TL register to NAKIT_TL', () => {
    const csv = buildLedgerCsv([validOutRow({ 9: 'NAKİT TL' })])
    const result = parseLedgerCsv(csv)
    expect(result.rows[0].register).toBe('NAKIT_TL')
  })

  it('normalizes NAKİT USD register to NAKIT_USD', () => {
    const csv = buildLedgerCsv([validOutRow({ 9: 'NAKİT USD' })])
    const result = parseLedgerCsv(csv)
    expect(result.rows[0].register).toBe('NAKIT_USD')
  })

  it('maps TRX to USDT register', () => {
    const csv = buildLedgerCsv([validOutRow({ 9: 'TRX' })])
    const result = parseLedgerCsv(csv)
    expect(result.rows[0].register).toBe('USDT')
  })

  it('parses dates correctly', () => {
    const csv = buildLedgerCsv([validOutRow()])
    const result = parseLedgerCsv(csv)
    expect(result.rows[0].entryDate).toBe('2024-01-15')
  })

  it('skips fully empty rows', () => {
    const csv = buildLedgerCsv([validOutRow(), ',,,,,,,,,,'])
    const result = parseLedgerCsv(csv)
    expect(result.rows).toHaveLength(1)
  })

  it('counts valid, error, and warning rows', () => {
    const csv = buildLedgerCsv([validOutRow(), validOutRow({ 1: 'INVALID_TYPE' })])
    const result = parseLedgerCsv(csv)
    expect(result.validRows).toBe(1)
    expect(result.errorRows).toBe(1)
  })
})
