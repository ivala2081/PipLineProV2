import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from '@phosphor-icons/react'
import { ibPaymentSchema, type IBPaymentFormValues } from '@/schemas/ibSchema'
import { useIBPartnersQuery } from '@/hooks/queries/useIBPartnersQuery'
import { useIBCommissionsQuery } from '@/hooks/queries/useIBCommissionsQuery'
import { useIBPaymentMutations } from '@/hooks/queries/useIBPaymentsQuery'
import { useToast } from '@/hooks/useToast'
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function todayYMD(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PaymentDialog({ open, onClose }: PaymentDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()

  const { partners } = useIBPartnersQuery()
  const { commissions } = useIBCommissionsQuery()
  const { createPayment } = useIBPaymentMutations()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IBPaymentFormValues>({
    resolver: zodResolver(ibPaymentSchema),
    defaultValues: {
      ib_partner_id: '',
      ib_commission_id: '',
      amount: 0,
      currency: 'USD',
      register: 'USDT',
      payment_method: '',
      reference: '',
      payment_date: todayYMD(),
      description: '',
      notes: '',
    },
  })

  /* ---- Reset form when dialog opens ---- */

  useEffect(() => {
    if (open) {
      reset({
        ib_partner_id: '',
        ib_commission_id: '',
        amount: 0,
        currency: 'USD',
        register: 'USDT',
        payment_method: '',
        reference: '',
        payment_date: todayYMD(),
        description: '',
        notes: '',
      })
    }
  }, [open, reset])

  /* ---- Filter commissions by selected partner (confirmed only) ---- */

  const selectedPartnerId = watch('ib_partner_id')

  const partnerCommissions = useMemo(() => {
    if (!selectedPartnerId) return []
    return commissions.filter(
      (c) => c.ib_partner_id === selectedPartnerId && c.status === 'confirmed',
    )
  }, [commissions, selectedPartnerId])

  /* ---- Submit ---- */

  const isSubmitting = createPayment.isPending

  const onFormSubmit = handleSubmit(async (data) => {
    try {
      await createPayment.mutateAsync(data)
      toast({ title: t('ib.payments.createSuccess'), variant: 'success' })
      onClose()
    } catch {
      toast({ title: t('ib.payments.createError'), variant: 'error' })
    }
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isSubmitting && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t('ib.payments.dialog.title')}</DialogTitle>
          <DialogDescription>{t('ib.payments.dialog.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="space-y-md">
          {/* Partner */}
          <div className="space-y-sm">
            <Label>{t('ib.payments.partner')}</Label>
            <Select
              value={watch('ib_partner_id')}
              onValueChange={(v) => {
                setValue('ib_partner_id', v, { shouldValidate: true })
                // Reset commission link when partner changes
                setValue('ib_commission_id', '')
                // Reset is fine - the Select will display __none__ via the || fallback
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('ib.payments.partnerPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ib_partner_id && (
              <p className="text-xs text-red">{errors.ib_partner_id.message}</p>
            )}
          </div>

          {/* Amount & Currency row */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <Label>{t('ib.payments.amount')}</Label>
              <Input
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-xs text-red">{errors.amount.message}</p>}
            </div>
            <div className="space-y-sm">
              <Label>{t('ib.payments.currency')}</Label>
              <Select
                value={watch('currency')}
                onValueChange={(v) => setValue('currency', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              {errors.currency && <p className="text-xs text-red">{errors.currency.message}</p>}
            </div>
          </div>

          {/* Register */}
          <div className="space-y-sm">
            <Label>{t('ib.payments.register')}</Label>
            <Select
              value={watch('register')}
              onValueChange={(v) =>
                setValue('register', v as IBPaymentFormValues['register'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="NAKIT_TL">NAKIT_TL</SelectItem>
                <SelectItem value="NAKIT_USD">NAKIT_USD</SelectItem>
                <SelectItem value="TRX">TRX</SelectItem>
              </SelectContent>
            </Select>
            {errors.register && <p className="text-xs text-red">{errors.register.message}</p>}
          </div>

          {/* Payment Method & Reference row */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <Label>{t('ib.payments.paymentMethod')}</Label>
              <Input
                {...register('payment_method')}
                placeholder={t('ib.payments.paymentMethodPlaceholder')}
              />
            </div>
            <div className="space-y-sm">
              <Label>{t('ib.payments.reference')}</Label>
              <Input
                {...register('reference')}
                placeholder={t('ib.payments.referencePlaceholder')}
              />
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-sm">
            <Label>{t('ib.payments.paymentDate')}</Label>
            <Input type="date" {...register('payment_date')} />
            {errors.payment_date && (
              <p className="text-xs text-red">{errors.payment_date.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-sm">
            <Label>{t('ib.payments.description')}</Label>
            <Input
              {...register('description')}
              placeholder={t('ib.payments.descriptionPlaceholder')}
            />
          </div>

          {/* Link to Commission */}
          {partnerCommissions.length > 0 && (
            <div className="space-y-sm">
              <Label>{t('ib.payments.linkedCommission')}</Label>
              <Select
                value={watch('ib_commission_id') || '__none__'}
                onValueChange={(v) => setValue('ib_commission_id', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('ib.payments.dialog.selectCommission')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('ib.payments.noCommission')}</SelectItem>
                  {partnerCommissions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.period_start} — {c.period_end} ({c.currency}{' '}
                      {new Intl.NumberFormat(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(c.final_amount)}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-sm">
            <Label>{t('ib.payments.notes')}</Label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-black/30 focus:border-black/25"
              placeholder={t('ib.payments.notesPlaceholder')}
            />
          </div>

          {/* Info callout */}
          <div className="flex items-start gap-2 rounded-lg border border-blue/15 bg-blue/[0.03] px-3 py-2.5">
            <Info size={14} className="mt-0.5 shrink-0 text-blue/60" />
            <p className="text-xs text-black/50">{t('ib.payments.accountingNote')}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t('ib.payments.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isSubmitting}>
              {isSubmitting ? t('ib.payments.saving') : t('ib.payments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
