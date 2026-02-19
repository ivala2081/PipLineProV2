import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { entryFormSchema, type EntryFormValues } from '@/schemas/accountingSchema'
import type { AccountingEntry } from '@/lib/database.types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
} from '@ds'

interface EntryDialogProps {
  open: boolean
  onClose: () => void
  entry: AccountingEntry | null
  onSubmit: (data: EntryFormValues) => Promise<void>
  isSubmitting: boolean
}

export function EntryDialog({ open, onClose, entry, onSubmit, isSubmitting }: EntryDialogProps) {
  const { t } = useTranslation('pages')
  const isEditing = !!entry

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      description: '',
      entry_type: 'ODEME',
      direction: 'out',
      amount: 0,
      currency: 'USDT',
      cost_period: '',
      entry_date: new Date().toISOString().slice(0, 10),
      payment_period: '',
      register: 'USDT',
    },
  })

  useEffect(() => {
    if (open) {
      if (entry) {
        reset({
          description: entry.description,
          entry_type: entry.entry_type,
          direction: entry.direction,
          amount: entry.amount,
          currency: entry.currency as EntryFormValues['currency'],
          cost_period: entry.cost_period ?? '',
          entry_date: entry.entry_date,
          payment_period: entry.payment_period ?? '',
          register: entry.register as EntryFormValues['register'],
        })
      } else {
        reset({
          description: '',
          entry_type: 'ODEME',
          direction: 'out',
          amount: 0,
          currency: 'USDT',
          cost_period: '',
          entry_date: new Date().toISOString().slice(0, 10),
          payment_period: '',
          register: 'USDT',
        })
      }
    }
  }, [open, entry, reset])

  const direction = watch('direction')

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data)
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('accounting.editEntry') : t('accounting.addEntry')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label>{t('accounting.form.description')}</Label>
            <Input
              {...register('description')}
              placeholder={t('accounting.form.descriptionPlaceholder')}
            />
            {errors.description && <p className="text-xs text-red">{errors.description.message}</p>}
          </div>

          {/* Entry Type & Direction row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('accounting.form.entryType')}</Label>
              <Select
                value={watch('entry_type')}
                onValueChange={(v) => setValue('entry_type', v as EntryFormValues['entry_type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ODEME">{t('accounting.entryTypes.ODEME')}</SelectItem>
                  <SelectItem value="TRANSFER">{t('accounting.entryTypes.TRANSFER')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('accounting.form.direction')}</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={direction === 'in' ? 'filled' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setValue('direction', 'in')}
                >
                  {t('accounting.directions.in')}
                </Button>
                <Button
                  type="button"
                  variant={direction === 'out' ? 'filled' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setValue('direction', 'out')}
                >
                  {t('accounting.directions.out')}
                </Button>
              </div>
            </div>
          </div>

          {/* Amount & Currency row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('accounting.form.amount')}</Label>
              <Input type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-red">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('accounting.form.currency')}</Label>
              <Select
                value={watch('currency')}
                onValueChange={(v) => setValue('currency', v as EntryFormValues['currency'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="TL">TL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Register */}
          <div className="space-y-2">
            <Label>{t('accounting.form.register')}</Label>
            <Select
              value={watch('register')}
              onValueChange={(v) => setValue('register', v as EntryFormValues['register'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="NAKIT_TL">Cash TL</SelectItem>
                <SelectItem value="NAKIT_USD">Cash USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>{t('accounting.form.date')}</Label>
            <DateInput {...register('entry_date')} />
            {errors.entry_date && <p className="text-xs text-red">{errors.entry_date.message}</p>}
          </div>

          {/* Cost Period & Payment Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('accounting.form.costPeriod')}</Label>
              <Input
                {...register('cost_period')}
                placeholder={t('accounting.form.costPeriodPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('accounting.form.paymentPeriod')}</Label>
              <Input
                {...register('payment_period')}
                placeholder={t('accounting.form.paymentPeriodPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('accounting.form.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isSubmitting}>
              {isSubmitting ? t('accounting.form.saving') : t('accounting.form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
