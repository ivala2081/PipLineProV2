import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Eye,
  EyeSlash,
  CircleNotch,
  Sun,
  Moon,
  Globe,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { Button, Card, Input, FormMessage } from '@ds'
import { useTheme, useLocale, type Locale } from '@ds/hooks'

/* ------------------------------------------------------------------ */
/*  Password strength rules                                            */
/* ------------------------------------------------------------------ */

interface PasswordRule {
  key:
    | 'resetPassword.validationMinLength'
    | 'resetPassword.validationUppercase'
    | 'resetPassword.validationLowercase'
    | 'resetPassword.validationNumber'
  test: (v: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { key: 'resetPassword.validationMinLength', test: (v) => v.length >= 8 },
  { key: 'resetPassword.validationUppercase', test: (v) => /[A-Z]/.test(v) },
  { key: 'resetPassword.validationLowercase', test: (v) => /[a-z]/.test(v) },
  { key: 'resetPassword.validationNumber', test: (v) => /\d/.test(v) },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function ResetPasswordPage() {
  const { t } = useTranslation('pages')
  const { updatePassword } = useAuth()
  const { toast } = useToast()
  const { toggleTheme, resolvedTheme } = useTheme()
  const { locale, changeLocale, localeNames } = useLocale()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  /* ---- Check that the user arrived via a valid recovery link ------ */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setHasSession(true)
        }
      },
    )

    // Also check if we already have a session (user may have already
    // been redirected and the event already fired before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true)
      else setHasSession((prev) => prev ?? false)
    })

    return () => subscription.unsubscribe()
  }, [])

  /* ---- Validation ------------------------------------------------- */
  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password))

  const validateConfirm = useCallback(
    (value: string): string => {
      if (!value) return t('resetPassword.validationRequired')
      if (value !== password) return t('resetPassword.validationMatch')
      return ''
    },
    [password, t],
  )

  /* ---- Submit ----------------------------------------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!allRulesPassed) return

    const cErr = validateConfirm(confirmPassword)
    setConfirmError(cErr)
    if (cErr) return

    setLoading(true)
    setServerError('')

    const { error } = await updatePassword(password)

    if (error) {
      setServerError(t('resetPassword.error'))
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      toast({ title: t('resetPassword.success'), variant: 'success' })
    }
  }

  const nextLocale: Locale = locale === 'en' ? 'tr' : 'en'

  /* ---- Expired / invalid link ------------------------------------ */
  if (hasSession === false) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-bg1 px-4">
        <TopRightControls
          toggleTheme={toggleTheme}
          resolvedTheme={resolvedTheme}
          changeLocale={changeLocale}
          nextLocale={nextLocale}
          locale={locale}
          localeNames={localeNames}
        />
        <div className="flex w-full max-w-md flex-col items-center">
          <img
            src={resolvedTheme === 'dark' ? '/for-dark.png' : '/for-white.png'}
            alt="PipLinePro"
            className="mb-8 h-16 w-auto object-contain"
          />
          <Card className="w-full space-y-6 bg-bg1 border border-black/10">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-black">
                {t('resetPassword.title')}
              </h1>
            </div>
            <FormMessage error>{t('resetPassword.errorExpired')}</FormMessage>
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-brand underline-offset-4 transition-colors hover:underline"
              >
                {t('forgotPassword.submit')}
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  /* ---- Loading session check ------------------------------------- */
  if (hasSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg1">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-brand" />
      </div>
    )
  }

  /* ---- Success state --------------------------------------------- */
  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-bg1 px-4">
        <TopRightControls
          toggleTheme={toggleTheme}
          resolvedTheme={resolvedTheme}
          changeLocale={changeLocale}
          nextLocale={nextLocale}
          locale={locale}
          localeNames={localeNames}
        />
        <div className="flex w-full max-w-md flex-col items-center">
          <img
            src={resolvedTheme === 'dark' ? '/for-dark.png' : '/for-white.png'}
            alt="PipLinePro"
            className="mb-8 h-16 w-auto object-contain"
          />
          <Card className="w-full space-y-6 bg-bg1 border border-black/10">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-black">
                {t('resetPassword.success')}
              </h1>
              <p className="text-sm text-black/60">
                {t('resetPassword.successMessage')}
              </p>
            </div>
            <Button
              variant="filled"
              size="lg"
              className="w-full"
              onClick={() => navigate('/login', { replace: true })}
            >
              <span className="font-semibold">{t('resetPassword.goToLogin')}</span>
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  /* ---- Main form ------------------------------------------------- */
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg1 px-4">
      <TopRightControls
        toggleTheme={toggleTheme}
        resolvedTheme={resolvedTheme}
        changeLocale={changeLocale}
        nextLocale={nextLocale}
        locale={locale}
        localeNames={localeNames}
      />

      <div className="flex w-full max-w-md flex-col items-center">
        <img
          src={resolvedTheme === 'dark' ? '/for-dark.png' : '/for-white.png'}
          alt="PipLinePro"
          className="mb-8 h-16 w-auto object-contain"
        />

      <Card className="w-full space-y-6 bg-bg1 border border-black/10">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-black">
            {t('resetPassword.title')}
          </h1>
          <p className="text-sm text-black/60">{t('resetPassword.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* New password */}
          <div className="space-y-1">
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                title={t('resetPassword.newPassword')}
                placeholder=" "
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                required
                autoComplete="new-password"
                className="bg-black/5 pr-12"
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

            {/* Strength checklist */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(password)
                  return (
                    <li
                      key={rule.key}
                      className={`flex items-center gap-1.5 text-xs ${
                        passed ? 'text-green' : 'text-black/40'
                      }`}
                    >
                      {passed ? (
                        <CheckCircle size={14} weight="fill" />
                      ) : (
                        <XCircle size={14} />
                      )}
                      {t(rule.key)}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                title={t('resetPassword.confirmPassword')}
                placeholder=" "
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setConfirmPassword(e.target.value)
                  if (confirmError) setConfirmError(validateConfirm(e.target.value))
                }}
                onBlur={() => {
                  if (confirmPassword) setConfirmError(validateConfirm(confirmPassword))
                }}
                required
                autoComplete="new-password"
                className="bg-black/5 pr-12"
                aria-invalid={!!confirmError}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/80 transition-colors"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmError && <FormMessage error>{confirmError}</FormMessage>}
          </div>

          {/* Server error */}
          {serverError && <FormMessage error>{serverError}</FormMessage>}

          {/* Submit */}
          <Button
            type="submit"
            variant="filled"
            size="lg"
            disabled={loading || !allRulesPassed}
            className="w-full"
          >
            {loading ? (
              <CircleNotch size={20} className="animate-spin" />
            ) : (
              <span className="font-semibold">{t('resetPassword.submit')}</span>
            )}
          </Button>
        </form>

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

/* ------------------------------------------------------------------ */
/*  Shared top-right controls                                          */
/* ------------------------------------------------------------------ */

function TopRightControls({
  toggleTheme,
  resolvedTheme,
  changeLocale,
  nextLocale,
  locale,
  localeNames,
}: {
  toggleTheme: () => void
  resolvedTheme: string
  changeLocale: (l: Locale) => void
  nextLocale: Locale
  locale: string
  localeNames: Record<string, string>
}) {
  return (
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
  )
}
