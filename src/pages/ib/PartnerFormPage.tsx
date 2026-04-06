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
  Bank,
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
import { useHrEmployeesQuery } from '@/hooks/queries/useHrQuery'
import { useOrganization } from '@/app/providers/OrganizationProvider'
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

const DEFAULT_SALARY: SalaryDetails = { amount: '', currency: 'USD', period: 'monthly' }
const DEFAULT_CPA: CpaDetails = { cpa_amount: '', currency: 'USD', min_ftd_amount: '' }
const DEFAULT_LOT_REBATE: LotRebateDetails = { rebate_per_lot: '', currency: 'USD' }
const DEFAULT_REVENUE_SHARE: RevenueShareDetails = { revshare_pct: '', source: 'spread' }

/* ------------------------------------------------------------------ */
/*  Social platforms config                                            */
/* ------------------------------------------------------------------ */

const SOCIAL_PLATFORMS = [
  { key: 'telegram' as const, icon: TelegramLogo, placeholder: '@username or t.me/username' },
  { key: 'whatsapp' as const, icon: WhatsappLogo, placeholder: '+90 555 123 4567' },
  { key: 'instagram' as const, icon: InstagramLogo, placeholder: '@username' },
  { key: 'twitter' as const, icon: TwitterLogo, placeholder: '@username' },
  { key: 'linkedin' as const, icon: LinkedinLogo, placeholder: 'linkedin.com/in/username' },
]

type SocialKey = (typeof SOCIAL_PLATFORMS)[number]['key']

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseDetailsFromPartner(
  agreementTypes: string[],
  details: Record<string, unknown> | null,
) {
  const d = (details ?? {}) as Record<string, Record<string, unknown>>
  const result: {
    salary: SalaryDetails
    cpa: CpaDetails
    lotRebate: LotRebateDetails
    revenueShare: RevenueShareDetails
  } = {
    salary: { ...DEFAULT_SALARY },
    cpa: { ...DEFAULT_CPA },
    lotRebate: { ...DEFAULT_LOT_REBATE },
    revenueShare: { ...DEFAULT_REVENUE_SHARE },
  }

  if (agreementTypes.includes('salary') && d.salary) {
    const s = d.salary
    result.salary = {
      amount: (s.amount as number) ?? '',
      currency: (s.currency as string) ?? 'USD',
      period: (s.period as string) ?? 'monthly',
    }
  }
  if (agreementTypes.includes('cpa') && d.cpa) {
    const c = d.cpa
    result.cpa = {
      cpa_amount: (c.cpa_amount as number) ?? '',
      currency: (c.currency as string) ?? 'USD',
      min_ftd_amount: (c.min_ftd_amount as number) ?? '',
    }
  }
  if (agreementTypes.includes('lot_rebate') && d.lot_rebate) {
    const l = d.lot_rebate
    result.lotRebate = {
      rebate_per_lot: (l.rebate_per_lot as number) ?? '',
      currency: (l.currency as string) ?? 'USD',
    }
  }
  if (agreementTypes.includes('revenue_share') && d.revenue_share) {
    const r = d.revenue_share
    result.revenueShare = {
      revshare_pct: (r.revshare_pct as number) ?? '',
      source: (r.source as string) ?? 'spread',
    }
  }

  return result
}

function buildAllAgreementDetails(
  selectedTypes: Set<AgreementType>,
  salary: SalaryDetails,
  cpa: CpaDetails,
  lotRebate: LotRebateDetails,
  revenueShare: RevenueShareDetails,
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {}

  if (selectedTypes.has('salary')) {
    result.salary = {
      amount: salary.amount === '' ? 0 : Number(salary.amount),
      currency: salary.currency,
      period: salary.period,
    }
  }
  if (selectedTypes.has('cpa')) {
    result.cpa = {
      cpa_amount: cpa.cpa_amount === '' ? 0 : Number(cpa.cpa_amount),
      currency: cpa.currency,
      ...(cpa.min_ftd_amount !== '' ? { min_ftd_amount: Number(cpa.min_ftd_amount) } : {}),
    }
  }
  if (selectedTypes.has('lot_rebate')) {
    result.lot_rebate = {
      rebate_per_lot: lotRebate.rebate_per_lot === '' ? 0 : Number(lotRebate.rebate_per_lot),
      currency: lotRebate.currency,
    }
  }
  if (selectedTypes.has('revenue_share')) {
    result.revenue_share = {
      revshare_pct: revenueShare.revshare_pct === '' ? 0 : Number(revenueShare.revshare_pct),
      source: revenueShare.source,
    }
  }

  return result
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
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
/*  Toggle pill                                                        */
/* ------------------------------------------------------------------ */

function TogglePill({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ size?: number; weight?: string; className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? 'border-brand/40 bg-brand/5 text-black'
          : 'border-black/[0.09] bg-bg2 text-black/50 hover:border-black/15 hover:bg-bg1'
      }`}
    >
      <Icon size={13} weight={active ? 'fill' : 'regular'} className={active ? 'text-brand' : ''} />
      {label}
    </button>
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
  const { data: hrEmployees = [] } = useHrEmployeesQuery()
  const { currentOrg } = useOrganization()

  const partner = isEdit ? (partners.find((p) => p.id === id) ?? null) : null

  /* ---- Form ---- */

  const form = useForm<IBPartnerFormValues>({
    resolver: zodResolver(ibPartnerSchema),
    defaultValues: {
      name: '',
      contact_email: '',
      contact_phone: '',
      agreement_types: [],
      agreement_details: {},
      status: 'active',
      notes: '',
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
      managed_by_employee_id: '',
      secondary_employee_id: '',
    },
  })

  const watchedPaymentMethod = useWatch({ control: form.control, name: 'preferred_payment_method' })
  const watchedCryptoNetwork = useWatch({ control: form.control, name: 'crypto_network' })
  const watchedLogoUrl = useWatch({ control: form.control, name: 'logo_url' })
  const watchedManagedBy = useWatch({ control: form.control, name: 'managed_by_employee_id' })
  const watchedSecondary = useWatch({ control: form.control, name: 'secondary_employee_id' })

  /* ---- Indefinite contract toggle ---- */

  const [indefiniteEnd, setIndefiniteEnd] = useState(!isEdit)

  /* ---- Agreement detail state ---- */

  const [selectedTypes, setSelectedTypes] = useState<Set<AgreementType>>(() => new Set())
  const [salary, setSalary] = useState<SalaryDetails>({ ...DEFAULT_SALARY })
  const [cpa, setCpa] = useState<CpaDetails>({ ...DEFAULT_CPA })
  const [lotRebate, setLotRebate] = useState<LotRebateDetails>({ ...DEFAULT_LOT_REBATE })
  const [revenueShare, setRevenueShare] = useState<RevenueShareDetails>({
    ...DEFAULT_REVENUE_SHARE,
  })
  const [detailErrors, setDetailErrors] = useState<Record<string, Record<string, string>>>({})

  /* ---- Social media toggle state ---- */

  const [activeSocials, setActiveSocials] = useState<Set<SocialKey>>(() => new Set())

  const toggleSocial = (key: SocialKey) => {
    setActiveSocials((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        form.setValue(key, '')
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleAgreementType = (type: AgreementType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      form.setValue('agreement_types', [...next])
      return next
    })
    setDetailErrors({})
  }

  /* ---- Populate form when partner data loads (adjust state during render) ---- */

  const [populatedPartnerId, setPopulatedPartnerId] = useState<string | null>(null)
  if (partner && partner.id !== populatedPartnerId) {
    setPopulatedPartnerId(partner.id)

    const details = partner.agreement_details as Record<string, unknown> | null
    const types = (partner.agreement_types as string[]) ?? []
    form.reset({
      name: partner.name,
      contact_email: partner.contact_email ?? '',
      contact_phone: partner.contact_phone ?? '',
      agreement_types: types as AgreementType[],
      agreement_details: (details ?? {}) as Record<string, unknown>,
      status: partner.status as 'active' | 'paused' | 'terminated',
      notes: partner.notes ?? '',
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
      managed_by_employee_id: partner.managed_by_employee_id ?? '',
      secondary_employee_id: partner.secondary_employee_id ?? '',
    })

    setSelectedTypes(new Set(types as AgreementType[]))
    const parsed = parseDetailsFromPartner(types, details)
    setSalary(parsed.salary)
    setCpa(parsed.cpa)
    setLotRebate(parsed.lotRebate)
    setRevenueShare(parsed.revenueShare)

    // Set indefinite toggle based on existing data
    setIndefiniteEnd(!partner.contract_end_date)

    // Auto-activate social pills for non-empty fields
    const socials = new Set<SocialKey>()
    if (partner.telegram) socials.add('telegram')
    if (partner.whatsapp) socials.add('whatsapp')
    if (partner.instagram) socials.add('instagram')
    if (partner.twitter) socials.add('twitter')
    if (partner.linkedin) socials.add('linkedin')
    setActiveSocials(socials)
  }

  /* ---- Submit ---- */

  const handleSubmit = form.handleSubmit(async (values) => {
    const agreementDetails = buildAllAgreementDetails(
      selectedTypes,
      salary,
      cpa,
      lotRebate,
      revenueShare,
    )

    const validation = validateAgreementDetails([...selectedTypes], agreementDetails)
    if (!validation.success) {
      setDetailErrors(validation.errors)
      return
    }
    setDetailErrors({})

    const payload: IBPartnerFormValues = {
      ...values,
      agreement_types: [...selectedTypes],
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
                    shape="square"
                    skipProfileUpdate
                    onUploadSuccess={(url) => form.setValue('logo_url', url)}
                    onRemoveSuccess={() => form.setValue('logo_url', '')}
                  />
                </div>

                {/* Name */}
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

                {/* Email + Phone (2-col) */}
                <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
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
                </div>

                {/* Responsible Employee */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.partnerForm.responsible')}
                  </Label>
                  <Select
                    value={watchedManagedBy || '__org__'}
                    onValueChange={(v) =>
                      form.setValue('managed_by_employee_id', v === '__org__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('ib.partnerForm.responsiblePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__org__">
                        {currentOrg?.name ?? t('ib.partnerForm.organization')}
                      </SelectItem>
                      {hrEmployees
                        .filter((e) => e.is_active)
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Secondary Employee (Exception) */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {t('ib.partnerForm.secondary')}
                  </Label>
                  <Select
                    value={watchedSecondary || '__none__'}
                    onValueChange={(v) =>
                      form.setValue('secondary_employee_id', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('ib.partnerForm.secondaryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('ib.partners.unassigned')}</SelectItem>
                      {hrEmployees
                        .filter((e) => e.is_active)
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-black/45">
                    {t('ib.partnerForm.secondaryHelper')}
                  </p>
                </div>

                {/* Status (edit only — pills) */}
                {isEdit && (
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      {t('ib.partners.status')}
                    </Label>
                    <div className="flex gap-2">
                      {(['active', 'paused', 'terminated'] as const).map((s) => (
                        <TogglePill
                          key={s}
                          active={form.getValues('status') === s}
                          onClick={() => form.setValue('status', s)}
                          icon={Handshake}
                          label={t(`ib.partners.statuses.${s}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </FormSection>

            {/* Social & Web */}
            <FormSection icon={Globe} title={t('ib.partnerForm.sections.social')}>
              <div className="space-y-md">
                {/* Website — always visible */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <Globe size={12} className="mr-1 inline text-black/30" />
                    {t('ib.partnerForm.website')}
                  </Label>
                  <Input {...form.register('website')} placeholder="https://example.com" />
                </div>

                {/* Social platform pills */}
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_PLATFORMS.map((p) => (
                    <TogglePill
                      key={p.key}
                      active={activeSocials.has(p.key)}
                      onClick={() => toggleSocial(p.key)}
                      icon={p.icon}
                      label={t(`ib.partnerForm.${p.key}`)}
                    />
                  ))}
                </div>

                {/* Active social inputs */}
                {SOCIAL_PLATFORMS.filter((p) => activeSocials.has(p.key)).map((p) => (
                  <div key={p.key}>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      <p.icon size={12} className="mr-1 inline text-brand" />
                      {t(`ib.partnerForm.${p.key}`)}
                    </Label>
                    <Input {...form.register(p.key)} placeholder={p.placeholder} />
                  </div>
                ))}
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
                  <div className="flex flex-wrap gap-2">
                    {AGREEMENT_TYPES.map((type) => (
                      <TogglePill
                        key={type}
                        active={selectedTypes.has(type)}
                        onClick={() => toggleAgreementType(type)}
                        icon={Handshake}
                        label={t(`ib.partners.agreements.${type}`)}
                      />
                    ))}
                  </div>
                  {form.formState.errors.agreement_types && (
                    <p className={compactError}>{form.formState.errors.agreement_types.message}</p>
                  )}
                </div>

                {/* Dynamic Agreement Details — one section per selected type */}
                {AGREEMENT_TYPES.filter((type) => selectedTypes.has(type)).map((type) => (
                  <AgreementDetailForm
                    key={type}
                    type={type}
                    salary={salary}
                    onSalaryChange={setSalary}
                    cpa={cpa}
                    onCpaChange={setCpa}
                    lotRebate={lotRebate}
                    onLotRebateChange={setLotRebate}
                    revenueShare={revenueShare}
                    onRevenueShareChange={setRevenueShare}
                    errors={detailErrors[type]}
                    t={t}
                    currencies={CURRENCIES}
                  />
                ))}

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
                    <label className="mt-1.5 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={indefiniteEnd}
                        onChange={(e) => {
                          setIndefiniteEnd(e.target.checked)
                          if (e.target.checked) form.setValue('contract_end_date', '')
                        }}
                        className="size-4 rounded border-black/20 accent-brand"
                      />
                      <span className="text-xs text-black/60">
                        {t('ib.partnerForm.indefinite')}
                      </span>
                    </label>
                    {!indefiniteEnd && (
                      <Input
                        type="date"
                        {...form.register('contract_end_date')}
                        className="mt-1.5"
                      />
                    )}
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Payment Preference */}
            <FormSection icon={Wallet} title={t('ib.partnerForm.sections.payment')}>
              <div className="space-y-md">
                {/* Payment method pills */}
                <div className="flex gap-2">
                  <TogglePill
                    active={watchedPaymentMethod === 'crypto'}
                    onClick={() => {
                      if (watchedPaymentMethod === 'crypto') {
                        form.setValue('preferred_payment_method', '')
                        form.setValue('crypto_wallet_address', '')
                        form.setValue('crypto_network', '')
                      } else {
                        form.setValue('preferred_payment_method', 'crypto')
                        form.setValue('iban', '')
                      }
                    }}
                    icon={Wallet}
                    label={t('ib.partnerForm.crypto')}
                  />
                  <TogglePill
                    active={watchedPaymentMethod === 'iban'}
                    onClick={() => {
                      if (watchedPaymentMethod === 'iban') {
                        form.setValue('preferred_payment_method', '')
                        form.setValue('iban', '')
                      } else {
                        form.setValue('preferred_payment_method', 'iban')
                        form.setValue('crypto_wallet_address', '')
                        form.setValue('crypto_network', '')
                      }
                    }}
                    icon={Bank}
                    label={t('ib.partnerForm.iban')}
                  />
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
/*  Agreement Detail Form (per type)                                   */
/* ------------------------------------------------------------------ */

interface AgreementDetailFormProps {
  type: AgreementType
  salary: SalaryDetails
  onSalaryChange: (v: SalaryDetails) => void
  cpa: CpaDetails
  onCpaChange: (v: CpaDetails) => void
  lotRebate: LotRebateDetails
  onLotRebateChange: (v: LotRebateDetails) => void
  revenueShare: RevenueShareDetails
  onRevenueShareChange: (v: RevenueShareDetails) => void
  errors?: Record<string, string>
  t: (key: string) => string
  currencies: string[]
}

function AgreementDetailForm({
  type,
  salary,
  onSalaryChange,
  cpa,
  onCpaChange,
  lotRebate,
  onLotRebateChange,
  revenueShare,
  onRevenueShareChange,
  errors,
  t,
  currencies,
}: AgreementDetailFormProps) {
  switch (type) {
    case 'salary':
      return (
        <fieldset className="space-y-sm rounded-lg border border-black/[0.07] bg-bg2/50 p-4">
          <legend className="text-xs font-semibold text-black/70 px-1.5">
            {t('ib.partners.salaryTitle')}
          </legend>
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
        <fieldset className="space-y-sm rounded-lg border border-black/[0.07] bg-bg2/50 p-4">
          <legend className="text-xs font-semibold text-black/70 px-1.5">
            {t('ib.partners.cpaTitle')}
          </legend>
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
        <fieldset className="space-y-sm rounded-lg border border-black/[0.07] bg-bg2/50 p-4">
          <legend className="text-xs font-semibold text-black/70 px-1.5">
            {t('ib.partners.lotRebateTitle')}
          </legend>
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
        <fieldset className="space-y-sm rounded-lg border border-black/[0.07] bg-bg2/50 p-4">
          <legend className="text-xs font-semibold text-black/70 px-1.5">
            {t('ib.partners.revenueShareTitle')}
          </legend>
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

    default:
      return null
  }
}
