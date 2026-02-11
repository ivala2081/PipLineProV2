import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeSlash, CircleNotch, Sun, Moon, Globe } from '@phosphor-icons/react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/useToast'
import { Button, Card, Input, FormMessage } from '@ds'
import { useTheme, useLocale } from '@ds/hooks'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  // Validation state
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [serverError, setServerError] = useState('')

  // Rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0)
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
  const validateEmail = (value: string): string => {
    if (!value.trim()) return t('login.validationEmailRequired')
    if (!EMAIL_REGEX.test(value)) return t('login.validationEmailInvalid')
    return ''
  }

  const validatePassword = (value: string): string => {
    if (!value) return t('login.validationPasswordRequired')
    return ''
  }

  // Submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Check lockout
    if (lockoutRemaining > 0) return

    // Validate
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    setEmailError(eErr)
    setPasswordError(pErr)
    setServerError('')

    if (eErr || pErr) return

    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      const attempts = failedAttempts + 1
      setFailedAttempts(attempts)

      if (attempts >= MAX_ATTEMPTS) {
        const end = Date.now() + LOCKOUT_SECONDS * 1000
        setLockoutEnd(end)
        setServerError(t('login.errorRateLimit', { seconds: LOCKOUT_SECONDS }))
        setFailedAttempts(0)
      } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setServerError(t('login.errorNetwork'))
      } else {
        setServerError(t('login.error'))
      }

      setLoading(false)
    } else {
      // Handle "remember me"
      if (!rememberMe) {
        sessionStorage.setItem('piplinepro-session-only', 'true')
      } else {
        sessionStorage.removeItem('piplinepro-session-only')
      }

      toast({ title: t('login.title'), variant: 'success' })
      navigate('/', { replace: true })
    }
  }

  const isLocked = lockoutRemaining > 0
  const nextLocale = locale === 'en' ? 'tr' : 'en'

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg1 px-4">
      {/* Top-right controls */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <Button
          variant="gray"
          size="sm"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
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

      {/* Login card */}
      <Card className="w-full max-w-md space-y-6 bg-bg1 border border-black/10">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            {t('login.brand')}
          </p>
          <h1 className="text-2xl font-semibold text-black">{t('login.title')}</h1>
          <p className="text-sm text-black/60">{t('login.subtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <div className="space-y-1">
            <Input
              id="email"
              type="email"
              title={t('login.email')}
              placeholder=" "
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value)
                if (emailError) setEmailError(validateEmail(e.target.value))
              }}
              onBlur={() => setEmailError(validateEmail(email))}
              required
              autoComplete="email"
              aria-invalid={!!emailError}
              className="bg-black/5"
            />
            {emailError && <FormMessage error>{emailError}</FormMessage>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                title={t('login.password')}
                placeholder=" "
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError(validatePassword(e.target.value))
                }}
                onBlur={() => setPasswordError(validatePassword(password))}
                required
                autoComplete="current-password"
                className="bg-black/5 pr-12"
                aria-invalid={!!passwordError}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/80 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {passwordError && <FormMessage error>{passwordError}</FormMessage>}
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-black/20 accent-brand"
            />
            <span className="text-sm text-black/60">{t('login.rememberMe')}</span>
          </label>

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
            className="w-full"
          >
            {loading ? (
              <CircleNotch size={20} className="animate-spin" />
            ) : (
              <span className="font-semibold">{t('login.submit')}</span>
            )}
          </Button>
        </form>

        {/* Forgot password */}
        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-brand underline-offset-4 transition-colors hover:underline"
          >
            {t('login.forgotPassword')}
          </Link>
        </div>
      </Card>
    </div>
  )
}
