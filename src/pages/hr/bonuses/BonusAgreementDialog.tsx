import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Handshake } from '@phosphor-icons/react'
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
import {
  useBonusMutations,
  type HrBonusAgreement,
  type HrEmployee,
} from '@/hooks/queries/useHrQuery'

const agreementSchema = z.object({
  employee_id: z.string().min(1, 'Çalışan seçin'),
  title: z.string().min(2, 'Başlık en az 2 karakter'),
  description: z.string().optional(),
  bonus_type: z.enum(['fixed', 'percentage', 'tiered', 'custom']),
  fixed_amount: z.coerce.number().min(0).default(0),
  percentage_rate: z.coerce.number().min(0).max(100).default(0),
  percentage_base: z.string().optional(),
  is_active: z.boolean(),
  effective_from: z.string().optional(),
  effective_until: z.string().optional(),
})

type AgreementFormValues = z.infer<typeof agreementSchema>

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
      effective_until: '',
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
          effective_until: agreement.effective_until ?? '',
        })
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
          effective_until: '',
        })
      }
    }
  }, [open, agreement, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const payload = {
        employee_id: data.employee_id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        bonus_type: data.bonus_type,
        currency: 'USDT',
        fixed_amount: data.bonus_type === 'fixed' ? data.fixed_amount : 0,
        percentage_rate: data.bonus_type === 'percentage' ? data.percentage_rate : 0,
        percentage_base:
          data.bonus_type === 'percentage' ? data.percentage_base?.trim() || null : null,
        tier_rules: [] as unknown,
        is_active: data.is_active,
        effective_from: data.effective_from || null,
        effective_until: data.effective_until || null,
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
                  value={form.watch('bonus_type')}
                  onValueChange={(v) =>
                    form.setValue('bonus_type', v as AgreementFormValues['bonus_type'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">
                      {lang === 'tr' ? 'Sabit Tutar' : 'Fixed Amount'}
                    </SelectItem>
                    <SelectItem value="percentage">
                      {lang === 'tr' ? 'Yüzdelik' : 'Percentage'}
                    </SelectItem>
                    <SelectItem value="tiered">{lang === 'tr' ? 'Kademeli' : 'Tiered'}</SelectItem>
                    <SelectItem value="custom">{lang === 'tr' ? 'Özel' : 'Custom'}</SelectItem>
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
              {bonusType === 'fixed' && (
                <div>
                  <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                    {lang === 'tr' ? 'Sabit Tutar (USDT)' : 'Fixed Amount (USDT)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register('fixed_amount')}
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Percentage rate (shown for percentage type) */}
              {bonusType === 'percentage' && (
                <>
                  <div>
                    <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                      {lang === 'tr' ? 'Yüzde Oranı (%)' : 'Percentage Rate (%)'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...form.register('percentage_rate')}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                      {lang === 'tr' ? 'Hesaplama Bazı' : 'Calculation Base'}
                    </Label>
                    <Input
                      {...form.register('percentage_base')}
                      placeholder={
                        lang === 'tr'
                          ? 'örn. Aylık ciro, Yatırım hacmi'
                          : 'e.g. Monthly revenue, Deposit volume'
                      }
                    />
                  </div>
                </>
              )}

              {/* Effective dates */}
              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Başlangıç Tarihi' : 'Effective From'}
                </Label>
                <Input type="date" {...form.register('effective_from')} />
              </div>
              <div>
                <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
                  {lang === 'tr' ? 'Bitiş Tarihi' : 'Effective Until'}
                </Label>
                <Input type="date" {...form.register('effective_until')} />
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
