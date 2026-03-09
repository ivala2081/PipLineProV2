import { useState } from 'react'
import { Briefcase, ProhibitInset, TreePalm } from '@phosphor-icons/react'
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
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useAbsenceWithLeaveMutation, type HrEmployee } from '@/hooks/queries/useHrQuery'
import type { HrLeaveType } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LEAVE_TYPES: {
  value: HrLeaveType
  labelTr: string
  labelEn: string
  icon: React.ReactNode
}[] = [
  {
    value: 'paid',
    labelTr: 'Ücretli İzin',
    labelEn: 'Paid Leave',
    icon: <Briefcase size={14} weight="fill" className="text-green" />,
  },
  {
    value: 'unpaid',
    labelTr: 'Ücretsiz İzin',
    labelEn: 'Unpaid Leave',
    icon: <ProhibitInset size={14} weight="fill" className="text-red" />,
  },
  {
    value: 'annual',
    labelTr: 'Yıllık İzin',
    labelEn: 'Annual Leave',
    icon: <TreePalm size={14} weight="fill" className="text-blue" />,
  },
]

/* ------------------------------------------------------------------ */
/*  Dialog                                                             */
/* ------------------------------------------------------------------ */

interface AbsenceReasonDialogProps {
  open: boolean
  onClose: () => void
  employee: HrEmployee | null
  date: string
  lang: 'tr' | 'en'
}

export function AbsenceReasonDialog({
  open,
  onClose,
  employee,
  date,
  lang,
}: AbsenceReasonDialogProps) {
  const { toast } = useToast()
  const absenceMutation = useAbsenceWithLeaveMutation()
  const [leaveType, setLeaveType] = useState<HrLeaveType>('unpaid')
  const [notes, setNotes] = useState('')

  const formattedDate = date
    ? new Date(date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const handleConfirm = async () => {
    if (!employee) return
    try {
      await absenceMutation.mutateAsync({
        employee_id: employee.id,
        date,
        leave_type: leaveType,
        notes: notes.trim() || null,
      })
      toast({
        title:
          lang === 'tr'
            ? 'Devamsızlık ve izin kaydedildi'
            : 'Absence and leave recorded',
        variant: 'success',
      })
      setLeaveType('unpaid')
      setNotes('')
      onClose()
    } catch {
      toast({
        title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong',
        variant: 'error',
      })
    }
  }

  const handleCancel = () => {
    setLeaveType('unpaid')
    setNotes('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent size="sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {lang === 'tr' ? 'Devamsızlık Nedeni' : 'Absence Reason'}
          </DialogTitle>
          <DialogDescription>
            {lang === 'tr'
              ? 'Gelmeme sebebini seçin. Kayıt otomatik olarak izinlere düşecektir.'
              : 'Select the reason for absence. The record will be automatically added to leaves.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Employee + Date info */}
          <div className="flex items-center justify-between rounded-lg bg-bg2/50 px-3 py-2">
            <span className="text-sm font-medium text-black">
              {employee?.full_name}
            </span>
            <span className="text-xs tabular-nums text-black/50">
              {formattedDate}
            </span>
          </div>

          {/* Leave Type */}
          <div className="space-y-1.5">
            <Label>{lang === 'tr' ? 'İzin Tipi' : 'Leave Type'}</Label>
            <Select
              value={leaveType}
              onValueChange={(v) => setLeaveType(v as HrLeaveType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>
                    <div className="flex items-center gap-2">
                      {lt.icon}
                      {lang === 'tr' ? lt.labelTr : lt.labelEn}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{lang === 'tr' ? 'Not' : 'Notes'}</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={
                lang === 'tr' ? 'İsteğe bağlı not...' : 'Optional note...'
              }
              className="w-full rounded-md bg-bg2/75 px-3 py-2 text-sm text-black inset-ring inset-ring-black/15 focus:outline-none focus:ring-4 focus:ring-brand/20 focus:inset-ring-brand/55"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={absenceMutation.isPending}
            >
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="filled"
              onClick={() => void handleConfirm()}
              disabled={absenceMutation.isPending}
            >
              {absenceMutation.isPending
                ? lang === 'tr'
                  ? 'Kaydediliyor...'
                  : 'Saving...'
                : lang === 'tr'
                  ? 'Kaydet'
                  : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
