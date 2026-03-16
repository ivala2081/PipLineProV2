import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@ds'
import { useVerifyOrgPin } from '@/hooks/queries/useOrgPinQuery'

interface PinDialogProps {
  open: boolean
  onClose: () => void
  onVerified: () => void
  title?: string
  description?: string
}

export function PinDialog({ open, onClose, onVerified, title, description }: PinDialogProps) {
  const { t } = useTranslation('pages')
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const pinInputRef = useRef<HTMLInputElement>(null)
  const verifyPin = useVerifyOrgPin()

  useEffect(() => {
    if (open && pinInputRef.current) {
      pinInputRef.current.focus()
    }
  }, [open])

  const handleVerify = async () => {
    if (!pinInput) return
    try {
      const ok = await verifyPin.mutateAsync(pinInput)
      if (ok) {
        setPinError('')
        setPinInput('')
        onVerified()
      } else {
        setPinError(t('transfers.pin.error'))
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? ''
      if (msg === 'RATE_LIMITED') {
        setPinError(t('transfers.pin.rateLimited', 'Too many attempts. Please wait.'))
      } else {
        setPinError(t('transfers.pin.error'))
      }
    }
  }

  const handleClose = () => {
    setPinInput('')
    setPinError('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}
    >
      <DialogContent size="sm" className="p-0" aria-describedby={undefined}>
        <div className="px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {title ?? t('transfers.pin.title')}
            </DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-[12px] text-black/60">
            {description ?? t('transfers.pin.description')}
          </p>

          <div className="mt-4">
            <input
              ref={pinInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value)
                setPinError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerify()
                else if (e.key === 'Escape') handleClose()
              }}
              placeholder={t('transfers.pin.placeholder')}
              className="h-10 w-full rounded border border-black/10 bg-white px-3 text-center font-mono text-lg tracking-widest outline-none focus:border-black/25 [-webkit-text-security:disc]"
              maxLength={6}
              disabled={verifyPin.isPending}
            />
            {pinError && <p className="mt-2 text-xs text-red">{pinError}</p>}
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={verifyPin.isPending}
            >
              {t('transfers.pin.cancel')}
            </Button>
            <Button
              variant="filled"
              className="flex-1"
              onClick={handleVerify}
              disabled={verifyPin.isPending}
            >
              {verifyPin.isPending ? '...' : t('transfers.pin.verify')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
