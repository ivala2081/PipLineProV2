import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  ArrowCircleDown,
  ArrowCircleUp,
  Check,
  User,
  CreditCard,
  CurrencyCircleDollar,
  UserCircle,
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { TransferRow } from '@/hooks/useTransfers'
import type { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import type { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import { useExchangeRateQuery } from '@/hooks/queries/useExchangeRateQuery'
import { useHrEmployeesQuery } from '@/hooks/queries/useHrQuery'
import { useToast } from '@/hooks/useToast'
import { transferFormSchema, type TransferFormValues } from '@/schemas/transferSchema'
import { basicInputClasses, disabledInputClasses, focusInputClasses } from '@ds/components/Input'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  Input,
  DatePickerField,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'
import { cn } from '@ds/utils'

/* ── Types & constants ────────────────────────────────────────────── */

export interface TransferFormContentProps {
  transfer: TransferRow | null
  lookupData: ReturnType<typeof useLookupQueries>
  onSubmit: ReturnType<typeof useTransfersQuery>
  onDone: () => void
}

type SelectOption = { value: string; label: string; searchText?: string }

type RememberedTransferFields = Pick<
  TransferFormValues,
  'payment_method_id' | 'psp_id' | 'category_id' | 'currency'
>

const TRANSFER_PREFS_KEY = 'piplinepro:transfer-form-prefs'
const AUTO_BONUS_ROLES = ['Marketing', 'Retention'] as const

/* ── Pure helpers ─────────────────────────────────────────────────── */

function getLocalDatetimeString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function getDefaultFormValues(): TransferFormValues {
  return {
    full_name: '',
    payment_method_id: '',
    psp_id: '',
    transfer_date: getLocalDatetimeString(new Date()),
    category_id: '',
    raw_amount: 0,
    currency: '',
    type_id: 'client',
    exchange_rate: 1,
    crm_id: '',
    meta_id: '',
    employee_id: '',
    is_first_deposit: null,
    notes: '',
  }
}

function getPrefsKey(orgId?: string) {
  return `${TRANSFER_PREFS_KEY}:${orgId ?? 'global'}`
}

function loadRememberedFields(orgId?: string): Partial<RememberedTransferFields> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(getPrefsKey(orgId))
    if (!raw) return {}
    const p = JSON.parse(raw) as Partial<RememberedTransferFields>
    const pmId = typeof p.payment_method_id === 'string' ? p.payment_method_id : ''
    const isTether = pmId === 'tether'
    return {
      payment_method_id: pmId,
      // Tether ise psp otomatik ayarlanacak, remembered değeri kullanma
      psp_id: isTether ? '' : typeof p.psp_id === 'string' ? p.psp_id : '',
      category_id: '',
      currency: '',
    }
  } catch {
    return {}
  }
}

function saveRememberedFields(orgId: string | undefined, v: RememberedTransferFields) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getPrefsKey(orgId), JSON.stringify(v))
}

/* ── Small UI components ──────────────────────────────────────────── */

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
        <SelectValue placeholder={placeholder} />
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

/* ── Main component ───────────────────────────────────────────────── */

export function TransferFormContent({
  transfer,
  lookupData,
  onSubmit,
  onDone,
}: TransferFormContentProps) {
  const { t, i18n } = useTranslation('pages')
  const { toast } = useToast()
  const { currentOrg } = useOrganization()
  const isEdit = !!transfer
  const submitModeRef = useRef<'close' | 'new'>('close')
  const lang = i18n.language === 'tr' ? 'tr' : 'en'

  const [manualRate, setManualRate] = useState(false)
  const manualFtdRef = useRef(false)
  const mountedRef = useRef(false)
  const [amountDisplay, setAmountDisplay] = useState('')
  const [rateConfirmed, setRateConfirmed] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<{ mode: 'close' | 'new' } | null>(null)

  type NameSuggestion = { crm_id: string; meta_id: string }
  const [nameSuggestions, setNameSuggestions] = useState<NameSuggestion[]>([])
  const [autoFilledHint, setAutoFilledHint] = useState<NameSuggestion | null>(null)

  const { data: employees = [] } = useHrEmployeesQuery()

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: getDefaultFormValues(),
  })

  // Re-format amount display when locale changes
  useEffect(() => {
    const current = form.getValues('raw_amount')
    if (current) setAmountDisplay(numberToDisplay(current, lang))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  /* ── Exchange rate ────────────────────────────────────────── */
  const { rate: fetchedRate, isError: rateError } = useExchangeRateQuery()
  const normalizedFetchedRate = useMemo(() => {
    if (fetchedRate == null || fetchedRate <= 1) return null
    return Math.round(fetchedRate * 10000) / 10000
  }, [fetchedRate])

  const handleEnableManualRate = useCallback(() => setManualRate(true), [])
  const handleResetRate = useCallback(() => {
    setManualRate(false)
    if (normalizedFetchedRate != null) form.setValue('exchange_rate', normalizedFetchedRate)
  }, [normalizedFetchedRate, form])

  /* ── Form reset ───────────────────────────────────────────── */
  const transferId = transfer?.id
  useEffect(() => {
    mountedRef.current = false
    setManualRate(false)
    manualFtdRef.current = false
    if (transfer) {
      form.reset({
        full_name: transfer.full_name,
        payment_method_id: transfer.payment_method_id,
        psp_id: transfer.psp_id,
        transfer_date: transfer.transfer_date
          ? getLocalDatetimeString(new Date(transfer.transfer_date))
          : '',
        category_id: transfer.category_id,
        raw_amount: Math.abs(transfer.amount),
        currency: transfer.currency,
        type_id: transfer.type_id,
        exchange_rate: normalizedFetchedRate ?? transfer.exchange_rate ?? 1,
        crm_id: transfer.crm_id ?? '',
        meta_id: transfer.meta_id ?? '',
        employee_id: (transfer as TransferRow & { employee_id?: string }).employee_id ?? '',
        is_first_deposit:
          (transfer as TransferRow & { is_first_deposit?: boolean }).is_first_deposit ?? false,
        notes: transfer.notes ?? '',
      })
      setAmountDisplay(numberToDisplay(Math.abs(transfer.amount), lang))
    } else {
      const defaults = getDefaultFormValues()
      const remembered = loadRememberedFields(currentOrg?.id)
      form.reset({
        ...defaults,
        ...remembered,
        type_id: 'client',
        exchange_rate: normalizedFetchedRate ?? defaults.exchange_rate,
        transfer_date: defaults.transfer_date,
      })
      setAmountDisplay('')
    }
    setRateConfirmed(false)
    // Allow auto-select effects to run after initial mount settles
    requestAnimationFrame(() => {
      mountedRef.current = true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferId])

  useEffect(() => {
    if (!manualRate && normalizedFetchedRate != null) {
      form.setValue('exchange_rate', normalizedFetchedRate)
    }
  }, [normalizedFetchedRate, form, manualRate])

  useEffect(() => {
    if (rateError) {
      toast({
        title: t('transfers.toast.exchangeRateError', 'Exchange rate could not be fetched'),
        description: t(
          'transfers.toast.exchangeRateErrorDesc',
          'Please enter the rate manually or try refreshing.',
        ),
        variant: 'warning',
      })
    }
  }, [rateError, toast, t])

  /* ── Watched fields ───────────────────────────────────────── */

  const categoryId = form.watch('category_id')
  const currency = form.watch('currency')
  const watchedRawAmount = form.watch('raw_amount')
  const watchedExchangeRate = form.watch('exchange_rate')
  const paymentMethodId = form.watch('payment_method_id')
  const pspId = form.watch('psp_id')
  const typeId = form.watch('type_id')
  const employeeId = form.watch('employee_id')
  const fullName = form.watch('full_name')
  const isFirstDeposit = form.watch('is_first_deposit')

  /* ── Tether auto-select: kasa → Tether (currency set by PSP effect) ── */
  useEffect(() => {
    if (!mountedRef.current) return
    if (paymentMethodId === 'tether') {
      const tetherPsp = lookupData.psps.find(
        (p) => p.is_active && p.name.toLowerCase().includes('tether'),
      )
      if (tetherPsp) form.setValue('psp_id', tetherPsp.id)
    }
  }, [paymentMethodId, lookupData.psps, form])

  /* ── Rate confirmation reset: any change to rate or currency requires re-confirm ── */
  useEffect(() => {
    setRateConfirmed(false)
  }, [watchedExchangeRate, currency])

  /* ── PSP currency auto-select: set currency from PSP's configured currency ── */
  useEffect(() => {
    if (!mountedRef.current) return
    if (!pspId) return
    const psp = lookupData.psps.find((p) => p.id === pspId)
    if (psp?.currency) {
      form.setValue('currency', psp.currency)
    }
  }, [pspId, lookupData.psps, form])

  const rawAmount = Number(watchedRawAmount) || 0
  const exchangeRateValue = Number(watchedExchangeRate) || 0

  /* ── FTD / STD auto-detect ────────────────────────────────── */
  useEffect(() => {
    if (isEdit || !currentOrg) return
    const trimmed = fullName?.trim() ?? ''
    if (trimmed.length < 3) {
      setNameSuggestions([])
      setAutoFilledHint(null)
      return
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('transfers')
        .select('crm_id, meta_id')
        .eq('organization_id', currentOrg.id)
        .ilike('full_name', trimmed)
        .order('transfer_date', { ascending: false })
        .limit(50)

      if (!data || data.length === 0) {
        setNameSuggestions([])
        setAutoFilledHint(null)
        return
      }

      // Benzersiz crm_id + meta_id çiftlerini bul
      const seen = new Set<string>()
      const unique: NameSuggestion[] = []
      for (const row of data) {
        const key = `${row.crm_id ?? ''}|${row.meta_id ?? ''}`
        if (!seen.has(key)) {
          seen.add(key)
          unique.push({ crm_id: row.crm_id ?? '', meta_id: row.meta_id ?? '' })
        }
      }

      if (unique.length === 1) {
        // Tek kişi → otomatik doldur + uyarı göster (FTD/STD el ile seçilsin)
        setNameSuggestions([])
        setAutoFilledHint(unique[0])
        const cur = form.getValues()
        if (!cur.crm_id && unique[0].crm_id) form.setValue('crm_id', unique[0].crm_id)
        if (!cur.meta_id && unique[0].meta_id) form.setValue('meta_id', unique[0].meta_id)
      } else {
        // Birden fazla kişi → kullanıcıya seç
        setNameSuggestions(unique)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [fullName, currentOrg, isEdit, form])

  const handlePickSuggestion = useCallback(
    (s: NameSuggestion) => {
      form.setValue('crm_id', s.crm_id)
      form.setValue('meta_id', s.meta_id)
      setNameSuggestions([])
    },
    [form],
  )

  /* ── Computed / memos ─────────────────────────────────────── */
  const employeeOptions = useMemo(
    () =>
      employees
        .filter((e) => e.is_active && (AUTO_BONUS_ROLES as readonly string[]).includes(e.role))
        .map((e) => ({ value: e.id, label: `${e.full_name} · ${e.role}` })),
    [employees],
  )

  const selectedCategory = useMemo(
    () => lookupData.categories.find((c) => c.id === categoryId),
    [lookupData.categories, categoryId],
  )

  const paymentMethodOptions = useMemo<SelectOption[]>(
    () => lookupData.paymentMethods.map((pm) => ({ value: pm.id, label: pm.name })),
    [lookupData.paymentMethods],
  )
  const categoryOptions = useMemo(
    () =>
      lookupData.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        is_deposit: cat.is_deposit,
      })),
    [lookupData.categories],
  )
  const transferTypeOptions = useMemo<SelectOption[]>(
    () => lookupData.transferTypes.map((tt) => ({ value: tt.id, label: tt.name })),
    [lookupData.transferTypes],
  )
  const pspOptions = useMemo<SelectOption[]>(
    () => lookupData.psps.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name })),
    [lookupData.psps],
  )

  const selectedPsp = useMemo(
    () => lookupData.psps.find((p) => p.id === pspId),
    [lookupData.psps, pspId],
  )

  /* ── Submit ───────────────────────────────────────────────── */
  const handleSubmit = form.handleSubmit(async (data) => {
    if (!selectedCategory) {
      toast({ title: t('transfers.toast.error'), variant: 'error' })
      return
    }
    try {
      const formData = { ...data, transfer_date: new Date(data.transfer_date).toISOString() }

      saveRememberedFields(currentOrg?.id, {
        payment_method_id: data.payment_method_id,
        psp_id: data.psp_id,
        category_id: data.category_id,
        currency: data.currency,
      })

      if (isEdit && transfer) {
        await onSubmit.updateTransfer(transfer.id, formData, selectedCategory)
        toast({ title: t('transfers.toast.updated'), variant: 'success' })
      } else {
        await onSubmit.createTransfer(formData, selectedCategory)
        toast({ title: t('transfers.toast.created'), variant: 'success' })
      }

      if (!isEdit && submitModeRef.current === 'new') {
        manualFtdRef.current = false
        const defaults = getDefaultFormValues()
        const remembered = loadRememberedFields(currentOrg?.id)
        form.reset({
          ...defaults,
          ...remembered,
          type_id: 'client',
          exchange_rate: normalizedFetchedRate ?? defaults.exchange_rate,
          transfer_date: defaults.transfer_date,
        })
        setAmountDisplay('')
        setRateConfirmed(false)
        return
      }
      onDone()
    } catch {
      toast({ title: t('transfers.toast.error'), variant: 'error' })
    }
  })

  const isSubmitting = onSubmit.isCreating || onSubmit.isUpdating

  /* ── Section labels ───────────────────────────────────────── */
  const s = {
    direction: lang === 'tr' ? 'Transfer Yönü' : 'Transfer Direction',
    client: lang === 'tr' ? 'Müşteri' : 'Client',
    payment: lang === 'tr' ? 'Detaylar' : 'Details',
    amount: lang === 'tr' ? 'Tutar' : 'Amount',
    details: lang === 'tr' ? 'Detaylar' : 'Details',
  }

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <>
      <form
        onSubmit={async (e) => {
          if (currency !== 'TL') {
            e.preventDefault()
            if (!rateConfirmed) return // locked — rate not confirmed yet
            const isValid = await form.trigger()
            if (isValid) setPendingSubmit({ mode: 'close' })
          } else {
            submitModeRef.current = 'close'
            void handleSubmit(e)
          }
        }}
        className="space-y-3 lg:space-y-5"
      >
        {/* ═══ TWO-COLUMN GRID ═════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
          {/* ─── LEFT CARD: Client & Payment ────────────────────── */}
          <Card padding="spacious">
            {/* Client section */}
            <SectionHeader icon={<User size={14} weight="bold" />}>{s.client}</SectionHeader>
            <div className="space-y-4">
              <Field
                label={t('transfers.form.fullName')}
                error={form.formState.errors.full_name?.message}
              >
                <Input
                  {...form.register('full_name')}
                  placeholder={t('transfers.form.fullNamePlaceholder')}
                  autoComplete="off"
                />
                {nameSuggestions.length > 0 && (
                  <div className="mt-1.5 rounded-xl border border-black/[0.08] bg-bg1 p-1 shadow-sm dark:border-white/[0.08]">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-black/35 dark:text-white/35">
                      {lang === 'tr'
                        ? `${nameSuggestions.length} farklı kayıt bulundu — birini seçin`
                        : `${nameSuggestions.length} different records found — pick one`}
                    </p>
                    {nameSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handlePickSuggestion(s)}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                      >
                        <span className="min-w-0 shrink-0 font-medium text-black/70 dark:text-white/70">
                          CRM: <span className="text-brand">{s.crm_id || '—'}</span>
                        </span>
                        <span className="min-w-0 shrink-0 font-medium text-black/70 dark:text-white/70">
                          META: <span className="text-brand">{s.meta_id || '—'}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {autoFilledHint && nameSuggestions.length === 0 && (
                  <div className="mt-1.5 rounded-lg bg-orange/10 px-3 py-2.5 dark:bg-orange/15">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-black dark:text-white">
                        {lang === 'tr'
                          ? 'Önceki kayıttan otomatik dolduruldu — CRM ve META ID doğruluğunu mutlaka kontrol edin.'
                          : 'Auto-filled from previous record — Please make sure to verify CRM and META ID.'}
                      </p>
                      <p className="whitespace-nowrap text-xs font-semibold text-black dark:text-white">
                        CRM: {autoFilledHint.crm_id || '—'} · META: {autoFilledHint.meta_id || '—'}
                      </p>
                    </div>
                  </div>
                )}
              </Field>

              {/* FTD / STD toggle */}
              <div>
                <Label className="mb-1.5 block text-xs font-medium tracking-wide text-black/60">
                  {lang === 'tr' ? 'Yatırım Durumu' : 'Deposit Status'}
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      manualFtdRef.current = true
                      form.setValue('is_first_deposit', true)
                    }}
                    className={cn(
                      'flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-all',
                      isFirstDeposit === true
                        ? 'bg-brand text-white shadow-sm'
                        : 'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                    )}
                  >
                    FTD
                    <span className="ml-1 text-xs font-normal opacity-70">
                      {lang === 'tr' ? '(İlk Yatırım)' : '(First Deposit)'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      manualFtdRef.current = true
                      form.setValue('is_first_deposit', false)
                    }}
                    className={cn(
                      'flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-all',
                      isFirstDeposit === false
                        ? 'bg-brand text-white shadow-sm'
                        : 'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                    )}
                  >
                    STD
                    <span className="ml-1 text-xs font-normal opacity-70">
                      {lang === 'tr' ? '(Tekrar Yatırım)' : '(Return Deposit)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* CRM & META — auto-filled from name lookup */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('transfers.form.crmId')}>
                  <Input
                    {...form.register('crm_id')}
                    placeholder={t('transfers.form.crmIdPlaceholder')}
                  />
                </Field>
                <Field label={t('transfers.form.metaId')}>
                  <Input
                    {...form.register('meta_id')}
                    placeholder={t('transfers.form.metaIdPlaceholder')}
                  />
                </Field>
              </div>
            </div>

            {/* Divider between Client and Payment */}
            <div className="my-5" />

            {/* Payment section — date/time, type, employee */}
            <SectionHeader icon={<CreditCard size={14} weight="bold" />}>{s.payment}</SectionHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <Field
                  label={t('transfers.form.type')}
                  error={form.formState.errors.type_id?.message}
                >
                  <SearchableSelectField
                    value={typeId}
                    onValueChange={(v) => form.setValue('type_id', v)}
                    placeholder={t('transfers.form.selectType')}
                    options={transferTypeOptions}
                    searchPlaceholder={t('transfers.form.searchInList')}
                    noResultsText={t('transfers.form.noResults')}
                  />
                </Field>
                <Field
                  label={
                    <span className="flex items-center gap-1">
                      <UserCircle size={12} className="text-black/40" />
                      {lang === 'tr' ? 'Çalışan' : 'Employee'}
                    </span>
                  }
                >
                  {employeeOptions.length === 0 ? (
                    <p className="flex h-10 items-center rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 text-xs text-black/35">
                      {lang === 'tr'
                        ? 'Aktif MT / Retention çalışanı yok'
                        : 'No active MT / Retention employees'}
                    </p>
                  ) : (
                    <SearchableSelectField
                      value={employeeId ? employeeId : '__none__'}
                      onValueChange={(v) => form.setValue('employee_id', v === '__none__' ? '' : v)}
                      placeholder={lang === 'tr' ? 'Seç (isteğe bağlı)' : 'Select (optional)'}
                      options={[
                        {
                          value: '__none__',
                          label: lang === 'tr' ? '— Çalışan yok —' : '-- No employee --',
                        },
                        ...employeeOptions,
                      ]}
                      searchPlaceholder={t('transfers.form.searchInList')}
                      noResultsText={t('transfers.form.noResults')}
                    />
                  )}
                </Field>
              </div>
              <Field label={t('transfers.form.notes')} className="sm:col-span-2">
                <textarea
                  {...form.register('notes')}
                  placeholder={t('transfers.form.notesPlaceholder')}
                  rows={3}
                  className={cn(
                    basicInputClasses,
                    disabledInputClasses,
                    focusInputClasses,
                    'w-full resize-none rounded-xl px-3 py-2.5 text-sm',
                  )}
                />
              </Field>
            </div>
          </Card>

          {/* ─── RIGHT CARD: Payment, Amount & Details ──────────── */}
          <Card padding="spacious">
            {/* Payment method & PSP */}
            <SectionHeader icon={<CreditCard size={14} weight="bold" />}>{s.payment}</SectionHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={t('transfers.form.paymentMethod')}
                error={form.formState.errors.payment_method_id?.message}
              >
                <SearchableSelectField
                  value={paymentMethodId}
                  onValueChange={(v) => form.setValue('payment_method_id', v)}
                  placeholder={t('transfers.form.selectPaymentMethod')}
                  options={paymentMethodOptions}
                  searchPlaceholder={t('transfers.form.searchInList')}
                  noResultsText={t('transfers.form.noResults')}
                />
              </Field>
              <Field label={t('transfers.form.psp')} error={form.formState.errors.psp_id?.message}>
                <SearchableSelectField
                  value={pspId}
                  onValueChange={(v) => form.setValue('psp_id', v)}
                  placeholder={t('transfers.form.selectPsp')}
                  options={pspOptions}
                  searchPlaceholder={t('transfers.form.searchInList')}
                  noResultsText={t('transfers.form.noResults')}
                />
              </Field>
            </div>

            {/* Divider between Payment and Amount */}
            <div className="my-5" />

            {/* Amount section */}
            <SectionHeader icon={<CurrencyCircleDollar size={14} weight="bold" />}>
              {s.amount}
            </SectionHeader>
            <div className="space-y-4">
              {/* Currency toggle */}
              <div>
                <Label className="mb-1.5 block text-xs font-medium tracking-wide text-black/60">
                  {t('transfers.form.currency')}
                </Label>
                <div className="flex gap-2">
                  {(['TL', 'USD', 'USDT'] as const).map((cur) => {
                    const isLocked = !!pspId && selectedPsp?.currency !== cur
                    const isActive = currency === cur
                    return (
                      <button
                        key={cur}
                        type="button"
                        disabled={isLocked}
                        onClick={() => !isLocked && form.setValue('currency', cur)}
                        className={cn(
                          'flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-all',
                          isActive && 'bg-brand text-white shadow-sm',
                          !isActive &&
                            !isLocked &&
                            'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                          !isActive &&
                            isLocked &&
                            'cursor-not-allowed bg-black/[0.04] text-black/15 opacity-40',
                        )}
                      >
                        {cur}
                      </button>
                    )
                  })}
                </div>
                {form.formState.errors.currency && (
                  <p className="mt-1 text-xs text-red">{form.formState.errors.currency.message}</p>
                )}
              </div>

              {/* Amount input — large */}
              <Field
                label={`${t('transfers.form.amount')}${currency ? ` (${currency})` : ''}`}
                error={form.formState.errors.raw_amount?.message}
              >
                <Input
                  type="text"
                  inputMode="decimal"
                  inputSize="lg"
                  value={amountDisplay}
                  onChange={(e) => {
                    const formatted = formatAmount(e.target.value, lang)
                    setAmountDisplay(formatted)
                    form.setValue('raw_amount', parseAmount(formatted, lang), {
                      shouldValidate: true,
                    })
                  }}
                  placeholder={amountPlaceholder(lang)}
                  className="text-2xl font-bold tabular-nums"
                />
              </Field>

              {/* DEP / WD direction */}
              <div>
                <Label className="mb-1.5 block text-xs font-medium tracking-wide text-black/60">
                  {s.direction}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {categoryOptions.map((cat) => {
                    const selected = categoryId === cat.id
                    const isDep = cat.is_deposit
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => form.setValue('category_id', cat.id)}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
                          selected &&
                            isDep &&
                            'bg-green-500/15 text-green-700 shadow-sm ring-1 ring-green-500/30',
                          selected &&
                            !isDep &&
                            'bg-red-500/15 text-red-600 shadow-sm ring-1 ring-red-500/30',
                          !selected && 'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                        )}
                      >
                        {isDep ? (
                          <ArrowCircleDown size={18} weight={selected ? 'fill' : 'bold'} />
                        ) : (
                          <ArrowCircleUp size={18} weight={selected ? 'fill' : 'bold'} />
                        )}
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
                {form.formState.errors.category_id && (
                  <p className="mt-1 text-xs text-red">
                    {form.formState.errors.category_id.message}
                  </p>
                )}
              </div>

              {/* Exchange rate bar */}
              <div
                className={cn(
                  'rounded-xl border px-3 py-2.5 transition-colors',
                  currency !== 'TL' && !rateConfirmed
                    ? 'border-amber-400/40 bg-amber-500/[0.02]'
                    : currency !== 'TL' && rateConfirmed
                      ? 'border-green/25 bg-green/[0.02]'
                      : 'border-black/[0.07] bg-black/[0.02]',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-black/45">{t('transfers.form.exchangeRate')}</span>
                  {manualRate ? (
                    <>
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        {...form.register('exchange_rate', { valueAsNumber: true })}
                        className={cn(
                          basicInputClasses,
                          focusInputClasses,
                          'ml-auto h-7 w-28 rounded-lg px-2 text-xs tabular-nums',
                        )}
                      />
                      <button
                        type="button"
                        onClick={handleResetRate}
                        className="text-xs text-brand/70 underline-offset-2 hover:text-brand hover:underline"
                      >
                        {t('transfers.form.resetRate')}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="ml-auto text-xs tabular-nums text-black/50">
                        {normalizedFetchedRate != null
                          ? `1 USD = ${normalizedFetchedRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} TL`
                          : t('transfers.form.fetchingRate')}
                      </span>
                      <button
                        type="button"
                        onClick={handleEnableManualRate}
                        className="text-xs text-black/35 underline-offset-2 hover:text-black/55 hover:underline"
                      >
                        {t('transfers.form.overrideRate')}
                      </button>
                    </>
                  )}
                </div>
                {rawAmount > 0 && exchangeRateValue > 0 && currency !== '' && (
                  <div className="mt-2.5 flex items-center gap-2 border-t border-black/[0.06] pt-2.5">
                    <span className="text-sm font-semibold tabular-nums text-brand">
                      {rawAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      {currency}
                    </span>
                    <span className="text-xs text-black/25">=</span>
                    <span className="text-sm font-semibold tabular-nums text-brand">
                      {currency === 'TL'
                        ? `${(rawAmount / exchangeRateValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                        : `${(rawAmount * exchangeRateValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`}
                    </span>
                    <span className="ml-auto text-[10px] tabular-nums text-black/30">
                      @{' '}
                      {exchangeRateValue.toLocaleString(undefined, {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}{' '}
                      TL
                    </span>
                  </div>
                )}

                {/* Option A — Rate confirmation (non-TL only) */}
                {currency !== 'TL' && (
                  <div className="mt-2.5 flex items-center justify-between border-t border-black/[0.06] pt-2.5">
                    {rateConfirmed ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-green">
                        <Check size={12} weight="bold" />
                        {lang === 'tr' ? 'Kur onaylandı' : 'Rate confirmed'}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-amber-700/80">
                          {lang === 'tr'
                            ? 'Kaydetmek için kuru onaylayın'
                            : 'Confirm the rate to save'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRateConfirmed(true)}
                          className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/20"
                        >
                          <Check size={11} weight="bold" />
                          {lang === 'tr' ? 'Kuru Onayla' : 'Confirm Rate'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {(currency === 'USD' || currency === 'USDT') &&
                exchangeRateValue > 0 &&
                exchangeRateValue <= 1 && (
                  <p className="rounded-xl bg-yellow-500/[0.08] px-3 py-2 text-xs text-yellow-700">
                    {t(
                      'transfers.form.exchangeRateWarning',
                      'Exchange rate for USD is usually > 1. Please verify.',
                    )}
                  </p>
                )}
              {form.formState.errors.exchange_rate && (
                <p className="text-xs text-red">{form.formState.errors.exchange_rate.message}</p>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={t('transfers.form.date')}
                  error={form.formState.errors.transfer_date?.message}
                >
                  <DatePickerField
                    value={form.watch('transfer_date')?.split('T')[0] ?? ''}
                    onChange={(e) => {
                      const d = e.target.value
                      const time = form.getValues('transfer_date')?.split('T')[1] ?? '00:00'
                      form.setValue('transfer_date', d ? `${d}T${time}` : '', {
                        shouldValidate: true,
                      })
                    }}
                  />
                </Field>
                <Field label={t('transfers.form.time')}>
                  <input
                    type="time"
                    value={form.watch('transfer_date')?.split('T')[1]?.slice(0, 5) ?? ''}
                    onChange={(e) => {
                      const time = e.target.value
                      const d = form.getValues('transfer_date')?.split('T')[0] ?? ''
                      if (d)
                        form.setValue('transfer_date', `${d}T${time}`, { shouldValidate: true })
                    }}
                    className={cn(
                      basicInputClasses,
                      disabledInputClasses,
                      focusInputClasses,
                      'h-10 w-full cursor-pointer rounded-xl px-3 text-sm [&::-webkit-calendar-picker-indicator]:opacity-0',
                    )}
                  />
                </Field>
              </div>
            </div>
          </Card>
        </div>

        {/* ═══ ACTIONS — full-width ════════════════════════════════ */}
        <div className="flex items-center justify-between py-1">
          <Button type="button" variant="outline" onClick={onDone}>
            {t('transfers.form.cancel')}
          </Button>
          <div className="flex items-center gap-2">
            {!isEdit && (
              <Button
                type="button"
                variant="gray"
                disabled={isSubmitting || (currency !== 'TL' && !rateConfirmed)}
                onClick={async () => {
                  if (currency !== 'TL') {
                    const isValid = await form.trigger()
                    if (isValid) setPendingSubmit({ mode: 'new' })
                  } else {
                    submitModeRef.current = 'new'
                    void handleSubmit()
                  }
                }}
              >
                {isSubmitting ? t('transfers.form.saving') : t('transfers.form.saveAndNew')}
              </Button>
            )}
            <Button
              type="submit"
              variant="filled"
              disabled={isSubmitting || (currency !== 'TL' && !rateConfirmed)}
            >
              {isSubmitting ? t('transfers.form.saving') : t('transfers.form.save')}
            </Button>
          </div>
        </div>
      </form>

      {/* ── Option B: Rate + summary confirmation dialog ─────── */}
      <Dialog
        open={pendingSubmit !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSubmit(null)
        }}
      >
        <DialogContent size="sm" aria-describedby={undefined}>
          <div className="space-y-4 p-1">
            {/* Header */}
            <div>
              <p className="text-sm font-semibold text-black/80">
                {lang === 'tr' ? 'Kaydetmeden önce onayla' : 'Confirm before saving'}
              </p>
              <p className="mt-0.5 text-xs text-black/40">
                {lang === 'tr'
                  ? 'Aşağıdaki kur ve tutarı kontrol edin.'
                  : 'Review the rate and amount below.'}
              </p>
            </div>

            {/* Summary rows */}
            <div className="divide-y divide-black/[0.06] rounded-xl border border-black/[0.07] bg-black/[0.015]">
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs text-black/45">{lang === 'tr' ? 'Tutar' : 'Amount'}</span>
                <span className="text-sm font-bold tabular-nums text-black/80">
                  {rawAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {currency}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs text-black/45">{lang === 'tr' ? 'Kur' : 'Rate'}</span>
                <span className="text-sm font-bold tabular-nums text-black/80">
                  1 {currency === 'TL' ? 'USD' : currency} ={' '}
                  {exchangeRateValue.toLocaleString(undefined, {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}{' '}
                  TL
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs text-black/45">
                  {lang === 'tr' ? 'TL Karşılığı' : 'TL Equivalent'}
                </span>
                <span className="text-sm font-bold tabular-nums text-brand">
                  {currency === 'TL'
                    ? `${(rawAmount / exchangeRateValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                    : `${(rawAmount * exchangeRateValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setPendingSubmit(null)}
              >
                {lang === 'tr' ? 'Geri Dön' : 'Go Back'}
              </Button>
              <Button
                type="button"
                variant="filled"
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => {
                  const mode = pendingSubmit!.mode
                  setPendingSubmit(null)
                  submitModeRef.current = mode
                  void handleSubmit()
                }}
              >
                {isSubmitting
                  ? t('transfers.form.saving')
                  : lang === 'tr'
                    ? 'Onayla & Kaydet'
                    : 'Confirm & Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
