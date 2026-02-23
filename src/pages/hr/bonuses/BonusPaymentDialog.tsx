import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Money } from '@phosphor-icons/react'
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
  useBonusMutations,
  type HrBonusAgreement,
  type HrEmployee,
} from '@/hooks/queries/useHrQuery'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'

const paymentSchema = z.object({
  amount_usdt: z.coerce.number().min(0.01, "Tutar 0'dan büyük olmalı"),
  period: z.string().min(1, 'Dönem gerekli'),
  paid_at: z.string().optional(),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

interface BonusPaymentDialogProps {
  open: boolean
  onClose: () => void
  agreement: HrBonusAgreement | null
  employees: HrEmployee[]
}

export function BonusPaymentDialog({
  open,
  onClose,
  agreement,
  employees,
}: BonusPaymentDialogProps) {
  const { i18n } = useTranslation('pages')
  const { toast } = useToast()
  const lang = i18n.language === 'tr' ? 'tr' : 'en'

  const { createPayment } = useBonusMutations()
  const [amountDisplay, setAmountDisplay] = useState('')

  const employee = employees.find((e) => e.id === agreement?.employee_id)

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount_usdt: agreement?.fixed_amount ?? 0,
      period: '',
      paid_at: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  useEffect(() => {
    if (open && agreement) {
      const amt = agreement.bonus_type === 'fixed' ? agreement.fixed_amount : 0
      form.reset({
        amount_usdt: amt,
        period: '',
        paid_at: new Date().toISOString().split('T')[0],
        notes: '',
      })
      setAmountDisplay(numberToDisplay(amt, lang))
    }
  }, [open, agreement, form, lang])

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!agreement) return
    try {
      await createPayment.mutateAsync({
        agreement_id: agreement.id,
        employee_id: agreement.employee_id,
        period: data.period.trim(),
        amount_usdt: data.amount_usdt,
        paid_at: data.paid_at || null,
        notes: data.notes?.trim() || null,
      })
      toast({ title: lang === 'tr' ? 'Ödeme kaydedildi' : 'Payment recorded', variant: 'success' })
      onClose()
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  })

  const isSubmitting = createPayment.isPending
  const compactError = 'mt-1 text-xs text-red'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        size="md"
        className="max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Money size={20} className="text-brand" weight="duotone" />
            {lang === 'tr' ? 'Prim Ödemesi' : 'Bonus Payment'}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/55">
            {employee && <span className="font-medium text-black/70">{employee.full_name}</span>}
            {agreement && <> — {agreement.title}</>}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-md"
        >
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {/* Period */}
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                {lang === 'tr' ? 'Dönem' : 'Period'}
              </Label>
              <Input
                {...form.register('period')}
                placeholder={lang === 'tr' ? 'örn. Şubat 2026' : 'e.g. February 2026'}
              />
              {form.formState.errors.period && (
                <p className={compactError}>{form.formState.errors.period.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                {lang === 'tr' ? 'Tutar (USDT)' : 'Amount (USDT)'}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amountDisplay}
                onChange={(e) => {
                  const formatted = formatAmount(e.target.value, lang)
                  setAmountDisplay(formatted)
                  form.setValue('amount_usdt', parseAmount(formatted, lang), { shouldValidate: true })
                }}
                placeholder={amountPlaceholder(lang)}
              />
              {form.formState.errors.amount_usdt && (
                <p className={compactError}>{form.formState.errors.amount_usdt.message}</p>
              )}
            </div>

            {/* Paid at */}
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                {lang === 'tr' ? 'Ödeme Tarihi' : 'Payment Date'}
              </Label>
              <Input type="date" {...form.register('paid_at')} />
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

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button type="submit" variant="filled" size="sm" disabled={isSubmitting}>
              {isSubmitting
                ? lang === 'tr'
                  ? 'Kaydediliyor...'
                  : 'Saving...'
                : lang === 'tr'
                  ? 'Ödemeyi Kaydet'
                  : 'Save Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
