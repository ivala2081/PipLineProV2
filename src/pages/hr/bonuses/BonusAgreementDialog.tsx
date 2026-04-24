import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Handshake, Info } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  DatePickerField,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useBonusMutations,
  type HrBonusAgreement,
  type HrEmployee,
} from '@/hooks/queries/useHrQuery'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'

const agreementSchema = z.object({
  employee_id: z.string().min(1, 'Çalışan seçin'),
  title: z.string().min(2, 'Başlık en az 2 karakter'),
  description: z.string().optional(),
  bonus_type: z.enum(['fixed', 'variable', 'percentage', 'tiered', 'custom']),
  fixed_amount: z.coerce.number().min(0).default(0),
  percentage_rate: z.coerce.number().min(0).max(100).default(0),
  percentage_base: z.string().optional(),
  is_active: z.boolean(),
  effective_from: z.string().optional(),
})

type AgreementFormValues = z.infer<typeof agreementSchema>

// Bonus types offered in the UI for other departments
type SelectableBonusType = 'fixed' | 'variable'

interface BonusAgreementDialogProps {
  open: boolean
  onClose: () => void
  agreement: HrBonusAgreement | null
  employees: HrEmployee[]
}

export function BonusAgreementDialog({
  open,
  onClose,
  agreement,
  employees,
}: BonusAgreementDialogProps) {
  const { i18n } = useTranslation('pages')
  const { toast } = useToast()
  const lang = i18n.language === 'tr' ? 'tr' : 'en'
  const isEdit = !!agreement
  const [fixedAmountDisplay, setFixedAmountDisplay] = useState('')

  const { createAgreement, updateAgreement } = useBonusMutations()

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      employee_id: '',
      title: '',
      description: '',
      bonus_type: 'fixed',
      fixed_amount: 0,
      percentage_rate: 0,
      percentage_base: '',
      is_active: true,
      effective_from: '',
    },
  })

  const bonusType = form.watch('bonus_type')

  useEffect(() => {
    if (open) {
      if (agreement) {
        form.reset({
          employee_id: agreement.employee_id,
          title: agreement.title,
          description: agreement.description ?? '',
          bonus_type: agreement.bonus_type as AgreementFormValues['bonus_type'],
          fixed_amount: agreement.fixed_amount,
          percentage_rate: agreement.percentage_rate,
          percentage_base: agreement.percentage_base ?? '',
          is_active: agreement.is_active,
          effective_from: agreement.effective_from ?? '',
        })
        setFixedAmountDisplay(numberToDisplay(agreement.fixed_amount, lang))
      } else {
        form.reset({
          employee_id: '',
          title: '',
          description: '',
          bonus_type: 'fixed',
          fixed_amount: 0,
          percentage_rate: 0,
          percentage_base: '',
          is_active: true,
          effective_from: '',
        })
        setFixedAmountDisplay('')
      }
    }
  }, [open, agreement, form, lang])

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const payload = {
        employee_id: data.employee_id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        bonus_type: data.bonus_type,
        currency: 'USDT',
        fixed_amount: data.bonus_type === 'fixed' ? data.fixed_amount : 0,
        percentage_rate: 0,
        percentage_base: null,
        tier_rules: [] as unknown,
        is_active: data.is_active,
        effective_from: data.effective_from || null,
        effective_until: null,
      }

      if (isEdit && agreement) {
        await updateAgreement.mutateAsync({ id: agreement.id, payload })
        toast({
          title: lang === 'tr' ? 'Anlaşma güncellendi' : 'Agreement updated',
          variant: 'success',
        })
      } else {
        await createAgreement.mutateAsync(payload)
        toast({ title: lang === 'tr' ? 'Anlaşma eklendi' : 'Agreement added', variant: 'success' })
      }
      onClose()
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  })

  const isSubmitting = createAgreement.isPending || updateAgreement.isPending
  const compactError = 'mt-1 text-xs text-red'

  // For the select we only expose the two selectable types; legacy types still render if already set
  const selectableBonusType: SelectableBonusType =
    bonusType === 'fixed' || bonusType === 'variable' ? bonusType : 'fixed'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Handshake size={20} className="text-brand" weight="duotone" />
            {isEdit
              ? lang === 'tr'
                ? 'Anlaşmayı Düzenle'
                : 'Edit Agreement'
              : lang === 'tr'
                ? 'Yeni Prim Anlaşması'
                : 'New Bonus Agreement'}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/55">
            {lang === 'tr'
              ? 'Çalışan için prim anlaşması bilgilerini doldurun. Primler USDT bazlıdır.'
              : 'Fill in bonus agreement details. Bonuses are USDT-based.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-lg"
        >
          {/* Employee & Title */}
          <div className="space-y-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-black/35">
              {lang === 'tr' ? 'Genel Bilgiler' : 'General Information'}
            </p>

            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              {/* Employee */}
              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Çalışan' : 'Employee'}
                </Label>
                <Select
                  value={form.watch('employee_id')}
                  onValueChange={(v) => form.setValue('employee_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={lang === 'tr' ? 'Çalışan seçin' : 'Select employee'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter((e) => e.is_active)
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.employee_id && (
                  <p className={compactError}>{form.formState.errors.employee_id.message}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Anlaşma Başlığı' : 'Agreement Title'}
                </Label>
                <Input
                  {...form.register('title')}
                  placeholder={
                    lang === 'tr' ? 'örn. Aylık Performans Primi' : 'e.g. Monthly Performance Bonus'
                  }
                />
                {form.formState.errors.title && (
                  <p className={compactError}>{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Açıklama (İsteğe bağlı)' : 'Description (Optional)'}
                </Label>
                <textarea
                  {...form.register('description')}
                  rows={2}
                  placeholder={
                    lang === 'tr' ? 'Prim hesaplama detayları...' : 'Bonus calculation details...'
                  }
                  className="w-full resize-none rounded-lg border border-black/[0.12] bg-bg1 px-3 py-2 text-sm text-black placeholder:text-black/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 dark:border-white/10 dark:bg-bg2 dark:text-white"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Bonus Type & Amount */}
          <div className="space-y-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-black/35">
              {lang === 'tr' ? 'Prim Detayları' : 'Bonus Details'}
            </p>

            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              {/* Type */}
              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Prim Türü' : 'Bonus Type'}
                </Label>
                <Select
                  value={selectableBonusType}
                  onValueChange={(v) =>
                    form.setValue('bonus_type', v as AgreementFormValues['bonus_type'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">{lang === 'tr' ? 'Sabit' : 'Fixed'}</SelectItem>
                    <SelectItem value="variable">
                      {lang === 'tr' ? 'Değişken' : 'Variable'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Durum' : 'Status'}
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

              {/* Fixed amount (shown for fixed type) */}
              {(bonusType === 'fixed' ||
                (bonusType !== 'variable' &&
                  bonusType !== 'percentage' &&
                  bonusType !== 'tiered' &&
                  bonusType !== 'custom')) && (
                <div>
                  <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                    {lang === 'tr' ? 'Sabit Tutar (USDT)' : 'Fixed Amount (USDT)'}
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={fixedAmountDisplay}
                    onChange={(e) => {
                      const formatted = formatAmount(e.target.value, lang)
                      setFixedAmountDisplay(formatted)
                      form.setValue('fixed_amount', parseAmount(formatted, lang), {
                        shouldValidate: true,
                      })
                    }}
                    placeholder={amountPlaceholder(lang)}
                  />
                </div>
              )}

              {/* Variable bonus info (shown for variable type) */}
              {bonusType === 'variable' && (
                <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-orange/30 bg-orange/5 px-3 py-2.5 text-xs text-orange">
                  <Info size={14} weight="fill" className="mt-0.5 shrink-0" />
                  <span>
                    {lang === 'tr'
                      ? 'Değişken primde tutar anlaşmaya bağlı değildir. İK, her ay ödeme yapmadan önce o aya ait hakedilen tutarı manuel olarak girmelidir.'
                      : 'Variable bonus amount is not fixed in the agreement. HR must manually enter the earned amount for each month before making a payment.'}
                  </span>
                </div>
              )}

              {/* Effective from date */}
              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Başlangıç Tarihi' : 'Effective From'}
                </Label>
                <Controller
                  control={form.control}
                  name="effective_from"
                  render={({ field }) => (
                    <DatePickerField
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder={lang === 'tr' ? 'Tarih seç...' : 'Pick date...'}
                      inputSize="sm"
                    />
                  )}
                />
              </div>

              {/* Info: agreement ends automatically when employee is deactivated */}
              <div className="flex items-start gap-2 rounded-lg border border-black/[0.08] bg-bg2 px-3 py-2.5 text-xs text-black/50">
                <Info size={14} weight="fill" className="mt-0.5 shrink-0 text-black/30" />
                <span>
                  {lang === 'tr'
                    ? 'Anlaşma bitiş tarihi yoktur. Personel pasife alındığında veya işten çıkarıldığında otomatik sona erer.'
                    : 'No end date. Agreement ends automatically when the employee is deactivated or terminated.'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
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
