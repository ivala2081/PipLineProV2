import { teyitEntrySchema, reconciliationConfigSchema } from './reconciliationSchema'

describe('teyitEntrySchema', () => {
  it('accepts a valid entry', () => {
    const result = teyitEntrySchema.safeParse({ label: 'Item', amount: 100, currency: 'USD' })
    expect(result.success).toBe(true)
  })

  it('rejects empty label', () => {
    const result = teyitEntrySchema.safeParse({ label: '', amount: 100, currency: 'USD' })
    expect(result.success).toBe(false)
  })

  it('coerces string amount to number', () => {
    const result = teyitEntrySchema.safeParse({ label: 'Item', amount: '50', currency: 'USD' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.amount).toBe(50)
  })

  it('accepts USD currency', () => {
    const result = teyitEntrySchema.safeParse({ label: 'Item', amount: 100, currency: 'USD' })
    expect(result.success).toBe(true)
  })

  it('accepts TL currency', () => {
    const result = teyitEntrySchema.safeParse({ label: 'Item', amount: 100, currency: 'TL' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid currency', () => {
    const result = teyitEntrySchema.safeParse({ label: 'Item', amount: 100, currency: 'EUR' })
    expect(result.success).toBe(false)
  })
})

describe('reconciliationConfigSchema', () => {
  it('accepts a valid config with entries', () => {
    const result = reconciliationConfigSchema.safeParse({
      devir_usdt: 1000,
      kur: 32.5,
      teyit_entries: [{ label: 'Entry 1', amount: 500, currency: 'USD' }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts all nullable numeric fields as null', () => {
    const result = reconciliationConfigSchema.safeParse({
      devir_usdt: null,
      devir_nakit_tl: null,
      devir_nakit_usd: null,
      kur: null,
      bekl_tahs: null,
      teyit_entries: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts omitted optional fields', () => {
    const result = reconciliationConfigSchema.safeParse({ teyit_entries: [] })
    expect(result.success).toBe(true)
  })

  it('accepts empty teyit_entries array', () => {
    const result = reconciliationConfigSchema.safeParse({ teyit_entries: [] })
    expect(result.success).toBe(true)
  })

  it('validates nested teyit entries', () => {
    const result = reconciliationConfigSchema.safeParse({
      teyit_entries: [{ label: '', amount: 100, currency: 'USD' }],
    })
    expect(result.success).toBe(false)
  })
})
