import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { ArrowsClockwise, SpinnerGap } from '@phosphor-icons/react'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { TransferRow } from '@/hooks/useTransfers'
import type { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import type { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import { useExchangeRateQuery } from '@/hooks/queries/useExchangeRateQuery'
import { useOrgPspRates, resolveRateForDate } from '@/hooks/queries/usePspRatesQuery'
import { useToast } from '@/hooks/useToast'
import { transferFormSchema, type TransferFormValues } from '@/schemas/transferSchema'
import { basicInputClasses, disabledInputClasses, focusInputClasses } from '@ds/components/Input'
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
import { cn } from '@ds/utils'

interface TransferDialogProps {
  open: boolean
  onClose: () => void
  transfer: TransferRow | null
  lookupData: ReturnType<typeof useLookupQueries>
  onSubmit: ReturnType<typeof useTransfersQuery>
}

type SelectOption = {
  value: string
  label: string
  searchText?: string
}

type RememberedTransferFields = Pick<
  TransferFormValues,
  'payment_method_id' | 'category_id' | 'currency' | 'psp_id' | 'type_id'
>

const TRANSFER_PREFS_KEY = 'piplinepro:transfer-form-prefs'

/** Yerel saati datetime-local input formatında döndürür (UTC değil). */
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
    transfer_date: getLocalDatetimeString(new Date()),
    category_id: '',
    raw_amount: 0,
    currency: 'TL',
    psp_id: '',
    type_id: '',
    exchange_rate: 1,
    crm_id: '',
    meta_id: '',
  }
}

function getPrefsKey(orgId?: string): string {
  return `${TRANSFER_PREFS_KEY}:${orgId ?? 'global'}`
}

function loadRememberedFields(orgId?: string): Partial<RememberedTransferFields> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(getPrefsKey(orgId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<RememberedTransferFields>
    return {
      payment_method_id:
        typeof parsed.payment_method_id === 'string' ? parsed.payment_method_id : '',
      category_id: typeof parsed.category_id === 'string' ? parsed.category_id : '',
      currency: parsed.currency === 'USD' ? 'USD' : 'TL',
      psp_id: typeof parsed.psp_id === 'string' ? parsed.psp_id : '',
      type_id: typeof parsed.type_id === 'string' ? parsed.type_id : '',
    }
  } catch {
    return {}
  }
}

function saveRememberedFields(
  orgId: string | undefined,
  values: RememberedTransferFields,
): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getPrefsKey(orgId), JSON.stringify(values))
}

function SearchableSelectField({
  value,
  onValueChange,
  placeholder,
  options,
  triggerClassName,
  searchPlaceholder,
  noResultsText,
}: {
  value: string
  onValueChange: (next: string) => void
  placeholder: string
  options: SelectOption[]
  triggerClassName?: string
  searchPlaceholder: string
  noResultsText: string
}) {
  const [query, setQuery] = useState('')

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter((option) =>
      (option.searchText ?? option.label).toLowerCase().includes(normalized),
    )
  }, [options, query])

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        onValueChange(next)
        setQuery('')
      }}
      onOpenChange={(isOpen) => {
        if (!isOpen) setQuery('')
      }}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 pb-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={searchPlaceholder}
            className={cn(
              basicInputClasses,
              disabledInputClasses,
              focusInputClasses,
              '!h-9 w-full !rounded-lg !px-3 !py-1.5 !text-xs',
            )}
          />
        </div>
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        ) : (
          <p className="px-3 py-2 text-xs text-black/55">{noResultsText}</p>
        )}
      </SelectContent>
    </Select>
  )
}

export function TransferDialog({
  open,
  onClose,
  transfer,
  lookupData,
  onSubmit,
}: TransferDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { currentOrg } = useOrganization()
  const isEdit = !!transfer
  const submitModeRef = useRef<'close' | 'new'>('close')

  // Rate history for all PSPs in this org
  const { ratesByPsp } = useOrgPspRates()

  // Rate override state (user can manually override the auto-resolved rate)
  const [rateOverride, setRateOverride] = useState<number | null>(null)
  const [showRateOverride, setShowRateOverride] = useState(false)

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: getDefaultFormValues(),
  })

  // Reset form when dialog opens/closes or transfer changes
  useEffect(() => {
    if (open) {
      setRateOverride(null)
      setShowRateOverride(false)
      if (transfer) {
        form.reset({
          full_name: transfer.full_name,
          payment_method_id: transfer.payment_method_id,
          transfer_date: transfer.transfer_date
            ? getLocalDatetimeString(new Date(transfer.transfer_date))
            : '',
          category_id: transfer.category_id,
          raw_amount: Math.abs(transfer.amount),
          currency: transfer.currency,
          psp_id: transfer.psp_id,
          type_id: transfer.type_id,
          exchange_rate: transfer.exchange_rate ?? 1,
          crm_id: transfer.crm_id ?? '',
          meta_id: transfer.meta_id ?? '',
        })
      } else {
        const defaults = getDefaultFormValues()
        const remembered = loadRememberedFields(currentOrg?.id)
        form.reset({
          ...defaults,
          ...remembered,
          transfer_date: defaults.transfer_date,
        })
      }
    }
  }, [open, transfer, form, currentOrg?.id])

  // Watch category/psp/currency for submission computation
  const [categoryId, pspId, currency, rawAmount, exchangeRateValue, transferDate] =
    form.watch([
      'category_id',
      'psp_id',
      'currency',
      'raw_amount',
      'exchange_rate',
      'transfer_date',
    ])

  // Reset rate override when PSP or date changes
  useEffect(() => {
    setRateOverride(null)
    setShowRateOverride(false)
  }, [pspId, transferDate])

  // Exchange rate auto-fetch (always USD/TRY)
  const {
    rate: fetchedRate,
    isLoading: rateLoading,
    isError: rateError,
    refetch: refetchRate,
  } = useExchangeRateQuery()

  // Auto-fill exchange_rate when rate is fetched (only for new transfers)
  useEffect(() => {
    if (!isEdit && fetchedRate != null && fetchedRate > 1) {
      form.setValue('exchange_rate', Math.round(fetchedRate * 10000) / 10000)
    }
  }, [fetchedRate, form, isEdit])

  // Show toast when exchange rate fetch fails
  useEffect(() => {
    if (rateError && open) {
      toast({
        title: t('transfers.toast.exchangeRateError', 'Exchange rate could not be fetched'),
        description: t(
          'transfers.toast.exchangeRateErrorDesc',
          'Please enter the rate manually or try refreshing.',
        ),
        variant: 'warning',
      })
    }
  }, [rateError, open, toast, t])

  const selectedCategory = useMemo(
    () => lookupData.categories.find((c) => c.id === categoryId),
    [lookupData.categories, categoryId],
  )
  const selectedPsp = useMemo(
    () => lookupData.psps.find((p) => p.id === pspId),
    [lookupData.psps, pspId],
  )

  // Resolve the commission rate for the selected PSP + date
  const resolvedRate = useMemo(() => {
    if (!pspId || !transferDate) return null
    const dateStr = transferDate.slice(0, 10) // 'YYYY-MM-DD' from datetime-local
    const pspRates = ratesByPsp.get(pspId)
    if (!pspRates || pspRates.length === 0) return null
    return resolveRateForDate(pspRates, dateStr)
  }, [pspId, transferDate, ratesByPsp])

  // Effective rate: override > resolved from history > PSP fallback
  const effectiveRate =
    rateOverride ?? resolvedRate ?? selectedPsp?.commission_rate ?? 0

  const paymentMethodOptions = useMemo<SelectOption[]>(
    () =>
      lookupData.paymentMethods.map((pm) => ({
        value: pm.id,
        label: pm.name,
      })),
    [lookupData.paymentMethods],
  )

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      lookupData.categories.map((cat) => ({
        value: cat.id,
        label: cat.name,
      })),
    [lookupData.categories],
  )

  const pspOptions = useMemo<SelectOption[]>(
    () =>
      lookupData.psps.map((psp) => ({
        value: psp.id,
        label: `${psp.name} (${(psp.commission_rate * 100).toFixed(1)}%)`,
        searchText: `${psp.name} ${(psp.commission_rate * 100).toFixed(1)}`,
      })),
    [lookupData.psps],
  )

  const transferTypeOptions = useMemo<SelectOption[]>(
    () =>
      lookupData.transferTypes.map((tt) => ({
        value: tt.id,
        label: tt.name,
      })),
    [lookupData.transferTypes],
  )

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!selectedCategory || !selectedPsp) {
      toast({ title: t('transfers.toast.error'), variant: 'error' })
      return
    }

    try {
      const formData = {
        ...data,
        transfer_date: new Date(data.transfer_date).toISOString(),
      }

      saveRememberedFields(currentOrg?.id, {
        payment_method_id: data.payment_method_id,
        category_id: data.category_id,
        currency: data.currency,
        psp_id: data.psp_id,
        type_id: data.type_id,
      })

      if (isEdit && transfer) {
        await onSubmit.updateTransfer(
          transfer.id,
          formData,
          selectedCategory,
          selectedPsp,
          effectiveRate,
        )
        toast({
          title: t('transfers.toast.updated'),
          variant: 'success',
        })
      } else {
        await onSubmit.createTransfer(
          formData,
          selectedCategory,
          selectedPsp,
          effectiveRate,
        )
        toast({
          title: t('transfers.toast.created'),
          variant: 'success',
        })
      }

      if (!isEdit && submitModeRef.current === 'new') {
        const defaults = getDefaultFormValues()
        const remembered = loadRememberedFields(currentOrg?.id)
        form.reset({
          ...defaults,
          ...remembered,
          transfer_date: defaults.transfer_date,
        })
        setRateOverride(null)
        setShowRateOverride(false)
        return
      }

      onClose()
    } catch (error) {
      toast({ title: t('transfers.toast.error'), variant: 'error' })
    }
  })

  const isSubmitting = onSubmit.isCreating || onSubmit.isUpdating
  const compactLabelClasses = 'mb-1 text-xs font-medium tracking-wide text-black/75'
  const compactControlClasses = '!h-10 !rounded-xl !px-3 !py-2 !text-sm'
  const compactHintClasses = 'mt-1 text-[11px] text-black/55'
  const compactErrorClasses = 'mt-1 text-[11px] text-red'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[85vh] max-w-xl overflow-y-auto p-4 sm:p-5"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isEdit ? t('transfers.editTransfer') : t('transfers.addTransfer')}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/60">
            {t('transfers.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            submitModeRef.current = 'close'
            void handleSubmit(event)
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {/* Full Name */}
          <div className="sm:col-span-2">
            <Label className={compactLabelClasses}>
              {t('transfers.form.fullName')}
            </Label>
            <Input
              {...form.register('full_name')}
              placeholder={t('transfers.form.fullNamePlaceholder')}
              className={compactControlClasses}
            />
            {form.formState.errors.full_name && (
              <p className={compactErrorClasses}>
                {form.formState.errors.full_name.message}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="sm:col-span-2">
            <Label className={compactLabelClasses}>
              {t('transfers.form.paymentMethod')}
            </Label>
            <SearchableSelectField
              value={form.watch('payment_method_id')}
              onValueChange={(value) => form.setValue('payment_method_id', value)}
              placeholder={t('transfers.form.selectPaymentMethod')}
              options={paymentMethodOptions}
              triggerClassName={compactControlClasses}
              searchPlaceholder={t('transfers.form.searchInList')}
              noResultsText={t('transfers.form.noResults')}
            />
            {form.formState.errors.payment_method_id && (
              <p className={compactErrorClasses}>
                {form.formState.errors.payment_method_id.message}
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
            <Label className={compactLabelClasses}>
              {t('transfers.form.date')}
            </Label>
            <input
              type="datetime-local"
              {...form.register('transfer_date')}
              className={cn(
                basicInputClasses,
                disabledInputClasses,
                focusInputClasses,
                compactControlClasses,
                'w-full',
              )}
            />
            {form.formState.errors.transfer_date && (
              <p className={compactErrorClasses}>
                {form.formState.errors.transfer_date.message}
              </p>
            )}
            </div>

            {/* Currency */}
            <div>
            <Label className={compactLabelClasses}>
              {t('transfers.form.currency')}
            </Label>
            <Select
              value={form.watch('currency')}
              onValueChange={(value) =>
                form.setValue('currency', value as 'TL' | 'USD')
              }
            >
              <SelectTrigger className={compactControlClasses}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TL">TL</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>

          {/* Exchange Rate (USD/TRY — always visible) */}
          <div className="sm:col-span-2">
            <Label className={compactLabelClasses}>
              {t('transfers.form.exchangeRate')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="0.0001"
                {...form.register('exchange_rate')}
                className={cn(compactControlClasses, 'flex-1')}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="!h-10 !w-10 shrink-0 !p-0"
                onClick={() => refetchRate()}
                disabled={rateLoading}
                title={t('transfers.form.refreshRate')}
              >
                {rateLoading ? (
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowsClockwise className="h-4 w-4" />
                )}
              </Button>
            </div>
            {rateError ? (
              <p className="mt-1 text-[11px] text-amber-600">
                {t(
                  'transfers.form.exchangeRateWarning',
                  'Could not fetch rate automatically. Enter manually or retry.',
                )}
              </p>
            ) : (
              <p className={compactHintClasses}>
                {t('transfers.form.exchangeRateHint', {
                  rate: exchangeRateValue,
                })}
              </p>
            )}
            {form.formState.errors.exchange_rate && (
              <p className={compactErrorClasses}>
                {form.formState.errors.exchange_rate.message}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="sm:col-span-2">
            <Label className={compactLabelClasses}>
              {t('transfers.form.category')}
            </Label>
            <div className="grid w-full grid-cols-2 gap-2">
              {categoryOptions.map((option) => {
                const isSelected = form.watch('category_id') === option.value
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isSelected ? 'filled' : 'outline'}
                    size="sm"
                    className={cn(compactControlClasses, 'w-full min-w-0')}
                    onClick={() => form.setValue('category_id', option.value)}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
            {form.formState.errors.category_id && (
              <p className={compactErrorClasses}>
                {form.formState.errors.category_id.message}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="sm:col-span-2">
            <Label className={compactLabelClasses}>
              {t('transfers.form.amount')}
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...form.register('raw_amount')}
              placeholder="0.00"
              className={compactControlClasses}
            />
            <p className={compactHintClasses}>
              {t('transfers.form.amountHint')}
            </p>
            {rawAmount > 0 && exchangeRateValue > 0 && (
              <p className="mt-1 text-xs font-medium text-blue-600">
                {currency === 'TL'
                  ? `≈ ${(rawAmount / exchangeRateValue).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} USD`
                  : `≈ ${(rawAmount * exchangeRateValue).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} TL`}
              </p>
            )}
            {form.formState.errors.raw_amount && (
              <p className={compactErrorClasses}>
                {form.formState.errors.raw_amount.message}
              </p>
            )}
          </div>

          {/* PSP */}
          <div className="sm:col-span-2">
            <Label className={compactLabelClasses}>
              {t('transfers.form.psp')}
            </Label>
            <SearchableSelectField
              value={form.watch('psp_id')}
              onValueChange={(value) => form.setValue('psp_id', value)}
              placeholder={t('transfers.form.selectPsp')}
              options={pspOptions}
              triggerClassName={compactControlClasses}
              searchPlaceholder={t('transfers.form.searchInList')}
              noResultsText={t('transfers.form.noResults')}
            />
            {form.formState.errors.psp_id && (
              <p className={compactErrorClasses}>
                {form.formState.errors.psp_id.message}
              </p>
            )}

            {/* Commission rate info */}
            {selectedPsp && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className={compactHintClasses}>
                  {t('transfers.form.commissionRate')}:{' '}
                  <span className="font-mono font-medium tabular-nums">
                    {(effectiveRate * 100).toFixed(1)}%
                  </span>
                  {rateOverride !== null && (
                    <span className="ml-1 text-amber-600">
                      ({t('transfers.form.overridden')})
                      <button
                        type="button"
                        className="ml-1 text-[11px] underline"
                        onClick={() => {
                          setRateOverride(null)
                          setShowRateOverride(false)
                        }}
                      >
                        {t('transfers.form.resetRate')}
                      </button>
                    </span>
                  )}
                </p>

                {!showRateOverride && rateOverride === null && (
                  <button
                    type="button"
                    className="text-[11px] text-blue-600 underline"
                    onClick={() => setShowRateOverride(true)}
                  >
                    {t('transfers.form.overrideRate')}
                  </button>
                )}

                {/* Snapshot info when editing */}
                {isEdit && transfer?.commission_rate_snapshot != null && (
                  <p className={compactHintClasses}>
                    {t('transfers.form.originalRate')}:{' '}
                    <span className="font-mono tabular-nums">
                      {(transfer.commission_rate_snapshot * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Rate override input */}
            {showRateOverride && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="99.99"
                  step="0.1"
                  placeholder="%"
                  className="!h-8 !w-24 !rounded-lg !px-2 !py-1 !text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = parseFloat(
                        (e.target as HTMLInputElement).value,
                      )
                      if (!isNaN(val) && val >= 0 && val < 100) {
                        setRateOverride(val / 100)
                        setShowRateOverride(false)
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="!h-8 !px-2 !text-xs"
                  onClick={(e) => {
                    const input = (
                      e.currentTarget.previousElementSibling as HTMLInputElement
                    )
                    const val = parseFloat(input?.value ?? '')
                    if (!isNaN(val) && val >= 0 && val < 100) {
                      setRateOverride(val / 100)
                      setShowRateOverride(false)
                    }
                  }}
                >
                  OK
                </Button>
                <Button
                  type="button"
                  variant="borderless"
                  size="sm"
                  className="!h-8 !px-2 !text-xs"
                  onClick={() => setShowRateOverride(false)}
                >
                  {t('transfers.form.cancel')}
                </Button>
              </div>
            )}
          </div>

          {/* Type */}
          <div className="sm:col-span-2">
            <Label className={compactLabelClasses}>
              {t('transfers.form.type')}
            </Label>
            <SearchableSelectField
              value={form.watch('type_id')}
              onValueChange={(value) => form.setValue('type_id', value)}
              placeholder={t('transfers.form.selectType')}
              options={transferTypeOptions}
              triggerClassName={compactControlClasses}
              searchPlaceholder={t('transfers.form.searchInList')}
              noResultsText={t('transfers.form.noResults')}
            />
            {form.formState.errors.type_id && (
              <p className={compactErrorClasses}>
                {form.formState.errors.type_id.message}
              </p>
            )}
          </div>

          {/* CRM + META */}
          <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className={compactLabelClasses}>
                {t('transfers.form.crmId')}
              </Label>
              <Input
                {...form.register('crm_id')}
                placeholder={t('transfers.form.crmIdPlaceholder')}
                className={compactControlClasses}
              />
            </div>
            <div>
              <Label className={compactLabelClasses}>
                {t('transfers.form.metaId')}
              </Label>
              <Input
                {...form.register('meta_id')}
                placeholder={t('transfers.form.metaIdPlaceholder')}
                className={compactControlClasses}
              />
            </div>
          </div>

          <div className="pt-1 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                {t('transfers.form.cancel')}
              </Button>
              <div className="ml-auto flex items-center gap-2">
                {!isEdit && (
                  <Button
                    type="button"
                    variant="gray"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                      submitModeRef.current = 'new'
                      void handleSubmit()
                    }}
                  >
                    {isSubmitting
                      ? t('transfers.form.saving')
                      : t('transfers.form.saveAndNew')}
                  </Button>
                )}
                <Button type="submit" variant="filled" size="sm" disabled={isSubmitting}>
                  {isSubmitting
                    ? t('transfers.form.saving')
                    : t('transfers.form.save')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
