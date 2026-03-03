import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AliasTagInput } from '@/components/AliasTagInput'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@ds'

interface LookupItemDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; aliases: string[] }) => Promise<void>
  editingItem: { id: string; name: string; aliases: string[] } | null
  title: string
  isSaving?: boolean
}

export function LookupItemDialog({
  open,
  onClose,
  onSave,
  editingItem,
  title,
  isSaving,
}: LookupItemDialogProps) {
  const { t } = useTranslation('pages')

  const [name, setName] = useState('')
  const [aliases, setAliases] = useState<string[]>([])
  const [nameError, setNameError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editingItem?.name ?? '')
      setAliases(editingItem?.aliases ?? [])
      setNameError('')
    }
  }, [open, editingItem])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError(t('transfers.settings.nameRequired'))
      return
    }
    setIsSubmitting(true)
    setNameError('')
    try {
      await onSave({ name: trimmed, aliases })
      onClose()
    } catch (err) {
      const msg = (err as Error).message
      if (msg === 'name_taken') {
        setNameError(t('transfers.settings.nameTaken'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const busy = isSaving || isSubmitting

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-md">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('transfers.settings.nameLabel')}</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError('')
              }}
              placeholder={t('transfers.settings.namePlaceholder')}
              disabled={busy}
              autoFocus
            />
            {nameError && <p className="text-xs text-red">{nameError}</p>}
          </div>

          {/* Aliases */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('transfers.settings.aliases')}</Label>
              <span className="text-xs text-black/35">{t('transfers.settings.aliasesHelp')}</span>
            </div>
            <AliasTagInput value={aliases} onChange={setAliases} disabled={busy} />
            <p className="text-xs text-black/35">{t('transfers.settings.aliasesHint')}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t('transfers.settings.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={busy}>
              {busy ? t('transfers.form.saving') : t('transfers.settings.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
