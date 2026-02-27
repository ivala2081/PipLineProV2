import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVerifyOrgPin } from '@/hooks/queries/useOrgPinQuery'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
} from '@ds'

interface BulkDeleteConfirmDialogProps {
  ids: string[] | null
  count?: number
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

export function BulkDeleteConfirmDialog({
  ids,
  count: countOverride,
  onClose,
  onConfirm,
  isDeleting,
}: BulkDeleteConfirmDialogProps) {
  const { t } = useTranslation('pages')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const verifyPin = useVerifyOrgPin()

  const count = countOverride ?? ids?.length ?? 0
  const isVerifying = verifyPin.isPending
  const isBusy = isDeleting || isVerifying

  const handleConfirm = async () => {
    if (!pin || isBusy) return
    setError('')

    try {
      const valid = await verifyPin.mutateAsync(pin)
      if (!valid) {
        setError(t('transfers.settings.pinInvalid'))
        return
      }
      await onConfirm()
      setPin('')
      setError('')
    } catch (err) {
      const msg = (err as Error)?.message ?? ''
      if (msg.includes('RATE_LIMITED')) {
        setError(
          t('transfers.settings.pinRateLimited', 'Too many attempts. Please wait a few minutes.'),
        )
      } else {
        setError(t('transfers.settings.pinInvalid'))
      }
    }
  }

  const handleClose = () => {
    setPin('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={!!ids} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('transfers.bulkDelete.title', { count })}</DialogTitle>
          <DialogDescription>{t('transfers.bulkDelete.description', { count })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 px-6 pb-2">
          <label className="block text-xs font-medium text-black/50">
            {t('transfers.bulkDelete.pinLabel', 'Enter security PIN to confirm')}
          </label>
          <Input
            type="password"
            inputSize="sm"
            placeholder="PIN"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''))
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            className="w-40"
            autoComplete="off"
            disabled={isBusy}
          />
          {error && <p className="mt-1 text-xs text-red">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isBusy}>
            {t('transfers.bulkDelete.cancel')}
          </Button>
          <Button
            variant="filled"
            className="bg-red hover:bg-red/80"
            onClick={handleConfirm}
            disabled={!pin || isBusy}
          >
            {isVerifying
              ? t('transfers.settings.pinVerifying', 'Verifying...')
              : isDeleting
                ? t('transfers.bulkDelete.deleting', 'Deleting...')
                : t('transfers.bulkDelete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
