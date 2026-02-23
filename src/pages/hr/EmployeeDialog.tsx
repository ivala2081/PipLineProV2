import { useEffect, useState } from 'react'
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
import { useHrMutations, HR_EMPLOYEE_ROLES, type HrEmployee } from '@/hooks/queries/useHrQuery'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'

/* ------------------------------------------------------------------ */
/*  Form schema                                                         */
/* ------------------------------------------------------------------ */

const employeeSchema = z.object({
  full_name: z.string().min(2, 'En az 2 karakter olmalı'),
  email: z.string().email('Geçerli bir e-posta girin'),
  role: z.enum([
    'Manager',
    'Marketing',
    'Operation',
    'Re-attention',
    'Project Management',
    'Social Media',
    'Sales Development',
    'Programmer',
  ]),
  salary_tl: z.coerce.number().min(0, 'Maaş negatif olamaz'),
  is_insured: z.boolean(),
  is_active: z.boolean(),
  hire_date: z.string().optional(),
  notes: z.string().optional(),
})

type EmployeeFormValues = z.infer<typeof employeeSchema>

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

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'Operation',
      salary_tl: 0,
      is_insured: true,
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
          is_insured: employee.is_insured ?? true,
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
          is_insured: true,
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
        is_insured: data.is_insured,
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

              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Maaş (₺)' : 'Salary (₺)'}
                </Label>
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
                    {HR_EMPLOYEE_ROLES.map((r) => (
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

              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Sigorta Durumu' : 'Insurance Status'}
                </Label>
                <Select
                  value={form.watch('is_insured') ? 'insured' : 'uninsured'}
                  onValueChange={(v) => form.setValue('is_insured', v === 'insured')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insured">
                      {lang === 'tr' ? 'Sigortalı' : 'Insured'}
                    </SelectItem>
                    <SelectItem value="uninsured">
                      {lang === 'tr'
                        ? 'Sigortasız (+4.000 ₺ ek ücret)'
                        : 'Uninsured (+₺4,000 supplement)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
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
