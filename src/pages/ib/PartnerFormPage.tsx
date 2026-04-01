import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  UserCircle,
  Globe,
  Handshake,
  Wallet,
  NoteBlank,
  FloppyDisk,
  TelegramLogo,
  WhatsappLogo,
  InstagramLogo,
  TwitterLogo,
  LinkedinLogo,
  CalendarBlank,
} from '@phosphor-icons/react'
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
  Skeleton,
} from '@ds'
import { useIBPartnersQuery, useIBPartnerMutations } from '@/hooks/queries/useIBPartnersQuery'
import { useToast } from '@/hooks/useToast'
import {
  ibPartnerSchema,
  validateAgreementDetails,
  AGREEMENT_TYPES,
  CRYPTO_NETWORKS,
  type IBPartnerFormValues,
  type AgreementType,
} from '@/schemas/ibSchema'
import { AvatarUpload } from '@/components/AvatarUpload'

/* ------------------------------------------------------------------ */
/*  Agreement detail types (reused from PartnerDialog)                  */
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
/*  Section wrapper (same pattern as EmployeeFormPage)                  */
/* ------------------------------------------------------------------ */

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; weight?: string; className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-black/[0.07] bg-bg1">
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-5 py-3.5">
        <Icon size={16} weight="duotone" className="text-brand" />
        <h3 className="text-sm font-semibold text-black/80">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */

export function PartnerFormPage() {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const { partners, isLoading: partnersLoading } = useIBPartnersQuery()
  const { createPartner, updatePartner } = useIBPartnerMutations()

  const partner = isEdit ? (partners.find((p) => p.id === id) ?? null) : null

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
      company_name: '',
      website: '',
      telegram: '',
      whatsapp: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      preferred_payment_method: '',
      iban: '',
      crypto_wallet_address: '',
      crypto_network: '',
      contract_start_date: '',
      contract_end_date: '',
      logo_url: '',
    },
  })

  const watchedAgreementType = useWatch({ control: form.control, name: 'agreement_type' })
  const watchedPaymentMethod = useWatch({ control: form.control, name: 'preferred_payment_method' })
  const watchedStatus = useWatch({ control: form.control, name: 'status' })
  const watchedCryptoNetwork = useWatch({ control: form.control, name: 'crypto_network' })

  /* ---- Agreement detail state (outside Zod schema) ---- */

  const [salary, setSalary] = useState<SalaryDetails>({ ...DEFAULT_SALARY })
  const [cpa, setCpa] = useState<CpaDetails>({ ...DEFAULT_CPA })
  const [lotRebate, setLotRebate] = useState<LotRebateDetails>({ ...DEFAULT_LOT_REBATE })
  const [revenueShare, setRevenueShare] = useState<RevenueShareDetails>({
    ...DEFAULT_REVENUE_SHARE,
  })
  const [hybrid, setHybrid] = useState<HybridDetails>({ ...DEFAULT_HYBRID })
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({})
  const watchedLogoUrl = useWatch({ control: form.control, name: 'logo_url' })

  /* ---- Populate form when editing ---- */

  /* ---- Populate form when partner data loads (adjust state during render) ---- */

  const [populatedPartnerId, setPopulatedPartnerId] = useState<string | null>(null)
  if (partner && partner.id !== populatedPartnerId) {
    setPopulatedPartnerId(partner.id)

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
      company_name: partner.company_name ?? '',
      website: partner.website ?? '',
      telegram: partner.telegram ?? '',
      whatsapp: partner.whatsapp ?? '',
      instagram: partner.instagram ?? '',
      twitter: partner.twitter ?? '',
      linkedin: partner.linkedin ?? '',
      preferred_payment_method: (partner.preferred_payment_method as 'crypto' | 'iban') ?? '',
      iban: partner.iban ?? '',
      crypto_wallet_address: partner.crypto_wallet_address ?? '',
      crypto_network: partner.crypto_network ?? '',
      contract_start_date: partner.contract_start_date ?? '',
      contract_end_date: partner.contract_end_date ?? '',
      logo_url: partner.logo_url ?? '',
    })

    const parsed = parseDetailsFromPartner(partner.agreement_type, details)
    setSalary('salary' in parsed ? parsed.salary : { ...DEFAULT_SALARY })
    setCpa('cpa' in parsed ? parsed.cpa : { ...DEFAULT_CPA })
    setLotRebate('lotRebate' in parsed ? parsed.lotRebate : { ...DEFAULT_LOT_REBATE })
    setRevenueShare('revenueShare' in parsed ? parsed.revenueShare : { ...DEFAULT_REVENUE_SHARE })
    setHybrid('hybrid' in parsed ? parsed.hybrid : { ...DEFAULT_HYBRID })
  }

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
      if (isEdit && partner) {
        await updatePartner.mutateAsync({ id: partner.id, data: payload })
        toast({ title: t('ib.partnerForm.updateSuccess'), variant: 'success' })
      } else {
        await createPartner.mutateAsync(payload)
        toast({ title: t('ib.partnerForm.createSuccess'), variant: 'success' })
      }
      navigate('/ib')
    } catch {
      toast({
        title: isEdit ? t('ib.partnerForm.updateError') : t('ib.partnerForm.createError'),
        variant: 'error',
      })
    }
  })

  const isPending = createPartner.isPending || updatePartner.isPending
  const compactError = 'mt-1.5 text-xs text-red'
  const CURRENCIES = ['USD', 'TRY', 'EUR']

  /* ---- Loading state ---- */

  if (isEdit && partnersLoading) {
    return (
      <div className="space-y-lg">
        <div>
          <Skeleton className="mb-3 h-4 w-32 rounded" />
          <Skeleton className="mb-1 h-6 w-64 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <div className="space-y-md">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  /* ---- Not found ---- */

  if (isEdit && !partnersLoading && !partner) {
    return (
      <div className="space-y-lg">
        <div>
          <button
            onClick={() => navigate('/ib')}
            className="mb-3 flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
          >
            <ArrowLeft size={13} weight="bold" />
            <span>{t('ib.partners.detail.back')}</span>
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <Handshake size={48} weight="duotone" className="text-black/15" />
          <p className="mt-3 text-sm text-black/50">{t('ib.partnerForm.notFound')}</p>
        </div>
      </div>
    )
  }

  /* ---- Render ---- */

  return (
    <div className="space-y-lg">
      {/* Back link + Header */}
      <div>
        <button
          onClick={() => navigate('/ib')}
          className="mb-3 flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>{t('ib.partners.detail.back')}</span>
        </button>
        <PageHeader
          title={isEdit ? t('ib.partnerForm.editTitle') : t('ib.partnerForm.createTitle')}
          subtitle={
            isEdit
              ? (partner?.name ?? t('ib.partnerForm.editSubtitle'))
              : t('ib.partnerForm.createSubtitle')
          }
        />
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
        className="space-y-md"
      >
        <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
          {/* ── Left column ── */}
          <div className="space-y-md">
            {/* Partner Information */}
            <FormSection icon={UserCircle} title={t('ib.partnerForm.sections.info')}>
              <div className="space-y-md">
                {/* Logo upload */}
                <div className="flex justify-center">
                  <AvatarUpload
                    userId={partner?.id ?? 'new'}
                    currentAvatarUrl={watchedLogoUrl || null}
                    size="lg"
                    editable
                    onUploadSuccess={(url) => form.setValue('logo_url', url)}
                    onRemoveSuccess={() => form.setValue('logo_url', '')}
                  />
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.partners.name')} *
                  </Label>
                  <Input
                    {...form.register('name')}
                    placeholder={t('ib.partners.namePlaceholder')}
                  />
                  {form.formState.errors.name && (
                    <p className={compactError}>{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.partnerForm.companyName')}
                  </Label>
                  <Input
                    {...form.register('company_name')}
                    placeholder={t('ib.partnerForm.companyName')}
                  />
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.partners.contactEmail')}
                  </Label>
                  <Input
                    type="email"
                    {...form.register('contact_email')}
                    placeholder={t('ib.partners.contactEmailPlaceholder')}
                  />
                  {form.formState.errors.contact_email && (
                    <p className={compactError}>{form.formState.errors.contact_email.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.partners.contactPhone')}
                  </Label>
                  <Input
                    {...form.register('contact_phone')}
                    placeholder={t('ib.partners.contactPhonePlaceholder')}
                  />
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.partners.referralCode')} *
                  </Label>
                  <Input
                    {...form.register('referral_code')}
                    placeholder={t('ib.partners.referralCodePlaceholder')}
                  />
                  {form.formState.errors.referral_code && (
                    <p className={compactError}>{form.formState.errors.referral_code.message}</p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Social Media & Web */}
            <FormSection icon={Globe} title={t('ib.partnerForm.sections.social')}>
              <div className="space-y-md">
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <Globe size={12} className="mr-1 inline text-black/30" />
                    {t('ib.partnerForm.website')}
                  </Label>
                  <Input {...form.register('website')} placeholder="https://example.com" />
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <TelegramLogo size={12} className="mr-1 inline text-black/30" />
                    {t('ib.partnerForm.telegram')}
                  </Label>
                  <Input {...form.register('telegram')} placeholder="@username or t.me/username" />
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <WhatsappLogo size={12} className="mr-1 inline text-black/30" />
                    {t('ib.partnerForm.whatsapp')}
                  </Label>
                  <Input {...form.register('whatsapp')} placeholder="+90 555 123 4567" />
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <InstagramLogo size={12} className="mr-1 inline text-black/30" />
                    {t('ib.partnerForm.instagram')}
                  </Label>
                  <Input {...form.register('instagram')} placeholder="@username" />
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <TwitterLogo size={12} className="mr-1 inline text-black/30" />
                    {t('ib.partnerForm.twitter')}
                  </Label>
                  <Input {...form.register('twitter')} placeholder="@username" />
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <LinkedinLogo size={12} className="mr-1 inline text-black/30" />
                    {t('ib.partnerForm.linkedin')}
                  </Label>
                  <Input
                    {...form.register('linkedin')}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>
            </FormSection>

            {/* Notes */}
            <FormSection icon={NoteBlank} title={t('ib.partnerForm.sections.notes')}>
              <div>
                <textarea
                  {...form.register('notes')}
                  rows={3}
                  placeholder={t('ib.partners.notesPlaceholder')}
                  className="w-full resize-none rounded-lg border border-black/[0.12] bg-bg2 px-3.5 py-2.5 text-sm text-black placeholder:text-black/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 dark:border-white/10 dark:bg-bg2 dark:text-white"
                />
              </div>
            </FormSection>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-md">
            {/* Agreement */}
            <FormSection icon={Handshake} title={t('ib.partnerForm.sections.agreement')}>
              <div className="space-y-md">
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.partners.agreementType')}
                  </Label>
                  <Select
                    value={watchedAgreementType}
                    onValueChange={(v) => {
                      form.setValue('agreement_type', v as AgreementType)
                      setDetailErrors({})
                    }}
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
                  currencies={CURRENCIES}
                />

                {/* Contract Dates */}
                <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      <CalendarBlank size={12} className="mr-1 inline text-black/30" />
                      {t('ib.partnerForm.contractStart')}
                    </Label>
                    <Input type="date" {...form.register('contract_start_date')} />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      <CalendarBlank size={12} className="mr-1 inline text-black/30" />
                      {t('ib.partnerForm.contractEnd')}
                    </Label>
                    <Input type="date" {...form.register('contract_end_date')} />
                    <p className="mt-1 text-[11px] text-black/30">
                      {t('ib.partnerForm.contractEndHint')}
                    </p>
                  </div>
                </div>

                {/* Status (edit only) */}
                {isEdit && (
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      {t('ib.partners.status')}
                    </Label>
                    <Select
                      value={watchedStatus}
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
                        <SelectItem value="terminated">
                          {t('ib.partners.statuses.terminated')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </FormSection>

            {/* Payment Preference */}
            <FormSection icon={Wallet} title={t('ib.partnerForm.sections.payment')}>
              <div className="space-y-md">
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.partnerForm.preferredPayment')}
                  </Label>
                  <Select
                    value={watchedPaymentMethod || ''}
                    onValueChange={(v) =>
                      form.setValue('preferred_payment_method', v as 'crypto' | 'iban')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('ib.partners.optional')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crypto">{t('ib.partnerForm.crypto')}</SelectItem>
                      <SelectItem value="iban">{t('ib.partnerForm.iban')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Crypto fields */}
                {watchedPaymentMethod === 'crypto' && (
                  <>
                    <div>
                      <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                        {t('ib.partnerForm.walletAddress')} *
                      </Label>
                      <Input
                        {...form.register('crypto_wallet_address')}
                        placeholder="0x... / T..."
                      />
                      {form.formState.errors.crypto_wallet_address && (
                        <p className={compactError}>
                          {form.formState.errors.crypto_wallet_address.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                        {t('ib.partnerForm.cryptoNetwork')}
                      </Label>
                      <Select
                        value={watchedCryptoNetwork || ''}
                        onValueChange={(v) => form.setValue('crypto_network', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('ib.partners.optional')} />
                        </SelectTrigger>
                        <SelectContent>
                          {CRYPTO_NETWORKS.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* IBAN field */}
                {watchedPaymentMethod === 'iban' && (
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      {t('ib.partnerForm.iban')} *
                    </Label>
                    <Input {...form.register('iban')} placeholder="TR..." />
                    {form.formState.errors.iban && (
                      <p className={compactError}>{form.formState.errors.iban.message}</p>
                    )}
                  </div>
                )}
              </div>
            </FormSection>
          </div>
        </div>

        {/* ── Actions bar ── */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.07] bg-bg1 px-5 py-3.5">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/ib')}>
            <ArrowLeft size={14} weight="bold" />
            {t('ib.partnerForm.cancel')}
          </Button>
          <Button type="submit" variant="filled" size="sm" disabled={isPending}>
            <FloppyDisk size={14} weight="bold" />
            {isPending
              ? t('ib.partnerForm.saving')
              : isEdit
                ? t('ib.partnerForm.update')
                : t('ib.partnerForm.save')}
          </Button>
        </div>
      </form>
    </div>
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
  currencies: string[]
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
  currencies,
}: AgreementDetailsSectionProps) {
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
                  {currencies.map((c) => (
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
                  {currencies.map((c) => (
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
                  {currencies.map((c) => (
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
