import { useTranslation } from 'react-i18next'
import { WarningCircle } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from '@ds'
import type { HrEmployee } from '@/hooks/queries/useHrQuery'

interface DeleteEmployeeDialogProps {
  open: boolean
  employee: HrEmployee | null
  isDeleting: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteEmployeeDialog({
  open,
  employee,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteEmployeeDialogProps) {
  const { i18n } = useTranslation('pages')
  const lang = i18n.language === 'tr' ? 'tr' : 'en'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-red/10">
            <WarningCircle size={22} weight="fill" className="text-red" />
          </div>
          <DialogTitle>{lang === 'tr' ? 'Çalışanı Sil' : 'Delete Employee'}</DialogTitle>
          <DialogDescription>
            {lang === 'tr' ? (
              <>
                <strong className="text-black">{employee?.full_name}</strong> adlı çalışanı silmek
                istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm belgeler de silinir.
              </>
            ) : (
              <>
                Are you sure you want to delete{' '}
                <strong className="text-black">{employee?.full_name}</strong>? This action cannot be
                undone and all documents will be deleted.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            {lang === 'tr' ? 'İptal' : 'Cancel'}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isDeleting}
            onClick={onConfirm}
            className="bg-red text-white hover:bg-red/90"
          >
            {isDeleting
              ? lang === 'tr'
                ? 'Siliniyor...'
                : 'Deleting...'
              : lang === 'tr'
                ? 'Evet, Sil'
                : 'Yes, Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
