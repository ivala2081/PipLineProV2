import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { Card, Button, Input, Label } from '@ds'
import { useToast } from '@/hooks/useToast'
import { useHasOrgPin, useSetOrgPin } from '@/hooks/queries/useOrgPinQuery'

export function OrgPinSettings() {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { data: hasPin, isLoading: checkingPin } = useHasOrgPin()
  const setOrgPin = useSetOrgPin()

  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')

    if (!/^\d{4,6}$/.test(newPin)) {
      setError(t('settings.pin.invalidFormat', 'PIN must be 4-6 digits.'))
      return
    }
    if (newPin !== confirmPin) {
      setError(t('settings.pin.mismatch', 'PINs do not match.'))
      return
    }

    try {
      await setOrgPin.mutateAsync(newPin)
      toast({
        title: t('settings.pin.saved', 'Organization PIN updated.'),
        variant: 'success',
      })
      setNewPin('')
      setConfirmPin('')
    } catch (err) {
      const msg = (err as Error)?.message ?? ''
      if (msg.includes('UNAUTHORIZED')) {
        setError(t('settings.pin.unauthorized', 'Only admins can change the PIN.'))
      } else {
        setError(t('settings.pin.error', 'Failed to update PIN.'))
      }
    }
  }

  return (
    <Card padding="spacious" className="space-y-md border border-black/5 bg-bg1">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/5">
          <Lock size={20} className="text-black/40" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t('settings.pin.title', 'Organization PIN')}</h2>
          <p className="text-sm text-black/60">
            {t(
              'settings.pin.description',
              'This PIN is required for sensitive operations like PSP management and rate changes.',
            )}
          </p>
        </div>
      </div>

      {/* Status indicator */}
      {!checkingPin && (
        <div className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-3 py-2">
          {hasPin ? (
            <>
              <CheckCircle size={16} weight="fill" className="text-green" />
              <span className="text-xs font-medium text-black/60">
                {t('settings.pin.pinIsSet', 'PIN is configured')}
              </span>
            </>
          ) : (
            <>
              <WarningCircle size={16} weight="fill" className="text-yellow-600" />
              <span className="text-xs font-medium text-black/60">
                {t('settings.pin.noPinSet', 'No PIN set — sensitive operations are unprotected')}
              </span>
            </>
          )}
        </div>
      )}

      {/* Set/Change PIN form */}
      <div className="space-y-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-black/60">
              {hasPin ? t('settings.pin.newPin', 'New PIN') : t('settings.pin.setPin', 'Set PIN')}
            </Label>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              placeholder="••••"
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-black/60">
              {t('settings.pin.confirmPin', 'Confirm PIN')}
            </Label>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>
        {error && <p className="text-xs text-red">{error}</p>}
        <p className="text-xs text-black/35">
          {t('settings.pin.hint', 'PIN must be 4-6 digits. All org members will use this PIN.')}
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="filled"
          size="sm"
          onClick={handleSave}
          disabled={!newPin || !confirmPin || setOrgPin.isPending}
        >
          {setOrgPin.isPending
            ? t('settings.pin.saving', 'Saving...')
            : hasPin
              ? t('settings.pin.changePin', 'Change PIN')
              : t('settings.pin.setPin', 'Set PIN')}
        </Button>
      </div>
    </Card>
  )
}
