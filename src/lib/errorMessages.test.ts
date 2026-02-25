import {
  parseAuthError,
  checkEmailDomainTypo,
  isNetworkError,
  isRateLimitError,
  getErrorMessageKey,
} from './errorMessages'

describe('parseAuthError', () => {
  it('returns unknown for null error', () => {
    const result = parseAuthError(null)
    expect(result.messageKey).toBe('login.errors.unknown')
    expect(result.type).toBe('unknown')
  })

  it('returns unknown for missing message', () => {
    const result = parseAuthError({ message: undefined })
    expect(result.messageKey).toBe('login.errors.unknown')
    expect(result.type).toBe('unknown')
  })

  it('parses invalid credentials', () => {
    const result = parseAuthError({ message: 'Invalid login credentials' })
    expect(result.messageKey).toBe('login.errors.invalidCredentials')
    expect(result.type).toBe('auth')
  })

  it('parses email not confirmed', () => {
    const result = parseAuthError({ message: 'Email not confirmed' })
    expect(result.messageKey).toBe('login.errors.emailNotConfirmed')
    expect(result.type).toBe('auth')
  })

  it('parses user not found', () => {
    const result = parseAuthError({ message: 'User not found' })
    expect(result.messageKey).toBe('login.errors.userNotFound')
    expect(result.type).toBe('auth')
  })

  it('parses network error (Failed to fetch)', () => {
    const result = parseAuthError({ message: 'Failed to fetch' })
    expect(result.type).toBe('network')
  })

  it('parses rate limit error', () => {
    const result = parseAuthError({ message: 'Too many requests' })
    expect(result.type).toBe('rate_limit')
  })

  it('parses Rate limit pattern', () => {
    const result = parseAuthError({ message: 'Rate limit exceeded' })
    expect(result.type).toBe('rate_limit')
  })

  it('returns generic error for unknown message', () => {
    const result = parseAuthError({ message: 'something weird happened' })
    expect(result.messageKey).toBe('login.error')
    expect(result.type).toBe('unknown')
  })
})

describe('checkEmailDomainTypo', () => {
  it('detects gmail.co typo', () => {
    expect(checkEmailDomainTypo('user@gmail.co')).toBe('gmail.com')
  })

  it('detects gmial.com typo', () => {
    expect(checkEmailDomainTypo('user@gmial.com')).toBe('gmail.com')
  })

  it('returns undefined for valid domain', () => {
    expect(checkEmailDomainTypo('user@example.com')).toBeUndefined()
  })

  it('returns undefined for missing @ sign', () => {
    expect(checkEmailDomainTypo('usergmail.com')).toBeUndefined()
  })

  it('is case-insensitive', () => {
    expect(checkEmailDomainTypo('USER@GMAIL.CO')).toBe('gmail.com')
  })
})

describe('isNetworkError', () => {
  it('detects fetch error', () => {
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true)
  })

  it('detects network error', () => {
    expect(isNetworkError({ message: 'network error' })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isNetworkError(null)).toBe(false)
  })

  it('returns false for non-network error', () => {
    expect(isNetworkError({ message: 'Invalid credentials' })).toBe(false)
  })
})

describe('isRateLimitError', () => {
  it('detects "Too many" error', () => {
    expect(isRateLimitError({ message: 'Too many requests' })).toBe(true)
  })

  it('detects "rate limit" error', () => {
    expect(isRateLimitError({ message: 'rate limit exceeded' })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isRateLimitError(null)).toBe(false)
  })

  it('returns false for non-rate-limit error', () => {
    expect(isRateLimitError({ message: 'Invalid credentials' })).toBe(false)
  })
})

describe('getErrorMessageKey', () => {
  it('returns the same key as parseAuthError', () => {
    const error = { message: 'Invalid login credentials' }
    expect(getErrorMessageKey(error)).toBe(parseAuthError(error).messageKey)
  })

  it('returns unknown key for null', () => {
    expect(getErrorMessageKey(null)).toBe('login.errors.unknown')
  })
})
