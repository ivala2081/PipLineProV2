import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  UserCircle,
  Briefcase,
  Shield,
  ShieldWarning,
  Money,
  CurrencyCircleDollar,
  NotePencil,
  CalendarBlank,
  Envelope,
  User,
  CheckCircle,
  XCircle,
  FloppyDisk,
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
  Separator,
  Skeleton,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useHrEmployeesQuery,
  useHrMutations,
  useHrSettingsQuery,
  HR_EMPLOYEE_ROLES,
} from '@/hooks/queries/useHrQuery'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'

/* ------------------------------------------------------------------ */
/*  Form schema                                                         */
/* ------------------------------------------------------------------ */

function buildEmployeeSchema(roles: string[]) {
  return z.object({
    full_name: z.string().min(2, 'En az 2 karakter olmalı'),
    email: z.string().email('Geçerli bir e-posta girin'),
    role: z.string().refine((v) => roles.includes(v), { message: 'Geçersiz rol' }),
    salary_tl: z.coerce.number().min(0, 'Maaş negatif olamaz'),
    salary_currency: z.enum(['TL', 'USD']),
    is_insured: z.boolean(),
    receives_supplement: z.boolean(),
    use_custom_bank_salary: z.boolean(),
    bank_salary_tl: z.coerce.number().min(0).optional(),
    is_active: z.boolean(),
    hire_date: z.string().optional(),
    exit_date: z.string().optional(),
    notes: z.string().optional(),
  })
}

type EmployeeFormValues = z.infer<ReturnType<typeof buildEmployeeSchema>>

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                     */
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
/*  Toggle button                                                       */
/* ------------------------------------------------------------------ */

function ToggleButton({
  active,
  onClick,
  children,
  color = 'brand',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  color?: 'brand' | 'orange'
}) {
  const activeClasses =
    color === 'orange' ? 'border-orange/40 bg-orange/5 text-black' : 'border-brand/40 bg-brand/5 text-black'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3.5 py-2.5 text-center transition-all ${
        active ? activeClasses : 'border-black/[0.09] bg-bg2 text-black/60 hover:border-black/15 hover:bg-bg1'
      }`}
    >
      <span className="text-xs font-medium">{children}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */

export function EmployeeFormPage() {
  const { i18n } = useTranslation('pages')
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const lang = i18n.language === 'tr' ? 'tr' : 'en'
  const isEdit = !!id

  const [salaryDisplay, setSalaryDisplay] = useState('')
  const [bankSalaryDisplay, setBankSalaryDisplay] = useState('')

  const { createEmployee, updateEmployee } = useHrMutations()
  const { data: hrSettings } = useHrSettingsQuery()
  const { data: employees = [], isLoading: employeesLoading } = useHrEmployeesQuery()
  const settingsRoles = hrSettings?.roles ?? HR_EMPLOYEE_ROLES
  const insuredBankAmountTl = hrSettings?.insured_bank_amount_tl ?? 28075.5

  const employee = useMemo(() => {
    if (!id) return null
    return employees.find((e) => e.id === id) ?? null
  }, [id, employees])

  const schema = useMemo(() => buildEmployeeSchema(settingsRoles), [settingsRoles])

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'Operation',
      salary_tl: 0,
      salary_currency: 'TL' as const,
      is_insured: true,
      receives_supplement: false,
      use_custom_bank_salary: false,
      bank_salary_tl: 0,
      is_active: true,
      hire_date: '',
      exit_date: '',
      notes: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (employee) {
      const hasCustomBank = employee.bank_salary_tl !== null && employee.bank_salary_tl !== undefined
      form.reset({
        full_name: employee.full_name,
        email: employee.email,
        role: employee.role,
        salary_tl: employee.salary_tl ?? 0,
        salary_currency: employee.salary_currency ?? 'TL',
        is_insured: employee.is_insured ?? true,
        receives_supplement: employee.receives_supplement ?? false,
        use_custom_bank_salary: hasCustomBank,
        bank_salary_tl: employee.bank_salary_tl ?? 0,
        is_active: employee.is_active,
        hire_date: employee.hire_date ?? '',
        exit_date: employee.exit_date ?? '',
        notes: employee.notes ?? '',
      })
      setSalaryDisplay(numberToDisplay(employee.salary_tl ?? 0, lang))
      setBankSalaryDisplay(hasCustomBank ? numberToDisplay(employee.bank_salary_tl!, lang) : '')
    }
  }, [employee, form, lang])

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const payload = {
        full_name: data.full_name.trim(),
        email: data.email.trim().toLowerCase(),
        role: data.role,
        salary_tl: data.salary_tl,
        salary_currency: data.salary_currency,
        is_insured: data.is_insured,
        receives_supplement: data.is_insured ? false : data.receives_supplement,
        bank_salary_tl:
          data.is_insured && data.use_custom_bank_salary ? (data.bank_salary_tl ?? null) : null,
        is_active: data.is_active,
        hire_date: data.hire_date || null,
        exit_date: data.is_active ? null : (data.exit_date || null),
        notes: data.notes?.trim() || null,
      }

      if (isEdit && employee) {
        await updateEmployee.mutateAsync({ id: employee.id, payload })
        toast({
          title: lang === 'tr' ? 'Çalışan güncellendi' : 'Employee updated',
          variant: 'success',
        })
      } else {
        await createEmployee.mutateAsync(payload)
        toast({ title: lang === 'tr' ? 'Çalışan eklendi' : 'Employee added', variant: 'success' })
      }
      navigate('/hr')
    } catch {
      toast({
        title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong',
        variant: 'error',
      })
    }
  })

  const isSubmitting = createEmployee.isPending || updateEmployee.isPending
  const compactError = 'mt-1.5 text-xs text-red'

  // Loading state for edit mode
  if (isEdit && employeesLoading) {
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

  // Not found
  if (isEdit && !employeesLoading && !employee) {
    return (
      <div className="space-y-lg">
        <div>
          <button
            onClick={() => navigate('/hr')}
            className="mb-3 flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
          >
            <ArrowLeft size={13} weight="bold" />
            <span>{lang === 'tr' ? 'İnsan Kaynakları' : 'Human Resources'}</span>
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <UserCircle size={48} weight="duotone" className="text-black/15" />
          <p className="mt-3 text-sm text-black/50">
            {lang === 'tr' ? 'Çalışan bulunamadı' : 'Employee not found'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      {/* Back link + Header */}
      <div>
        <button
          onClick={() => navigate('/hr')}
          className="mb-3 flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>{lang === 'tr' ? 'İnsan Kaynakları' : 'Human Resources'}</span>
        </button>
        <PageHeader
          title={
            isEdit
              ? lang === 'tr'
                ? 'Çalışanı Düzenle'
                : 'Edit Employee'
              : lang === 'tr'
                ? 'Yeni Çalışan'
                : 'New Employee'
          }
          subtitle={
            isEdit
              ? employee?.full_name
              : lang === 'tr'
                ? 'Çalışan bilgilerini doldurun'
                : 'Fill in employee details'
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
            {/* Personal Info */}
            <FormSection
              icon={User}
              title={lang === 'tr' ? 'Kişisel Bilgiler' : 'Personal Information'}
            >
              <div className="space-y-md">
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {lang === 'tr' ? 'Ad Soyad' : 'Full Name'}
                  </Label>
                  <Input
                    {...form.register('full_name')}
                    placeholder={lang === 'tr' ? 'Ad soyad girin' : 'Enter full name'}
                  />
                  {form.formState.errors.full_name && (
                    <p className={compactError}>{form.formState.errors.full_name.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <Envelope size={12} className="mr-1 inline text-black/30" />
                    {lang === 'tr' ? 'E-posta' : 'Email'}
                  </Label>
                  <Input
                    type="email"
                    {...form.register('email')}
                    placeholder="ornek@sirket.com"
                  />
                  {form.formState.errors.email && (
                    <p className={compactError}>{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <CalendarBlank size={12} className="mr-1 inline text-black/30" />
                    {lang === 'tr' ? 'İşe Giriş Tarihi' : 'Hire Date'}
                  </Label>
                  <Input type="date" {...form.register('hire_date')} />
                </div>

                <Separator />

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {lang === 'tr' ? 'Rol' : 'Role'}
                  </Label>
                  <Select
                    value={form.watch('role')}
                    onValueChange={(v) =>
                      form.setValue('role', v as EmployeeFormValues['role'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {settingsRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className={compactError}>{form.formState.errors.role.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {lang === 'tr' ? 'Çalışma Durumu' : 'Employment Status'}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <ToggleButton
                      active={form.watch('is_active')}
                      onClick={() => form.setValue('is_active', true)}
                    >
                      <CheckCircle size={14} weight="fill" className="mr-1.5 inline text-green" />
                      {lang === 'tr' ? 'Aktif' : 'Active'}
                    </ToggleButton>
                    <ToggleButton
                      active={!form.watch('is_active')}
                      onClick={() => form.setValue('is_active', false)}
                    >
                      <XCircle size={14} weight="fill" className="mr-1.5 inline text-black/30" />
                      {lang === 'tr' ? 'Pasif' : 'Inactive'}
                    </ToggleButton>
                  </div>
                </div>

                {/* Exit Date — only shown when Pasif */}
                {!form.watch('is_active') && (
                  <div>
                    <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                      <CalendarBlank size={12} className="mr-1 inline text-black/30" />
                      {lang === 'tr' ? 'Çıkış Tarihi' : 'Exit Date'}
                    </Label>
                    <Input type="date" {...form.register('exit_date')} />
                  </div>
                )}
              </div>
            </FormSection>

            {/* Notes */}
            <FormSection
              icon={NotePencil}
              title={lang === 'tr' ? 'Notlar' : 'Notes'}
            >
              <div>
                <textarea
                  {...form.register('notes')}
                  rows={3}
                  placeholder={
                    lang === 'tr' ? 'Çalışan hakkında notlar...' : 'Notes about the employee...'
                  }
                  className="w-full resize-none rounded-lg border border-black/[0.12] bg-bg2 px-3.5 py-2.5 text-sm text-black placeholder:text-black/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 dark:border-white/10 dark:bg-bg2 dark:text-white"
                />
              </div>
            </FormSection>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-md">
            {/* Role & Status */}
            <FormSection
              icon={Shield}
              title={lang === 'tr' ? 'Sigorta' : 'Insurance'}
            >
              <div className="space-y-md">
                {/* Insurance */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {lang === 'tr' ? 'Sigorta Durumu' : 'Insurance Status'}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <ToggleButton
                      active={form.watch('is_insured')}
                      onClick={() => {
                        form.setValue('is_insured', true)
                        form.setValue('receives_supplement', false)
                      }}
                    >
                      <Shield size={14} weight="fill" className="mr-1.5 inline text-blue" />
                      {lang === 'tr' ? 'Sigortalı' : 'Insured'}
                    </ToggleButton>
                    <ToggleButton
                      active={!form.watch('is_insured')}
                      onClick={() => {
                        form.setValue('is_insured', false)
                        form.setValue('receives_supplement', false)
                      }}
                    >
                      <ShieldWarning size={14} weight="fill" className="mr-1.5 inline text-orange" />
                      {lang === 'tr' ? 'Sigortasız' : 'Uninsured'}
                    </ToggleButton>
                  </div>

                  {/* Supplement toggle */}
                  {!form.watch('is_insured') && (
                    <button
                      type="button"
                      onClick={() =>
                        form.setValue('receives_supplement', !form.watch('receives_supplement'))
                      }
                      className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 transition-all ${
                        form.watch('receives_supplement')
                          ? 'border-orange/40 bg-orange/5'
                          : 'border-black/[0.09] bg-bg2 hover:border-black/15'
                      }`}
                    >
                      <span className="text-xs font-medium text-black/70">
                        {lang === 'tr' ? 'Sigorta Elden Ödeme Alacak' : 'Insurance Supplement'}
                      </span>
                      <div
                        className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${
                          form.watch('receives_supplement') ? 'bg-orange' : 'bg-black/15'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            form.watch('receives_supplement')
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Salary */}
            <FormSection
              icon={Money}
              title={lang === 'tr' ? 'Maaş Bilgileri' : 'Salary Information'}
            >
              <div className="space-y-md">
                {/* Currency selector */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    <CurrencyCircleDollar size={12} className="mr-1 inline text-black/30" />
                    {lang === 'tr' ? 'Para Birimi' : 'Currency'}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <ToggleButton
                      active={form.watch('salary_currency') === 'TL'}
                      onClick={() => form.setValue('salary_currency', 'TL')}
                    >
                      ₺ Türk Lirası (TL)
                    </ToggleButton>
                    <ToggleButton
                      active={form.watch('salary_currency') === 'USD'}
                      onClick={() => form.setValue('salary_currency', 'USD')}
                    >
                      $ Amerikan Doları (USD)
                    </ToggleButton>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                    {lang === 'tr' ? 'Tutar' : 'Amount'}
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={salaryDisplay}
                    onChange={(e) => {
                      const formatted = formatAmount(e.target.value, lang)
                      setSalaryDisplay(formatted)
                      form.setValue('salary_tl', parseAmount(formatted, lang), {
                        shouldValidate: true,
                      })
                    }}
                    placeholder={amountPlaceholder(lang)}
                  />
                  {form.formState.errors.salary_tl && (
                    <p className={compactError}>{form.formState.errors.salary_tl.message}</p>
                  )}
                </div>

                {/* Bank salary split (insured only) */}
                {form.watch('is_insured') && (
                  <>
                    <Separator />
                    <div>
                      <Label className="mb-1.5 text-xs font-medium tracking-wide text-black/70">
                        {lang === 'tr' ? 'Banka Ödeme Tutarı' : 'Bank Deposit Amount'}
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleButton
                          active={!form.watch('use_custom_bank_salary')}
                          onClick={() => {
                            form.setValue('use_custom_bank_salary', false)
                            form.setValue('bank_salary_tl', 0)
                            setBankSalaryDisplay('')
                          }}
                        >
                          {lang === 'tr' ? 'Varsayılan' : 'Default'} (
                          {insuredBankAmountTl.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          TL)
                        </ToggleButton>
                        <ToggleButton
                          active={form.watch('use_custom_bank_salary')}
                          onClick={() => form.setValue('use_custom_bank_salary', true)}
                        >
                          {lang === 'tr' ? 'Özel Tutar' : 'Custom Amount'}
                        </ToggleButton>
                      </div>

                      {form.watch('use_custom_bank_salary') && (
                        <div className="mt-2">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={bankSalaryDisplay}
                            onChange={(e) => {
                              const formatted = formatAmount(e.target.value, lang)
                              setBankSalaryDisplay(formatted)
                              form.setValue('bank_salary_tl', parseAmount(formatted, lang), {
                                shouldValidate: true,
                              })
                            }}
                            placeholder={amountPlaceholder(lang)}
                          />
                        </div>
                      )}

                      {/* Split summary */}
                      {form.watch('salary_tl') > 0 && (
                        <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue/20 bg-blue/5 px-4 py-3">
                          <div className="flex-1 text-center">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-blue/60">
                              {lang === 'tr' ? 'Banka' : 'Bank'}
                            </p>
                            <p className="text-sm font-bold tabular-nums text-blue">
                              {(form.watch('use_custom_bank_salary')
                                ? form.watch('bank_salary_tl') ?? 0
                                : insuredBankAmountTl
                              ).toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              TL
                            </p>
                          </div>
                          <span className="text-black/20">|</span>
                          <div className="flex-1 text-center">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-green/60">
                              {lang === 'tr' ? 'Elden' : 'Cash'}
                            </p>
                            <p className="text-sm font-bold tabular-nums text-green">
                              {Math.max(
                                0,
                                form.watch('salary_tl') -
                                  (form.watch('use_custom_bank_salary')
                                    ? form.watch('bank_salary_tl') ?? 0
                                    : insuredBankAmountTl),
                              ).toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              TL
                            </p>
                          </div>
                        </div>
                      )}

                      <p className="mt-2 text-[11px] text-black/30">
                        {lang === 'tr'
                          ? "Her ayın 5'inde bankaya yatırılacak tutar. Kalan kısım elden ödenecek."
                          : 'Amount to be deposited to bank on the 5th. The rest is paid as cash.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </FormSection>
          </div>
        </div>

        {/* ── Actions bar ── */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.07] bg-bg1 px-5 py-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/hr')}
          >
            <ArrowLeft size={14} weight="bold" />
            {lang === 'tr' ? 'İptal' : 'Cancel'}
          </Button>
          <Button type="submit" variant="filled" size="sm" disabled={isSubmitting}>
            <FloppyDisk size={14} weight="bold" />
            {isSubmitting
              ? lang === 'tr'
                ? 'Kaydediliyor...'
                : 'Saving...'
              : isEdit
                ? lang === 'tr'
                  ? 'Güncelle'
                  : 'Update'
                : lang === 'tr'
                  ? 'Kaydet'
                  : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}
