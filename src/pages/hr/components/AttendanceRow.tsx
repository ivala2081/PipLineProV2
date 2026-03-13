/**
 * AttendanceRow — A single employee row in the daily attendance table.
 *
 * Extracted from AttendanceTab.tsx (Phase 2 refactoring).
 */
import { useState } from 'react'
import { ShieldCheck } from '@phosphor-icons/react'
import {
  Tag,
  TableRow,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useHrAttendanceMutations,
  type HrEmployee,
  type HrAttendance,
  type HrSettings,
} from '@/hooks/queries/useHrQuery'
import type { HrAttendanceStatus } from '@/lib/database.types'
import { calculateLateHours, fmtTime, getStatusConfig } from '../utils/attendanceHelpers'

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface AttendanceRowProps {
  employee: HrEmployee
  record: HrAttendance | undefined
  date: string
  canManage: boolean
  lang: 'tr' | 'en'
  settings: HrSettings
  onAbsentSelected: (employee: HrEmployee) => void
  selected?: boolean
  onToggleSelect?: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function AttendanceRow({
  employee,
  record,
  date,
  canManage,
  lang,
  settings,
  onAbsentSelected,
  selected,
  onToggleSelect,
}: AttendanceRowProps) {
  const { toast } = useToast()
  const { upsertAttendance } = useHrAttendanceMutations()
  const [localStatus, setLocalStatus] = useState<HrAttendanceStatus | ''>(record?.status ?? '')
  const [checkIn, setCheckIn] = useState(record?.check_in ?? '')
  const [editingCheckIn, setEditingCheckIn] = useState(!record?.check_in)
  const [absentHours, setAbsentHours] = useState<number>(record?.absent_hours ?? 0)
  const [exempt, setExempt] = useState(record?.deduction_exempt ?? false)
  const [saving, setSaving] = useState(false)

  const handleSave = async (
    status: HrAttendanceStatus,
    hours?: number | null,
    overrideExempt?: boolean,
    overrideCheckIn?: string | null,
  ) => {
    setSaving(true)
    try {
      await upsertAttendance.mutateAsync({
        employee_id: employee.id,
        date,
        status,
        check_in: overrideCheckIn !== undefined ? overrideCheckIn : checkIn || null,
        check_out: settings.standard_check_out,
        absent_hours: hours !== undefined ? hours : absentHours || null,
        deduction_exempt: overrideExempt ?? exempt,
      })
      toast({ title: lang === 'tr' ? 'Kaydedildi' : 'Saved', variant: 'success' })
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (val: string) => {
    const s = val as HrAttendanceStatus
    if (s === 'absent') {
      // Don't save directly — open the AbsenceReasonDialog via parent
      onAbsentSelected(employee)
      return
    }
    setLocalStatus(s)
    if (s === 'half_day') {
      setAbsentHours(0)
      await handleSave(s, null)
    } else {
      await handleSave(s, absentHours || null)
    }
  }

  /** Auto-detect late status when check-in time is confirmed */
  const handleCheckInBlur = async () => {
    if (!checkIn) return
    setEditingCheckIn(false)
    const lateHours = calculateLateHours(checkIn, settings.standard_check_in)
    if (lateHours > 0) {
      setLocalStatus('late')
      setAbsentHours(lateHours)
      await handleSave('late', lateHours)
    } else {
      setLocalStatus('present')
      setAbsentHours(0)
      await handleSave('present', null)
    }
  }

  const handleToggleExempt = async () => {
    if (!localStatus) return
    const newExempt = !exempt
    setExempt(newExempt)
    await handleSave(localStatus as HrAttendanceStatus, undefined, newExempt)
  }

  const statusCfg = getStatusConfig(localStatus || undefined, lang)
  const hasDeduction = ['absent', 'half_day'].includes(localStatus as string) || absentHours > 0
  const showExemptBtn = canManage && localStatus && hasDeduction

  return (
    <TableRow className={selected ? 'bg-brand/[0.03]' : ''}>
      {/* Checkbox */}
      {canManage && (
        <TableCell>
          <input
            type="checkbox"
            className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
            checked={selected ?? false}
            onChange={onToggleSelect}
          />
        </TableCell>
      )}
      {/* Employee */}
      <TableCell data-label="Employee">
        <span className="text-sm font-medium text-black">{employee.full_name}</span>
      </TableCell>

      {/* Eksik Saat (Missing Hours) — read-only, auto-calculated */}
      <TableCell data-label="Missing Hrs">
        <div className="flex h-8 items-center gap-1">
          {absentHours > 0 ? (
            <span className="inline-flex h-8 w-16 items-center justify-center rounded-md bg-bg2/40 text-xs font-medium tabular-nums text-purple">
              {absentHours} {lang === 'tr' ? 'sa' : 'h'}
            </span>
          ) : (
            <span className="inline-flex h-8 w-16 items-center justify-center rounded-md bg-bg2/40 text-xs text-black/15">
              —
            </span>
          )}
        </div>
      </TableCell>

      {/* Check-in — fixed height */}
      <TableCell data-label="Check-in">
        <div className="flex h-8 items-center">
          {canManage && localStatus && localStatus !== 'absent' && localStatus !== 'half_day' ? (
            editingCheckIn || !checkIn ? (
              <input
                type="time"
                value={checkIn}
                autoFocus={editingCheckIn}
                onChange={(e) => setCheckIn(e.target.value)}
                onBlur={() => void handleCheckInBlur()}
                className="h-8 w-full rounded-md bg-bg2/75 px-2 text-xs text-black inset-ring inset-ring-black/15 focus:outline-none focus:ring-4 focus:ring-brand/20 focus:inset-ring-brand/55"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingCheckIn(true)}
                className="h-8 w-full rounded-md bg-bg2/75 px-2 text-left text-xs font-medium tabular-nums text-black/70 inset-ring inset-ring-black/15 hover:bg-bg2/90"
              >
                {fmtTime(checkIn)}
              </button>
            )
          ) : (
            <span className="inline-flex h-8 w-full items-center rounded-md bg-bg2/40 px-2 text-xs text-black/15">
              {record?.check_in ? fmtTime(record.check_in) : '—'}
            </span>
          )}
        </div>
      </TableCell>

      {/* Check-out (read-only, standard time) — fixed height */}
      <TableCell data-label="Check-out">
        <div className="flex h-8 items-center">
          <span className="inline-flex h-8 items-center rounded-md bg-bg2/40 px-2 text-xs tabular-nums text-black/50">
            {fmtTime(record?.check_out) !== '—'
              ? fmtTime(record?.check_out)
              : fmtTime(settings.standard_check_out)}
          </span>
        </div>
      </TableCell>

      {/* Status selector */}
      <TableCell data-label="Status">
        <div className="flex h-8 items-center">
          {canManage ? (
            <Select
              value={localStatus}
              onValueChange={(v) => void handleStatusChange(v)}
              disabled={saving}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder={lang === 'tr' ? 'Seç...' : 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">{lang === 'tr' ? 'Geldi' : 'Present'}</SelectItem>
                <SelectItem value="absent">{lang === 'tr' ? 'Gelmedi' : 'Absent'}</SelectItem>
                <SelectItem value="late">{lang === 'tr' ? 'Geç Geldi' : 'Late'}</SelectItem>
                <SelectItem value="half_day">{lang === 'tr' ? 'Yarım Gün' : 'Half Day'}</SelectItem>
              </SelectContent>
            </Select>
          ) : statusCfg ? (
            <div className="flex items-center gap-1.5">
              {statusCfg.icon}
              <span className="text-xs">{statusCfg.displayLabel}</span>
            </div>
          ) : (
            <span className="text-xs text-black/30">—</span>
          )}
        </div>
      </TableCell>

      {/* Badge + Exempt */}
      <TableCell data-label="Badge">
        <div className="flex items-center gap-1.5">
          {statusCfg && <Tag variant={statusCfg.variant}>{statusCfg.displayLabel}</Tag>}
          {(record?.absent_hours ?? absentHours) > 0 && (
            <Tag variant="purple">
              {record?.absent_hours ?? absentHours} {lang === 'tr' ? 'sa eksik' : 'h missing'}
            </Tag>
          )}
          {exempt && (
            <Tag variant="green">
              <ShieldCheck size={12} weight="fill" className="mr-0.5" />
              {lang === 'tr' ? 'İstisna' : 'Exempt'}
            </Tag>
          )}
        </div>
      </TableCell>

      {/* Exempt toggle */}
      <TableCell data-label="Exempt">
        {showExemptBtn ? (
          <button
            onClick={() => void handleToggleExempt()}
            disabled={saving}
            title={
              exempt
                ? lang === 'tr'
                  ? 'Kesinti istisnasını kaldır'
                  : 'Remove deduction exemption'
                : lang === 'tr'
                  ? 'Kesintiden muaf tut'
                  : 'Exempt from deduction'
            }
            className={`rounded-md p-1.5 transition-colors ${
              exempt
                ? 'bg-green/10 text-green hover:bg-green/20'
                : 'text-black/25 hover:bg-black/5 hover:text-black/50'
            }`}
          >
            <ShieldCheck size={16} weight={exempt ? 'fill' : 'regular'} />
          </button>
        ) : (
          <span className="text-xs text-black/15">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
