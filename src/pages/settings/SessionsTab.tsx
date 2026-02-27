import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Desktop,
  DeviceMobile,
  Shield,
  ShieldCheck,
  Trash,
  SignOut,
  CheckCircle,
  XCircle,
  SpinnerGap,
} from '@phosphor-icons/react'
import { Card, Button } from '@ds'
import { useToast } from '@/hooks/useToast'
import { useLoginHistory } from '@/hooks/queries/useSessionManagement'
import { useTrustedDevices } from '@/hooks/useTrustedDevices'
import { supabase } from '@/lib/supabase'
import type { TrustedDevice } from '@/lib/database.types'

function formatRelativeTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHour = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return locale === 'tr' ? 'Az önce' : 'Just now'
  if (diffMin < 60) return locale === 'tr' ? `${diffMin} dk önce` : `${diffMin}m ago`
  if (diffHour < 24) return locale === 'tr' ? `${diffHour} sa önce` : `${diffHour}h ago`
  if (diffDay < 30) return locale === 'tr' ? `${diffDay} gün önce` : `${diffDay}d ago`
  return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SessionsTab() {
  const { t, i18n } = useTranslation('pages')
  const { toast } = useToast()
  const lang = i18n.language === 'tr' ? 'tr' : 'en'

  const { deviceId: currentDeviceId, revokeDevice } = useTrustedDevices()
  const { data: loginHistory = [], isLoading: historyLoading } = useLoginHistory()

  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const { getTrustedDevices } = useTrustedDevices()

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true)
    const { data } = await getTrustedDevices()
    setDevices(data ?? [])
    setDevicesLoading(false)
  }, [getTrustedDevices])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const handleRevoke = async (targetDeviceId: string) => {
    setRevokingId(targetDeviceId)
    const { error } = await revokeDevice(targetDeviceId)
    if (error) {
      toast({ title: error.message, variant: 'error' })
    } else {
      toast({ title: t('sessions.deviceRevoked', 'Device revoked'), variant: 'success' })
      setDevices((prev) => prev.filter((d) => d.device_id !== targetDeviceId))
    }
    setRevokingId(null)
  }

  const handleSignOutOthers = async () => {
    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) throw error
      toast({
        title: t('sessions.signedOutOthers', 'Signed out other sessions'),
        variant: 'success',
      })
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-lg">
      {/* Current device */}
      <Card padding="spacious" className="space-y-md border border-black/5 bg-bg1">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
            <ShieldCheck size={20} className="text-brand" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {t('sessions.currentDevice', 'Current Device')}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-black/35">
              {currentDeviceId.slice(0, 16)}...
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSignOutOthers}
          disabled={signingOut}
        >
          <SignOut size={16} />
          {signingOut
            ? t('sessions.signingOut', 'Signing out...')
            : t('sessions.signOutOthers', 'Sign out other sessions')}
        </Button>
      </Card>

      {/* Trusted devices */}
      <Card padding="spacious" className="space-y-md border border-black/5 bg-bg1">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/5">
            <Shield size={20} className="text-black/40" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {t('sessions.trustedDevices', 'Trusted Devices')}
            </h2>
            <p className="text-sm text-black/60">
              {t(
                'sessions.trustedDevicesDescription',
                'Devices that skip additional security checks.',
              )}
            </p>
          </div>
        </div>

        {devicesLoading ? (
          <div className="flex items-center justify-center py-8">
            <SpinnerGap size={20} className="animate-spin text-black/30" />
          </div>
        ) : devices.length === 0 ? (
          <p className="py-4 text-center text-xs text-black/35">
            {t('sessions.noTrustedDevices', 'No trusted devices.')}
          </p>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {devices.map((device) => {
              const isCurrent = device.device_id === currentDeviceId
              return (
                <div key={device.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {isCurrent ? (
                    <Desktop size={18} className="shrink-0 text-brand" />
                  ) : (
                    <DeviceMobile size={18} className="shrink-0 text-black/30" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-xs text-black/70">
                        {device.device_id.slice(0, 16)}...
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                          {t('sessions.thisDevice', 'This device')}
                        </span>
                      )}
                    </div>
                    {device.label && <p className="text-xs text-black/45">{device.label}</p>}
                    <p className="text-[10px] text-black/30">
                      {t('sessions.lastUsed', 'Last used')}:{' '}
                      {formatRelativeTime(device.last_used_at, lang)}
                    </p>
                  </div>
                  {!isCurrent && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(device.device_id)}
                      disabled={revokingId === device.device_id}
                    >
                      {revokingId === device.device_id ? (
                        <SpinnerGap size={14} className="animate-spin" />
                      ) : (
                        <Trash size={14} className="text-red/60" />
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Login history */}
      <Card padding="spacious" className="space-y-md border border-black/5 bg-bg1">
        <h2 className="text-lg font-semibold">{t('sessions.loginHistory', 'Login History')}</h2>

        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <SpinnerGap size={20} className="animate-spin text-black/30" />
          </div>
        ) : loginHistory.length === 0 ? (
          <p className="py-4 text-center text-xs text-black/35">
            {t('sessions.noHistory', 'No login history found.')}
          </p>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {loginHistory.map((attempt) => (
              <div key={attempt.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {attempt.success ? (
                  <CheckCircle size={16} weight="fill" className="shrink-0 text-green" />
                ) : (
                  <XCircle size={16} weight="fill" className="shrink-0 text-red" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-black/70">
                      {attempt.success
                        ? t('sessions.loginSuccess', 'Successful login')
                        : t('sessions.loginFailed', 'Failed login')}
                    </span>
                    {attempt.ip_address && (
                      <span className="font-mono text-[10px] text-black/30">
                        {attempt.ip_address}
                      </span>
                    )}
                  </div>
                  {attempt.error_message && (
                    <p className="truncate text-[10px] text-red/60">{attempt.error_message}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-black/30">
                  {formatRelativeTime(attempt.created_at, lang)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
