import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { TransferRow } from '@/hooks/useTransfers'
import type { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import type { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import { useExchangeRateQuery } from '@/hooks/queries/useExchangeRateQuery'
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
  DateInput,
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
  'payment_method_id' | 'psp_id' | 'category_id' | 'currency' | 'type_id'
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
    psp_id: '',
    transfer_date: getLocalDatetimeString(new Date()),
    category_id: '',
    raw_amount: 0,
    currency: 'TL',
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
      psp_id: typeof parsed.psp_id === 'string' ? parsed.psp_id : '',
      category_id: typeof parsed.category_id === 'string' ? parsed.category_id : '',
      currency: parsed.currency === 'USD' ? 'USD' : 'TL',
      type_id: typeof parsed.type_id === 'string' ? parsed.type_id : '',
    }
  } catch {
    return {}
  }
}

function saveRememberedFields(orgId: string | undefined, values: RememberedTransferFields): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getPrefsKey(orgId), JSON.stringify(values))
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
      <SelectTrigger>
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
              'h-9 w-full rounded-lg px-3 py-1.5 text-xs',
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

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: getDefaultFormValues(),
  })

  // Exchange rate auto-fetch (always USD/TRY)
  const { rate: fetchedRate, isError: rateError } = useExchangeRateQuery()
  const normalizedFetchedRate = useMemo(() => {
    if (fetchedRate == null || fetchedRate <= 1) return null
    return Math.round(fetchedRate * 10000) / 10000
  }, [fetchedRate])

  // Reset form when dialog opens/closes or transfer changes
  useEffect(() => {
    if (open) {
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
          exchange_rate: normalizedFetchedRate ?? defaults.exchange_rate,
          transfer_date: defaults.transfer_date,
        })
      }
    }
  }, [open, transfer, form, currentOrg?.id, normalizedFetchedRate])

  // Watch individual fields for submission computation
  const categoryId = form.watch('category_id')
  const currency = form.watch('currency')
  const watchedRawAmount = form.watch('raw_amount')
  const watchedExchangeRate = form.watch('exchange_rate')
  const paymentMethodId = form.watch('payment_method_id')
  const pspId = form.watch('psp_id')
  const typeId = form.watch('type_id')

  // Ensure watched numeric values are always numbers (register can return strings)
  const rawAmount = Number(watchedRawAmount) || 0
  const exchangeRateValue = Number(watchedExchangeRate) || 0

  // Auto-fill exchange_rate when rate is fetched (only for new transfers)
  useEffect(() => {
    if (open && !isEdit && normalizedFetchedRate != null) {
      form.setValue('exchange_rate', normalizedFetchedRate)
    }
  }, [open, normalizedFetchedRate, form, isEdit, currentOrg?.id])

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

  const transferTypeOptions = useMemo<SelectOption[]>(
    () =>
      lookupData.transferTypes.map((tt) => ({
        value: tt.id,
        label: tt.name,
      })),
    [lookupData.transferTypes],
  )

  const pspOptions = useMemo<SelectOption[]>(
    () =>
      lookupData.psps
        .filter((psp) => psp.is_active)
        .map((psp) => ({
          value: psp.id,
          label: psp.name,
        })),
    [lookupData.psps],
  )

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!selectedCategory) {
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
        psp_id: data.psp_id,
        category_id: data.category_id,
        currency: data.currency,
        type_id: data.type_id,
      })

      if (isEdit && transfer) {
        await onSubmit.updateTransfer(transfer.id, formData, selectedCategory)
        toast({
          title: t('transfers.toast.updated'),
          variant: 'success',
        })
      } else {
        await onSubmit.createTransfer(formData, selectedCategory)
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
          exchange_rate: normalizedFetchedRate ?? defaults.exchange_rate,
          transfer_date: defaults.transfer_date,
        })
        return
      }

      onClose()
    } catch {
      toast({ title: t('transfers.toast.error'), variant: 'error' })
    }
  })

  const isSubmitting = onSubmit.isCreating || onSubmit.isUpdating
  const compactErrorClasses = 'mt-1 text-xs text-red'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        size="xl"
        className="max-h-[85vh] overflow-y-auto"
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
          className="grid grid-cols-1 gap-md sm:grid-cols-2"
        >
          {/* Full Name */}
          <div className="sm:col-span-2">
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
              {t('transfers.form.fullName')}
            </Label>
            <Input
              {...form.register('full_name')}
              placeholder={t('transfers.form.fullNamePlaceholder')}
            />
            {form.formState.errors.full_name && (
              <p className={compactErrorClasses}>{form.formState.errors.full_name.message}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="sm:col-span-2">
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
              {t('transfers.form.paymentMethod')}
            </Label>
            <SearchableSelectField
              value={paymentMethodId}
              onValueChange={(value) => form.setValue('payment_method_id', value)}
              placeholder={t('transfers.form.selectPaymentMethod')}
              options={paymentMethodOptions}
              searchPlaceholder={t('transfers.form.searchInList')}
              noResultsText={t('transfers.form.noResults')}
            />
            {form.formState.errors.payment_method_id && (
              <p className={compactErrorClasses}>
                {form.formState.errors.payment_method_id.message}
              </p>
            )}
          </div>

          {/* PSP (Payment Service Provider) */}
          <div className="sm:col-span-2">
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
              {t('transfers.form.psp')}
            </Label>
            <SearchableSelectField
              value={pspId}
              onValueChange={(value) => form.setValue('psp_id', value)}
              placeholder={t('transfers.form.selectPsp')}
              options={pspOptions}
              searchPlaceholder={t('transfers.form.searchInList')}
              noResultsText={t('transfers.form.noResults')}
            />
            {form.formState.errors.psp_id && (
              <p className={compactErrorClasses}>{form.formState.errors.psp_id.message}</p>
            )}
          </div>

          {/* Date & Time */}
          <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
                {t('transfers.form.date')}
              </Label>
              <DateInput type="datetime-local" {...form.register('transfer_date')} />
              {form.formState.errors.transfer_date && (
                <p className={compactErrorClasses}>{form.formState.errors.transfer_date.message}</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
                {t('transfers.form.currency')}
              </Label>
              <Select
                value={currency}
                onValueChange={(value) => form.setValue('currency', value as 'TL' | 'USD')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TL">TL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="sm:col-span-2">
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
              {t('transfers.form.category')}
            </Label>
            <div className="grid w-full grid-cols-2 gap-2">
              {categoryOptions.map((option) => {
                const isSelected = categoryId === option.value
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isSelected ? 'filled' : 'outline'}
                    size="sm"
                    className="w-full min-w-0"
                    onClick={() => form.setValue('category_id', option.value)}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
            {form.formState.errors.category_id && (
              <p className={compactErrorClasses}>{form.formState.errors.category_id.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="sm:col-span-2">
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
              {t('transfers.form.amount')} ({currency})
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...form.register('raw_amount', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.raw_amount && (
              <p className={compactErrorClasses}>{form.formState.errors.raw_amount.message}</p>
            )}

            {/* Live conversion preview */}
            {rawAmount > 0 && exchangeRateValue > 0 && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue/[0.06] px-3 py-2">
                <span className="text-xs font-semibold text-blue">
                  {rawAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {currency}
                </span>
                <span className="text-xs text-black/30">=</span>
                <span className="text-xs font-semibold text-blue">
                  {currency === 'TL'
                    ? `${(rawAmount / exchangeRateValue).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} USD`
                    : `${(rawAmount * exchangeRateValue).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} TL`}
                </span>
                <span className="ml-auto text-[10px] tabular-nums text-black/30">
                  1 USD ={' '}
                  {exchangeRateValue.toLocaleString(undefined, {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}{' '}
                  TL
                </span>
              </div>
            )}
          </div>

          {/* Type */}
          <div className="sm:col-span-2">
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
              {t('transfers.form.type')}
            </Label>
            <SearchableSelectField
              value={typeId}
              onValueChange={(value) => form.setValue('type_id', value)}
              placeholder={t('transfers.form.selectType')}
              options={transferTypeOptions}
              searchPlaceholder={t('transfers.form.searchInList')}
              noResultsText={t('transfers.form.noResults')}
            />
            {form.formState.errors.type_id && (
              <p className={compactErrorClasses}>{form.formState.errors.type_id.message}</p>
            )}
          </div>

          {/* CRM + META */}
          <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
                {t('transfers.form.crmId')}
              </Label>
              <Input
                {...form.register('crm_id')}
                placeholder={t('transfers.form.crmIdPlaceholder')}
              />
            </div>
            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/75">
                {t('transfers.form.metaId')}
              </Label>
              <Input
                {...form.register('meta_id')}
                placeholder={t('transfers.form.metaIdPlaceholder')}
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
                    {isSubmitting ? t('transfers.form.saving') : t('transfers.form.saveAndNew')}
                  </Button>
                )}
                <Button type="submit" variant="filled" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? t('transfers.form.saving') : t('transfers.form.save')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
