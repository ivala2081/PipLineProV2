import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Info, Wallet } from '@phosphor-icons/react'
import { ibPaymentSchema, type IBPaymentFormValues } from '@/schemas/ibSchema'
import { useIBPartnersQuery } from '@/hooks/queries/useIBPartnersQuery'
import { useIBCommissionsQuery } from '@/hooks/queries/useIBCommissionsQuery'
import { useIBPaymentMutations } from '@/hooks/queries/useIBPaymentsQuery'
import { useToast } from '@/hooks/useToast'
import {
  PageHeader,
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

export function PaymentFormPage() {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedPartnerId = searchParams.get('partner') ?? ''

  const { partners } = useIBPartnersQuery()
  const { commissions } = useIBCommissionsQuery()
  const { createPayment } = useIBPaymentMutations()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IBPaymentFormValues>({
    resolver: zodResolver(ibPaymentSchema),
    defaultValues: {
      ib_partner_id: preselectedPartnerId,
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
      navigate('/ib?tab=payments')
    } catch {
      toast({ title: t('ib.payments.createError'), variant: 'error' })
    }
  })

  const compactError = 'mt-1.5 text-xs text-red'

  return (
    <div className="space-y-lg">
      {/* Back link + Header */}
      <div>
        <button
          onClick={() => navigate('/ib?tab=payments')}
          className="mb-3 flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>{t('ib.payments.backToPayments')}</span>
        </button>
        <PageHeader
          title={t('ib.payments.dialog.title')}
          subtitle={t('ib.payments.dialog.description')}
        />
      </div>

      <form
        onSubmit={(e) => {
          void onFormSubmit(e)
        }}
        className="space-y-md"
      >
        <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-md">
            <div className="rounded-xl border border-black/[0.07] bg-bg1">
              <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-5 py-3.5">
                <Wallet size={16} weight="duotone" className="text-brand" />
                <h3 className="text-sm font-semibold text-black/80">
                  {t('ib.payments.dialog.title')}
                </h3>
              </div>
              <div className="space-y-md p-5">
                {/* Partner */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.payments.partner')} *
                  </Label>
                  <Select
                    value={watch('ib_partner_id')}
                    onValueChange={(v) => {
                      setValue('ib_partner_id', v, { shouldValidate: true })
                      setValue('ib_commission_id', '')
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
                    <p className={compactError}>{errors.ib_partner_id.message}</p>
                  )}
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      {t('ib.payments.amount')} *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register('amount', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                    {errors.amount && <p className={compactError}>{errors.amount.message}</p>}
                  </div>
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      {t('ib.payments.currency')}
                    </Label>
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
                  </div>
                </div>

                {/* Register */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.payments.register')}
                  </Label>
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
                </div>

                {/* Payment Method & Reference */}
                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      {t('ib.payments.paymentMethod')}
                    </Label>
                    <Input
                      {...register('payment_method')}
                      placeholder={t('ib.payments.paymentMethodPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      {t('ib.payments.reference')}
                    </Label>
                    <Input
                      {...register('reference')}
                      placeholder={t('ib.payments.referencePlaceholder')}
                    />
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.payments.paymentDate')} *
                  </Label>
                  <Input type="date" {...register('payment_date')} />
                  {errors.payment_date && (
                    <p className={compactError}>{errors.payment_date.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-md">
            <div className="rounded-xl border border-black/[0.07] bg-bg1">
              <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-5 py-3.5">
                <Info size={16} weight="duotone" className="text-brand" />
                <h3 className="text-sm font-semibold text-black/80">{t('ib.payments.details')}</h3>
              </div>
              <div className="space-y-md p-5">
                {/* Description */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.payments.description')}
                  </Label>
                  <Input
                    {...register('description')}
                    placeholder={t('ib.payments.descriptionPlaceholder')}
                  />
                </div>

                {/* Link to Commission */}
                {partnerCommissions.length > 0 && (
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      {t('ib.payments.linkedCommission')}
                    </Label>
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
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.payments.notes')}
                  </Label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-black/30 focus:border-black/25"
                    placeholder={t('ib.payments.notesPlaceholder')}
                  />
                </div>

                {/* Info callout */}
                <div className="flex items-start gap-2 rounded-lg border border-blue/15 bg-blue/[0.03] px-3 py-2.5">
                  <Info size={14} className="mt-0.5 shrink-0 text-blue/60" />
                  <p className="text-xs text-black/50">{t('ib.payments.accountingNote')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit row */}
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/ib?tab=payments')}
            disabled={isSubmitting}
          >
            {t('ib.payments.cancel')}
          </Button>
          <Button type="submit" variant="filled" disabled={isSubmitting}>
            {isSubmitting ? t('ib.payments.saving') : t('ib.payments.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
