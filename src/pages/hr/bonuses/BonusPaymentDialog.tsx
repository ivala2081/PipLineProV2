import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Money, PencilSimple } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useBonusMutations,
  type HrBonusAgreement,
  type HrBonusPayment,
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
  /** When creating a new payment — must be provided */
  agreement?: HrBonusAgreement | null
  /** When editing an existing payment */
  existingPayment?: HrBonusPayment | null
  employees: HrEmployee[]
}

export function BonusPaymentDialog({
  open,
  onClose,
  agreement,
  existingPayment,
  employees,
}: BonusPaymentDialogProps) {
  const { i18n } = useTranslation('pages')
  const { toast } = useToast()
  const lang = i18n.language === 'tr' ? 'tr' : 'en'

  const { createPayment, updatePayment } = useBonusMutations()
  const [amountDisplay, setAmountDisplay] = useState('')

  const isEditMode = !!existingPayment

  const employee = isEditMode
    ? employees.find((e) => e.id === existingPayment.employee_id)
    : employees.find((e) => e.id === agreement?.employee_id)

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount_usdt: agreement?.fixed_amount ?? 0,
      period: '',
      paid_at: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  const isVariable = !isEditMode && agreement?.bonus_type === 'variable'
  const currentYear = new Date().getFullYear()

  const months = [
    { value: '1', label: lang === 'tr' ? 'Ocak' : 'January' },
    { value: '2', label: lang === 'tr' ? 'Şubat' : 'February' },
    { value: '3', label: lang === 'tr' ? 'Mart' : 'March' },
    { value: '4', label: lang === 'tr' ? 'Nisan' : 'April' },
    { value: '5', label: lang === 'tr' ? 'Mayıs' : 'May' },
    { value: '6', label: lang === 'tr' ? 'Haziran' : 'June' },
    { value: '7', label: lang === 'tr' ? 'Temmuz' : 'July' },
    { value: '8', label: lang === 'tr' ? 'Ağustos' : 'August' },
    { value: '9', label: lang === 'tr' ? 'Eylül' : 'September' },
    { value: '10', label: lang === 'tr' ? 'Ekim' : 'October' },
    { value: '11', label: lang === 'tr' ? 'Kasım' : 'November' },
    { value: '12', label: lang === 'tr' ? 'Aralık' : 'December' },
  ]

  /** Derive the select value (month number as string) from the free-text period */
  function periodToMonthValue(period: string): string {
    const monthNames = [
      lang === 'tr' ? 'Ocak' : 'January',
      lang === 'tr' ? 'Şubat' : 'February',
      lang === 'tr' ? 'Mart' : 'March',
      lang === 'tr' ? 'Nisan' : 'April',
      lang === 'tr' ? 'Mayıs' : 'May',
      lang === 'tr' ? 'Haziran' : 'June',
      lang === 'tr' ? 'Temmuz' : 'July',
      lang === 'tr' ? 'Ağustos' : 'August',
      lang === 'tr' ? 'Eylül' : 'September',
      lang === 'tr' ? 'Ekim' : 'October',
      lang === 'tr' ? 'Kasım' : 'November',
      lang === 'tr' ? 'Aralık' : 'December',
    ]
    for (let i = 0; i < monthNames.length; i++) {
      if (period.startsWith(monthNames[i])) return String(i + 1)
    }
    return ''
  }

  const handleMonthChange = (monthValue: string) => {
    const monthNames = [
      lang === 'tr' ? 'Ocak' : 'January',
      lang === 'tr' ? 'Şubat' : 'February',
      lang === 'tr' ? 'Mart' : 'March',
      lang === 'tr' ? 'Nisan' : 'April',
      lang === 'tr' ? 'Mayıs' : 'May',
      lang === 'tr' ? 'Haziran' : 'June',
      lang === 'tr' ? 'Temmuz' : 'July',
      lang === 'tr' ? 'Ağustos' : 'August',
      lang === 'tr' ? 'Eylül' : 'September',
      lang === 'tr' ? 'Ekim' : 'October',
      lang === 'tr' ? 'Kasım' : 'November',
      lang === 'tr' ? 'Aralık' : 'December',
    ]
    const monthIndex = parseInt(monthValue) - 1
    const monthName = monthNames[monthIndex] || ''
    const periodText = `${monthName} ${currentYear}`
    form.setValue('period', periodText, { shouldValidate: true })
  }

  useEffect(() => {
    if (!open) return
    if (isEditMode && existingPayment) {
      form.reset({
        amount_usdt: existingPayment.amount_usdt,
        period: existingPayment.period,
        paid_at: existingPayment.paid_at ?? new Date().toISOString().split('T')[0],
        notes: existingPayment.notes ?? '',
      })
      setAmountDisplay(numberToDisplay(existingPayment.amount_usdt, lang))
    } else if (agreement) {
      const amt = agreement.bonus_type === 'fixed' ? agreement.fixed_amount : 0
      form.reset({
        amount_usdt: amt,
        period: '',
        paid_at: new Date().toISOString().split('T')[0],
        notes: '',
      })
      setAmountDisplay(amt > 0 ? numberToDisplay(amt, lang) : '')
    }
  }, [open, isEditMode, existingPayment, agreement, form, lang])

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      if (isEditMode && existingPayment) {
        // Build description from what we know
        const desc = `${employee?.full_name ?? ''} — Prim (${data.period.trim()})`
        await updatePayment.mutateAsync({
          id: existingPayment.id,
          amount_usdt: data.amount_usdt,
          period: data.period.trim(),
          paid_at: data.paid_at ?? null,
          notes: data.notes?.trim() || null,
          description: desc,
        })
        toast({
          title: lang === 'tr' ? 'Ödeme güncellendi' : 'Payment updated',
          variant: 'success',
        })
      } else if (agreement) {
        await createPayment.mutateAsync({
          agreement_id: agreement.id,
          employee_id: agreement.employee_id,
          period: data.period.trim(),
          amount_usdt: data.amount_usdt,
          paid_at: data.paid_at || null,
          notes: data.notes?.trim() || null,
          description: `${agreement.title} — ${employee?.full_name ?? ''} (${data.period.trim()})`,
        })
        toast({
          title: lang === 'tr' ? 'Ödeme kaydedildi' : 'Payment recorded',
          variant: 'success',
        })
      }
      onClose()
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  })

  const isSubmitting = createPayment.isPending || updatePayment.isPending
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
            {isEditMode ? (
              <PencilSimple size={20} className="text-brand" weight="duotone" />
            ) : (
              <Money size={20} className="text-brand" weight="duotone" />
            )}
            {isEditMode
              ? lang === 'tr'
                ? 'Ödemeyi Düzenle'
                : 'Edit Payment'
              : lang === 'tr'
                ? 'Prim Ödemesi'
                : 'Bonus Payment'}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/55">
            {employee && <span className="font-medium text-black/70">{employee.full_name}</span>}
            {!isEditMode && agreement && <> — {agreement.title}</>}
            {isEditMode && existingPayment && (
              <>
                {' '}
                — <span className="text-black/50">{existingPayment.period}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-md"
        >
          {/* Variable bonus warning */}
          {isVariable && (
            <div className="flex items-start gap-2 rounded-lg border border-orange/30 bg-orange/5 px-3 py-2.5 text-xs text-orange">
              <Money size={14} weight="fill" className="mt-0.5 shrink-0" />
              <span>
                {lang === 'tr'
                  ? 'Değişken prim anlaşması — bu ay için hakedilen tutarı girin.'
                  : 'Variable bonus agreement — enter the earned amount for this month.'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {/* Period */}
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                {lang === 'tr' ? 'Dönem' : 'Period'}
              </Label>
              <Select
                value={periodToMonthValue(form.watch('period'))}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang === 'tr' ? 'Ay seçin' : 'Select month'} />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label} {currentYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Show raw period text for past payments not matching current year */}
              {isEditMode && form.watch('period') && !periodToMonthValue(form.watch('period')) && (
                <p className="mt-1 text-xs text-black/50">{form.watch('period')}</p>
              )}
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
                  form.setValue('amount_usdt', parseAmount(formatted, lang), {
                    shouldValidate: true,
                  })
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
                : isEditMode
                  ? lang === 'tr'
                    ? 'Güncelle'
                    : 'Update'
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
