import { useState, useMemo } from 'react'
import {
  CalendarBlank,
  CheckCircle,
  XCircle,
  Clock,
  MinusCircle,
  CaretLeft,
  CaretRight,
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  EmptyState,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useHrAttendanceQuery,
  useHrMonthlyAttendanceQuery,
  useHrAttendanceMutations,
  type HrEmployee,
  type HrAttendance,
} from '@/hooks/queries/useHrQuery'
import type { HrAttendanceStatus } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function getStatusConfig(status: HrAttendanceStatus | undefined, lang: 'tr' | 'en') {
  const configs: Record<
    HrAttendanceStatus,
    {
      label: string
      labelEn: string
      icon: React.ReactNode
      variant: 'green' | 'red' | 'orange' | 'blue'
    }
  > = {
    present: {
      label: 'Geldi',
      labelEn: 'Present',
      icon: <CheckCircle size={14} weight="fill" className="text-green" />,
      variant: 'green',
    },
    absent: {
      label: 'Gelmedi',
      labelEn: 'Absent',
      icon: <XCircle size={14} weight="fill" className="text-red" />,
      variant: 'red',
    },
    late: {
      label: 'Geç Geldi',
      labelEn: 'Late',
      icon: <Clock size={14} weight="fill" className="text-orange" />,
      variant: 'orange',
    },
    half_day: {
      label: 'Yarım Gün',
      labelEn: 'Half Day',
      icon: <MinusCircle size={14} weight="fill" className="text-blue" />,
      variant: 'blue',
    },
  }
  if (!status) return null
  const cfg = configs[status]
  return { ...cfg, displayLabel: lang === 'tr' ? cfg.label : cfg.labelEn }
}

/* ------------------------------------------------------------------ */
/*  Daily Attendance Row                                                */
/* ------------------------------------------------------------------ */

function AttendanceRow({
  employee,
  record,
  date,
  canManage,
  lang,
}: {
  employee: HrEmployee
  record: HrAttendance | undefined
  date: string
  canManage: boolean
  lang: 'tr' | 'en'
}) {
  const { toast } = useToast()
  const { upsertAttendance } = useHrAttendanceMutations()
  const [localStatus, setLocalStatus] = useState<HrAttendanceStatus | ''>(record?.status ?? '')
  const [checkIn, setCheckIn] = useState(record?.check_in ?? '')
  const [checkOut, setCheckOut] = useState(record?.check_out ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (status: HrAttendanceStatus) => {
    setSaving(true)
    try {
      await upsertAttendance.mutateAsync({
        employee_id: employee.id,
        date,
        status,
        check_in: checkIn || null,
        check_out: checkOut || null,
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
    setLocalStatus(s)
    await handleSave(s)
  }

  const statusCfg = getStatusConfig(localStatus || undefined, lang)

  return (
    <TableRow>
      {/* Employee */}
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
            {employee.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <span className="text-sm font-medium text-black">{employee.full_name}</span>
        </div>
      </TableCell>

      {/* Status selector */}
      <TableCell>
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
      </TableCell>

      {/* Check-in */}
      <TableCell>
        {canManage && localStatus && localStatus !== 'absent' ? (
          <input
            type="time"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            onBlur={() => {
              if (localStatus) void handleSave(localStatus as HrAttendanceStatus)
            }}
            className="h-8 rounded-md border border-black/[0.12] bg-bg1 px-2 text-xs text-black focus:border-brand focus:outline-none dark:border-white/10 dark:bg-bg2 dark:text-white"
          />
        ) : (
          <span className="text-xs text-black/50">{record?.check_in ?? '—'}</span>
        )}
      </TableCell>

      {/* Check-out */}
      <TableCell>
        {canManage && localStatus && localStatus !== 'absent' ? (
          <input
            type="time"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            onBlur={() => {
              if (localStatus) void handleSave(localStatus as HrAttendanceStatus)
            }}
            className="h-8 rounded-md border border-black/[0.12] bg-bg1 px-2 text-xs text-black focus:border-brand focus:outline-none dark:border-white/10 dark:bg-bg2 dark:text-white"
          />
        ) : (
          <span className="text-xs text-black/50">{record?.check_out ?? '—'}</span>
        )}
      </TableCell>

      {/* Badge */}
      <TableCell>
        {statusCfg && <Tag variant={statusCfg.variant}>{statusCfg.displayLabel}</Tag>}
      </TableCell>
    </TableRow>
  )
}

/* ------------------------------------------------------------------ */
/*  Monthly Summary                                                     */
/* ------------------------------------------------------------------ */

function MonthlySummary({
  employees,
  year,
  month,
  lang,
}: {
  employees: HrEmployee[]
  year: number
  month: number
  lang: 'tr' | 'en'
}) {
  const { data: monthlyRecords = [], isLoading } = useHrMonthlyAttendanceQuery(year, month)

  const summary = useMemo(() => {
    return employees.map((emp) => {
      const recs = monthlyRecords.filter((r) => r.employee_id === emp.id)
      return {
        emp,
        present: recs.filter((r) => r.status === 'present').length,
        absent: recs.filter((r) => r.status === 'absent').length,
        late: recs.filter((r) => r.status === 'late').length,
        half_day: recs.filter((r) => r.status === 'half_day').length,
        total: recs.length,
      }
    })
  }, [employees, monthlyRecords])

  const monthNames = {
    tr: [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık',
    ],
    en: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-black/35">
        {monthNames[lang][month - 1]} {year} — {lang === 'tr' ? 'Aylık Özet' : 'Monthly Summary'}
      </p>
      <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
              <TableHead className="text-center text-green">
                {lang === 'tr' ? 'Geldi' : 'Present'}
              </TableHead>
              <TableHead className="text-center text-red">
                {lang === 'tr' ? 'Gelmedi' : 'Absent'}
              </TableHead>
              <TableHead className="text-center text-orange">
                {lang === 'tr' ? 'Geç' : 'Late'}
              </TableHead>
              <TableHead className="text-center text-blue">
                {lang === 'tr' ? 'Yarım' : 'Half'}
              </TableHead>
              <TableHead className="text-center">
                {lang === 'tr' ? 'Kayıtlı Gün' : 'Recorded'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map(({ emp, present, absent, late, half_day, total }) => (
              <TableRow key={emp.id}>
                <TableCell>
                  <span className="text-sm font-medium text-black">{emp.full_name}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-semibold tabular-nums text-green">{present}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-semibold tabular-nums text-red">{absent}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-semibold tabular-nums text-orange">{late}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-semibold tabular-nums text-blue">{half_day}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm tabular-nums text-black/50">{total}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Attendance Tab                                                      */
/* ------------------------------------------------------------------ */

interface AttendanceTabProps {
  employees: HrEmployee[]
  canManage: boolean
  lang: 'tr' | 'en'
}

export function AttendanceTab({ employees, canManage, lang }: AttendanceTabProps) {
  const [selectedDate, setSelectedDate] = useState(todayString())

  const activeEmployees = useMemo(() => employees.filter((e) => e.is_active), [employees])

  const { data: dayRecords = [], isLoading } = useHrAttendanceQuery(selectedDate)

  const recordMap = useMemo(() => {
    const m = new Map<string, HrAttendance>()
    dayRecords.forEach((r) => m.set(r.employee_id, r))
    return m
  }, [dayRecords])

  // Summary nav
  const today = new Date()
  const [summaryYear, setSummaryYear] = useState(today.getFullYear())
  const [summaryMonth, setSummaryMonth] = useState(today.getMonth() + 1)

  const prevMonth = () => {
    if (summaryMonth === 1) {
      setSummaryMonth(12)
      setSummaryYear((y) => y - 1)
    } else setSummaryMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (summaryMonth === 12) {
      setSummaryMonth(1)
      setSummaryYear((y) => y + 1)
    } else setSummaryMonth((m) => m + 1)
  }

  return (
    <div className="space-y-lg">
      {/* Date picker */}
      <div className="flex items-center gap-sm">
        <CalendarBlank size={16} className="text-black/40" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={todayString()}
          className="h-9 rounded-lg border border-black/[0.12] bg-bg1 px-3 text-sm text-black focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 dark:border-white/10 dark:bg-bg2 dark:text-white"
        />
        <Button variant="outline" size="sm" onClick={() => setSelectedDate(todayString())}>
          {lang === 'tr' ? 'Bugün' : 'Today'}
        </Button>
      </div>

      {/* Daily table */}
      {activeEmployees.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title={lang === 'tr' ? 'Aktif çalışan yok' : 'No active employees'}
          description={
            lang === 'tr'
              ? 'Devam takibi için aktif çalışan eklenmeli.'
              : 'Add active employees to track attendance.'
          }
        />
      ) : isLoading ? (
        <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-56">{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
                <TableHead>{lang === 'tr' ? 'Durum' : 'Status'}</TableHead>
                <TableHead>{lang === 'tr' ? 'Giriş' : 'Check-in'}</TableHead>
                <TableHead>{lang === 'tr' ? 'Çıkış' : 'Check-out'}</TableHead>
                <TableHead>{lang === 'tr' ? 'Etiket' : 'Badge'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEmployees.map((emp) => (
                <AttendanceRow
                  key={emp.id}
                  employee={emp}
                  record={recordMap.get(emp.id)}
                  date={selectedDate}
                  canManage={canManage}
                  lang={lang}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Monthly summary */}
      {activeEmployees.length > 0 && (
        <div className="space-y-sm">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
              <CaretLeft size={14} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
              <CaretRight size={14} />
            </Button>
          </div>
          <MonthlySummary
            employees={activeEmployees}
            year={summaryYear}
            month={summaryMonth}
            lang={lang}
          />
        </div>
      )}
    </div>
  )
}
