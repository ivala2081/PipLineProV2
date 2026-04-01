import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useIBPartnerMutations } from '@/hooks/queries/useIBPartnersQuery'
import { useToast } from '@/hooks/useToast'
import {
  ibPartnerSchema,
  validateAgreementDetails,
  AGREEMENT_TYPES,
  type IBPartnerFormValues,
  type AgreementType,
} from '@/schemas/ibSchema'
import type { IBPartner } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PartnerDialogProps {
  open: boolean
  onClose: () => void
  partner: IBPartner | null // null = create, object = edit
}

/* ------------------------------------------------------------------ */
/*  Agreement detail types                                             */
/* ------------------------------------------------------------------ */

interface SalaryDetails {
  amount: number | ''
  currency: string
  period: string
}

interface CpaDetails {
  cpa_amount: number | ''
  currency: string
  min_ftd_amount: number | ''
}

interface LotRebateDetails {
  rebate_per_lot: number | ''
  currency: string
}

interface RevenueShareDetails {
  revshare_pct: number | ''
  source: string
}

interface HybridDetails {
  json: string
}

const DEFAULT_SALARY: SalaryDetails = { amount: '', currency: 'USD', period: 'monthly' }
const DEFAULT_CPA: CpaDetails = { cpa_amount: '', currency: 'USD', min_ftd_amount: '' }
const DEFAULT_LOT_REBATE: LotRebateDetails = { rebate_per_lot: '', currency: 'USD' }
const DEFAULT_REVENUE_SHARE: RevenueShareDetails = { revshare_pct: '', source: 'spread' }
const DEFAULT_HYBRID: HybridDetails = { json: '{}' }

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseDetailsFromPartner(agreementType: string, details: Record<string, unknown> | null) {
  const d = (details ?? {}) as Record<string, unknown>
  switch (agreementType) {
    case 'salary':
      return {
        salary: {
          amount: (d.amount as number) ?? '',
          currency: (d.currency as string) ?? 'USD',
          period: (d.period as string) ?? 'monthly',
        } satisfies SalaryDetails,
      }
    case 'cpa':
      return {
        cpa: {
          cpa_amount: (d.cpa_amount as number) ?? '',
          currency: (d.currency as string) ?? 'USD',
          min_ftd_amount: (d.min_ftd_amount as number) ?? '',
        } satisfies CpaDetails,
      }
    case 'lot_rebate':
      return {
        lotRebate: {
          rebate_per_lot: (d.rebate_per_lot as number) ?? '',
          currency: (d.currency as string) ?? 'USD',
        } satisfies LotRebateDetails,
      }
    case 'revenue_share':
      return {
        revenueShare: {
          revshare_pct: (d.revshare_pct as number) ?? '',
          source: (d.source as string) ?? 'spread',
        } satisfies RevenueShareDetails,
      }
    case 'hybrid':
      return {
        hybrid: {
          json: JSON.stringify(d, null, 2),
        } satisfies HybridDetails,
      }
    default:
      return {}
  }
}

function buildAgreementDetails(
  agreementType: AgreementType,
  salary: SalaryDetails,
  cpa: CpaDetails,
  lotRebate: LotRebateDetails,
  revenueShare: RevenueShareDetails,
  hybrid: HybridDetails,
): Record<string, unknown> {
  switch (agreementType) {
    case 'salary':
      return {
        amount: salary.amount === '' ? 0 : Number(salary.amount),
        currency: salary.currency,
        period: salary.period,
      }
    case 'cpa':
      return {
        cpa_amount: cpa.cpa_amount === '' ? 0 : Number(cpa.cpa_amount),
        currency: cpa.currency,
        ...(cpa.min_ftd_amount !== '' ? { min_ftd_amount: Number(cpa.min_ftd_amount) } : {}),
      }
    case 'lot_rebate':
      return {
        rebate_per_lot: lotRebate.rebate_per_lot === '' ? 0 : Number(lotRebate.rebate_per_lot),
        currency: lotRebate.currency,
      }
    case 'revenue_share':
      return {
        revshare_pct: revenueShare.revshare_pct === '' ? 0 : Number(revenueShare.revshare_pct),
        source: revenueShare.source,
      }
    case 'hybrid': {
      try {
        return JSON.parse(hybrid.json) as Record<string, unknown>
      } catch {
        return {}
      }
    }
    default:
      return {}
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PartnerDialog({ open, onClose, partner }: PartnerDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { createPartner, updatePartner } = useIBPartnerMutations()
  const isEditing = partner !== null

  /* ---- Form ---- */

  const form = useForm<IBPartnerFormValues>({
    resolver: zodResolver(ibPartnerSchema),
    defaultValues: {
      name: '',
      referral_code: '',
      contact_email: '',
      contact_phone: '',
      agreement_type: 'cpa',
      agreement_details: {},
      status: 'active',
      notes: '',
    },
  })

  const watchedAgreementType = form.watch('agreement_type')

  /* ---- Agreement detail state (outside Zod schema) ---- */

  const [salary, setSalary] = useState<SalaryDetails>({ ...DEFAULT_SALARY })
  const [cpa, setCpa] = useState<CpaDetails>({ ...DEFAULT_CPA })
  const [lotRebate, setLotRebate] = useState<LotRebateDetails>({ ...DEFAULT_LOT_REBATE })
  const [revenueShare, setRevenueShare] = useState<RevenueShareDetails>({
    ...DEFAULT_REVENUE_SHARE,
  })
  const [hybrid, setHybrid] = useState<HybridDetails>({ ...DEFAULT_HYBRID })
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({})

  // Clear detail errors when agreement type changes
  useEffect(() => {
    setDetailErrors({})
  }, [watchedAgreementType])

  /* ---- Reset on open / partner change ---- */

  useEffect(() => {
    if (!open) return

    if (partner) {
      const details = partner.agreement_details as Record<string, unknown> | null
      form.reset({
        name: partner.name,
        referral_code: partner.referral_code,
        contact_email: partner.contact_email ?? '',
        contact_phone: partner.contact_phone ?? '',
        agreement_type: partner.agreement_type as AgreementType,
        agreement_details: (details ?? {}) as Record<string, unknown>,
        status: partner.status as 'active' | 'paused' | 'terminated',
        notes: partner.notes ?? '',
      })

      // Parse detail state from existing partner
      const parsed = parseDetailsFromPartner(partner.agreement_type, details)
      setSalary('salary' in parsed ? parsed.salary : { ...DEFAULT_SALARY })
      setCpa('cpa' in parsed ? parsed.cpa : { ...DEFAULT_CPA })
      setLotRebate('lotRebate' in parsed ? parsed.lotRebate : { ...DEFAULT_LOT_REBATE })
      setRevenueShare('revenueShare' in parsed ? parsed.revenueShare : { ...DEFAULT_REVENUE_SHARE })
      setHybrid('hybrid' in parsed ? parsed.hybrid : { ...DEFAULT_HYBRID })
    } else {
      form.reset({
        name: '',
        referral_code: '',
        contact_email: '',
        contact_phone: '',
        agreement_type: 'cpa',
        agreement_details: {},
        status: 'active',
        notes: '',
      })
      setSalary({ ...DEFAULT_SALARY })
      setCpa({ ...DEFAULT_CPA })
      setLotRebate({ ...DEFAULT_LOT_REBATE })
      setRevenueShare({ ...DEFAULT_REVENUE_SHARE })
      setHybrid({ ...DEFAULT_HYBRID })
    }
  }, [open, partner, form])

  /* ---- Submit ---- */

  const handleSubmit = form.handleSubmit(async (values) => {
    const agreementDetails = buildAgreementDetails(
      values.agreement_type,
      salary,
      cpa,
      lotRebate,
      revenueShare,
      hybrid,
    )

    // Validate agreement details against type-specific schema
    const validation = validateAgreementDetails(values.agreement_type, agreementDetails)
    if (!validation.success) {
      setDetailErrors(validation.errors)
      return
    }
    setDetailErrors({})

    const payload: IBPartnerFormValues = {
      ...values,
      agreement_details: validation.data,
    }

    try {
      if (isEditing) {
        await updatePartner.mutateAsync({ id: partner.id, data: payload })
        toast({ title: t('ib.partners.updateSuccess'), variant: 'success' })
      } else {
        await createPartner.mutateAsync(payload)
        toast({ title: t('ib.partners.createSuccess'), variant: 'success' })
      }
      onClose()
    } catch {
      toast({
        title: isEditing ? t('ib.partners.updateError') : t('ib.partners.createError'),
        variant: 'error',
      })
    }
  })

  const isPending = createPartner.isPending || updatePartner.isPending

  /* ---- Render ---- */

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('ib.partners.editTitle') : t('ib.partners.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('ib.partners.editDescription') : t('ib.partners.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-md">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="partner-name">{t('ib.partners.name')}</Label>
            <Input
              id="partner-name"
              {...form.register('name')}
              placeholder={t('ib.partners.namePlaceholder')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-error">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Referral Code */}
          <div className="space-y-1">
            <Label htmlFor="partner-referral-code">{t('ib.partners.referralCode')}</Label>
            <Input
              id="partner-referral-code"
              {...form.register('referral_code')}
              placeholder={t('ib.partners.referralCodePlaceholder')}
            />
            {form.formState.errors.referral_code && (
              <p className="text-xs text-error">{form.formState.errors.referral_code.message}</p>
            )}
          </div>

          {/* Contact Email */}
          <div className="space-y-1">
            <Label htmlFor="partner-email">{t('ib.partners.contactEmail')}</Label>
            <Input
              id="partner-email"
              type="email"
              {...form.register('contact_email')}
              placeholder={t('ib.partners.contactEmailPlaceholder')}
            />
            {form.formState.errors.contact_email && (
              <p className="text-xs text-error">{form.formState.errors.contact_email.message}</p>
            )}
          </div>

          {/* Contact Phone */}
          <div className="space-y-1">
            <Label htmlFor="partner-phone">{t('ib.partners.contactPhone')}</Label>
            <Input
              id="partner-phone"
              {...form.register('contact_phone')}
              placeholder={t('ib.partners.contactPhonePlaceholder')}
            />
          </div>

          {/* Agreement Type */}
          <div className="space-y-1">
            <Label>{t('ib.partners.agreementType')}</Label>
            <Select
              value={watchedAgreementType}
              onValueChange={(v) => form.setValue('agreement_type', v as AgreementType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGREEMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`ib.partners.agreements.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Agreement Details */}
          <AgreementDetailsSection
            agreementType={watchedAgreementType}
            salary={salary}
            onSalaryChange={setSalary}
            cpa={cpa}
            onCpaChange={setCpa}
            lotRebate={lotRebate}
            onLotRebateChange={setLotRebate}
            revenueShare={revenueShare}
            onRevenueShareChange={setRevenueShare}
            hybrid={hybrid}
            onHybridChange={setHybrid}
            errors={detailErrors}
            t={t}
          />

          {/* Status (edit mode only) */}
          {isEditing && (
            <div className="space-y-1">
              <Label>{t('ib.partners.status')}</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(v) =>
                  form.setValue('status', v as 'active' | 'paused' | 'terminated')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('ib.partners.statuses.active')}</SelectItem>
                  <SelectItem value="paused">{t('ib.partners.statuses.paused')}</SelectItem>
                  <SelectItem value="terminated">{t('ib.partners.statuses.terminated')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="partner-notes">{t('ib.partners.notes')}</Label>
            <Input
              id="partner-notes"
              {...form.register('notes')}
              placeholder={t('ib.partners.notesPlaceholder')}
            />
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('ib.partners.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isPending}>
              {isPending
                ? t('ib.partners.saving')
                : isEditing
                  ? t('ib.partners.save')
                  : t('ib.partners.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Agreement Details Section                                          */
/* ------------------------------------------------------------------ */

interface AgreementDetailsSectionProps {
  agreementType: AgreementType
  salary: SalaryDetails
  onSalaryChange: (v: SalaryDetails) => void
  cpa: CpaDetails
  onCpaChange: (v: CpaDetails) => void
  lotRebate: LotRebateDetails
  onLotRebateChange: (v: LotRebateDetails) => void
  revenueShare: RevenueShareDetails
  onRevenueShareChange: (v: RevenueShareDetails) => void
  hybrid: HybridDetails
  onHybridChange: (v: HybridDetails) => void
  errors?: Record<string, string>
  t: (key: string) => string
}

function AgreementDetailsSection({
  agreementType,
  salary,
  onSalaryChange,
  cpa,
  onCpaChange,
  lotRebate,
  onLotRebateChange,
  revenueShare,
  onRevenueShareChange,
  hybrid,
  onHybridChange,
  errors,
  t,
}: AgreementDetailsSectionProps) {
  const CURRENCIES = ['USD', 'TRY', 'EUR']

  switch (agreementType) {
    case 'salary':
      return (
        <fieldset className="space-y-sm rounded-md border border-border p-md">
          <legend className="text-sm font-medium px-1">{t('ib.partners.salaryTitle')}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
            <div className="space-y-1">
              <Label htmlFor="salary-amount">{t('ib.partners.salary.amount')}</Label>
              <Input
                id="salary-amount"
                type="number"
                min={0}
                step="0.01"
                value={salary.amount}
                onChange={(e) =>
                  onSalaryChange({
                    ...salary,
                    amount: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                placeholder="0.00"
              />
              {errors?.amount && <p className="text-xs text-error">{errors.amount}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t('ib.partners.currency')}</Label>
              <Select
                value={salary.currency}
                onValueChange={(v) => onSalaryChange({ ...salary, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('ib.partners.salary.period')}</Label>
              <Select
                value={salary.period}
                onValueChange={(v) => onSalaryChange({ ...salary, period: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('ib.partners.salary.weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('ib.partners.salary.monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>
      )

    case 'cpa':
      return (
        <fieldset className="space-y-sm rounded-md border border-border p-md">
          <legend className="text-sm font-medium px-1">{t('ib.partners.cpaTitle')}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
            <div className="space-y-1">
              <Label htmlFor="cpa-amount">{t('ib.partners.cpa.cpaAmount')}</Label>
              <Input
                id="cpa-amount"
                type="number"
                min={0}
                step="0.01"
                value={cpa.cpa_amount}
                onChange={(e) =>
                  onCpaChange({
                    ...cpa,
                    cpa_amount: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                placeholder="0.00"
              />
              {errors?.cpa_amount && <p className="text-xs text-error">{errors.cpa_amount}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t('ib.partners.currency')}</Label>
              <Select
                value={cpa.currency}
                onValueChange={(v) => onCpaChange({ ...cpa, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cpa-min-ftd">{t('ib.partners.cpa.minFtdAmount')}</Label>
              <Input
                id="cpa-min-ftd"
                type="number"
                min={0}
                step="0.01"
                value={cpa.min_ftd_amount}
                onChange={(e) =>
                  onCpaChange({
                    ...cpa,
                    min_ftd_amount: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                placeholder={t('ib.partners.optional')}
              />
              {errors?.min_ftd_amount && (
                <p className="text-xs text-error">{errors.min_ftd_amount}</p>
              )}
            </div>
          </div>
        </fieldset>
      )

    case 'lot_rebate':
      return (
        <fieldset className="space-y-sm rounded-md border border-border p-md">
          <legend className="text-sm font-medium px-1">{t('ib.partners.lotRebateTitle')}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <div className="space-y-1">
              <Label htmlFor="rebate-per-lot">{t('ib.partners.lotRebate.rebatePerLot')}</Label>
              <Input
                id="rebate-per-lot"
                type="number"
                min={0}
                step="0.01"
                value={lotRebate.rebate_per_lot}
                onChange={(e) =>
                  onLotRebateChange({
                    ...lotRebate,
                    rebate_per_lot: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                placeholder="0.00"
              />
              {errors?.rebate_per_lot && (
                <p className="text-xs text-error">{errors.rebate_per_lot}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>{t('ib.partners.currency')}</Label>
              <Select
                value={lotRebate.currency}
                onValueChange={(v) => onLotRebateChange({ ...lotRebate, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>
      )

    case 'revenue_share':
      return (
        <fieldset className="space-y-sm rounded-md border border-border p-md">
          <legend className="text-sm font-medium px-1">{t('ib.partners.revenueShareTitle')}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <div className="space-y-1">
              <Label htmlFor="revshare-pct">{t('ib.partners.revenueShare.revSharePct')}</Label>
              <Input
                id="revshare-pct"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={revenueShare.revshare_pct}
                onChange={(e) =>
                  onRevenueShareChange({
                    ...revenueShare,
                    revshare_pct: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                placeholder="0"
              />
              {errors?.revshare_pct && <p className="text-xs text-error">{errors.revshare_pct}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t('ib.partners.revenueShare.source')}</Label>
              <Select
                value={revenueShare.source}
                onValueChange={(v) => onRevenueShareChange({ ...revenueShare, source: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spread">{t('ib.partners.revenueShare.spread')}</SelectItem>
                  <SelectItem value="commission">
                    {t('ib.partners.revenueShare.commission')}
                  </SelectItem>
                  <SelectItem value="net_revenue">
                    {t('ib.partners.revenueShare.netRevenue')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>
      )

    case 'hybrid':
      return (
        <fieldset className="space-y-sm rounded-md border border-border p-md">
          <legend className="text-sm font-medium px-1">{t('ib.partners.hybridTitle')}</legend>
          <div className="space-y-1">
            <Label htmlFor="hybrid-json">{t('ib.partners.hybridJson')}</Label>
            <textarea
              id="hybrid-json"
              className="flex min-h-[100px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm ring-offset-surface placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={hybrid.json}
              onChange={(e) => onHybridChange({ json: e.target.value })}
              placeholder='{ "components": [{ "type": "salary", "amount": 500 }] }'
            />
            {errors?.components && <p className="text-xs text-error">{errors.components}</p>}
            {errors?._root && <p className="text-xs text-error">{errors._root}</p>}
          </div>
        </fieldset>
      )

    default:
      return null
  }
}
