import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DatePickerField,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useHrLeaveMutations, type HrEmployee, type HrLeave } from '@/hooks/queries/useHrQuery'
import type { HrLeaveType } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Schema                                                              */
/* ------------------------------------------------------------------ */

const leaveSchema = z
  .object({
    employee_id: z.string().min(1, 'Çalışan seçilmeli'),
    leave_type: z.enum(['paid', 'unpaid', 'annual']),
    start_date: z.string().min(1, 'Başlangıç tarihi gerekli'),
    end_date: z.string().min(1, 'Bitiş tarihi gerekli'),
    notes: z.string().optional(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: 'Bitiş tarihi başlangıçtan önce olamaz',
    path: ['end_date'],
  })

type LeaveFormValues = z.infer<typeof leaveSchema>

const LEAVE_TYPES: { value: HrLeaveType; labelTr: string; labelEn: string }[] = [
  { value: 'paid', labelTr: 'Ücretli İzin', labelEn: 'Paid Leave' },
  { value: 'unpaid', labelTr: 'Ücretsiz İzin', labelEn: 'Unpaid Leave' },
  { value: 'annual', labelTr: 'Yıllık İzin', labelEn: 'Annual Leave' },
]

/* ------------------------------------------------------------------ */
/*  Dialog                                                              */
/* ------------------------------------------------------------------ */

interface LeaveDialogProps {
  open: boolean
  onClose: () => void
  employees: HrEmployee[]
  lang: 'tr' | 'en'
  editLeave?: HrLeave | null
}

export function LeaveDialog({ open, onClose, employees, lang, editLeave }: LeaveDialogProps) {
  const { toast } = useToast()
  const { createLeave, updateLeave } = useHrLeaveMutations()
  const activeEmployees = employees.filter((e) => e.is_active)
  const isEdit = !!editLeave
  const saving = createLeave.isPending || updateLeave.isPending

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      employee_id: '',
      leave_type: 'paid',
      start_date: '',
      end_date: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (editLeave) {
        form.reset({
          employee_id: editLeave.employee_id,
          leave_type: editLeave.leave_type,
          start_date: editLeave.start_date,
          end_date: editLeave.end_date,
          notes: editLeave.notes ?? '',
        })
      } else {
        form.reset({
          employee_id: '',
          leave_type: 'paid',
          start_date: '',
          end_date: '',
          notes: '',
        })
      }
    }
  }, [open, editLeave, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const payload = {
        employee_id: data.employee_id,
        leave_type: data.leave_type as HrLeaveType,
        start_date: data.start_date,
        end_date: data.end_date,
        notes: data.notes?.trim() || null,
      }

      if (isEdit && editLeave) {
        await updateLeave.mutateAsync({ id: editLeave.id, payload })
      } else {
        await createLeave.mutateAsync(payload)
      }

      toast({
        title: lang === 'tr' ? 'İzin kaydedildi' : 'Leave saved',
        variant: 'success',
      })
      onClose()
    } catch {
      toast({
        title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong',
        variant: 'error',
      })
    }
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? lang === 'tr'
                ? 'İzni Düzenle'
                : 'Edit Leave'
              : lang === 'tr'
                ? 'İzin Ekle'
                : 'Add Leave'}
          </DialogTitle>
          <DialogDescription>
            {lang === 'tr'
              ? 'Çalışana izin tanımlayın. Ücretsiz izin günleri maaştan kesilir.'
              : 'Assign leave to an employee. Unpaid leave days are deducted from salary.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Employee */}
          <div className="space-y-1.5">
            <Label>{lang === 'tr' ? 'Çalışan' : 'Employee'}</Label>
            <Select
              value={form.watch('employee_id')}
              onValueChange={(v) => form.setValue('employee_id', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={lang === 'tr' ? 'Çalışan seç...' : 'Select employee...'}
                />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.employee_id && (
              <p className="text-xs text-red">{form.formState.errors.employee_id.message}</p>
            )}
          </div>

          {/* Leave Type */}
          <div className="space-y-1.5">
            <Label>{lang === 'tr' ? 'İzin Tipi' : 'Leave Type'}</Label>
            <Select
              value={form.watch('leave_type')}
              onValueChange={(v) =>
                form.setValue('leave_type', v as HrLeaveType, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>
                    {lang === 'tr' ? lt.labelTr : lt.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range — DatePickerField with calendar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{lang === 'tr' ? 'Başlangıç' : 'Start Date'}</Label>
              <Controller
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={lang === 'tr' ? 'Tarih seç...' : 'Pick date...'}
                    inputSize="sm"
                  />
                )}
              />
              {form.formState.errors.start_date && (
                <p className="text-xs text-red">{form.formState.errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{lang === 'tr' ? 'Bitiş' : 'End Date'}</Label>
              <Controller
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={lang === 'tr' ? 'Tarih seç...' : 'Pick date...'}
                    inputSize="sm"
                  />
                )}
              />
              {form.formState.errors.end_date && (
                <p className="text-xs text-red">{form.formState.errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{lang === 'tr' ? 'Not' : 'Notes'}</Label>
            <textarea
              {...form.register('notes')}
              rows={2}
              placeholder={lang === 'tr' ? 'İsteğe bağlı not...' : 'Optional note...'}
              className="w-full rounded-md bg-bg2/75 px-3 py-2 text-sm text-black inset-ring inset-ring-black/15 focus:outline-none focus:ring-4 focus:ring-brand/20 focus:inset-ring-brand/55"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button type="submit" variant="filled" disabled={saving}>
              {saving
                ? lang === 'tr'
                  ? 'Kaydediliyor...'
                  : 'Saving...'
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
