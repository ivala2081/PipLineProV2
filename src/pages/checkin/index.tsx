import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle,
  Clock,
  QrCode,
  WarningCircle,
  MapPin,
  ArrowsClockwise,
  LockKey,
} from '@phosphor-icons/react'
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
  | {
      ok: false
      error:
        | 'invalid_token'
        | 'invalid_input'
        | 'employee_not_found'
        | 'gps_required'
        | 'out_of_range'
        | 'device_locked'
      distance_meters?: number
      radius_meters?: number
      locked_at?: string
    }

type GpsState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'granted'; lat: number; lng: number; accuracy: number }
  | { status: 'denied'; reason: string }

/** Device lock saved in localStorage. Mirrors backend hr_checkin_device_locks. */
type LocalLock = { date: string; email: string }

const DEVICE_ID_KEY = 'piplinepro:checkin-device-id'
const LOCK_KEY_PREFIX = 'piplinepro:checkin-lock'

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      window.localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    // localStorage blocked — fall back to a per-session id (still valuable
    // for the backend lock; the user just won't get the friendly local UX).
    return crypto.randomUUID()
  }
}

function lockKey(token: string): string {
  return `${LOCK_KEY_PREFIX}:${token}`
}

function readLocalLock(token: string): LocalLock | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(lockKey(token))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalLock
    if (parsed.date !== todayLocal()) {
      // Stale lock from a previous day — clear it.
      window.localStorage.removeItem(lockKey(token))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeLocalLock(token: string, email: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      lockKey(token),
      JSON.stringify({ date: todayLocal(), email } satisfies LocalLock),
    )
  } catch {
    // ignore — backend lock is still authoritative
  }
}

function getStatusTag(status: CheckinStatus, lang: 'tr' | 'en') {
  const map: Record<CheckinStatus, { label: string; className: string } | null> = {
    present: null,
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
  const [gps, setGps] = useState<GpsState>({ status: 'idle' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deviceId] = useState<string>(() => getOrCreateDeviceId())

  // Mirror of backend lock for this device + token + today.
  const [localLock, setLocalLock] = useState<LocalLock | null>(() =>
    token ? readLocalLock(token) : null,
  )

  /* ── Geolocation ────────────────────────────────────────────────── */
  const requestGps = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGps({ status: 'denied', reason: 'unsupported' })
      return
    }
    setGps({ status: 'requesting' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          status: 'granted',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        const reason =
          err.code === 1 ? 'permission_denied' : err.code === 3 ? 'timeout' : 'unavailable'
        setGps({ status: 'denied', reason })
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    )
  }, [])

  useEffect(() => {
    requestGps()
  }, [requestGps])

  /* ── Submit pipeline ────────────────────────────────────────────── */

  const submitCheckin = async (confirmedEmail: string) => {
    if (!token) return
    setLoading(true)
    setNetworkError(null)
    setResult(null)

    try {
      const { data, error } = await supabase.rpc('hr_checkin_by_qr', {
        p_token: token,
        p_email: confirmedEmail,
        p_lat: gps.status === 'granted' ? gps.lat : null,
        p_lng: gps.status === 'granted' ? gps.lng : null,
        p_device_id: deviceId,
      })
      if (error) {
        console.error('[checkin] RPC error:', error)
        setNetworkError(error.message || 'unknown')
      } else {
        const r = data as unknown as RpcResult
        setResult(r)
        // Successful check-in → mirror lock locally so we skip the
        // confirmation prompt on subsequent same-email submits today.
        if (r.ok) {
          writeLocalLock(token, confirmedEmail.trim().toLowerCase())
          setLocalLock({ date: todayLocal(), email: confirmedEmail.trim().toLowerCase() })
        }
      }
    } catch (err) {
      console.error('[checkin] fetch error:', err)
      setNetworkError(err instanceof Error ? err.message : 'network')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return
    const normalized = trimmedEmail.toLowerCase()

    // Local lock check — fail fast in the UI before hitting the server.
    if (localLock && localLock.email !== normalized) {
      setResult({ ok: false, error: 'device_locked' })
      return
    }

    // If we already have a lock for this exact email, the server will be
    // idempotent — skip the "are you sure" prompt.
    if (localLock && localLock.email === normalized) {
      void submitCheckin(trimmedEmail)
      return
    }

    // First-of-the-day for this device → ask for explicit confirmation.
    setConfirmOpen(true)
  }

  const handleReset = () => {
    setResult(null)
    setEmail('')
    setNetworkError(null)
  }

  /* ── Success screen ─────────────────────────────────────────────── */
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
                <span
                  className={`ml-xs rounded-md px-2 py-0.5 text-[11px] font-medium ${tag.className}`}
                >
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

  /* ── Error / Form screen ────────────────────────────────────────── */
  const getErrorMessage = (): string | null => {
    if (networkError) {
      const base =
        lang === 'tr'
          ? 'Bağlantı hatası. Lütfen tekrar deneyin.'
          : 'Network error. Please try again.'
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
      if (result.error === 'gps_required') {
        return lang === 'tr'
          ? 'Konum izni gerekli. Tarayıcı ayarlarından konuma izin verin.'
          : 'Location permission required. Please enable location access in your browser.'
      }
      if (result.error === 'out_of_range') {
        const dist = result.distance_meters ?? 0
        const radius = result.radius_meters ?? 0
        return lang === 'tr'
          ? `Ofis konumundan çok uzaktasınız (${dist}m, izin verilen ${radius}m).\nLütfen ofise gelip tekrar deneyin.`
          : `You're too far from the office (${dist}m, allowed ${radius}m).\nPlease come to the office and try again.`
      }
      if (result.error === 'device_locked') {
        return lang === 'tr'
          ? 'Bu cihaz bugün başka bir e-posta için kullanıldı. Aynı cihazdan günde sadece bir çalışan giriş yapabilir. Yöneticinize başvurun.'
          : 'This device was already used today for a different email. Only one employee per device per day. Please contact your manager.'
      }
    }
    return null
  }

  const errorMessage = getErrorMessage()

  /* ── GPS status pill ─────────────────────────────────────────────── */
  const renderGpsStatus = () => {
    if (gps.status === 'idle' || gps.status === 'requesting') {
      return (
        <div className="flex items-center gap-xs rounded-lg border border-black/[0.07] bg-bg2 px-sm py-1.5 text-xs text-black/60">
          <MapPin size={14} className="animate-pulse" />
          <span>{lang === 'tr' ? 'Konum alınıyor…' : 'Getting location…'}</span>
        </div>
      )
    }
    if (gps.status === 'granted') {
      return (
        <div className="flex items-center gap-xs rounded-lg border border-green/20 bg-green/5 px-sm py-1.5 text-xs text-green">
          <MapPin size={14} weight="fill" />
          <span>
            {lang === 'tr' ? 'Konum doğrulandı' : 'Location confirmed'}
            {gps.accuracy ? ` (±${Math.round(gps.accuracy)}m)` : ''}
          </span>
        </div>
      )
    }
    const reasonText =
      gps.reason === 'permission_denied'
        ? lang === 'tr'
          ? 'Tarayıcı ayarlarından konum iznini açın'
          : 'Allow location access in your browser settings'
        : gps.reason === 'unsupported'
          ? lang === 'tr'
            ? 'Tarayıcınız konum desteklemiyor'
            : 'Your browser does not support location'
          : lang === 'tr'
            ? 'Konum alınamadı, tekrar deneyin'
            : 'Could not get location, please retry'
    return (
      <div className="flex items-start gap-xs rounded-lg border border-orange/20 bg-orange/5 p-sm text-xs text-orange">
        <MapPin size={14} weight="fill" className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">{lang === 'tr' ? 'Konum gerekli' : 'Location required'}</p>
          <p className="mt-0.5 text-orange/80">{reasonText}</p>
        </div>
        <button
          type="button"
          onClick={requestGps}
          className="shrink-0 rounded-md bg-orange/20 p-1 text-orange transition-colors hover:bg-orange/30"
          aria-label={lang === 'tr' ? 'Tekrar dene' : 'Retry'}
        >
          <ArrowsClockwise size={12} weight="bold" />
        </button>
      </div>
    )
  }

  /* ── Confirmation modal (rendered inline as overlay) ─────────────── */
  const renderConfirm = () => {
    if (!confirmOpen) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-lg">
        <Card padding="none" className="w-full max-w-sm p-xl">
          <div className="mx-auto mb-md flex size-12 items-center justify-center rounded-full bg-orange/10">
            <LockKey size={24} weight="duotone" className="text-orange" />
          </div>
          <h2 className="mb-xs text-center text-base font-semibold text-black">
            {lang === 'tr' ? 'Emin misiniz?' : 'Are you sure?'}
          </h2>
          <p className="mb-md text-center text-sm text-black/60">
            {lang === 'tr' ? (
              <>
                Bu cihaz bugün <span className="font-semibold text-black">{email.trim()}</span>{' '}
                e-postasına kilitlenecek. Bugün başka bir e-posta ile giriş yapamazsınız.
              </>
            ) : (
              <>
                This device will be locked to{' '}
                <span className="font-semibold text-black">{email.trim()}</span> for today. You
                cannot check in with a different email until tomorrow.
              </>
            )}
          </p>
          <div className="flex gap-sm">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              {lang === 'tr' ? 'Geri Dön' : 'Go Back'}
            </Button>
            <Button
              variant="filled"
              className="flex-1"
              disabled={loading}
              onClick={() => {
                setConfirmOpen(false)
                void submitCheckin(email.trim())
              }}
            >
              {lang === 'tr' ? 'Onaylıyorum' : 'Confirm'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

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

          {renderGpsStatus()}

          {localLock && (
            <div className="flex items-start gap-xs rounded-lg border border-blue/20 bg-blue/5 p-sm text-xs text-blue">
              <LockKey size={14} weight="fill" className="mt-0.5 shrink-0" />
              <span>
                {lang === 'tr'
                  ? `Bu cihaz bugün ${localLock.email} için kilitli.`
                  : `This device is locked to ${localLock.email} today.`}
              </span>
            </div>
          )}

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

      {renderConfirm()}
    </div>
  )
}
