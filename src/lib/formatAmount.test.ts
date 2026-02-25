import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from './formatAmount'

describe('formatAmount', () => {
  it('TR: adds thousands dots', () => {
    expect(formatAmount('1000', 'tr')).toBe('1.000')
  })

  it('TR: preserves comma decimal', () => {
    expect(formatAmount('1000,50', 'tr')).toBe('1.000,50')
  })

  it('TR: strips non-digit/comma characters', () => {
    expect(formatAmount('abc1000', 'tr')).toBe('1.000')
  })

  it('TR: limits to 2 decimal places', () => {
    expect(formatAmount('100,999', 'tr')).toBe('100,99')
  })

  it('EN: adds thousands commas', () => {
    expect(formatAmount('1000', 'en')).toBe('1,000')
  })

  it('EN: preserves dot decimal', () => {
    expect(formatAmount('1000.50', 'en')).toBe('1,000.50')
  })

  it('EN: strips non-digit/dot characters', () => {
    expect(formatAmount('abc1000', 'en')).toBe('1,000')
  })

  it('returns empty string for empty input', () => {
    expect(formatAmount('', 'tr')).toBe('')
    expect(formatAmount('', 'en')).toBe('')
  })

  it('TR: formats large numbers', () => {
    expect(formatAmount('1000000', 'tr')).toBe('1.000.000')
  })

  it('EN: formats large numbers', () => {
    expect(formatAmount('1000000', 'en')).toBe('1,000,000')
  })
})

describe('parseAmount', () => {
  it('TR: parses "1.000,50"', () => {
    expect(parseAmount('1.000,50', 'tr')).toBe(1000.5)
  })

  it('TR: parses "10.000"', () => {
    expect(parseAmount('10.000', 'tr')).toBe(10000)
  })

  it('EN: parses "1,000.50"', () => {
    expect(parseAmount('1,000.50', 'en')).toBe(1000.5)
  })

  it('EN: parses "10,000"', () => {
    expect(parseAmount('10,000', 'en')).toBe(10000)
  })

  it('returns 0 for invalid input', () => {
    expect(parseAmount('abc', 'tr')).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(parseAmount('', 'en')).toBe(0)
  })
})

describe('numberToDisplay', () => {
  it('TR: converts 1000.5 to "1.000,5"', () => {
    expect(numberToDisplay(1000.5, 'tr')).toBe('1.000,5')
  })

  it('EN: converts 1000.5 to "1,000.5"', () => {
    expect(numberToDisplay(1000.5, 'en')).toBe('1,000.5')
  })

  it('returns empty string for 0', () => {
    expect(numberToDisplay(0, 'tr')).toBe('')
  })

  it('returns empty string for NaN', () => {
    expect(numberToDisplay(NaN, 'en')).toBe('')
  })
})

describe('amountPlaceholder', () => {
  it('returns "0,00" for TR', () => {
    expect(amountPlaceholder('tr')).toBe('0,00')
  })

  it('returns "0.00" for EN', () => {
    expect(amountPlaceholder('en')).toBe('0.00')
  })
})
