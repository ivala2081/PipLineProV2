import { localYMD, localYM, localDayStart, localDayEnd } from './date'

describe('localYMD', () => {
  it('formats a date correctly', () => {
    expect(localYMD(new Date(2024, 0, 15))).toBe('2024-01-15')
  })

  it('pads single-digit month', () => {
    expect(localYMD(new Date(2024, 2, 5))).toBe('2024-03-05')
  })

  it('pads single-digit day', () => {
    expect(localYMD(new Date(2024, 11, 1))).toBe('2024-12-01')
  })

  it('handles Dec 31', () => {
    expect(localYMD(new Date(2024, 11, 31))).toBe('2024-12-31')
  })

  it('handles Jan 1', () => {
    expect(localYMD(new Date(2025, 0, 1))).toBe('2025-01-01')
  })

  it('round-trips with Date constructor', () => {
    const date = new Date(2024, 5, 15)
    expect(localYMD(date)).toBe('2024-06-15')
  })
})

describe('localYM', () => {
  it('formats year-month correctly', () => {
    expect(localYM(new Date(2024, 0, 15))).toBe('2024-01')
  })

  it('pads single-digit month', () => {
    expect(localYM(new Date(2024, 8, 1))).toBe('2024-09')
  })

  it('handles December', () => {
    expect(localYM(new Date(2024, 11, 25))).toBe('2024-12')
  })
})

describe('localDayStart', () => {
  it('returns an ISO string ending in Z', () => {
    const result = localDayStart('2024-01-15')
    expect(result).toMatch(/Z$/)
  })

  it('represents midnight local time', () => {
    const result = localDayStart('2024-01-15')
    const date = new Date(result)
    expect(date.getHours()).toBe(0)
    expect(date.getMinutes()).toBe(0)
    expect(date.getSeconds()).toBe(0)
  })
})

describe('localDayEnd', () => {
  it('returns an ISO string ending in Z', () => {
    const result = localDayEnd('2024-01-15')
    expect(result).toMatch(/Z$/)
  })

  it('represents 23:59:59 local time', () => {
    const result = localDayEnd('2024-01-15')
    const date = new Date(result)
    expect(date.getHours()).toBe(23)
    expect(date.getMinutes()).toBe(59)
    expect(date.getSeconds()).toBe(59)
  })
})

describe('localDayStart vs localDayEnd', () => {
  it('start is before end for the same day', () => {
    const start = new Date(localDayStart('2024-06-15'))
    const end = new Date(localDayEnd('2024-06-15'))
    expect(start.getTime()).toBeLessThan(end.getTime())
  })
})
