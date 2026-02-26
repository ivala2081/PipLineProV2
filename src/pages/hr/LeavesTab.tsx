import { useState, useMemo } from 'react'
import {
  CalendarBlank,
  Plus,
  Trash,
  PencilSimple,
  CaretLeft,
  CaretRight,
  Briefcase,
  TreePalm,
  ProhibitInset,
  ChatText,
} from '@phosphor-icons/react'
import {
  Button,
  Tag,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useHrLeavesQuery,
  useHrLeaveMutations,
  type HrEmployee,
  type HrLeave,
} from '@/hooks/queries/useHrQuery'
import type { HrLeaveType } from '@/lib/database.types'
import { LeaveDialog } from './LeaveDialog'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function getLeaveTypeConfig(type: HrLeaveType, lang: 'tr' | 'en') {
  const configs: Record<
    HrLeaveType,
    { label: string; icon: React.ReactNode; variant: 'green' | 'red' | 'blue' }
  > = {
    paid: {
      label: lang === 'tr' ? 'Ücretli İzin' : 'Paid Leave',
      icon: <Briefcase size={14} weight="fill" className="text-green" />,
      variant: 'green',
    },
    unpaid: {
      label: lang === 'tr' ? 'Ücretsiz İzin' : 'Unpaid Leave',
      icon: <ProhibitInset size={14} weight="fill" className="text-red" />,
      variant: 'red',
    },
    annual: {
      label: lang === 'tr' ? 'Yıllık İzin' : 'Annual Leave',
      icon: <TreePalm size={14} weight="fill" className="text-blue" />,
      variant: 'blue',
    },
  }
  return configs[type]
}

function formatDate(dateStr: string, lang: 'tr' | 'en') {
  return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function dayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface LeavesTabProps {
  employees: HrEmployee[]
  canManage: boolean
  lang: 'tr' | 'en'
}

export function LeavesTab({ employees, canManage, lang }: LeavesTabProps) {
  const { toast } = useToast()
  const { data: leaves = [], isLoading } = useHrLeavesQuery()
  const { deleteLeave } = useHrLeaveMutations()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HrLeave | null>(null)
  const [noteLeave, setNoteLeave] = useState<HrLeave | null>(null)

  // Period filter
  const today = new Date()
  const [filterYear, setFilterYear] = useState(today.getFullYear())
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1)
  const monthNames = lang === 'tr' ? MONTH_NAMES_TR : MONTH_NAMES_EN

  const prevMonth = () => {
    if (filterMonth === 1) {
      setFilterMonth(12)
      setFilterYear((y) => y - 1)
    } else setFilterMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (filterMonth === 12) {
      setFilterMonth(1)
      setFilterYear((y) => y + 1)
    } else setFilterMonth((m) => m + 1)
  }

  // Employee map for quick lookup
  const empMap = useMemo(() => {
    const m = new Map<string, HrEmployee>()
    employees.forEach((e) => m.set(e.id, e))
    return m
  }, [employees])

  // Filter leaves that overlap with selected month
  const filteredLeaves = useMemo(() => {
    const monthStart = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`
    const lastDay = new Date(filterYear, filterMonth, 0).getDate()
    const monthEnd = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return leaves.filter((l) => l.start_date <= monthEnd && l.end_date >= monthStart)
  }, [leaves, filterYear, filterMonth])

  const handleDelete = async (id: string) => {
    try {
      await deleteLeave.mutateAsync(id)
      toast({
        title: lang === 'tr' ? 'İzin silindi' : 'Leave deleted',
        variant: 'success',
      })
    } catch {
      toast({
        title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong',
        variant: 'error',
      })
    }
  }

  const handleEdit = (leave: HrLeave) => {
    setEditTarget(leave)
    setDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-lg">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
            <CaretLeft size={14} />
          </Button>
          <span className="min-w-[120px] text-center text-sm font-medium text-black">
            {monthNames[filterMonth - 1]} {filterYear}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
            <CaretRight size={14} />
          </Button>
        </div>

        {canManage && (
          <Button variant="filled" onClick={handleAddNew}>
            <Plus size={16} weight="bold" />
            {lang === 'tr' ? 'İzin Ekle' : 'Add Leave'}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredLeaves.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title={lang === 'tr' ? 'Bu dönemde izin kaydı yok' : 'No leave records for this period'}
          description={
            canManage
              ? lang === 'tr'
                ? 'İzin eklemek için yukarıdaki butona tıklayın.'
                : 'Click the button above to add leave.'
              : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
                <TableHead>{lang === 'tr' ? 'İzin Tipi' : 'Leave Type'}</TableHead>
                <TableHead>{lang === 'tr' ? 'Başlangıç' : 'Start'}</TableHead>
                <TableHead>{lang === 'tr' ? 'Bitiş' : 'End'}</TableHead>
                <TableHead className="text-center">{lang === 'tr' ? 'Gün' : 'Days'}</TableHead>
                {canManage && <TableHead className="w-28" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.map((leave) => {
                const emp = empMap.get(leave.employee_id)
                const cfg = getLeaveTypeConfig(leave.leave_type, lang)
                const days = dayCount(leave.start_date, leave.end_date)
                return (
                  <TableRow key={leave.id} className="group">
                    <TableCell>
                      <span className="text-sm font-medium text-black">
                        {emp?.full_name ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {cfg.icon}
                        <Tag variant={cfg.variant}>{cfg.label}</Tag>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums text-black/70">
                        {formatDate(leave.start_date, lang)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums text-black/70">
                        {formatDate(leave.end_date, lang)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-semibold tabular-nums text-black">
                        {days}
                      </span>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100">
                          {leave.notes && (
                            <button
                              onClick={() => setNoteLeave(leave)}
                              className="rounded-md p-1.5 text-black/25 transition-colors hover:bg-black/5 hover:text-black/50"
                              title={lang === 'tr' ? 'Notu Gör' : 'View Note'}
                            >
                              <ChatText size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(leave)}
                            className="rounded-md p-1.5 text-black/25 transition-colors hover:bg-black/5 hover:text-black/50"
                            title={lang === 'tr' ? 'Düzenle' : 'Edit'}
                          >
                            <PencilSimple size={15} />
                          </button>
                          <button
                            onClick={() => void handleDelete(leave.id)}
                            disabled={deleteLeave.isPending}
                            className="rounded-md p-1.5 text-black/25 transition-colors hover:bg-red/10 hover:text-red"
                            title={lang === 'tr' ? 'Sil' : 'Delete'}
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Leave create/edit dialog */}
      <LeaveDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditTarget(null)
        }}
        employees={employees}
        lang={lang}
        editLeave={editTarget}
      />

      {/* Notes popup */}
      <Dialog open={!!noteLeave} onOpenChange={(v) => !v && setNoteLeave(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{lang === 'tr' ? 'İzin Notu' : 'Leave Note'}</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm text-black/70">
            {noteLeave?.notes}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
