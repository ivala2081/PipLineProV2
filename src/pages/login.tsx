import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeSlash, Sun, Moon, Globe } from '@phosphor-icons/react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/useToast'
import {
  Button,
  Card,
  Input,
  FormMessage,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ds'
import { useTheme, useLocale } from '@ds/hooks'
import { HCaptchaWidget } from '@/components/HCaptchaWidget'
import { SuccessCheckmark } from '@/components/SuccessCheckmark'
import { validateEmail } from '@/lib/validationUtils'
import { parseAuthError } from '@/lib/errorMessages'
import haptics from '@/lib/haptics'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_ATTEMPTS = 3 // Show CAPTCHA after 3 failed attempts
const LOCKOUT_SECONDS = 30

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function LoginPage() {
  const { t } = useTranslation('pages')
  const { signIn } = useAuth()
  const { toast } = useToast()
  const { toggleTheme, resolvedTheme } = useTheme()
  const { locale, changeLocale, localeNames } = useLocale()
  const navigate = useNavigate()

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Validation state
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [serverError, setServerError] = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState('')

  // CAPTCHA state
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  // Rate limiting
  const [lockoutEnd, setLockoutEnd] = useState(0)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const lockoutTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Lockout countdown
  useEffect(() => {
    if (lockoutEnd <= Date.now()) return

    const tick = () => {
      const remaining = Math.ceil((lockoutEnd - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockoutRemaining(0)
        if (lockoutTimer.current) clearInterval(lockoutTimer.current)
      } else {
        setLockoutRemaining(remaining)
      }
    }

    tick()
    lockoutTimer.current = setInterval(tick, 1000)
    return () => {
      if (lockoutTimer.current) clearInterval(lockoutTimer.current)
    }
  }, [lockoutEnd])

  // Validation
  const handleEmailValidation = (value: string): string => {
    const result = validateEmail(value, locale)

    // Check for typo suggestions
    if (result.isValid && result.suggestion) {
      const suggestedDomain = result.suggestion.split('@')[1]
      setEmailSuggestion(suggestedDomain)
    } else {
      setEmailSuggestion('')
    }

    // Map validation error keys to translation keys
    if (!result.isValid && result.error) {
      const errorKeyMap: Record<string, string> = {
        emailRequired: 'validationEmailRequired',
        emailInvalid: 'validationEmailInvalid',
      }
      return t(`login.${errorKeyMap[result.error] || result.error}`)
    }
    return ''
  }

  const handlePasswordValidation = (value: string): string => {
    if (!value) return t('login.validationPasswordRequired')
    return ''
  }

  // CAPTCHA handlers
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token)
    haptics.success()
  }

  const handleCaptchaExpire = () => {
    setCaptchaToken(null)
  }

  // Submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Check lockout
    if (lockoutRemaining > 0) return

    // Check CAPTCHA if required
    if (showCaptcha && !captchaToken) {
      setServerError(t('login.captchaRequired'))
      haptics.warning()
      return
    }

    // Validate
    const eErr = handleEmailValidation(email)
    const pErr = handlePasswordValidation(password)
    setEmailError(eErr)
    setPasswordError(pErr)
    setServerError('')

    if (eErr || pErr) {
      haptics.error()
      return
    }

    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      const attempts = failedAttempts + 1
      setFailedAttempts(attempts)

      // Parse error for better messaging
      const parsedError = parseAuthError(error)
      setServerError(t(parsedError.messageKey))

      // Show CAPTCHA after MAX_ATTEMPTS
      if (attempts >= MAX_ATTEMPTS && !showCaptcha) {
        setShowCaptcha(true)
        setCaptchaToken(null)
        haptics.warning()
      }

      // Rate limit after 5 total failed attempts
      if (attempts >= 5) {
        const end = Date.now() + LOCKOUT_SECONDS * 1000
        setLockoutEnd(end)
        setServerError(t('login.errorRateLimit', { seconds: LOCKOUT_SECONDS }))
        setFailedAttempts(0)
        setShowCaptcha(false)
      }

      haptics.error()
      setLoading(false)
    } else {
      // Success!
      haptics.success()
      setShowSuccess(true)

      // Handle "remember me"
      if (!rememberMe) {
        sessionStorage.setItem('piplinepro-session-only', 'true')
      } else {
        sessionStorage.removeItem('piplinepro-session-only')
      }

      // Show success animation then redirect
      setTimeout(() => {
        toast({ title: t('login.success'), variant: 'success' })
        navigate('/', { replace: true })
      }, 800)
    }
  }

  const isLocked = lockoutRemaining > 0
  const nextLocale = locale === 'en' ? 'tr' : 'en'

  // Show success animation overlay
  if (showSuccess) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-bg1 login-background">
        <SuccessCheckmark size={64} />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="relative flex min-h-screen items-center justify-center login-background px-4">
        {/* Top-right controls */}
        <div className="absolute right-4 top-4 flex items-center gap-sm">
          <Button variant="gray" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
            {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button
            variant="gray"
            size="sm"
            onClick={() => changeLocale(nextLocale)}
            aria-label="Change language"
            leftContent={<Globe size={18} />}
            label={localeNames[locale as keyof typeof localeNames]}
          />
        </div>

        {/* Logo above card */}
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="mb-8 flex flex-col items-center gap-1">
            <div className="flex items-baseline gap-0.5">
              <span className="text-3xl font-black tracking-tight text-black">PipLine</span>
              <span className="text-3xl font-black tracking-tight text-brand">Pro</span>
            </div>
            <span className="text-[11px] font-medium tracking-[0.2em] text-black/30 uppercase">v2.1</span>
          </div>

          {/* Login card */}
          <Card className="w-full space-y-lg bg-bg1 border border-black/10 shadow-lg">
            {/* Header */}
            <div className="space-y-sm">
              <h1 className="text-2xl font-semibold text-black">{t('login.title')}</h1>
              <p className="text-sm text-black/60">{t('login.subtitle')}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-md" noValidate>
              {/* Email */}
              <div className="space-y-1">
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder={t('login.email')}
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError(handleEmailValidation(e.target.value))
                  }}
                  onBlur={() => setEmailError(handleEmailValidation(email))}
                  required
                  autoComplete="email"
                  aria-invalid={!!emailError}
                  disabled={loading}
                  inputSize="lg"
                  className="bg-black/5"
                />
                {emailError && <FormMessage error>{emailError}</FormMessage>}
                {emailSuggestion && !emailError && (
                  <p className="text-xs text-blue">
                    {t('login.emailSuggestion', { domain: emailSuggestion })}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder={t('login.password')}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setPassword(e.target.value)
                      if (passwordError) setPasswordError(handlePasswordValidation(e.target.value))
                    }}
                    onBlur={() => setPasswordError(handlePasswordValidation(password))}
                    required
                    autoComplete="current-password"
                    inputSize="lg"
                    className="bg-black/5 pr-12"
                    aria-invalid={!!passwordError}
                    disabled={loading}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/80 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        disabled={loading}
                      >
                        {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t('login.showPasswordTooltip')}</TooltipContent>
                  </Tooltip>
                </div>
                {passwordError && <FormMessage error>{passwordError}</FormMessage>}
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-sm cursor-pointer select-none min-h-[44px]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-black/20 accent-brand"
                  disabled={loading}
                />
                <span className="text-sm text-black/60">{t('login.rememberMe')}</span>
              </label>

              {/* CAPTCHA */}
              {showCaptcha && (
                <div className="flex justify-center">
                  <HCaptchaWidget
                    onVerify={handleCaptchaVerify}
                    onExpire={handleCaptchaExpire}
                    size="normal"
                  />
                </div>
              )}

              {/* Server error / rate limit */}
              {serverError && (
                <FormMessage error>
                  {isLocked
                    ? t('login.errorRateLimit', { seconds: lockoutRemaining })
                    : serverError}
                </FormMessage>
              )}

              {/* Submit */}
              <Button
                type="submit"
                variant="filled"
                size="lg"
                disabled={loading || isLocked}
                className="w-full transition-all hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="font-semibold">{t('login.signingIn')}</span>
                ) : (
                  <span className="font-semibold">{t('login.submit')}</span>
                )}
              </Button>
            </form>

            {/* Forgot password */}
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-brand underline-offset-4 transition-colors hover:underline min-h-[44px] inline-flex items-center"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>
          </Card>
          <span className="mt-4 text-xs text-black/30">V2.1</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
