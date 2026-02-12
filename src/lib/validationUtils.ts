/**
 * Validation Utilities
 *
 * Centralized validation logic for forms with locale-specific rules.
 * Includes email validation, password strength checking, and typo suggestions.
 *
 * @module validationUtils
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PasswordStrength = 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong'

export interface PasswordStrengthResult {
  strength: PasswordStrength
  score: number // 0-100
  feedback: string[]
  hasMinLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

export interface EmailValidationResult {
  isValid: boolean
  error?: string
  suggestion?: string
}

/* ------------------------------------------------------------------ */
/*  Email Validation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Common email domain typos and their corrections
 */
const DOMAIN_TYPOS: Record<string, string> = {
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'outlok.com': 'outlook.com',
}

/**
 * Locale-specific email regex patterns
 * Supports international characters where appropriate
 */
const EMAIL_REGEX_BY_LOCALE: Record<string, RegExp> = {
  // English (strict)
  en: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // Turkish (allows Turkish characters)
  tr: /^[a-zA-Z0-9çÇğĞıİöÖşŞüÜ.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9çÇğĞıİöÖşŞüÜ](?:[a-zA-Z0-9çÇğĞıİöÖşŞüÜ-]{0,61}[a-zA-Z0-9çÇğĞıİöÖşŞüÜ])?(?:\.[a-zA-Z0-9çÇğĞıİöÖşŞüÜ](?:[a-zA-Z0-9çÇğĞıİöÖşŞüÜ-]{0,61}[a-zA-Z0-9çÇğĞıİöÖşŞüÜ])?)*$/,
}

/**
 * Default email regex (used when locale not found)
 */
const DEFAULT_EMAIL_REGEX = EMAIL_REGEX_BY_LOCALE.en

/**
 * Check if email domain is a common typo and suggest correction
 */
function checkEmailTypo(email: string): string | undefined {
  const parts = email.toLowerCase().split('@')
  if (parts.length !== 2) return undefined

  const domain = parts[1]
  const correction = DOMAIN_TYPOS[domain]

  return correction ? `${parts[0]}@${correction}` : undefined
}

/**
 * Validate email with locale-specific rules
 */
export function validateEmail(
  email: string,
  locale: string = 'en'
): EmailValidationResult {
  // Check if empty
  if (!email || !email.trim()) {
    return {
      isValid: false,
      error: 'emailRequired',
    }
  }

  const trimmedEmail = email.trim()

  // Get locale-specific regex or use default
  const regex = EMAIL_REGEX_BY_LOCALE[locale] || DEFAULT_EMAIL_REGEX

  // Validate format
  if (!regex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'emailInvalid',
    }
  }

  // Check for typos
  const suggestion = checkEmailTypo(trimmedEmail)

  return {
    isValid: true,
    suggestion,
  }
}

/**
 * Simple email format check (for quick validation)
 */
export function isValidEmailFormat(email: string): boolean {
  return DEFAULT_EMAIL_REGEX.test(email.trim())
}

/* ------------------------------------------------------------------ */
/*  Password Validation                                                */
/* ------------------------------------------------------------------ */

/**
 * Common weak passwords to reject
 */
const COMMON_PASSWORDS = [
  'password', '12345678', '123456789', 'qwerty', 'abc123',
  'password123', 'admin', 'letmein', 'welcome', 'monkey',
  '1234567890', 'Password1', 'Password123'
]

/**
 * Calculate password strength and provide feedback
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = []
  let score = 0

  // Check requirements
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(password)

  // Length scoring
  if (password.length === 0) {
    return {
      strength: 'very-weak',
      score: 0,
      feedback: ['passwordEmpty'],
      hasMinLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false,
    }
  }

  if (password.length < 6) {
    score += 10
    feedback.push('passwordTooShort')
  } else if (password.length < 8) {
    score += 20
    feedback.push('passwordMinLength')
  } else if (password.length < 12) {
    score += 30
  } else if (password.length < 16) {
    score += 40
  } else {
    score += 50
  }

  // Character variety scoring
  if (hasLowercase) score += 10
  else feedback.push('passwordNeedsLowercase')

  if (hasUppercase) score += 10
  else feedback.push('passwordNeedsUppercase')

  if (hasNumber) score += 10
  else feedback.push('passwordNeedsNumber')

  if (hasSpecialChar) score += 15
  else feedback.push('passwordNeedsSpecial')

  // Check for common patterns
  const lowerPassword = password.toLowerCase()

  // Sequential characters
  if (/012|123|234|345|456|567|678|789|890/.test(password)) {
    score -= 15
    feedback.push('passwordHasSequence')
  }

  // Repeated characters
  if (/(.)\1{2,}/.test(password)) {
    score -= 10
    feedback.push('passwordHasRepeats')
  }

  // Common passwords
  if (COMMON_PASSWORDS.includes(lowerPassword)) {
    score = Math.min(score, 20)
    feedback.push('passwordTooCommon')
  }

  // Keyboard patterns
  if (/(qwerty|asdfgh|zxcvbn)/i.test(password)) {
    score -= 15
    feedback.push('passwordKeyboardPattern')
  }

  // Ensure score is in bounds
  score = Math.max(0, Math.min(100, score))

  // Determine strength level
  let strength: PasswordStrength
  if (score < 20) strength = 'very-weak'
  else if (score < 40) strength = 'weak'
  else if (score < 60) strength = 'medium'
  else if (score < 80) strength = 'strong'
  else strength = 'very-strong'

  // If all requirements met, ensure at least medium
  if (hasMinLength && hasUppercase && hasLowercase && hasNumber) {
    if (strength === 'very-weak' || strength === 'weak') {
      strength = 'medium'
      score = Math.max(score, 50)
    }
  }

  return {
    strength,
    score,
    feedback: feedback.length === 0 ? ['passwordStrong'] : feedback,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  }
}

/**
 * Simple password validation (for login - just check if not empty)
 */
export function validatePassword(password: string): boolean {
  return password.length > 0
}

/**
 * Strict password validation (for registration/password change)
 */
export function validatePasswordStrict(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('passwordMinLength8')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('passwordNeedsUppercase')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('passwordNeedsLowercase')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('passwordNeedsNumber')
  }

  // Check common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('passwordTooCommon')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/* ------------------------------------------------------------------ */
/*  General Utilities                                                  */
/* ------------------------------------------------------------------ */

/**
 * Sanitize input (trim and remove extra whitespace)
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

/**
 * Check if string contains only alphanumeric characters
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str)
}

/**
 * Check if string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching and typo detection
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}
