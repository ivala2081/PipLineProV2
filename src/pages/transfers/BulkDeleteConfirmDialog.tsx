import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const SECURITY_PIN = '4561'

export function BulkDeleteConfirmDialog({
  ids,
  count: countOverride,
  onClose,
  onConfirm,
  isDeleting,
}: BulkDeleteConfirmDialogProps) {
  const { t } = useTranslation('pages')
  const [pin, setPin] = useState('')

  const count = countOverride ?? ids?.length ?? 0
  const pinValid = pin === SECURITY_PIN

  const handleConfirm = async () => {
    if (!pinValid) return
    await onConfirm()
    setPin('')
  }

  const handleClose = () => {
    setPin('')
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
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-40"
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            {t('transfers.bulkDelete.cancel')}
          </Button>
          <Button
            variant="filled"
            className="bg-red hover:bg-red/80"
            onClick={handleConfirm}
            disabled={!pinValid || isDeleting}
          >
            {isDeleting
              ? t('transfers.bulkDelete.deleting', 'Deleting...')
              : t('transfers.bulkDelete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
