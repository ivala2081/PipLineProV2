import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/hooks/useToast'
import type { TransferRow } from '@/hooks/useTransfers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@ds'

interface DeleteConfirmDialogProps {
  transfer: TransferRow | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfirmDialog({
  transfer,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
      toast({ title: t('transfers.toast.deleted'), variant: 'success' })
    } catch {
      toast({ title: t('transfers.toast.error'), variant: 'error' })
    }
    setDeleting(false)
  }

  return (
    <Dialog open={!!transfer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('transfers.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('transfers.delete.description', { name: transfer?.full_name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {t('transfers.delete.cancel')}
          </Button>
          <Button
            variant="filled"
            className="bg-red hover:bg-red/80"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {t('transfers.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
