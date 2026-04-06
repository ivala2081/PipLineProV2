import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react'
import { localYMD } from '@/lib/date'
import { entryFormSchema, type EntryFormValues } from '@/schemas/accountingSchema'
import { formatAmount, parseAmount, amountPlaceholder } from '@/lib/formatAmount'
import { useAccountingQuery } from '@/hooks/queries/useAccountingQuery'
import { useHrEmployeesQuery } from '@/hooks/queries/useHrQuery'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAccountingRegisters } from '@/hooks/queries/useAccountingRegisters'
import { useAccountingCategories } from '@/hooks/queries/useAccountingCategories'
import { useRecentPayees } from '@/hooks/queries/useAccountingQuery'
import { useToast } from '@/hooks/useToast'
import {
  PageHeader,
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

export function AddEntryPage() {
  const { t, i18n } = useTranslation('pages')
  const lang = (i18n.language === 'tr' ? 'tr' : 'en') as 'tr' | 'en'
  const navigate = useNavigate()
  const { toast } = useToast()
  const accounting = useAccountingQuery()
  const [amountDisplay, setAmountDisplay] = useState('')

  const { currentOrg } = useOrganization()
  const baseCurrency = currentOrg?.base_currency ?? 'USD'
  const secondaryCurrency = baseCurrency === 'USD' ? 'EUR' : 'USD'
  const currencySlots = [baseCurrency, secondaryCurrency, 'USDT'].filter(
    (c, i, arr) => arr.indexOf(c) === i,
  )

  const { data: employees = [] } = useHrEmployeesQuery()
  const { data: registers = [] } = useAccountingRegisters()
  const { data: categories = [] } = useAccountingCategories()
  const { data: recentPayees = [] } = useRecentPayees()

  const {
    register,
    handleSubmit,
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

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch is intentional
  const direction = watch('direction')
  const descriptionPreset = watch('description_preset')
  const isAdvance =
    descriptionPreset === 'maas_avans' ||
    descriptionPreset === 'prim_avans' ||
    descriptionPreset === 'sigortali_maas_avans'

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
    }
  }

  const onFormSubmit = handleSubmit(async (data) => {
    try {
      await accounting.createEntry(data)
      toast({ title: t('accounting.toast.created'), variant: 'success' })
      navigate('/accounting')
    } catch {
      toast({
        title: t('accounting.toast.createError', 'Failed to create entry'),
        variant: 'error',
      })
    }
  })

  const handleBack = () => navigate('/accounting')

  const labelCls = 'text-xs font-medium tracking-wide text-black/70'

  return (
    <div className="space-y-lg">
      {/* Back + Header */}
      <div>
        <button
          onClick={handleBack}
          className="mb-3 flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>{t('accounting.title')}</span>
        </button>
        <PageHeader
          title={t('accounting.addEntry')}
          subtitle={t('accounting.addEntrySubtitle', 'Create a new accounting entry')}
        />
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          void onFormSubmit(e)
        }}
        className="space-y-md"
      >
        <div className="rounded-xl border border-black/[0.07] bg-bg1">
          {/* ── Description ── */}
          <div className="border-b border-black/[0.06] p-5">
            <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
              <div className="space-y-sm sm:col-span-2">
                <Label className={labelCls}>{t('accounting.form.description')}</Label>
                <Select
                  value={descriptionPreset}
                  onValueChange={(v) =>
                    handlePresetChange(v as EntryFormValues['description_preset'])
                  }
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
                {descriptionPreset === 'diger' && (
                  <Input
                    {...register('description')}
                    placeholder={t('accounting.form.descriptionPlaceholder')}
                  />
                )}
                {errors.description && (
                  <p className="text-xs text-red">{errors.description.message}</p>
                )}
              </div>
              <div className="space-y-sm">
                <Label className={labelCls}>{t('accounting.form.entryType')}</Label>
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
            </div>
          </div>

          {/* ── Advance employee + period (conditional) ── */}
          {isAdvance && (
            <div className="border-b border-black/[0.06] bg-brand/5 px-5 py-4">
              <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
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
            </div>
          )}

          {/* ── Amount / Currency / Direction ── */}
          <div className="border-b border-black/[0.06] p-5">
            <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
              <div className="space-y-sm">
                <Label className={labelCls}>{t('accounting.form.amount')}</Label>
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
                <Label className={labelCls}>{t('accounting.form.currency')}</Label>
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
              <div className="space-y-sm">
                <Label className={labelCls}>{t('accounting.form.direction')}</Label>
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
              <div className="space-y-sm">
                <Label className={labelCls}>{t('accounting.form.register')}</Label>
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
            </div>
          </div>

          {/* ── Category / Payee / Date ── */}
          <div className="border-b border-black/[0.06] p-5">
            <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
              <div className="space-y-sm">
                <Label className={labelCls}>{t('accounting.form.category', 'Category')}</Label>
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
                <Label className={labelCls}>{t('accounting.form.payee', 'Payee')}</Label>
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
              <div className="space-y-sm">
                <Label className={labelCls}>{t('accounting.form.date')}</Label>
                <DatePickerField
                  value={watch('entry_date')}
                  onChange={(e) => setValue('entry_date', e.target.value)}
                />
                {errors.entry_date && (
                  <p className="text-xs text-red">{errors.entry_date.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Cost Period / Payment Period ── */}
          {!isAdvance && (
            <div className="p-5">
              <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                <div className="space-y-sm">
                  <Label className={labelCls}>{t('accounting.form.costPeriod')}</Label>
                  <Input
                    {...register('cost_period')}
                    placeholder={t('accounting.form.costPeriodPlaceholder')}
                  />
                </div>
                <div className="space-y-sm">
                  <Label className={labelCls}>{t('accounting.form.paymentPeriod')}</Label>
                  <Input
                    {...register('payment_period')}
                    placeholder={t('accounting.form.paymentPeriodPlaceholder')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Actions bar ── */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.07] bg-bg1 px-5 py-3.5">
          <Button type="button" variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft size={14} weight="bold" />
            {t('accounting.form.cancel')}
          </Button>
          <Button type="submit" variant="filled" size="sm" disabled={accounting.isCreating}>
            <FloppyDisk size={14} weight="bold" />
            {accounting.isCreating ? t('accounting.form.saving') : t('accounting.form.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
