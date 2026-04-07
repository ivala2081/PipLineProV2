import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  ArrowCircleDown,
  ArrowCircleUp,
  ArrowsLeftRight,
  CurrencyCircleDollar,
  Handshake,
  ListBullets,
  Receipt,
  Tag as TagIcon,
  UserCircle,
  Vault,
} from '@phosphor-icons/react'
import { localYMD } from '@/lib/date'
import { MONTH_NAMES_TR } from '@/pages/hr/utils/hrConstants'
import { entryFormSchema, type EntryFormValues } from '@/schemas/accountingSchema'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'
import { useAccountingQuery, useRecentPayees } from '@/hooks/queries/useAccountingQuery'
import { useHrEmployeesQuery } from '@/hooks/queries/useHrQuery'
import { useIBPartnersQuery } from '@/hooks/queries/useIBPartnersQuery'
import { usePspsQuery } from '@/hooks/queries/usePspsQuery'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAccountingRegisters } from '@/hooks/queries/useAccountingRegisters'
import { useAccountingCategories } from '@/hooks/queries/useAccountingCategories'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/useToast'
import type { AccountingEntry } from '@/lib/database.types'
import { basicInputClasses, disabledInputClasses, focusInputClasses } from '@ds/components/Input'
import {
  Button,
  Card,
  Input,
  DatePickerField,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from '@ds'
import { cn } from '@ds/utils'

/* ── Types & constants ────────────────────────────────────────────── */

export interface AccountingEntryFormContentProps {
  entry: AccountingEntry | null
  onDone: () => void
}

type SelectOption = { value: string; label: string; searchText?: string }

type RememberedAccountingFields = Pick<
  EntryFormValues,
  'register_id' | 'register' | 'currency' | 'entry_type' | 'category_id' | 'direction'
>

const ACCOUNTING_PREFS_KEY = 'piplinepro:accounting-form-prefs'

const AUTO_DESCRIPTIONS: Record<Exclude<EntryFormValues['description_preset'], 'diger'>, string> = {
  maas_avans: 'Maaş Avans Ödemesi',
  prim_avans: 'Prim Avans Ödemesi',
  sigortali_maas_avans: 'Sigortalı Banka Ödeme',
}

/**
 * Description options for entry_type='ODEME' (payments). The `slug` must
 * match `accounting_categories.name` exactly so we can auto-link
 * `category_id` when the user picks one.
 *
 * `salary` and `bonus` are intentionally NOT here — they overlap with the
 * advance presets above (Maaş Avans Ödemesi / Prim Avans Ödemesi).
 * `psp_transfer` lives in TRANSFER_DESCRIPTION_OPTIONS instead.
 */
const CATEGORY_DESCRIPTION_OPTIONS: { slug: string; label: string }[] = [
  { slug: 'ib_payment', label: 'IB Ödemesi' },
  { slug: 'office', label: 'Ofis Giderleri' },
  { slug: 'legal', label: 'Hukuk Giderleri' },
  { slug: 'hardware', label: 'Donanım' },
  { slug: 'software', label: 'Yazılım' },
  { slug: 'marketing', label: 'Pazarlama Giderleri' },
  { slug: 'entertainment', label: 'Eğlence' },
]

/**
 * Description options for entry_type='TRANSFER'. Only 4 options here:
 *   - Psp Tahsilatı   → routes through `psp_settlements` (trigger creates entry)
 *   - Banka Transferi → plain accounting entry, no special linkage
 *   - Çevrim/Dönüşüm  → plain accounting entry, links to 'conversion' category
 *   - Diğer           → free text (handled separately)
 *
 * The `slug` for `psp_transfer` and `conversion` matches existing global
 * `accounting_categories.name` values. `bank_transfer` has no DB category
 * yet — it's stored as plain description text only.
 */
const TRANSFER_DESCRIPTION_OPTIONS: { slug: string; label: string }[] = [
  { slug: 'psp_transfer', label: 'Psp Tahsilatı' },
  { slug: 'bank_transfer', label: 'Banka Transferi' },
  { slug: 'conversion', label: 'Çevrim / Dönüşüm' },
]

/** Transfer options that also show a free-text description input. */
const TRANSFER_FREE_TEXT_SLUGS = new Set(['bank_transfer', 'conversion'])

/**
 * Slug used to detect "IB Ödemesi" in the description dropdown — when this
 * is selected, the form expands to show an IB partner picker and submit
 * routes through `ib_payments` (the trigger creates the accounting entry).
 */
const IB_PAYMENT_SLUG = 'ib_payment'

/**
 * Slug used to detect "Psp Tahsilatı" — when selected, the form shows a
 * PSP picker and submit routes through `psp_settlements` (a trigger then
 * creates the accounting entry).
 */
const PSP_SETTLEMENT_SLUG = 'psp_transfer'

const CATEGORY_DESCRIPTION_LABELS = CATEGORY_DESCRIPTION_OPTIONS.map((o) => o.label)
const TRANSFER_DESCRIPTION_LABELS = TRANSFER_DESCRIPTION_OPTIONS.map((o) => o.label)

const AUTO_DESCRIPTION_VALUES = [
  ...Object.values(AUTO_DESCRIPTIONS),
  ...CATEGORY_DESCRIPTION_LABELS,
  ...TRANSFER_DESCRIPTION_LABELS,
]

/* ── Pure helpers ─────────────────────────────────────────────────── */

/**
 * Current month label in the format the rest of the system uses for
 * `payment_period` (see `useHrQuery.ts:1354` — e.g. "Şubat 2026").
 * Used to pre-fill both the advance "Dönem" field and the regular
 * "Ödeme Dönemi" field so the user rarely has to type it.
 */
function currentMonthPeriodTR(): string {
  const now = new Date()
  return `${MONTH_NAMES_TR[now.getMonth()]} ${now.getFullYear()}`
}

function getDefaultFormValues(): EntryFormValues {
  return {
    description_preset: 'diger',
    description: '',
    entry_type: 'ODEME',
    direction: 'out',
    amount: 0,
    currency: 'USDT',
    cost_period: '',
    entry_date: localYMD(new Date()),
    payment_period: currentMonthPeriodTR(),
    register: 'USDT',
    register_id: null,
    category_id: null,
    payee: null,
    exchange_rate_used: null,
    exchange_rate_override: false,
    hr_employee_id: null,
    advance_type: null,
  }
}

function presetFromAdvanceType(
  advanceType: AccountingEntry['advance_type'] | null,
): EntryFormValues['description_preset'] {
  if (advanceType === 'salary') return 'maas_avans'
  if (advanceType === 'bonus') return 'prim_avans'
  if (advanceType === 'insured_salary') return 'sigortali_maas_avans'
  return 'diger'
}

function entryToFormValues(entry: AccountingEntry): EntryFormValues {
  return {
    description_preset: presetFromAdvanceType(entry.advance_type),
    description: entry.description,
    entry_type: entry.entry_type as EntryFormValues['entry_type'],
    direction: entry.direction as EntryFormValues['direction'],
    amount: entry.amount,
    currency: entry.currency,
    cost_period: entry.cost_period ?? '',
    entry_date: entry.entry_date,
    payment_period: entry.payment_period ?? '',
    register: entry.register,
    register_id: entry.register_id ?? null,
    category_id: entry.category_id ?? null,
    payee: entry.payee ?? null,
    exchange_rate_used: entry.exchange_rate_used ?? null,
    exchange_rate_override: entry.exchange_rate_override ?? false,
    hr_employee_id: entry.hr_employee_id ?? null,
    advance_type: (entry.advance_type as EntryFormValues['advance_type']) ?? null,
  }
}

function getPrefsKey(orgId?: string) {
  return `${ACCOUNTING_PREFS_KEY}:${orgId ?? 'global'}`
}

function loadRememberedFields(orgId?: string): Partial<RememberedAccountingFields> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(getPrefsKey(orgId))
    if (!raw) return {}
    const p = JSON.parse(raw) as Partial<RememberedAccountingFields>
    const out: Partial<RememberedAccountingFields> = {}
    if (typeof p.register_id === 'string') out.register_id = p.register_id
    if (typeof p.register === 'string' && p.register.length > 0) out.register = p.register
    if (typeof p.currency === 'string' && p.currency.length > 0) out.currency = p.currency
    if (p.entry_type === 'ODEME' || p.entry_type === 'TRANSFER') out.entry_type = p.entry_type
    if (typeof p.category_id === 'string') out.category_id = p.category_id
    if (p.direction === 'in' || p.direction === 'out') out.direction = p.direction
    return out
  } catch {
    return {}
  }
}

function saveRememberedFields(orgId: string | undefined, v: RememberedAccountingFields) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getPrefsKey(orgId), JSON.stringify(v))
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

/* ── Small UI primitives (mirrored from TransferFormContent) ───────── */

function SectionHeader({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon && <span className="text-black/30">{icon}</span>}
      <p className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-black/35">
        {children}
      </p>
      <div className="h-px flex-1 bg-black/[0.06]" />
    </div>
  )
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: ReactNode
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium tracking-wide text-black/60">
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-red">{error}</p>}
    </div>
  )
}

function SearchableSelectField({
  value,
  onValueChange,
  placeholder,
  options,
  searchPlaceholder,
  noResultsText,
}: {
  value: string
  onValueChange: (next: string) => void
  placeholder: string
  options: SelectOption[]
  searchPlaceholder: string
  noResultsText: string
}) {
  const [query, setQuery] = useState('')
  const filteredOptions = useMemo(() => {
    const n = query.trim().toLowerCase()
    if (!n) return options
    return options.filter((o) => (o.searchText ?? o.label).toLowerCase().includes(n))
  }, [options, query])

  const selectedLabel = options.find((o) => o.value === value)?.label

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        onValueChange(v)
        setQuery('')
      }}
      onOpenChange={(open) => {
        if (!open) setQuery('')
      }}
    >
      <SelectTrigger>
        <span className={cn('truncate', !selectedLabel && 'text-black/45')}>
          {selectedLabel || placeholder}
        </span>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 pb-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={searchPlaceholder}
            className={cn(
              basicInputClasses,
              disabledInputClasses,
              focusInputClasses,
              'h-9 w-full rounded-lg px-3 py-1.5 text-xs',
            )}
          />
        </div>
        {filteredOptions.length > 0 ? (
          filteredOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))
        ) : (
          <p className="px-3 py-2 text-xs text-black/55">{noResultsText}</p>
        )}
      </SelectContent>
    </Select>
  )
}

type SelectGroupShape = { label: string; options: SelectOption[] }

/**
 * Grouped variant of `SearchableSelectField` — keeps the group labels
 * and separators (Avans / Gider Kategorileri / Diğer) while adding a
 * search input at the top of the popover. Used for the description
 * dropdown which spans 3 logical groups.
 *
 * Pass `value=""` to render the placeholder (no selection).
 */
function GroupedSearchableSelectField({
  value,
  onValueChange,
  placeholder,
  groups,
  searchPlaceholder,
  noResultsText,
}: {
  value: string
  onValueChange: (next: string) => void
  placeholder: string
  groups: SelectGroupShape[]
  searchPlaceholder: string
  noResultsText: string
}) {
  const [query, setQuery] = useState('')

  const filteredGroups = useMemo(() => {
    const n = query.trim().toLowerCase()
    if (!n) return groups
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter((o) => (o.searchText ?? o.label).toLowerCase().includes(n)),
      }))
      .filter((g) => g.options.length > 0)
  }, [groups, query])

  const selectedLabel = useMemo(() => {
    for (const g of groups) {
      const hit = g.options.find((o) => o.value === value)
      if (hit) return hit.label
    }
    return undefined
  }, [groups, value])

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => {
        onValueChange(v)
        setQuery('')
      }}
      onOpenChange={(open) => {
        if (!open) setQuery('')
      }}
    >
      <SelectTrigger>
        <span className={cn('truncate', !selectedLabel && 'text-black/45')}>
          {selectedLabel || placeholder}
        </span>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 pb-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={searchPlaceholder}
            className={cn(
              basicInputClasses,
              disabledInputClasses,
              focusInputClasses,
              'h-9 w-full rounded-lg px-3 py-1.5 text-xs',
            )}
          />
        </div>
        {filteredGroups.length > 0 ? (
          filteredGroups.map((g, gi) => (
            <Fragment key={g.label}>
              {gi > 0 && <SelectSeparator />}
              <SelectGroup>
                <SelectLabel className="text-[10px] uppercase tracking-widest text-black/40">
                  {g.label}
                </SelectLabel>
                {g.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </Fragment>
          ))
        ) : (
          <p className="px-3 py-2 text-xs text-black/55">{noResultsText}</p>
        )}
      </SelectContent>
    </Select>
  )
}

/* ── Main component ───────────────────────────────────────────────── */

export function AccountingEntryFormContent({ entry, onDone }: AccountingEntryFormContentProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = (i18n.language === 'tr' ? 'tr' : 'en') as 'tr' | 'en'
  const { toast } = useToast()
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const accounting = useAccountingQuery()
  const isEdit = !!entry
  const submitModeRef = useRef<'close' | 'new'>('close')

  const baseCurrency = currentOrg?.base_currency ?? 'USD'
  const secondaryCurrency = baseCurrency === 'USD' ? 'EUR' : 'USD'
  const currencySlots = useMemo(
    () => [baseCurrency, secondaryCurrency, 'USDT'].filter((c, i, arr) => arr.indexOf(c) === i),
    [baseCurrency, secondaryCurrency],
  )

  const { data: employees = [] } = useHrEmployeesQuery()
  const { data: registers = [] } = useAccountingRegisters()
  const { data: categories = [] } = useAccountingCategories()
  const { data: recentPayees = [] } = useRecentPayees()
  const { partners: ibPartners } = useIBPartnersQuery()
  const { psps } = usePspsQuery()

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: getDefaultFormValues(),
  })

  const [amountDisplay, setAmountDisplay] = useState('')
  // IB partner picker state — only used when description = "IB Ödemesi".
  // Not part of EntryFormValues because it routes to a different table on submit.
  const [ibPartnerId, setIbPartnerId] = useState<string>('')
  const [ibPaymentSubmitting, setIbPaymentSubmitting] = useState(false)
  const [pspId, setPspId] = useState<string>('')
  const [pspSubmitting, setPspSubmitting] = useState(false)
  // The schema defaults `description_preset` to 'diger' but we want the
  // dropdown to start unselected (showing "Seçiniz") in create mode. This
  // tracks whether the user has actively picked an option yet.
  const [descriptionTouched, setDescriptionTouched] = useState(isEdit)

  /* ── Form reset on entry change (edit) or initial mount (add) ── */
  const entryId = entry?.id
  useEffect(() => {
    if (entry) {
      form.reset(entryToFormValues(entry))
      setAmountDisplay(numberToDisplay(entry.amount, lang))
      setDescriptionTouched(true)
    } else {
      const defaults = getDefaultFormValues()
      const remembered = loadRememberedFields(currentOrg?.id)
      form.reset({ ...defaults, ...remembered })
      setAmountDisplay('')
      setDescriptionTouched(false)
    }
    setIbPartnerId('')
    setPspId('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, currentOrg?.id])

  /* ── Re-format amount display when locale changes ── */
  useEffect(() => {
    const current = form.getValues('amount')
    if (current) setAmountDisplay(numberToDisplay(current, lang))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  /* ── Watched fields ───────────────────────────────────────── */
  const direction = form.watch('direction')
  const descriptionPreset = form.watch('description_preset')
  const entryType = form.watch('entry_type')
  const currency = form.watch('currency')
  const watchedAmount = form.watch('amount')
  const watchedRegisterId = form.watch('register_id')
  const watchedCategoryId = form.watch('category_id')
  const watchedHrEmployeeId = form.watch('hr_employee_id')
  const watchedPayee = form.watch('payee')

  const isAdvance =
    descriptionPreset === 'maas_avans' ||
    descriptionPreset === 'prim_avans' ||
    descriptionPreset === 'sigortali_maas_avans'

  const handlePresetChange = (val: EntryFormValues['description_preset']) => {
    form.setValue('description_preset', val, { shouldValidate: true })
    if (val === 'maas_avans') {
      form.setValue('advance_type', 'salary')
      form.setValue('description', AUTO_DESCRIPTIONS.maas_avans, { shouldValidate: true })
    } else if (val === 'prim_avans') {
      form.setValue('advance_type', 'bonus')
      form.setValue('description', AUTO_DESCRIPTIONS.prim_avans, { shouldValidate: true })
    } else if (val === 'sigortali_maas_avans') {
      form.setValue('advance_type', 'insured_salary')
      form.setValue('description', AUTO_DESCRIPTIONS.sigortali_maas_avans, { shouldValidate: true })
    } else {
      form.setValue('advance_type', null)
      form.setValue('hr_employee_id', null)
      // Only clear description if it still holds an auto-set value — preserve custom text.
      const cur = form.getValues('description')
      if (AUTO_DESCRIPTION_VALUES.includes(cur)) {
        form.setValue('description', '')
      }
    }
  }

  /* ── Submit ───────────────────────────────────────────────── */
  const handleSubmit = form.handleSubmit(async (data) => {
    // Block submit if user picked IB Ödemesi but didn't choose a partner.
    const dataIsIbPayment =
      !isEdit &&
      data.description_preset === 'diger' &&
      categories.find((c) => c.id === data.category_id)?.name === IB_PAYMENT_SLUG
    if (dataIsIbPayment && !ibPartnerId) {
      toast({ title: labels.ibPartnerRequired, variant: 'error' })
      return
    }

    // Special branch: when creating an IB payment, route through `ib_payments`.
    // The DB trigger `trg_ib_payment_accounting` will create the matching
    // accounting_entries row automatically (so the ledger and IB Management
    // payments tab stay perfectly in sync).
    const isIbPaymentCreate = dataIsIbPayment && !!ibPartnerId

    if (isIbPaymentCreate) {
      if (!currentOrg) return
      const reg = registers.find((r) => r.id === data.register_id)
      const registerName = reg?.name ?? data.register
      try {
        setIbPaymentSubmitting(true)
        const { error } = await supabase.from('ib_payments').insert({
          organization_id: currentOrg.id,
          ib_partner_id: ibPartnerId,
          ib_commission_id: null,
          amount: data.amount,
          currency: data.currency,
          register: registerName,
          payment_method: null,
          reference: null,
          payment_date: data.entry_date,
          description: data.description?.trim() || null,
          notes: null,
          created_by: user?.id ?? null,
        })
        if (error) throw error
        toast({ title: t('accounting.toast.created'), variant: 'success' })
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.ib.payments(currentOrg.id),
          }),
        ])
        saveRememberedFields(currentOrg.id, {
          register_id: data.register_id ?? null,
          register: data.register,
          currency: data.currency,
          entry_type: data.entry_type,
          category_id: data.category_id ?? null,
          direction: data.direction,
        })
        if (submitModeRef.current === 'new') {
          const defaults = getDefaultFormValues()
          const remembered = loadRememberedFields(currentOrg.id)
          form.reset({ ...defaults, ...remembered })
          setAmountDisplay('')
          setIbPartnerId('')
          setDescriptionTouched(false)
          return
        }
        onDone()
      } catch {
        toast({
          title: t('accounting.toast.createError', 'Failed to create entry'),
          variant: 'error',
        })
      } finally {
        setIbPaymentSubmitting(false)
      }
      return
    }

    // ── PSP settlement branch ───────────────────────────────────────
    const dataIsPspSettlement =
      !isEdit &&
      data.description_preset === 'diger' &&
      categories.find((c) => c.id === data.category_id)?.name === PSP_SETTLEMENT_SLUG
    if (dataIsPspSettlement && !pspId) {
      toast({ title: labels.pspRequired, variant: 'error' })
      return
    }
    if (dataIsPspSettlement && pspId) {
      if (!currentOrg) return
      const reg = registers.find((r) => r.id === data.register_id)
      try {
        setPspSubmitting(true)
        const { error } = await supabase.from('psp_settlements').insert({
          psp_id: pspId,
          organization_id: currentOrg.id,
          settlement_date: data.entry_date,
          amount: data.amount,
          currency: data.currency,
          register: reg?.name ?? data.register,
          register_id: data.register_id ?? null,
          description: data.description?.trim() || null,
          notes: null,
          created_by: user?.id ?? null,
        } as never)
        if (error) throw error
        toast({ title: t('accounting.toast.created'), variant: 'success' })
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.pspSettlements.all,
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.pspDashboard.all,
          }),
        ])
        saveRememberedFields(currentOrg.id, {
          register_id: data.register_id ?? null,
          register: data.register,
          currency: data.currency,
          entry_type: data.entry_type,
          category_id: data.category_id ?? null,
          direction: data.direction,
        })
        if (submitModeRef.current === 'new') {
          const defaults = getDefaultFormValues()
          const remembered = loadRememberedFields(currentOrg.id)
          form.reset({ ...defaults, ...remembered })
          setAmountDisplay('')
          setPspId('')
          setDescriptionTouched(false)
          return
        }
        onDone()
      } catch {
        toast({
          title: t('accounting.toast.createError', 'Failed to create entry'),
          variant: 'error',
        })
      } finally {
        setPspSubmitting(false)
      }
      return
    }

    // ── Normal accounting entry ─────────────────────────────────────
    try {
      if (isEdit && entry) {
        await accounting.updateEntry(entry.id, data)
        toast({ title: t('accounting.toast.updated'), variant: 'success' })
      } else {
        await accounting.createEntry(data)
        toast({ title: t('accounting.toast.created'), variant: 'success' })
      }

      saveRememberedFields(currentOrg?.id, {
        register_id: data.register_id ?? null,
        register: data.register,
        currency: data.currency,
        entry_type: data.entry_type,
        category_id: data.category_id ?? null,
        direction: data.direction,
      })

      if (!isEdit && submitModeRef.current === 'new') {
        const defaults = getDefaultFormValues()
        const remembered = loadRememberedFields(currentOrg?.id)
        form.reset({ ...defaults, ...remembered })
        setAmountDisplay('')
        setIbPartnerId('')
        setPspId('')
        setDescriptionTouched(false)
        return
      }
      onDone()
    } catch {
      toast({
        title: isEdit
          ? t('accounting.toast.updateError', 'Failed to update entry')
          : t('accounting.toast.createError', 'Failed to create entry'),
        variant: 'error',
      })
    }
  })

  const isSubmitting = accounting.isCreating || accounting.isUpdating || ibPaymentSubmitting || pspSubmitting

  /* ── Computed options ─────────────────────────────────────── */
  const employeeOptions = useMemo<SelectOption[]>(() => {
    const filtered = employees
      .filter(
        (e) =>
          e.is_active && (descriptionPreset !== 'sigortali_maas_avans' || e.is_insured),
      )
      .map((e) => ({ value: e.id, label: e.full_name, searchText: `${e.full_name} ${e.role}` }))
    // Edit mode: include currently-selected employee even if it no longer matches the filter
    if (isEdit && watchedHrEmployeeId && !filtered.some((o) => o.value === watchedHrEmployeeId)) {
      const emp = employees.find((e) => e.id === watchedHrEmployeeId)
      if (emp) filtered.unshift({ value: emp.id, label: emp.full_name })
    }
    return filtered
  }, [employees, descriptionPreset, isEdit, watchedHrEmployeeId])

  const registerOptions = useMemo<SelectOption[]>(() => {
    const active = registers
      .filter((r) => r.is_active)
      .map((r) => ({
        value: r.id,
        label: `${r.label} (${r.currency})`,
        searchText: `${r.label} ${r.name} ${r.currency}`,
      }))
    if (isEdit && watchedRegisterId && !active.some((o) => o.value === watchedRegisterId)) {
      const r = registers.find((reg) => reg.id === watchedRegisterId)
      if (r) active.unshift({ value: r.id, label: `${r.label} (${r.currency})` })
    }
    return active
  }, [registers, isEdit, watchedRegisterId])

  const ibPartnerOptions = useMemo<SelectOption[]>(
    () =>
      ibPartners
        .filter((p) => p.status === 'active')
        .map((p) => ({ value: p.id, label: p.name, searchText: p.name })),
    [ibPartners],
  )

  const pspOptions = useMemo<SelectOption[]>(
    () =>
      psps
        .filter((p) => p.is_active)
        .map((p) => ({ value: p.id, label: `${p.name} (${p.currency})`, searchText: `${p.name} ${p.currency}` })),
    [psps],
  )

  const recentPayeeChips = useMemo(() => recentPayees.slice(0, 3), [recentPayees])

  /**
   * Description options grouped for the searchable dropdown. Built from
   * the constant arrays + i18n labels so search picks up Turkish text.
   *
   * Conditional on `entry_type`:
   *   - ÖDEME: advance + expense categories + diğer
   *   - TRANSFER: psp tahsilatı / banka transferi / çevrim / diğer
   */
  const descriptionGroups = useMemo<SelectGroupShape[]>(() => {
    const otherGroup: SelectGroupShape = {
      label: t('accounting.form.descriptionGroupOther', 'Diğer'),
      options: [
        {
          value: 'diger',
          label: t('accounting.form.presetDiger', 'Diğer (Serbest Metin)'),
          searchText: 'diğer diger serbest metin',
        },
      ],
    }

    if (entryType === 'TRANSFER') {
      const transferGroup: SelectGroupShape = {
        label: t('accounting.form.descriptionGroupTransfer', 'Transfer İşlemleri'),
        options: TRANSFER_DESCRIPTION_OPTIONS.map((opt) => ({
          value: `cat:${opt.slug}`,
          label: opt.label,
          searchText: `${opt.label} ${opt.slug}`,
        })),
      }
      return [transferGroup, otherGroup]
    }

    const advanceGroup: SelectGroupShape = {
      label: t('accounting.form.descriptionGroupAdvance', 'Avans / Maaş Ödemeleri'),
      options: [
        {
          value: 'maas_avans',
          label: t('accounting.form.presetMaasAvans', 'Maaş Avansı'),
          searchText: 'maaş avansı maas avansi',
        },
        {
          value: 'prim_avans',
          label: t('accounting.form.presetPrimAvans', 'Prim Avansı'),
          searchText: 'prim avansı prim avansi',
        },
        {
          value: 'sigortali_maas_avans',
          label: t('accounting.form.presetSigortaliMaasAvans', 'Sigortalı Banka Ödeme'),
          searchText: 'sigortalı sigortali banka',
        },
      ],
    }
    const categoryGroup: SelectGroupShape = {
      label: t('accounting.form.descriptionGroupCategory', 'Gider Kategorileri'),
      options: CATEGORY_DESCRIPTION_OPTIONS.map((opt) => ({
        value: `cat:${opt.slug}`,
        label: opt.label,
        searchText: `${opt.label} ${opt.slug}`,
      })),
    }
    return [advanceGroup, categoryGroup, otherGroup]
  }, [t, entryType])

  const rawAmount = Number(watchedAmount) || 0

  /* ── i18n quick refs ──────────────────────────────────────── */
  const labels = {
    sectionEntryType: t('accounting.form.sectionEntryType', 'Kayıt Türü'),
    sectionDescription: t('accounting.form.sectionDescription', 'Açıklama'),
    sectionAdvance: t('accounting.form.sectionAdvance', 'Avans Detayı'),
    sectionIbPartner: t('accounting.form.sectionIbPartner', 'IB Ortağı'),
    sectionPayee: t('accounting.form.sectionPayee', 'Alıcı'),
    sectionDirection: t('accounting.form.sectionDirection', 'Yön'),
    sectionAmount: t('accounting.form.sectionAmount', 'Tutar'),
    sectionRegisterDate: t('accounting.form.sectionRegisterDate', 'Kasa & Tarih'),
    descriptionGroupAdvance: t(
      'accounting.form.descriptionGroupAdvance',
      'Avans / Maaş Ödemeleri',
    ),
    descriptionGroupCategory: t('accounting.form.descriptionGroupCategory', 'Gider Kategorileri'),
    descriptionGroupOther: t('accounting.form.descriptionGroupOther', 'Diğer'),
    presetMaasAvans: t('accounting.form.presetMaasAvans', 'Maaş Avansı'),
    presetPrimAvans: t('accounting.form.presetPrimAvans', 'Prim Avansı'),
    presetSigortaliMaasAvans: t('accounting.form.presetSigortaliMaasAvans', 'Sigortalı Banka Ödeme'),
    presetDiger: t('accounting.form.presetDiger', 'Diğer (Serbest Metin)'),
    descriptionPlaceholder: t('accounting.form.descriptionSelectPlaceholder', 'Seçiniz'),
    descriptionRequired: t('accounting.form.descriptionRequired', 'Lütfen bir açıklama seçin'),
    ibPartnerLabel: t('accounting.form.ibPartner', 'IB Ortağı'),
    ibPartnerPlaceholder: t('accounting.form.ibPartnerPlaceholder', 'IB ortağı seçin'),
    ibPartnerRequired: t('accounting.form.ibPartnerRequired', 'IB ortağı seçimi zorunludur'),
    noActiveIbPartners: t('accounting.form.noActiveIbPartners', 'Aktif IB ortağı yok'),
    ibPaymentNote: t(
      'accounting.form.ibPaymentNote',
      'Bu kayıt IB Yönetimi > Ödemeler kısmına da otomatik düşecek.',
    ),
    sectionPsp: t('accounting.form.sectionPsp', 'PSP'),
    pspLabel: t('accounting.form.pspLabel', 'PSP'),
    pspPlaceholder: t('accounting.form.pspPlaceholder', 'PSP seçin'),
    pspRequired: t('accounting.form.pspRequired', 'PSP seçimi zorunludur'),
    noActivePsps: t('accounting.form.noActivePsps', 'Aktif PSP yok'),
    pspNote: t(
      'accounting.form.pspNote',
      'Bu tahsilat PSP bakiyesinden düşecek ve tahsilatlar listesine eklenecek.',
    ),
    noActiveEmployees: t('accounting.form.noActiveEmployees', 'Aktif çalışan yok'),
    noInsuredEmployees: t('accounting.form.noInsuredEmployees', 'Sigortalı çalışan yok'),
    noActiveRegisters: t(
      'accounting.form.noActiveRegisters',
      "Aktif kasa yok — Ayarlar > Kasalar'dan ekleyin",
    ),
    recentPayees: t('accounting.form.recentPayees', 'Son alıcılar'),
    searchInList: t('accounting.form.searchInList', 'Listede ara...'),
    noResults: t('accounting.form.noResults', 'Sonuç bulunamadı'),
    saveAndNew: t('accounting.form.saveAndNew', 'Kaydet ve Yeni'),
  }

  /**
   * Compute the dropdown selection from form state. The dropdown shows
   * either an advance preset (maas_avans/prim_avans/sigortali_maas_avans),
   * a category-derived option (cat:<slug>), or 'diger' for free text.
   *
   * In edit mode we also recognize entries linked to an `ib_payment` row
   * (auto-generated by the IB payments trigger) so the dropdown shows
   * "IB Ödemesi" even if `category_id` was never set on the legacy entry.
   *
   * Returns '' (placeholder) until the user has actively picked an option
   * in create mode — `description_preset` defaults to 'diger' on the
   * schema but we don't want to surface that default visually.
   */
  const descriptionDropdownValue = (() => {
    if (!descriptionTouched) return ''
    if (descriptionPreset !== 'diger') return descriptionPreset
    if (entry?.ib_payment_id) return `cat:${IB_PAYMENT_SLUG}`
    if ((entry as Record<string, unknown>)?.psp_settlement_id) return `cat:${PSP_SETTLEMENT_SLUG}`
    if (watchedCategoryId) {
      const cat = categories.find((c) => c.id === watchedCategoryId)
      const found =
        CATEGORY_DESCRIPTION_OPTIONS.find((o) => o.slug === cat?.name) ??
        TRANSFER_DESCRIPTION_OPTIONS.find((o) => o.slug === cat?.name)
      if (found) return `cat:${found.slug}`
    }
    return 'diger'
  })()

  // Show pickers only in create mode. In edit mode the auto-gen warning
  // already discourages changes; the picker would be misleading.
  const isIbPayment = !isEdit && descriptionDropdownValue === `cat:${IB_PAYMENT_SLUG}`
  const isPspSettlement = !isEdit && descriptionDropdownValue === `cat:${PSP_SETTLEMENT_SLUG}`

  const handleDescriptionDropdownChange = (val: string) => {
    setDescriptionTouched(true)
    if (
      val === 'maas_avans' ||
      val === 'prim_avans' ||
      val === 'sigortali_maas_avans'
    ) {
      handlePresetChange(val)
      form.setValue('category_id', null)
      setIbPartnerId('')
      setPspId('')
      return
    }
    if (val.startsWith('cat:')) {
      const slug = val.slice(4)
      const opt =
        CATEGORY_DESCRIPTION_OPTIONS.find((o) => o.slug === slug) ??
        TRANSFER_DESCRIPTION_OPTIONS.find((o) => o.slug === slug)
      const cat = categories.find((c) => c.name === slug)
      form.setValue('description_preset', 'diger', { shouldValidate: true })
      form.setValue('advance_type', null)
      form.setValue('hr_employee_id', null)
      form.setValue('category_id', cat?.id ?? null)
      if (opt) {
        form.setValue('description', opt.label, { shouldValidate: true })
      }
      if (slug !== IB_PAYMENT_SLUG) setIbPartnerId('')
      if (slug !== PSP_SETTLEMENT_SLUG) setPspId('')
      return
    }
    // 'diger'
    form.setValue('description_preset', 'diger', { shouldValidate: true })
    form.setValue('advance_type', null)
    form.setValue('hr_employee_id', null)
    form.setValue('category_id', null)
    setIbPartnerId('')
    setPspId('')
    const cur = form.getValues('description')
    if (cur && AUTO_DESCRIPTION_VALUES.includes(cur)) {
      form.setValue('description', '')
    }
  }

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <form
      onSubmit={(e) => {
        // Guard runs BEFORE Zod (which would silently fail on the empty
        // default `description` because the free-text Input isn't rendered
        // yet — leaving the user with no visual feedback).
        if (!isEdit && !descriptionTouched) {
          e.preventDefault()
          toast({ title: labels.descriptionRequired, variant: 'error' })
          return
        }
        submitModeRef.current = 'close'
        void handleSubmit(e)
      }}
      className="space-y-3 lg:space-y-5"
    >
      {/* ═══ TWO-COLUMN GRID ═════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
        {/* ─── LEFT CARD: Type & Context ─────────────────────────── */}
        <Card padding="spacious">
          {/* Entry Type — at the very top */}
          <SectionHeader icon={<Receipt size={14} weight="bold" />}>
            {labels.sectionEntryType}
          </SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            {(['ODEME', 'TRANSFER'] as const).map((tv) => {
              const active = entryType === tv
              return (
                <button
                  key={tv}
                  type="button"
                  onClick={() => {
                    const changed = entryType !== tv
                    form.setValue('entry_type', tv)
                    // Auto-direction: ÖDEME → çıkış (out), TRANSFER → giriş (in).
                    form.setValue('direction', tv === 'ODEME' ? 'out' : 'in')
                    // Reset description when switching between ODEME/TRANSFER since
                    // each mode has its own set of valid description options.
                    if (changed) {
                      form.setValue('description_preset', 'diger')
                      form.setValue('description', '')
                      form.setValue('advance_type', null)
                      form.setValue('hr_employee_id', null)
                      form.setValue('category_id', null)
                      setDescriptionTouched(false)
                      setIbPartnerId('')
                      setPspId('')
                    }
                  }}
                  className={cn(
                    'rounded-lg px-3 py-2 text-center text-sm font-semibold transition-all',
                    active
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                  )}
                >
                  {t(`accounting.entryTypes.${tv}`)}
                </button>
              )
            })}
          </div>

          <div className="my-5" />

          {/* Description — grouped, searchable dropdown */}
          <SectionHeader icon={<TagIcon size={14} weight="bold" />}>
            {labels.sectionDescription}
          </SectionHeader>
          <div className="space-y-2">
            <GroupedSearchableSelectField
              value={descriptionDropdownValue}
              onValueChange={handleDescriptionDropdownChange}
              placeholder={labels.descriptionPlaceholder}
              groups={descriptionGroups}
              searchPlaceholder={labels.searchInList}
              noResultsText={labels.noResults}
            />
            {/* Free-text input: always for "Diğer", also for Banka Transferi
                and Çevrim/Dönüşüm (pre-filled with the label, user can edit). */}
            {(descriptionDropdownValue === 'diger' ||
              (descriptionDropdownValue.startsWith('cat:') &&
                TRANSFER_FREE_TEXT_SLUGS.has(descriptionDropdownValue.slice(4)))) && (
              <>
                <Input
                  {...form.register('description')}
                  placeholder={t('accounting.form.descriptionPlaceholder')}
                />
                {form.formState.errors.description && (
                  <p className="mt-1 text-xs text-red">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </>
            )}
          </div>

          {/* IB partner picker (conditional — when "IB Ödemesi" selected in create mode) */}
          {isIbPayment && (
            <>
              <div className="my-5" />
              <div className="rounded-2xl bg-brand/[0.04] p-4 ring-1 ring-brand/15">
                <SectionHeader icon={<Handshake size={14} weight="bold" />}>
                  {labels.sectionIbPartner}
                </SectionHeader>
                <Field
                  label={labels.ibPartnerLabel}
                  error={
                    !ibPartnerId && form.formState.isSubmitted
                      ? labels.ibPartnerRequired
                      : undefined
                  }
                >
                  {ibPartnerOptions.length === 0 ? (
                    <p className="flex h-10 items-center rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 text-xs text-black/35">
                      {labels.noActiveIbPartners}
                    </p>
                  ) : (
                    <SearchableSelectField
                      value={ibPartnerId}
                      onValueChange={setIbPartnerId}
                      placeholder={labels.ibPartnerPlaceholder}
                      options={ibPartnerOptions}
                      searchPlaceholder={labels.searchInList}
                      noResultsText={labels.noResults}
                    />
                  )}
                </Field>
                <p className="mt-2 text-[11px] text-black/40">{labels.ibPaymentNote}</p>
              </div>
            </>
          )}

          {/* PSP picker (conditional — when "Psp Tahsilatı" selected in create mode) */}
          {isPspSettlement && (
            <>
              <div className="my-5" />
              <div className="rounded-2xl bg-brand/[0.04] p-4 ring-1 ring-brand/15">
                <SectionHeader icon={<CurrencyCircleDollar size={14} weight="bold" />}>
                  {labels.sectionPsp}
                </SectionHeader>
                <Field
                  label={labels.pspLabel}
                  error={
                    !pspId && form.formState.isSubmitted
                      ? labels.pspRequired
                      : undefined
                  }
                >
                  {pspOptions.length === 0 ? (
                    <p className="flex h-10 items-center rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 text-xs text-black/35">
                      {labels.noActivePsps}
                    </p>
                  ) : (
                    <SearchableSelectField
                      value={pspId}
                      onValueChange={setPspId}
                      placeholder={labels.pspPlaceholder}
                      options={pspOptions}
                      searchPlaceholder={labels.searchInList}
                      noResultsText={labels.noResults}
                    />
                  )}
                </Field>
                <p className="mt-2 text-[11px] text-black/40">{labels.pspNote}</p>
              </div>
            </>
          )}

          {/* Advance section (conditional) */}
          {isAdvance && (
            <>
              <div className="my-5" />
              <div className="rounded-2xl bg-brand/[0.04] p-4 ring-1 ring-brand/15">
                <SectionHeader icon={<UserCircle size={14} weight="bold" />}>
                  {labels.sectionAdvance}
                </SectionHeader>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={t('accounting.form.advanceEmployee')}>
                    {employeeOptions.length === 0 ? (
                      <p className="flex h-10 items-center rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 text-xs text-black/35">
                        {descriptionPreset === 'sigortali_maas_avans'
                          ? labels.noInsuredEmployees
                          : labels.noActiveEmployees}
                      </p>
                    ) : (
                      <SearchableSelectField
                        value={watchedHrEmployeeId ?? ''}
                        onValueChange={(v) => form.setValue('hr_employee_id', v || null)}
                        placeholder={t('accounting.form.advanceEmployeePlaceholder')}
                        options={employeeOptions}
                        searchPlaceholder={labels.searchInList}
                        noResultsText={labels.noResults}
                      />
                    )}
                  </Field>
                  <Field label={t('accounting.form.advancePeriod')}>
                    <Input
                      {...form.register('payment_period')}
                      placeholder={t('accounting.form.costPeriodPlaceholder')}
                    />
                  </Field>
                </div>
              </div>
            </>
          )}

          {/* Payee — ÖDEME: hidden for advance + IB; TRANSFER: only for Diğer. */}
          {(entryType === 'TRANSFER'
            ? descriptionDropdownValue === 'diger'
            : !isAdvance &&
              descriptionDropdownValue !== `cat:${IB_PAYMENT_SLUG}`) && (
            <>
              <div className="my-5" />
              <SectionHeader icon={<ListBullets size={14} weight="bold" />}>
                {labels.sectionPayee}
              </SectionHeader>
              <Field label={t('accounting.form.payee', 'Payee')}>
                <Input
                  value={watchedPayee ?? ''}
                  onChange={(e) => form.setValue('payee', e.target.value || null)}
                  placeholder={t('accounting.form.payeePlaceholder', 'Person or company')}
                  list="accounting-payee-suggestions"
                />
                <datalist id="accounting-payee-suggestions">
                  {recentPayees.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                {recentPayeeChips.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-black/35">
                      {labels.recentPayees}
                    </span>
                    {recentPayeeChips.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => form.setValue('payee', p)}
                        className="rounded-md bg-black/5 px-2 py-0.5 text-xs font-medium text-black/70 transition-colors hover:bg-black/10"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
            </>
          )}
        </Card>

        {/* ─── RIGHT CARD: Money & Timing ────────────────────────── */}
        <Card padding="spacious">
          {/* Direction */}
          <SectionHeader icon={<ArrowsLeftRight size={14} weight="bold" />}>
            {labels.sectionDirection}
          </SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            {(['in', 'out'] as const).map((d) => {
              const selected = direction === d
              const isIn = d === 'in'
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => form.setValue('direction', d)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
                    selected &&
                      isIn &&
                      'bg-green-500/15 text-green-700 shadow-sm ring-1 ring-green-500/30',
                    selected &&
                      !isIn &&
                      'bg-red-500/15 text-red-600 shadow-sm ring-1 ring-red-500/30',
                    !selected && 'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                  )}
                >
                  {isIn ? (
                    <ArrowCircleDown size={18} weight={selected ? 'fill' : 'bold'} />
                  ) : (
                    <ArrowCircleUp size={18} weight={selected ? 'fill' : 'bold'} />
                  )}
                  {t(`accounting.directions.${d}`)}
                </button>
              )
            })}
          </div>

          <div className="my-5" />

          {/* Amount + currency */}
          <SectionHeader icon={<CurrencyCircleDollar size={14} weight="bold" />}>
            {labels.sectionAmount}
          </SectionHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs font-medium tracking-wide text-black/60">
                {t('accounting.form.currency')}
              </Label>
              <div className="flex gap-2">
                {currencySlots.map((cur) => {
                  const isActive = currency === cur
                  return (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => form.setValue('currency', cur)}
                      className={cn(
                        'flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-all',
                        isActive
                          ? 'bg-brand text-white shadow-sm'
                          : 'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                      )}
                    >
                      {cur}
                    </button>
                  )
                })}
              </div>
            </div>

            <Field
              label={`${t('accounting.form.amount')}${currency ? ` (${currency})` : ''}`}
              error={form.formState.errors.amount?.message}
            >
              <Input
                type="text"
                inputMode="decimal"
                inputSize="lg"
                value={amountDisplay}
                onChange={(e) => {
                  const formatted = formatAmount(e.target.value, lang)
                  setAmountDisplay(formatted)
                  form.setValue('amount', parseAmount(formatted, lang), { shouldValidate: true })
                }}
                placeholder={amountPlaceholder(lang)}
                className="text-2xl font-bold tabular-nums"
              />
              {rawAmount > 0 && (
                <p className="mt-1 text-xs tabular-nums text-black/40">
                  {rawAmount.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {currency}
                  {' · '}
                  <span className={direction === 'in' ? 'text-green-600' : 'text-red-600'}>
                    {direction === 'in'
                      ? t('accounting.directions.in')
                      : t('accounting.directions.out')}
                  </span>
                </p>
              )}
            </Field>
          </div>

          <div className="my-5" />

          {/* Register & Date */}
          <SectionHeader icon={<Vault size={14} weight="bold" />}>
            {labels.sectionRegisterDate}
          </SectionHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('accounting.form.register')}>
              {registerOptions.length === 0 ? (
                <p className="flex h-10 items-center rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 text-xs text-black/35">
                  {labels.noActiveRegisters}
                </p>
              ) : (
                <SearchableSelectField
                  value={watchedRegisterId ?? ''}
                  onValueChange={(v) => {
                    const reg = registers.find((r) => r.id === v)
                    if (reg) {
                      form.setValue('register_id', reg.id)
                      form.setValue('register', reg.name, { shouldValidate: true })
                    } else {
                      form.setValue('register_id', null)
                      form.setValue('register', v || 'USDT', { shouldValidate: true })
                    }
                  }}
                  placeholder={t('accounting.form.register')}
                  options={registerOptions}
                  searchPlaceholder={labels.searchInList}
                  noResultsText={labels.noResults}
                />
              )}
            </Field>
            <Field
              label={t('accounting.form.date')}
              error={form.formState.errors.entry_date?.message}
            >
              <DatePickerField
                value={form.watch('entry_date')}
                onChange={(e) => form.setValue('entry_date', e.target.value)}
              />
            </Field>
          </div>

          {!isAdvance && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t('accounting.form.costPeriod')}>
                <Input
                  {...form.register('cost_period')}
                  placeholder={t('accounting.form.costPeriodPlaceholder')}
                />
              </Field>
              <Field label={t('accounting.form.paymentPeriod')}>
                <Input
                  {...form.register('payment_period')}
                  placeholder={t('accounting.form.paymentPeriodPlaceholder')}
                />
              </Field>
            </div>
          )}
        </Card>
      </div>

      {/* ═══ ACTIONS — full-width ════════════════════════════════ */}
      <div className="flex items-center justify-between py-1">
        <Button type="button" variant="outline" onClick={onDone}>
          {t('accounting.form.cancel')}
        </Button>
        <div className="flex items-center gap-2">
          {!isEdit && (
            <Button
              type="button"
              variant="gray"
              disabled={isSubmitting}
              onClick={() => {
                if (!descriptionTouched) {
                  toast({ title: labels.descriptionRequired, variant: 'error' })
                  return
                }
                submitModeRef.current = 'new'
                void handleSubmit()
              }}
            >
              {isSubmitting ? t('accounting.form.saving') : labels.saveAndNew}
            </Button>
          )}
          <Button type="submit" variant="filled" disabled={isSubmitting}>
            {isSubmitting
              ? t('accounting.form.saving')
              : isEdit
                ? t('accounting.form.update', 'Update')
                : t('accounting.form.save')}
          </Button>
        </div>
      </div>
    </form>
  )
}
