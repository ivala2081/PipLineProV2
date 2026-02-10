import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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

interface LookupFormValues {
  name: string
  commission_rate?: number
  is_deposit?: boolean
}

interface LookupFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, unknown>) => Promise<void>
  editingItem: Record<string, unknown> | null
  hasCommissionRate?: boolean
  hasIsDeposit?: boolean
  title: string
  isSaving?: boolean
}

export function LookupFormDialog({
  open,
  onClose,
  onSave,
  editingItem,
  hasCommissionRate,
  hasIsDeposit,
  title,
  isSaving,
}: LookupFormDialogProps) {
  const { t } = useTranslation('pages')

  const form = useForm<LookupFormValues>({
    defaultValues: {
      name: '',
      commission_rate: 0,
      is_deposit: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: (editingItem.name as string) ?? '',
          commission_rate: hasCommissionRate
            ? ((editingItem.commission_rate as number) ?? 0) * 100
            : undefined,
          is_deposit: hasIsDeposit
            ? ((editingItem.is_deposit as boolean) ?? true)
            : undefined,
        })
      } else {
        form.reset({
          name: '',
          commission_rate: 0,
          is_deposit: true,
        })
      }
    }
  }, [open, editingItem, hasCommissionRate, hasIsDeposit, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    const payload: Record<string, unknown> = { name: data.name.trim() }
    if (hasCommissionRate && data.commission_rate !== undefined) {
      payload.commission_rate = data.commission_rate / 100
    }
    if (hasIsDeposit && data.is_deposit !== undefined) {
      payload.is_deposit = data.is_deposit
    }

    await onSave(payload)
    onClose()
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.settings.name')}
            </Label>
            <Input
              {...form.register('name', { required: true })}
              placeholder={t('transfers.settings.namePlaceholder')}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-500">Name is required</p>
            )}
          </div>

          {hasCommissionRate && (
            <div>
              <Label className="mb-1 text-sm font-medium">
                {t('transfers.settings.commissionRate')}
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                {...form.register('commission_rate')}
                placeholder={t('transfers.settings.commissionRatePlaceholder')}
              />
            </div>
          )}

          {hasIsDeposit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-deposit"
                {...form.register('is_deposit')}
                className="h-4 w-4 rounded"
              />
              <Label htmlFor="is-deposit" className="text-sm">
                {t('transfers.settings.isDeposit')}
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('transfers.settings.cancel')}
            </Button>
            <Button
              type="submit"
              variant="filled"
              disabled={isSaving || form.formState.isSubmitting}
            >
              {isSaving || form.formState.isSubmitting
                ? t('transfers.form.saving')
                : t('transfers.settings.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
