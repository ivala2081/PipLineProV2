import { entryFormSchema, walletFormSchema } from './accountingSchema'

function validEntry() {
  return {
    description: 'Test payment',
    entry_type: 'ODEME' as const,
    direction: 'out' as const,
    amount: 100,
    currency: 'TL' as const,
    entry_date: '2024-01-15',
    register: 'NAKIT_TL' as const,
  }
}

function validWallet() {
  return {
    label: 'My Wallet',
    address: 'TRx1234567890abcdef',
    chain: 'tron' as const,
  }
}

describe('entryFormSchema', () => {
  it('accepts a valid ODEME entry', () => {
    const result = entryFormSchema.safeParse(validEntry())
    expect(result.success).toBe(true)
  })

  it('accepts a valid TRANSFER entry', () => {
    const result = entryFormSchema.safeParse({ ...validEntry(), entry_type: 'TRANSFER' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid entry_type', () => {
    const result = entryFormSchema.safeParse({ ...validEntry(), entry_type: 'REFUND' })
    expect(result.success).toBe(false)
  })

  it('accepts direction in and out', () => {
    expect(entryFormSchema.safeParse({ ...validEntry(), direction: 'in' }).success).toBe(true)
    expect(entryFormSchema.safeParse({ ...validEntry(), direction: 'out' }).success).toBe(true)
  })

  it('rejects invalid direction', () => {
    const result = entryFormSchema.safeParse({ ...validEntry(), direction: 'left' })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = entryFormSchema.safeParse({ ...validEntry(), amount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = entryFormSchema.safeParse({ ...validEntry(), amount: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts all valid currencies', () => {
    for (const c of ['TL', 'USD', 'USDT'] as const) {
      expect(entryFormSchema.safeParse({ ...validEntry(), currency: c }).success).toBe(true)
    }
  })

  it('rejects invalid currency', () => {
    const result = entryFormSchema.safeParse({ ...validEntry(), currency: 'EUR' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid registers', () => {
    for (const r of ['USDT', 'NAKIT_TL', 'NAKIT_USD'] as const) {
      expect(entryFormSchema.safeParse({ ...validEntry(), register: r }).success).toBe(true)
    }
  })

  it('defaults description_preset to diger', () => {
    const result = entryFormSchema.safeParse(validEntry())
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.description_preset).toBe('diger')
  })

  it('accepts nullable hr_employee_id', () => {
    const result = entryFormSchema.safeParse({ ...validEntry(), hr_employee_id: null })
    expect(result.success).toBe(true)
  })

  it('rejects empty description', () => {
    const result = entryFormSchema.safeParse({ ...validEntry(), description: '' })
    expect(result.success).toBe(false)
  })
})

describe('walletFormSchema', () => {
  it('accepts a valid wallet', () => {
    const result = walletFormSchema.safeParse(validWallet())
    expect(result.success).toBe(true)
  })

  it('rejects empty label', () => {
    const result = walletFormSchema.safeParse({ ...validWallet(), label: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty address', () => {
    const result = walletFormSchema.safeParse({ ...validWallet(), address: '' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid chains', () => {
    for (const chain of ['tron', 'ethereum', 'bsc', 'bitcoin', 'solana'] as const) {
      expect(walletFormSchema.safeParse({ ...validWallet(), chain }).success).toBe(true)
    }
  })

  it('rejects invalid chain', () => {
    const result = walletFormSchema.safeParse({ ...validWallet(), chain: 'polygon' })
    expect(result.success).toBe(false)
  })
})
