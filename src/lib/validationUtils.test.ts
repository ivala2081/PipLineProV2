import {
  validateEmail,
  isValidEmailFormat,
  calculatePasswordStrength,
  validatePassword,
  validatePasswordStrict,
  sanitizeInput,
  isAlphanumeric,
  isValidUrl,
  levenshteinDistance,
} from './validationUtils'

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    const result = validateEmail('user@gmail.com')
    expect(result.isValid).toBe(true)
  })

  it('rejects empty email', () => {
    const result = validateEmail('')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('emailRequired')
  })

  it('rejects whitespace-only email', () => {
    const result = validateEmail('   ')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('emailRequired')
  })

  it('rejects invalid format', () => {
    const result = validateEmail('notanemail')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('emailInvalid')
  })

  it('suggests correction for gmail.co typo', () => {
    const result = validateEmail('user@gmail.co')
    expect(result.isValid).toBe(true)
    expect(result.suggestion).toBe('user@gmail.com')
  })

  it('suggests correction for hotmail.cm typo', () => {
    const result = validateEmail('user@hotmail.cm')
    expect(result.isValid).toBe(true)
    expect(result.suggestion).toBe('user@hotmail.com')
  })

  it('no suggestion for valid domain', () => {
    const result = validateEmail('user@example.com')
    expect(result.isValid).toBe(true)
    expect(result.suggestion).toBeUndefined()
  })

  it('uses default regex for unknown locale', () => {
    const result = validateEmail('user@example.com', 'fr')
    expect(result.isValid).toBe(true)
  })
})

describe('isValidEmailFormat', () => {
  it('returns true for valid email', () => {
    expect(isValidEmailFormat('user@example.com')).toBe(true)
  })

  it('returns false for invalid email', () => {
    expect(isValidEmailFormat('notanemail')).toBe(false)
  })
})

describe('calculatePasswordStrength', () => {
  it('returns very-weak for empty password', () => {
    const result = calculatePasswordStrength('')
    expect(result.strength).toBe('very-weak')
    expect(result.score).toBe(0)
    expect(result.feedback).toContain('passwordEmpty')
  })

  it('flags short password (< 6 chars)', () => {
    const result = calculatePasswordStrength('Ab1!')
    expect(result.feedback).toContain('passwordTooShort')
  })

  it('flags 6-7 char password', () => {
    const result = calculatePasswordStrength('Abcde1')
    expect(result.feedback).toContain('passwordMinLength')
  })

  it('gives strong score for 12+ mixed chars', () => {
    const result = calculatePasswordStrength('MyStr0ng!Pass')
    expect(['strong', 'very-strong']).toContain(result.strength)
  })

  it('caps common password at low score', () => {
    const result = calculatePasswordStrength('password')
    expect(result.score).toBeLessThanOrEqual(20)
    expect(result.feedback).toContain('passwordTooCommon')
  })

  it('penalizes sequential digits', () => {
    const result = calculatePasswordStrength('abc12345X!')
    expect(result.feedback).toContain('passwordHasSequence')
  })

  it('penalizes repeated characters', () => {
    const result = calculatePasswordStrength('aaabbbX1!')
    expect(result.feedback).toContain('passwordHasRepeats')
  })

  it('penalizes keyboard patterns', () => {
    const result = calculatePasswordStrength('qwertyAB1!')
    expect(result.feedback).toContain('passwordKeyboardPattern')
  })

  it('ensures at least medium when all reqs met', () => {
    // "Abcd1234" has sequential digits penalty (-15), but strength floor
    // guarantees at least 'medium' when all 4 requirements are met
    const result = calculatePasswordStrength('Abcd1234')
    expect(['medium', 'strong', 'very-strong']).toContain(result.strength)
  })

  it('reports all requirement flags correctly', () => {
    const result = calculatePasswordStrength('Abc123!x')
    expect(result.hasMinLength).toBe(true)
    expect(result.hasUppercase).toBe(true)
    expect(result.hasLowercase).toBe(true)
    expect(result.hasNumber).toBe(true)
    expect(result.hasSpecialChar).toBe(true)
  })

  it('returns passwordStrong when no feedback', () => {
    const result = calculatePasswordStrength('VeryStr0ng!Pass99')
    expect(result.feedback).toContain('passwordStrong')
  })
})

describe('validatePassword', () => {
  it('returns true for non-empty password', () => {
    expect(validatePassword('x')).toBe(true)
  })

  it('returns false for empty password', () => {
    expect(validatePassword('')).toBe(false)
  })
})

describe('validatePasswordStrict', () => {
  it('accepts a strong password', () => {
    const result = validatePasswordStrict('StrongP@ss1')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects too short password', () => {
    const result = validatePasswordStrict('Ab1')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('passwordMinLength8')
  })

  it('rejects password missing uppercase', () => {
    const result = validatePasswordStrict('abcdefg1')
    expect(result.errors).toContain('passwordNeedsUppercase')
  })

  it('rejects password missing lowercase', () => {
    const result = validatePasswordStrict('ABCDEFG1')
    expect(result.errors).toContain('passwordNeedsLowercase')
  })

  it('rejects password missing number', () => {
    const result = validatePasswordStrict('Abcdefgh')
    expect(result.errors).toContain('passwordNeedsNumber')
  })

  it('rejects common password', () => {
    // Common passwords list is checked with .toLowerCase() on input
    // Use a value that exists in the list in lowercase form
    const result = validatePasswordStrict('12345678')
    expect(result.errors).toContain('passwordTooCommon')
  })
})

describe('sanitizeInput', () => {
  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })

  it('collapses multiple spaces', () => {
    expect(sanitizeInput('hello   world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('')
  })
})

describe('isAlphanumeric', () => {
  it('returns true for alphanumeric string', () => {
    expect(isAlphanumeric('abc123')).toBe(true)
  })

  it('returns false for string with special chars', () => {
    expect(isAlphanumeric('abc-123')).toBe(false)
  })

  it('returns false for string with spaces', () => {
    expect(isAlphanumeric('abc 123')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isAlphanumeric('')).toBe(false)
  })
})

describe('isValidUrl', () => {
  it('returns true for valid https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  it('returns true for valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
  })

  it('returns false for non-URL string', () => {
    expect(isValidUrl('not a url')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })
})

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0)
  })

  it('returns 1 for single substitution', () => {
    expect(levenshteinDistance('abc', 'abd')).toBe(1)
  })

  it('returns 1 for single insertion', () => {
    expect(levenshteinDistance('abc', 'abcd')).toBe(1)
  })

  it('returns 1 for single deletion', () => {
    expect(levenshteinDistance('abcd', 'abc')).toBe(1)
  })

  it('handles empty strings', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3)
    expect(levenshteinDistance('abc', '')).toBe(3)
  })

  it('handles both empty', () => {
    expect(levenshteinDistance('', '')).toBe(0)
  })
})
