import { useTranslation } from 'react-i18next'
import type { AccountingEntry } from '@/lib/database.types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@ds'

interface DeleteEntryDialogProps {
  entry: AccountingEntry | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteEntryDialog({
  entry,
  onClose,
  onConfirm,
}: DeleteEntryDialogProps) {
  const { t } = useTranslation('pages')

  return (
    <Dialog open={entry !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('accounting.delete.title')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-black/60">
          {t('accounting.delete.description', {
            name: entry?.description ?? '',
          })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('accounting.delete.cancel')}
          </Button>
          <Button
            variant="filled"
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
          >
            {t('accounting.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
