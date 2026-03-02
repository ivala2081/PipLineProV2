import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PencilSimple } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useUpdateSalaryPaymentMutation,
  type HrEmployee,
  type HrSalaryPaymentLocal,
} from '@/hooks/queries/useHrQuery'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'

const schema = z.object({
  amount_tl: z.coerce.number().min(1, "Tutar 0'dan büyük olmalı"),
  paid_at: z.string().min(1, 'Tarih gerekli'),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface SalaryEditDialogProps {
  open: boolean
  onClose: () => void
  payment: HrSalaryPaymentLocal | null
  employee: HrEmployee | null
  lang: 'tr' | 'en'
}

export function SalaryEditDialog({
  open,
  onClose,
  payment,
  employee,
  lang,
}: SalaryEditDialogProps) {
  const { toast } = useToast()
  const updateSalary = useUpdateSalaryPaymentMutation()
  const [amountDisplay, setAmountDisplay] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount_tl: 0, paid_at: '', notes: '' },
  })

  useEffect(() => {
    if (open && payment) {
      form.reset({
        amount_tl: payment.amount_tl,
        paid_at: payment.paid_at,
        notes: payment.notes ?? '',
      })
      setAmountDisplay(numberToDisplay(payment.amount_tl, lang)) // eslint-disable-line react-hooks/set-state-in-effect -- syncing form display on dialog open
    }
  }, [open, payment, form, lang])

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!payment || !employee) return
    try {
      await updateSalary.mutateAsync({
        id: payment.id,
        amount_tl: data.amount_tl,
        old_amount_tl: payment.amount_tl,
        salary_currency: employee.salary_currency ?? 'TL',
        paid_at: data.paid_at,
        notes: data.notes?.trim() || null,
        description:
          lang === 'tr'
            ? `${employee.full_name} — ${payment.period} Maaş Ödemesi`
            : `${employee.full_name} — ${payment.period} Salary Payment`,
      })
      toast({
        title: lang === 'tr' ? 'Maaş ödemesi güncellendi' : 'Salary payment updated',
        variant: 'success',
      })
      onClose()
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  })

  const err = 'mt-1 text-xs text-red'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PencilSimple size={20} className="text-brand" weight="duotone" />
            {lang === 'tr' ? 'Maaş Ödemesini Düzenle' : 'Edit Salary Payment'}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/55">
            {employee && <span className="font-medium text-black/70">{employee.full_name}</span>}
            {payment && <> — {payment.period}</>}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-md"
        >
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {/* Amount */}
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                {lang === 'tr'
                  ? `Tutar (${(employee?.salary_currency ?? 'TL') === 'USD' ? '$' : 'TL'})`
                  : `Amount (${(employee?.salary_currency ?? 'TL') === 'USD' ? '$' : 'TL'})`}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amountDisplay}
                onChange={(e) => {
                  const fmt = formatAmount(e.target.value, lang)
                  setAmountDisplay(fmt)
                  form.setValue('amount_tl', parseAmount(fmt, lang), { shouldValidate: true })
                }}
                placeholder={amountPlaceholder(lang)}
              />
              {form.formState.errors.amount_tl && (
                <p className={err}>{form.formState.errors.amount_tl.message}</p>
              )}
            </div>

            {/* Paid at */}
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                {lang === 'tr' ? 'Ödeme Tarihi' : 'Payment Date'}
              </Label>
              <Input type="date" {...form.register('paid_at')} />
              {form.formState.errors.paid_at && (
                <p className={err}>{form.formState.errors.paid_at.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
              {lang === 'tr' ? 'Notlar (İsteğe bağlı)' : 'Notes (Optional)'}
            </Label>
            <textarea
              {...form.register('notes')}
              rows={2}
              placeholder={lang === 'tr' ? 'Ödeme notu...' : 'Payment note...'}
              className="w-full resize-none rounded-lg border border-black/[0.12] bg-bg1 px-3 py-2 text-sm text-black placeholder:text-black/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 dark:border-white/10 dark:bg-bg2 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button type="submit" variant="filled" size="sm" disabled={updateSalary.isPending}>
              {updateSalary.isPending
                ? lang === 'tr'
                  ? 'Kaydediliyor...'
                  : 'Saving...'
                : lang === 'tr'
                  ? 'Güncelle'
                  : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
