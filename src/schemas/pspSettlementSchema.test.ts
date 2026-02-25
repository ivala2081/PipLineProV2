import { settlementFormSchema } from './pspSettlementSchema'

function validInput() {
  return {
    settlement_date: '2024-01-15',
    amount: 100,
    currency: 'TL' as const,
  }
}

describe('settlementFormSchema', () => {
  it('accepts a valid settlement', () => {
    const result = settlementFormSchema.safeParse(validInput())
    expect(result.success).toBe(true)
  })

  it('rejects empty date', () => {
    const result = settlementFormSchema.safeParse({ ...validInput(), settlement_date: '' })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = settlementFormSchema.safeParse({ ...validInput(), amount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = settlementFormSchema.safeParse({ ...validInput(), amount: -10 })
    expect(result.success).toBe(false)
  })

  it('coerces string amount to number', () => {
    const result = settlementFormSchema.safeParse({ ...validInput(), amount: '200' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.amount).toBe(200)
  })

  it('accepts TL currency', () => {
    const result = settlementFormSchema.safeParse({ ...validInput(), currency: 'TL' })
    expect(result.success).toBe(true)
  })

  it('accepts USD currency', () => {
    const result = settlementFormSchema.safeParse({ ...validInput(), currency: 'USD' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid currency', () => {
    const result = settlementFormSchema.safeParse({ ...validInput(), currency: 'USDT' })
    expect(result.success).toBe(false)
  })

  it('allows optional notes to be omitted', () => {
    const result = settlementFormSchema.safeParse(validInput())
    expect(result.success).toBe(true)
  })
})
