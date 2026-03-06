import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { UserCircle } from '@phosphor-icons/react'
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
  Separator,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useHrMutations, useHrSettingsQuery, HR_EMPLOYEE_ROLES, type HrEmployee } from '@/hooks/queries/useHrQuery'
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
    is_active: z.boolean(),
    hire_date: z.string().optional(),
    notes: z.string().optional(),
  })
}

type EmployeeFormValues = z.infer<ReturnType<typeof buildEmployeeSchema>>

/* ------------------------------------------------------------------ */
/*  Employee Dialog                                                     */
/* ------------------------------------------------------------------ */

interface EmployeeDialogProps {
  open: boolean
  onClose: () => void
  employee: HrEmployee | null
}

export function EmployeeDialog({ open, onClose, employee }: EmployeeDialogProps) {
  const { i18n } = useTranslation('pages')
  const { toast } = useToast()
  const lang = i18n.language === 'tr' ? 'tr' : 'en'
  const isEdit = !!employee
  const [salaryDisplay, setSalaryDisplay] = useState('')

  const { createEmployee, updateEmployee } = useHrMutations()
  const { data: hrSettings } = useHrSettingsQuery()
  const settingsRoles = hrSettings?.roles ?? HR_EMPLOYEE_ROLES

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
      is_active: true,
      hire_date: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (employee) {
        form.reset({
          full_name: employee.full_name,
          email: employee.email,
          role: employee.role,
          salary_tl: employee.salary_tl ?? 0,
          salary_currency: employee.salary_currency ?? 'TL',
          is_insured: employee.is_insured ?? true,
          receives_supplement: employee.receives_supplement ?? false,
          is_active: employee.is_active,
          hire_date: employee.hire_date ?? '',
          notes: employee.notes ?? '',
        })
        setSalaryDisplay(numberToDisplay(employee.salary_tl ?? 0, lang))
      } else {
        form.reset({
          full_name: '',
          email: '',
          role: 'Operation',
          salary_tl: 0,
          salary_currency: 'TL' as const,
          is_insured: true,
          receives_supplement: false,
          is_active: true,
          hire_date: '',
          notes: '',
        })
        setSalaryDisplay('')
      }
    }
  }, [open, employee, form, lang])

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
        is_active: data.is_active,
        hire_date: data.hire_date || null,
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
      onClose()
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  })

  const isSubmitting = createEmployee.isPending || updateEmployee.isPending
  const compactError = 'mt-1 text-xs text-red'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserCircle size={20} className="text-brand" weight="duotone" />
            {isEdit
              ? lang === 'tr'
                ? 'Çalışanı Düzenle'
                : 'Edit Employee'
              : lang === 'tr'
                ? 'Yeni Çalışan Ekle'
                : 'Add New Employee'}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/55">
            {lang === 'tr' ? 'Çalışan bilgilerini doldurun.' : 'Fill in employee details.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-lg"
        >
          {/* ── Personal Info ── */}
          <div className="space-y-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-black/35">
              {lang === 'tr' ? 'Kişisel Bilgiler' : 'Personal Information'}
            </p>

            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
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
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'E-posta' : 'Email'}
                </Label>
                <Input type="email" {...form.register('email')} placeholder="ornek@sirket.com" />
                {form.formState.errors.email && (
                  <p className={compactError}>{form.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'İşe Giriş Tarihi' : 'Hire Date'}
                </Label>
                <Input type="date" {...form.register('hire_date')} />
              </div>

              <div className="sm:col-span-2 space-y-sm">
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Maaş' : 'Salary'}
                </Label>

                {/* Currency selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => form.setValue('salary_currency', 'TL')}
                    className={`rounded-lg border px-3 py-2 text-center transition-colors ${
                      form.watch('salary_currency') === 'TL'
                        ? 'border-brand/40 bg-brand/5 text-black'
                        : 'border-black/[0.09] bg-bg1 text-black/70'
                    }`}
                  >
                    <span className="text-xs font-medium">₺ Türk Lirası (TL)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue('salary_currency', 'USD')}
                    className={`rounded-lg border px-3 py-2 text-center transition-colors ${
                      form.watch('salary_currency') === 'USD'
                        ? 'border-brand/40 bg-brand/5 text-black'
                        : 'border-black/[0.09] bg-bg1 text-black/70'
                    }`}
                  >
                    <span className="text-xs font-medium">$ Amerikan Doları (USD)</span>
                  </button>
                </div>

                {/* Amount input */}
                <Input
                  type="text"
                  inputMode="decimal"
                  value={salaryDisplay}
                  onChange={(e) => {
                    const formatted = formatAmount(e.target.value, lang)
                    setSalaryDisplay(formatted)
                    form.setValue('salary_tl', parseAmount(formatted, lang), { shouldValidate: true })
                  }}
                  placeholder={amountPlaceholder(lang)}
                />
                {form.formState.errors.salary_tl && (
                  <p className={compactError}>{form.formState.errors.salary_tl.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Role, Status & Insurance ── */}
          <div className="space-y-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-black/35">
              {lang === 'tr' ? 'Rol & Durum' : 'Role & Status'}
            </p>

            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Rol' : 'Role'}
                </Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(v) => form.setValue('role', v as EmployeeFormValues['role'])}
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
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Çalışma Durumu' : 'Employment Status'}
                </Label>
                <Select
                  value={form.watch('is_active') ? 'active' : 'inactive'}
                  onValueChange={(v) => form.setValue('is_active', v === 'active')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{lang === 'tr' ? 'Aktif' : 'Active'}</SelectItem>
                    <SelectItem value="inactive">{lang === 'tr' ? 'Pasif' : 'Inactive'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Sigorta Durumu' : 'Insurance Status'}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Insured button — col 1 */}
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue('is_insured', true)
                      form.setValue('receives_supplement', false)
                    }}
                    className={`rounded-lg border px-3 py-2 text-center transition-colors ${
                      form.watch('is_insured')
                        ? 'border-brand/40 bg-brand/5 text-black'
                        : 'border-black/[0.09] bg-bg1 text-black/70'
                    }`}
                  >
                    <span className="text-xs font-medium">
                      {lang === 'tr' ? 'Sigortalı' : 'Insured'}
                    </span>
                  </button>

                  {/* Uninsured button — col 2 */}
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue('is_insured', false)
                      form.setValue('receives_supplement', false)
                    }}
                    className={`rounded-lg border px-3 py-2 text-center transition-colors ${
                      !form.watch('is_insured')
                        ? 'border-brand/40 bg-brand/5 text-black'
                        : 'border-black/[0.09] bg-bg1 text-black/70'
                    }`}
                  >
                    <span className="text-xs font-medium">
                      {lang === 'tr' ? 'Sigortasız' : 'Uninsured'}
                    </span>
                  </button>

                  {/* Supplement toggle — full width when uninsured */}
                  {!form.watch('is_insured') && (
                    <button
                      type="button"
                      onClick={() =>
                        form.setValue('receives_supplement', !form.watch('receives_supplement'))
                      }
                      className={`col-span-2 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                        form.watch('receives_supplement')
                          ? 'border-orange/40 bg-orange/5'
                          : 'border-black/[0.09] bg-bg1'
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
                            form.watch('receives_supplement') ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                {lang === 'tr' ? 'Notlar (İsteğe bağlı)' : 'Notes (Optional)'}
              </Label>
              <textarea
                {...form.register('notes')}
                rows={2}
                placeholder={
                  lang === 'tr' ? 'Çalışan hakkında notlar...' : 'Notes about the employee...'
                }
                className="w-full resize-none rounded-lg border border-black/[0.12] bg-bg1 px-3 py-2 text-sm text-black placeholder:text-black/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 dark:border-white/10 dark:bg-bg2 dark:text-white"
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button type="submit" variant="filled" size="sm" disabled={isSubmitting}>
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
      </DialogContent>
    </Dialog>
  )
}
