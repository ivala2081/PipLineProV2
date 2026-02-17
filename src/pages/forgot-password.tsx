import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleNotch, Sun, Moon, Globe } from '@phosphor-icons/react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/useToast'
import { Button, Card, Input, FormMessage } from '@ds'
import { useTheme, useLocale } from '@ds/hooks'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESEND_COOLDOWN = 60 // seconds

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function ForgotPasswordPage() {
  const { t } = useTranslation('pages')
  const { resetPassword } = useAuth()
  const { toast } = useToast()
  const { toggleTheme, resolvedTheme } = useTheme()
  const { locale, changeLocale, localeNames } = useLocale()

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    }
  }, [])

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN)

    if (cooldownTimer.current) clearInterval(cooldownTimer.current)

    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const validateEmail = (value: string): string => {
    if (!value.trim()) return t('forgotPassword.validationEmailRequired')
    if (!EMAIL_REGEX.test(value)) return t('forgotPassword.validationEmailInvalid')
    return ''
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const err = validateEmail(email)
    setEmailError(err)
    if (err) return

    setLoading(true)
    await resetPassword(email)
    setLoading(false)
    setSent(true)
    startCooldown()
    toast({ title: t('forgotPassword.success'), variant: 'success' })
  }

  const handleResend = async () => {
    if (cooldown > 0) return

    setLoading(true)
    await resetPassword(email)
    setLoading(false)
    startCooldown()
    toast({ title: t('forgotPassword.success'), variant: 'success' })
  }

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

      {/* Logo + Card */}
      <div className="flex w-full max-w-md flex-col items-center">
        <img
          src={resolvedTheme === 'dark' ? '/for-dark.png' : '/for-white.png'}
          alt="PipLinePro"
          className="mb-8 h-16 w-auto object-contain"
        />

      <Card className="w-full space-y-6 bg-bg1 border border-black/10">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-black">{t('forgotPassword.title')}</h1>
          <p className="text-sm text-black/60">{t('forgotPassword.subtitle')}</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <FormMessage error={false}>{t('forgotPassword.success')}</FormMessage>

            {/* Resend button with cooldown */}
            <Button
              variant="gray"
              size="lg"
              disabled={loading || cooldown > 0}
              className="w-full"
              onClick={handleResend}
            >
              {loading ? (
                <CircleNotch size={20} className="animate-spin" />
              ) : cooldown > 0 ? (
                <span className="text-sm text-black/40">
                  {t('forgotPassword.resendIn', { seconds: cooldown })}
                </span>
              ) : (
                <span className="font-semibold">{t('forgotPassword.resend')}</span>
              )}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                title={t('forgotPassword.email')}
                placeholder={t('forgotPassword.email')}
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError(validateEmail(e.target.value))
                }}
                onBlur={() => setEmailError(validateEmail(email))}
                required
                autoComplete="email"
                aria-invalid={!!emailError}
                inputSize="lg"
                className="bg-black/5"
              />
              {emailError && <FormMessage error>{emailError}</FormMessage>}
            </div>

            <Button
              type="submit"
              variant="filled"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <CircleNotch size={20} className="animate-spin" />
              ) : (
                <span className="font-semibold">{t('forgotPassword.submit')}</span>
              )}
            </Button>
          </form>
        )}

        {/* Back to login */}
        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-brand underline-offset-4 transition-colors hover:underline"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </Card>
      </div>
    </div>
  )
}
