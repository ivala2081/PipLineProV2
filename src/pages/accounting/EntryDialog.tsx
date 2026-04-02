import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { localYMD } from '@/lib/date'
import { zodResolver } from '@hookform/resolvers/zod'
import { entryFormSchema, type EntryFormValues } from '@/schemas/accountingSchema'
import type { AccountingEntry } from '@/lib/database.types'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'
import { useHrEmployeesQuery } from '@/hooks/queries/useHrQuery'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAccountingRegisters } from '@/hooks/queries/useAccountingRegisters'
import { useAccountingCategories } from '@/hooks/queries/useAccountingCategories'
import { useRecentPayees } from '@/hooks/queries/useAccountingQuery'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  DatePickerField,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
} from '@ds'

interface EntryDialogProps {
  open: boolean
  onClose: () => void
  entry: AccountingEntry | null
  onSubmit: (data: EntryFormValues) => Promise<void>
  isSubmitting: boolean
}

export function EntryDialog({ open, onClose, entry, onSubmit, isSubmitting }: EntryDialogProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = (i18n.language === 'tr' ? 'tr' : 'en') as 'tr' | 'en'
  const isEditing = !!entry
  const [amountDisplay, setAmountDisplay] = useState('')

  const { currentOrg } = useOrganization()
  const baseCurrency = currentOrg?.base_currency ?? 'USD'
  const secondaryCurrency = baseCurrency === 'USD' ? 'EUR' : 'USD'
  const currencySlots = [baseCurrency, secondaryCurrency, 'USDT'].filter(
    (c, i, arr) => arr.indexOf(c) === i,
  )

  // For employee selector in advance entries
  const { data: employees = [] } = useHrEmployeesQuery()

  // New overhaul data sources
  const { data: registers = [] } = useAccountingRegisters()
  const { data: categories = [] } = useAccountingCategories()
  const { data: recentPayees = [] } = useRecentPayees()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      description_preset: 'diger',
      description: '',
      entry_type: 'ODEME',
      direction: 'out',
      amount: 0,
      currency: 'USDT',
      cost_period: '',
      entry_date: localYMD(new Date()),
      payment_period: '',
      register: 'USDT',
      register_id: null,
      category_id: null,
      payee: null,
      exchange_rate_used: null,
      exchange_rate_override: false,
      hr_employee_id: null,
      advance_type: null,
    },
  })

  useEffect(() => {
    if (open) {
      if (entry) {
        // Detect preset from existing entry
        let preset: EntryFormValues['description_preset'] = 'diger'
        if (entry.advance_type === 'salary') preset = 'maas_avans'
        else if (entry.advance_type === 'bonus') preset = 'prim_avans'
        else if (entry.advance_type === 'insured_salary') preset = 'sigortali_maas_avans'

        reset({
          description_preset: preset,
          description: entry.description,
          entry_type: entry.entry_type,
          direction: entry.direction,
          amount: entry.amount,
          currency: entry.currency as EntryFormValues['currency'],
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
        })
        setAmountDisplay(numberToDisplay(entry.amount, lang))
      } else {
        reset({
          description_preset: 'diger',
          description: '',
          entry_type: 'ODEME',
          direction: 'out',
          amount: 0,
          currency: 'USDT',
          cost_period: '',
          entry_date: localYMD(new Date()),
          payment_period: '',
          register: 'USDT',
          register_id: null,
          category_id: null,
          payee: null,
          exchange_rate_used: null,
          exchange_rate_override: false,
          hr_employee_id: null,
          advance_type: null,
        })
        setAmountDisplay('')
      }
    }
  }, [open, entry, reset, lang])

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch is intentional
  const direction = watch('direction')
  const descriptionPreset = watch('description_preset')
  const isAdvance =
    descriptionPreset === 'maas_avans' ||
    descriptionPreset === 'prim_avans' ||
    descriptionPreset === 'sigortali_maas_avans'

  // When preset changes, sync advance_type and description
  const handlePresetChange = (val: EntryFormValues['description_preset']) => {
    setValue('description_preset', val)
    if (val === 'maas_avans') {
      setValue('advance_type', 'salary')
      setValue('description', 'Maaş Avans Ödemesi')
    } else if (val === 'prim_avans') {
      setValue('advance_type', 'bonus')
      setValue('description', 'Prim Avans Ödemesi')
    } else if (val === 'sigortali_maas_avans') {
      setValue('advance_type', 'insured_salary')
      setValue('description', 'Sigortalı Banka Ödeme')
    } else {
      setValue('advance_type', null)
      setValue('hr_employee_id', null)
      // Keep description as-is for free text
    }
  }

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data)
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('accounting.editEntry') : t('accounting.addEntry')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="space-y-md">
          {/* Description preset selector */}
          <div className="space-y-sm">
            <Label>{t('accounting.form.description')}</Label>
            <Select
              value={descriptionPreset}
              onValueChange={(v) => handlePresetChange(v as EntryFormValues['description_preset'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maas_avans">Maaş Avans Ödemesi</SelectItem>
                <SelectItem value="prim_avans">Prim Avans Ödemesi</SelectItem>
                <SelectItem value="sigortali_maas_avans">Sigortalı Banka Ödeme</SelectItem>
                <SelectItem value="diger">{t('accounting.form.descriptionOther')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Free text only when "Diğer" is selected */}
            {descriptionPreset === 'diger' && (
              <Input
                {...register('description')}
                placeholder={t('accounting.form.descriptionPlaceholder')}
                className="mt-1"
              />
            )}
            {errors.description && <p className="text-xs text-red">{errors.description.message}</p>}
          </div>

          {/* Advance employee + period selectors */}
          {isAdvance && (
            <div className="grid grid-cols-2 gap-md rounded-xl border border-brand/20 bg-brand/5 p-md">
              <div className="space-y-sm">
                <Label className="text-xs text-black/60">
                  {t('accounting.form.advanceEmployee')}
                </Label>
                <Select
                  value={watch('hr_employee_id') ?? ''}
                  onValueChange={(v) => setValue('hr_employee_id', v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('accounting.form.advanceEmployeePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter(
                        (e) =>
                          e.is_active &&
                          (descriptionPreset !== 'sigortali_maas_avans' || e.is_insured),
                      )
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-sm">
                <Label className="text-xs text-black/60">
                  {t('accounting.form.advancePeriod')}
                </Label>
                <Input
                  {...register('payment_period')}
                  placeholder={t('accounting.form.costPeriodPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Entry Type & Direction row */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <Label>{t('accounting.form.entryType')}</Label>
              <Select
                value={watch('entry_type')}
                onValueChange={(v) => setValue('entry_type', v as EntryFormValues['entry_type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ODEME">{t('accounting.entryTypes.ODEME')}</SelectItem>
                  <SelectItem value="TRANSFER">{t('accounting.entryTypes.TRANSFER')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-sm">
              <Label>{t('accounting.form.direction')}</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={direction === 'in' ? 'filled' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setValue('direction', 'in')}
                >
                  {t('accounting.directions.in')}
                </Button>
                <Button
                  type="button"
                  variant={direction === 'out' ? 'filled' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setValue('direction', 'out')}
                >
                  {t('accounting.directions.out')}
                </Button>
              </div>
            </div>
          </div>

          {/* Amount & Currency row */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <Label>{t('accounting.form.amount')}</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amountDisplay}
                onChange={(e) => {
                  const formatted = formatAmount(e.target.value, lang)
                  setAmountDisplay(formatted)
                  setValue('amount', parseAmount(formatted, lang), { shouldValidate: true })
                }}
                placeholder={amountPlaceholder(lang)}
              />
              {errors.amount && <p className="text-xs text-red">{errors.amount.message}</p>}
            </div>
            <div className="space-y-sm">
              <Label>{t('accounting.form.currency')}</Label>
              <Select
                value={watch('currency')}
                onValueChange={(v) => setValue('currency', v as EntryFormValues['currency'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencySlots.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category & Payee row */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <Label>{t('accounting.form.category', 'Category')}</Label>
              <Select
                value={watch('category_id') ?? '__none__'}
                onValueChange={(v) => setValue('category_id', v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('accounting.form.categoryPlaceholder', 'Select category')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t('accounting.form.noCategory', 'None')}
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-sm">
              <Label>{t('accounting.form.payee', 'Payee')}</Label>
              <Input
                value={watch('payee') ?? ''}
                onChange={(e) => setValue('payee', e.target.value || null)}
                placeholder={t('accounting.form.payeePlaceholder', 'Person or company')}
                list="payee-suggestions"
              />
              <datalist id="payee-suggestions">
                {recentPayees.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Register */}
          <div className="space-y-sm">
            <Label>{t('accounting.form.register')}</Label>
            <Select
              value={watch('register_id') ?? watch('register') ?? ''}
              onValueChange={(v) => {
                const reg = registers.find((r) => r.id === v)
                if (reg) {
                  setValue('register_id', reg.id)
                  setValue('register', reg.name)
                } else {
                  setValue('register_id', null)
                  setValue('register', v)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {registers.length > 0 ? (
                  registers
                    .filter((r) => r.is_active)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label} ({r.currency})
                      </SelectItem>
                    ))
                ) : (
                  <>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="NAKIT_TL">Cash TL</SelectItem>
                    <SelectItem value="NAKIT_USD">Cash USD</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-sm">
            <Label>{t('accounting.form.date')}</Label>
            <DatePickerField
              value={watch('entry_date')}
              onChange={(e) => setValue('entry_date', e.target.value)}
            />
            {errors.entry_date && <p className="text-xs text-red">{errors.entry_date.message}</p>}
          </div>

          {/* Cost Period & Payment Period */}
          {!isAdvance && (
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-sm">
                <Label>{t('accounting.form.costPeriod')}</Label>
                <Input
                  {...register('cost_period')}
                  placeholder={t('accounting.form.costPeriodPlaceholder')}
                />
              </div>
              <div className="space-y-sm">
                <Label>{t('accounting.form.paymentPeriod')}</Label>
                <Input
                  {...register('payment_period')}
                  placeholder={t('accounting.form.paymentPeriodPlaceholder')}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('accounting.form.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isSubmitting}>
              {isSubmitting ? t('accounting.form.saving') : t('accounting.form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
