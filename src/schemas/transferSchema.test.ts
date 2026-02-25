import { transferFormSchema } from './transferSchema'

function validInput() {
  return {
    full_name: 'John Doe',
    payment_method_id: 'pm-1',
    psp_id: 'psp-1',
    transfer_date: '2024-01-15',
    category_id: 'cat-1',
    raw_amount: 100,
    currency: 'TL',
    type_id: 'type-1',
    exchange_rate: 1,
  }
}

describe('transferFormSchema', () => {
  it('accepts a valid complete form', () => {
    const result = transferFormSchema.safeParse(validInput())
    expect(result.success).toBe(true)
  })

  it('rejects empty full_name', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), full_name: '' })
    expect(result.success).toBe(false)
  })

  it('trims full_name whitespace', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), full_name: '  John  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.full_name).toBe('John')
  })

  it('rejects empty payment_method_id', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), payment_method_id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty psp_id', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), psp_id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty transfer_date', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), transfer_date: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty category_id', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), category_id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), raw_amount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), raw_amount: -5 })
    expect(result.success).toBe(false)
  })

  it('coerces string amount to number', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), raw_amount: '150' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.raw_amount).toBe(150)
  })

  it('rejects exchange_rate above 200', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), exchange_rate: 201 })
    expect(result.success).toBe(false)
  })

  it('accepts exchange_rate at 200', () => {
    const result = transferFormSchema.safeParse({ ...validInput(), exchange_rate: 200 })
    expect(result.success).toBe(true)
  })

  it('defaults exchange_rate to 1 when omitted', () => {
    const input = validInput()
    delete (input as Record<string, unknown>).exchange_rate
    const result = transferFormSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.exchange_rate).toBe(1)
  })

  it('allows optional fields to be omitted', () => {
    const result = transferFormSchema.safeParse(validInput())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.crm_id).toBeUndefined()
      expect(result.data.meta_id).toBeUndefined()
      expect(result.data.notes).toBeUndefined()
    }
  })

  it('defaults is_first_deposit to null', () => {
    const result = transferFormSchema.safeParse(validInput())
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.is_first_deposit).toBeNull()
  })
})
