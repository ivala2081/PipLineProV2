/**
 * HCaptcha Widget Component
 *
 * Wrapper around @hcaptcha/react-hcaptcha for consistent usage.
 * Shows CAPTCHA challenge after failed login attempts.
 *
 * @module HCaptchaWidget
 */

import { useRef, useCallback } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useTheme } from '@ds/hooks'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface HCaptchaWidgetProps {
  /** Callback when CAPTCHA is successfully verified */
  onVerify: (token: string) => void
  /** Callback when CAPTCHA expires */
  onExpire?: () => void
  /** Callback when CAPTCHA errors */
  onError?: (error: string) => void
  /** Optional size (default: normal) */
  size?: 'normal' | 'compact' | 'invisible'
  /** Optional class name */
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HCaptchaWidget({
  onVerify,
  onExpire,
  onError,
  size = 'normal',
  className,
}: HCaptchaWidgetProps) {
  const captchaRef = useRef<HCaptcha>(null)
  const { resolvedTheme } = useTheme()

  // Get site key from environment
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY

  // Handle verification success
  const handleVerify = useCallback(
    (token: string) => {
      if (import.meta.env.DEV) {
        console.log('[HCaptcha] Verification successful')
      }
      onVerify(token)
    },
    [onVerify]
  )

  // Handle expiration
  const handleExpire = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('[HCaptcha] Token expired')
    }
    onExpire?.()
  },  [onExpire])

  // Handle error
  const handleError = useCallback(
    (error: string) => {
      console.error('[HCaptcha] Error:', error)
      onError?.(error)
    },
    [onError]
  )

  // Reset CAPTCHA (expose via ref if needed)
  const resetCaptcha = useCallback(() => {
    captchaRef.current?.resetCaptcha()
  }, [])

  // Show error if site key is missing
  if (!siteKey) {
    if (import.meta.env.DEV) {
      return (
        <div className="rounded-md border border-red/20 bg-red/5 p-4 text-sm text-red">
          <strong>Missing CAPTCHA Site Key</strong>
          <br />
          Add <code>VITE_HCAPTCHA_SITE_KEY</code> to your <code>.env</code> file.
        </div>
      )
    }
    console.error('[HCaptcha] Missing VITE_HCAPTCHA_SITE_KEY')
    return null
  }

  return (
    <div className={className}>
      <HCaptcha
        ref={captchaRef}
        sitekey={siteKey}
        onVerify={handleVerify}
        onExpire={handleExpire}
        onError={handleError}
        size={size}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      />
    </div>
  )
}

// Export reset function for external use if needed
HCaptchaWidget.displayName = 'HCaptchaWidget'
