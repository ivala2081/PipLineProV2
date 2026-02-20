/**
 * Error Message Parser
 *
 * Parses Supabase auth errors and returns user-friendly i18n keys.
 * Provides specific error messages instead of generic ones.
 *
 * @module errorMessages
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ParsedError {
  /** i18n key for the error message */
  messageKey: string
  /** Optional email domain suggestion (for typos) */
  suggestion?: string
  /** Error type for categorization */
  type: 'auth' | 'network' | 'validation' | 'rate_limit' | 'unknown'
}

/* ------------------------------------------------------------------ */
/*  Error Patterns                                                     */
/* ------------------------------------------------------------------ */

const ERROR_PATTERNS: Record<string, { key: string; type: ParsedError['type'] }> = {
  // Auth errors
  'Invalid login credentials': {
    key: 'login.errors.invalidCredentials',
    type: 'auth',
  },
  'Email not confirmed': {
    key: 'login.errors.emailNotConfirmed',
    type: 'auth',
  },
  'User not found': {
    key: 'login.errors.userNotFound',
    type: 'auth',
  },
  'Invalid email': {
    key: 'login.errors.invalidEmail',
    type: 'validation',
  },
  'Password is too weak': {
    key: 'login.errors.passwordTooWeak',
    type: 'validation',
  },

  // Network errors
  fetch: {
    key: 'login.errors.network',
    type: 'network',
  },
  network: {
    key: 'login.errors.network',
    type: 'network',
  },
  'Failed to fetch': {
    key: 'login.errors.network',
    type: 'network',
  },

  // Rate limiting
  'Too many requests': {
    key: 'login.errors.tooManyRequests',
    type: 'rate_limit',
  },
  'Rate limit': {
    key: 'login.errors.tooManyRequests',
    type: 'rate_limit',
  },
}

/* ------------------------------------------------------------------ */
/*  Email Domain Typos                                                 */
/* ------------------------------------------------------------------ */

const COMMON_DOMAIN_TYPOS: Record<string, string> = {
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

/* ------------------------------------------------------------------ */
/*  Functions                                                          */
/* ------------------------------------------------------------------ */

/**
 * Check if email has a common domain typo
 */
export function checkEmailDomainTypo(email: string): string | undefined {
  try {
    const parts = email.toLowerCase().split('@')
    if (parts.length !== 2) return undefined

    const domain = parts[1]
    const correction = COMMON_DOMAIN_TYPOS[domain]

    return correction ? correction : undefined
  } catch {
    return undefined
  }
}

/**
 * Parse Supabase auth error into user-friendly message
 */
export function parseAuthError(error: { message?: string } | null): ParsedError {
  if (!error || !error.message) {
    return {
      messageKey: 'login.errors.unknown',
      type: 'unknown',
    }
  }

  const message = error.message

  // Check for exact matches first
  for (const [pattern, config] of Object.entries(ERROR_PATTERNS)) {
    if (message.includes(pattern)) {
      return {
        messageKey: config.key,
        type: config.type,
      }
    }
  }

  // Default to generic error
  return {
    messageKey: 'login.error',
    type: 'unknown',
  }
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: { message?: string } | null): boolean {
  if (!error || !error.message) return false
  const message = error.message.toLowerCase()
  return message.includes('fetch') || message.includes('network')
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: { message?: string } | null): boolean {
  if (!error || !error.message) return false
  const message = error.message.toLowerCase()
  return message.includes('too many') || message.includes('rate limit')
}

/**
 * Get user-friendly error message key
 * Convenience function that combines parsing and key extraction
 */
export function getErrorMessageKey(error: { message?: string } | null): string {
  return parseAuthError(error).messageKey
}
