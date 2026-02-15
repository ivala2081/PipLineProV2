import { describe, it, expect } from 'vitest'
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
  describe('basic validation', () => {
    it('should validate correct email addresses', () => {
      const result = validateEmail('test@example.com')
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty email', () => {
      const result = validateEmail('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('emailRequired')
    })

    it('should reject email without @ symbol', () => {
      const result = validateEmail('testexample.com')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('emailInvalid')
    })

    it('should reject email without domain', () => {
      const result = validateEmail('test@')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('emailInvalid')
    })

    it('should trim whitespace', () => {
      const result = validateEmail('  test@example.com  ')
      expect(result.isValid).toBe(true)
    })
  })

  describe('typo detection', () => {
    it('should suggest correction for gmail.co typo', () => {
      const result = validateEmail('user@gmail.co')
      expect(result.isValid).toBe(true)
      expect(result.suggestion).toBe('user@gmail.com')
    })

    it('should suggest correction for gmial.com typo', () => {
      const result = validateEmail('user@gmial.com')
      expect(result.isValid).toBe(true)
      expect(result.suggestion).toBe('user@gmail.com')
    })

    it('should suggest correction for hotmail.co typo', () => {
      const result = validateEmail('user@hotmail.co')
      expect(result.isValid).toBe(true)
      expect(result.suggestion).toBe('user@hotmail.com')
    })

    it('should suggest correction for yahoo.cm typo', () => {
      const result = validateEmail('user@yahoo.cm')
      expect(result.isValid).toBe(true)
      expect(result.suggestion).toBe('user@yahoo.com')
    })

    it('should not suggest correction for correct domain', () => {
      const result = validateEmail('user@gmail.com')
      expect(result.isValid).toBe(true)
      expect(result.suggestion).toBeUndefined()
    })
  })

  describe('locale-specific validation', () => {
    it('should accept Turkish characters in tr locale', () => {
      const result = validateEmail('öğrenci@üniversite.edu.tr', 'tr')
      expect(result.isValid).toBe(true)
    })

    it('should accept standard emails in tr locale', () => {
      const result = validateEmail('test@example.com', 'tr')
      expect(result.isValid).toBe(true)
    })

    it('should use English regex as default for unknown locale', () => {
      const result = validateEmail('test@example.com', 'de')
      expect(result.isValid).toBe(true)
    })
  })
})

describe('isValidEmailFormat', () => {
  it('should return true for valid emails', () => {
    expect(isValidEmailFormat('test@example.com')).toBe(true)
    expect(isValidEmailFormat('user.name+tag@example.co.uk')).toBe(true)
  })

  it('should return false for invalid emails', () => {
    expect(isValidEmailFormat('invalid')).toBe(false)
    expect(isValidEmailFormat('invalid@')).toBe(false)
    expect(isValidEmailFormat('@example.com')).toBe(false)
  })

  it('should trim whitespace', () => {
    expect(isValidEmailFormat('  test@example.com  ')).toBe(true)
  })
})

describe('calculatePasswordStrength', () => {
  describe('empty password', () => {
    it('should return very-weak for empty password', () => {
      const result = calculatePasswordStrength('')
      expect(result.strength).toBe('very-weak')
      expect(result.score).toBe(0)
      expect(result.feedback).toContain('passwordEmpty')
    })
  })

  describe('very weak passwords', () => {
    it('should detect short password', () => {
      const result = calculatePasswordStrength('abc')
      expect(['very-weak', 'weak']).toContain(result.strength)
      expect(result.hasMinLength).toBe(false)
      expect(result.feedback).toContain('passwordTooShort')
    })

    it('should detect common password', () => {
      const result = calculatePasswordStrength('password')
      expect(result.score).toBeLessThanOrEqual(20)
      expect(result.feedback).toContain('passwordTooCommon')
    })

    it('should detect keyboard patterns', () => {
      const result = calculatePasswordStrength('qwertyuiop')
      expect(result.feedback).toContain('passwordKeyboardPattern')
    })
  })

  describe('weak passwords', () => {
    it('should detect password with sequential numbers', () => {
      const result = calculatePasswordStrength('abc123456')
      expect(result.feedback).toContain('passwordHasSequence')
    })

    it('should detect password with repeated characters', () => {
      const result = calculatePasswordStrength('aaa111bbb')
      expect(result.feedback).toContain('passwordHasRepeats')
    })
  })

  describe('medium passwords', () => {
    it('should rate password with all basic requirements as medium+', () => {
      const result = calculatePasswordStrength('Password1')
      expect(result.hasMinLength).toBe(true)
      expect(result.hasUppercase).toBe(true)
      expect(result.hasLowercase).toBe(true)
      expect(result.hasNumber).toBe(true)
      expect(['medium', 'strong', 'very-strong']).toContain(result.strength)
    })
  })

  describe('strong passwords', () => {
    it('should rate long diverse password as strong', () => {
      const result = calculatePasswordStrength('MySecureP@ssw0rd')
      expect(result.strength).toMatch(/strong|very-strong/)
      expect(result.hasMinLength).toBe(true)
      expect(result.hasUppercase).toBe(true)
      expect(result.hasLowercase).toBe(true)
      expect(result.hasNumber).toBe(true)
      expect(result.hasSpecialChar).toBe(true)
    })
  })

  describe('very strong passwords', () => {
    it('should rate long complex password as very strong', () => {
      const result = calculatePasswordStrength('C0mpl3x!P@ssw0rd#2024')
      expect(result.strength).toBe('very-strong')
      expect(result.score).toBeGreaterThanOrEqual(80)
      expect(result.hasMinLength).toBe(true)
      expect(result.hasSpecialChar).toBe(true)
    })
  })

  describe('requirement flags', () => {
    it('should correctly detect uppercase', () => {
      expect(calculatePasswordStrength('PASSWORD').hasUppercase).toBe(true)
      expect(calculatePasswordStrength('password').hasUppercase).toBe(false)
    })

    it('should correctly detect lowercase', () => {
      expect(calculatePasswordStrength('password').hasLowercase).toBe(true)
      expect(calculatePasswordStrength('PASSWORD').hasLowercase).toBe(false)
    })

    it('should correctly detect numbers', () => {
      expect(calculatePasswordStrength('password123').hasNumber).toBe(true)
      expect(calculatePasswordStrength('password').hasNumber).toBe(false)
    })

    it('should correctly detect special characters', () => {
      expect(calculatePasswordStrength('password!').hasSpecialChar).toBe(true)
      expect(calculatePasswordStrength('password@').hasSpecialChar).toBe(true)
      expect(calculatePasswordStrength('password#').hasSpecialChar).toBe(true)
      expect(calculatePasswordStrength('password').hasSpecialChar).toBe(false)
    })

    it('should correctly detect minimum length', () => {
      expect(calculatePasswordStrength('12345678').hasMinLength).toBe(true)
      expect(calculatePasswordStrength('1234567').hasMinLength).toBe(false)
    })
  })
})

describe('validatePassword', () => {
  it('should return true for non-empty password', () => {
    expect(validatePassword('password')).toBe(true)
    expect(validatePassword('a')).toBe(true)
    expect(validatePassword('123')).toBe(true)
  })

  it('should return false for empty password', () => {
    expect(validatePassword('')).toBe(false)
  })
})

describe('validatePasswordStrict', () => {
  it('should validate strong password', () => {
    const result = validatePasswordStrict('MyP@ssw0rd')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject password shorter than 8 characters', () => {
    const result = validatePasswordStrict('Abc123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('passwordMinLength8')
  })

  it('should reject password without uppercase', () => {
    const result = validatePasswordStrict('password123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('passwordNeedsUppercase')
  })

  it('should reject password without lowercase', () => {
    const result = validatePasswordStrict('PASSWORD123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('passwordNeedsLowercase')
  })

  it('should reject password without number', () => {
    const result = validatePasswordStrict('PasswordABC')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('passwordNeedsNumber')
  })

  it('should reject common passwords', () => {
    const result = validatePasswordStrict('Password123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('passwordTooCommon')
  })

  it('should accumulate multiple errors', () => {
    const result = validatePasswordStrict('abc')
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

describe('sanitizeInput', () => {
  it('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })

  it('should replace multiple spaces with single space', () => {
    expect(sanitizeInput('hello    world')).toBe('hello world')
    expect(sanitizeInput('one  two   three')).toBe('one two three')
  })

  it('should handle tabs and newlines', () => {
    expect(sanitizeInput('hello\t\tworld')).toBe('hello world')
    expect(sanitizeInput('hello\n\nworld')).toBe('hello world')
  })

  it('should handle already clean input', () => {
    expect(sanitizeInput('hello world')).toBe('hello world')
  })
})

describe('isAlphanumeric', () => {
  it('should return true for alphanumeric strings', () => {
    expect(isAlphanumeric('abc123')).toBe(true)
    expect(isAlphanumeric('ABC')).toBe(true)
    expect(isAlphanumeric('123')).toBe(true)
    expect(isAlphanumeric('Test123')).toBe(true)
  })

  it('should return false for non-alphanumeric strings', () => {
    expect(isAlphanumeric('hello world')).toBe(false) // space
    expect(isAlphanumeric('hello-world')).toBe(false) // hyphen
    expect(isAlphanumeric('test@example')).toBe(false) // special char
    expect(isAlphanumeric('hello_world')).toBe(false) // underscore
  })

  it('should return false for empty string', () => {
    expect(isAlphanumeric('')).toBe(false)
  })
})

describe('isValidUrl', () => {
  it('should return true for valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('https://example.com/path')).toBe(true)
    expect(isValidUrl('https://example.com:8080')).toBe(true)
    expect(isValidUrl('https://sub.example.com')).toBe(true)
  })

  it('should return false for invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false)
    expect(isValidUrl('example.com')).toBe(false) // missing protocol
    expect(isValidUrl('http://')).toBe(false)
    expect(isValidUrl('')).toBe(false)
  })

  it('should handle various protocols', () => {
    expect(isValidUrl('ftp://example.com')).toBe(true)
    expect(isValidUrl('mailto:test@example.com')).toBe(true)
  })
})

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0)
    expect(levenshteinDistance('', '')).toBe(0)
  })

  it('should calculate single character difference', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1) // substitution
    expect(levenshteinDistance('cat', 'cats')).toBe(1) // insertion
    expect(levenshteinDistance('cats', 'cat')).toBe(1) // deletion
  })

  it('should calculate multiple character differences', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
    expect(levenshteinDistance('saturday', 'sunday')).toBe(3)
  })

  it('should handle empty strings', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5)
    expect(levenshteinDistance('hello', '')).toBe(5)
  })

  it('should calculate distance for common typos', () => {
    expect(levenshteinDistance('gmail.com', 'gmial.com')).toBe(2)
    expect(levenshteinDistance('gmail.com', 'gmail.co')).toBe(1)
  })

  it('should be symmetric', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(levenshteinDistance('xyz', 'abc'))
  })
})
