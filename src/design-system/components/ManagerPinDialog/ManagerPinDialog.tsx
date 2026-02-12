import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { verifyManagerPin } from '@/lib/managerPin'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@ds'

interface ManagerPinDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ManagerPinDialog({
  open,
  onClose,
  onConfirm,
}: ManagerPinDialogProps) {
  const { t } = useTranslation('pages')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleClose = () => {
    setPin('')
    setError('')
    onClose()
  }

  const handleConfirm = () => {
    if (!verifyManagerPin(pin)) {
      setError(t('transfers.settings.pinInvalid'))
      return
    }
    setPin('')
    setError('')
    onConfirm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('transfers.settings.pinDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('transfers.settings.settingsChangeWarning')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.settings.managerPin')}
            </Label>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
            {error && (
              <p className="mt-1 text-xs text-red">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('transfers.settings.cancel')}
          </Button>
          <Button
            type="button"
            variant="filled"
            onClick={handleConfirm}
            disabled={!pin}
          >
            {t('transfers.settings.pinConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
