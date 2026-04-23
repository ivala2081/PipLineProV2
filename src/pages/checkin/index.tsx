import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Clock, QrCode, WarningCircle } from '@phosphor-icons/react'
import { Button, Card, Input } from '@ds'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type CheckinStatus = 'present' | 'late' | 'absent' | 'half_day'

type RpcResult =
  | {
      ok: true
      employee_name: string
      check_in: string
      status: CheckinStatus
      already_checked_in: boolean
    }
  | { ok: false; error: 'invalid_token' | 'invalid_input' | 'employee_not_found' }

function getStatusTag(status: CheckinStatus, lang: 'tr' | 'en') {
  const map: Record<CheckinStatus, { label: string; className: string } | null> = {
    present: null, // no tag — green checkmark already conveys "fine"
    late: {
      label: lang === 'tr' ? 'Geç' : 'Late',
      className: 'bg-orange/15 text-orange',
    },
    absent: {
      label: lang === 'tr' ? 'Gelmedi' : 'Absent',
      className: 'bg-red/15 text-red',
    },
    half_day: {
      label: lang === 'tr' ? 'Yarım Gün' : 'Half Day',
      className: 'bg-blue/15 text-blue',
    },
  }
  return map[status]
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function CheckinPage() {
  const { token } = useParams<{ token: string }>()
  const { i18n } = useTranslation()
  const lang: 'tr' | 'en' = i18n.language === 'tr' ? 'tr' : 'en'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RpcResult | null>(null)
  const [networkError, setNetworkError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!email.trim()) return

    setLoading(true)
    setNetworkError(null)
    setResult(null)

    try {
      const { data, error } = await supabase.rpc('hr_checkin_by_qr', {
        p_token: token,
        p_email: email.trim(),
      })
      if (error) {
        console.error('[checkin] RPC error:', error)
        setNetworkError(error.message || 'unknown')
      } else {
        setResult(data as unknown as RpcResult)
      }
    } catch (err) {
      console.error('[checkin] fetch error:', err)
      setNetworkError(err instanceof Error ? err.message : 'network')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setEmail('')
    setNetworkError(null)
  }

  /* -- Success screen -- */
  if (result && result.ok) {
    const timeDisplay = result.check_in ?? '—'
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg1 p-lg">
        <Card padding="none" className="w-full max-w-sm p-xl text-center">
          <div className="mx-auto mb-md flex size-16 items-center justify-center rounded-full bg-green/10">
            <CheckCircle size={36} weight="fill" className="text-green" />
          </div>
          <h1 className="mb-xs text-xl font-semibold text-black">
            {lang === 'tr' ? `Merhaba ${result.employee_name}!` : `Hi ${result.employee_name}!`}
          </h1>
          {result.already_checked_in ? (
            <p className="mb-md text-sm text-black/60">
              {lang === 'tr'
                ? `Bugün zaten giriş yapmışsınız.`
                : `You've already checked in today.`}
            </p>
          ) : (
            <p className="mb-md text-sm text-black/60">
              {lang === 'tr'
                ? 'Girişiniz başarıyla kaydedildi.'
                : 'Your check-in has been recorded.'}
            </p>
          )}
          <div className="mb-lg inline-flex items-center gap-xs rounded-xl bg-bg2 px-md py-sm">
            <Clock size={18} weight="fill" className="text-brand" />
            <span className="font-mono text-lg font-semibold tabular-nums text-black">
              {timeDisplay}
            </span>
            {(() => {
              const tag = getStatusTag(result.status, lang)
              return tag ? (
                <span className={`ml-xs rounded-md px-2 py-0.5 text-[11px] font-medium ${tag.className}`}>
                  {tag.label}
                </span>
              ) : null
            })()}
          </div>
          <Button variant="outline" className="w-full" onClick={handleReset}>
            {lang === 'tr' ? 'Başka bir giriş' : 'Another check-in'}
          </Button>
        </Card>
      </div>
    )
  }

  /* -- Error / Form screen -- */
  const getErrorMessage = (): string | null => {
    if (networkError) {
      const base =
        lang === 'tr' ? 'Bağlantı hatası. Lütfen tekrar deneyin.' : 'Network error. Please try again.'
      return `${base}\n(${networkError})`
    }
    if (result && !result.ok) {
      if (result.error === 'invalid_token') {
        return lang === 'tr'
          ? 'QR kod geçersiz. Yöneticinize danışın.'
          : 'Invalid QR code. Please contact your manager.'
      }
      if (result.error === 'employee_not_found') {
        return lang === 'tr'
          ? 'Bu e-posta sistemde kayıtlı değil.'
          : 'This email is not registered.'
      }
      if (result.error === 'invalid_input') {
        return lang === 'tr' ? 'Lütfen geçerli bir e-posta girin.' : 'Please enter a valid email.'
      }
    }
    return null
  }

  const errorMessage = getErrorMessage()

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg1 p-lg">
      <Card padding="none" className="w-full max-w-sm p-xl">
        <div className="mb-lg flex flex-col items-center text-center">
          <div className="mb-md flex size-14 items-center justify-center rounded-full bg-brand/10">
            <QrCode size={28} weight="duotone" className="text-brand" />
          </div>
          <h1 className="text-xl font-semibold text-black">
            {lang === 'tr' ? 'Mesai Girişi' : 'Check-in'}
          </h1>
          <p className="mt-xs text-sm text-black/60">
            {lang === 'tr'
              ? 'Giriş için e-posta adresinizi girin.'
              : 'Enter your email to check in.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <label htmlFor="email" className="mb-xs block text-xs font-medium text-black/70">
              {lang === 'tr' ? 'E-posta' : 'Email'}
            </label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="ornek@sirket.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {errorMessage && (
            <div className="flex items-start gap-xs rounded-lg border border-red/20 bg-red/5 p-sm text-xs text-red">
              <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
              <span className="whitespace-pre-line">{errorMessage}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="filled"
            className="w-full"
            disabled={loading || !email.trim() || !token}
          >
            {loading
              ? lang === 'tr'
                ? 'Kaydediliyor...'
                : 'Recording...'
              : lang === 'tr'
                ? 'Giriş Yap'
                : 'Check In'}
          </Button>
        </form>

        {!token && (
          <p className="mt-md text-center text-xs text-red">
            {lang === 'tr' ? 'Geçersiz bağlantı.' : 'Invalid link.'}
          </p>
        )}
      </Card>
    </div>
  )
}
