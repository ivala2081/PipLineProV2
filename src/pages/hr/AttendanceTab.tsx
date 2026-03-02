import { useState, useMemo, useEffect } from 'react'
import {
  CalendarBlank,
  CheckCircle,
  XCircle,
  Clock,
  MinusCircle,
  CaretLeft,
  CaretRight,
  ShieldCheck,
  MagnifyingGlass,
  SunHorizon,
} from '@phosphor-icons/react'
import {
  Button,
  Input,
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
  DatePicker,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useHrAttendanceQuery,
  useHrMonthlyAttendanceQuery,
  useHrAttendanceMutations,
  useHrSettingsQuery,
  DEFAULT_HR_SETTINGS,
  type HrEmployee,
  type HrAttendance,
  type HrSettings,
} from '@/hooks/queries/useHrQuery'
import type { HrAttendanceStatus } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function todayString() {
  return new Date().toISOString().split('T')[0]
}

/** Compare check-in time vs standard and return how many hours late (0 = on time). */
function calculateLateHours(checkInTime: string, standardCheckIn: string): number {
  const [ciH, ciM] = checkInTime.split(':').map(Number)
  const [stdH, stdM] = standardCheckIn.split(':').map(Number)
  const ciMinutes = ciH * 60 + ciM
  const stdMinutes = stdH * 60 + stdM
  if (ciMinutes <= stdMinutes) return 0
  return Math.ceil((ciMinutes - stdMinutes) / 60)
}

/** Strip seconds from time string: "18:30:00" → "18:30" */
function fmtTime(t: string | null | undefined): string {
  if (!t) return '—'
  return t.slice(0, 5)
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

/** Check if a YYYY-MM-DD date string falls on Saturday (6) or Sunday (0). */
function isWeekendDate(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  return day === 0 || day === 6
}

/* ------------------------------------------------------------------ */
/*  Weekend OFF Row (read-only)                                         */
/* ------------------------------------------------------------------ */

function AttendanceOffRow({ employee }: { employee: HrEmployee; lang: 'tr' | 'en' }) {
  return (
    <TableRow className="opacity-60">
      <TableCell>
        <span className="text-sm font-medium text-black">{employee.full_name}</span>
      </TableCell>
      <TableCell>
        <span className="inline-flex h-8 w-16 items-center justify-center rounded-md bg-bg2/40 text-xs text-black/15">
          —
        </span>
      </TableCell>
      <TableCell>
        <span className="inline-flex h-8 items-center rounded-md bg-bg2/40 px-2 text-xs text-black/15">
          —
        </span>
      </TableCell>
      <TableCell>
        <span className="inline-flex h-8 items-center rounded-md bg-bg2/40 px-2 text-xs text-black/15">
          —
        </span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-black/30">—</span>
      </TableCell>
      <TableCell>
        <Tag variant="cyan">
          <SunHorizon size={12} weight="fill" className="mr-0.5" />
          OFF
        </Tag>
      </TableCell>
      <TableCell>
        <span className="text-xs text-black/15">—</span>
      </TableCell>
    </TableRow>
  )
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
  settings,
}: {
  employee: HrEmployee
  record: HrAttendance | undefined
  date: string
  canManage: boolean
  lang: 'tr' | 'en'
  settings: HrSettings
}) {
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
    setLocalStatus(s)
    if (s === 'absent') {
      setAbsentHours(0)
      setCheckIn('')
      await handleSave(s, null, undefined, null)
    } else if (s === 'half_day') {
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
    <TableRow>
      {/* Employee */}
      <TableCell>
        <span className="text-sm font-medium text-black">{employee.full_name}</span>
      </TableCell>

      {/* Eksik Saat (Missing Hours) — read-only, auto-calculated */}
      <TableCell>
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
      <TableCell>
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
      <TableCell>
        <div className="flex h-8 items-center">
          <span className="inline-flex h-8 items-center rounded-md bg-bg2/40 px-2 text-xs tabular-nums text-black/50">
            {fmtTime(record?.check_out) !== '—'
              ? fmtTime(record?.check_out)
              : fmtTime(settings.standard_check_out)}
          </span>
        </div>
      </TableCell>

      {/* Status selector */}
      <TableCell>
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
      <TableCell>
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
      <TableCell>
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

/* ------------------------------------------------------------------ */
/*  Monthly Summary                                                     */
/* ------------------------------------------------------------------ */

function MonthlySummary({
  employees,
  year,
  month,
  lang,
  search,
  weekendOff,
}: {
  employees: HrEmployee[]
  year: number
  month: number
  lang: 'tr' | 'en'
  search: string
  weekendOff: boolean
}) {
  const [page, setPage] = useState(1)
  const { data: monthlyRecords = [], isLoading } = useHrMonthlyAttendanceQuery(year, month)

  const filteredEmps = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter((e) => e.full_name.toLowerCase().includes(q))
  }, [employees, search])

  const summary = useMemo(() => {
    return filteredEmps.map((emp) => {
      let recs = monthlyRecords.filter((r) => r.employee_id === emp.id)
      if (weekendOff) {
        recs = recs.filter((r) => !isWeekendDate(r.date))
      }
      const totalAbsentHours = recs.reduce((sum, r) => sum + (r.absent_hours ?? 0), 0)
      return {
        emp,
        present: recs.filter((r) => r.status === 'present').length,
        absent: recs.filter((r) => r.status === 'absent').length,
        late: recs.filter((r) => r.status === 'late').length,
        half_day: recs.filter((r) => r.status === 'half_day').length,
        total_absent_hours: totalAbsentHours,
        total: recs.length,
      }
    })
  }, [filteredEmps, monthlyRecords, weekendOff])

  const summaryTotalPages = Math.max(1, Math.ceil(summary.length / PAGE_SIZE))
  const paginatedSummary = useMemo(
    () => summary.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [summary, page],
  )

  // eslint-disable-next-line react-hooks/set-state-in-effect -- pagination reset on search change
  useEffect(() => {
    setPage(1)
  }, [search])

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
    <>
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
              <TableHead className="text-center text-purple">
                {lang === 'tr' ? 'Eksik Saat' : 'Missing Hrs'}
              </TableHead>
              <TableHead className="text-center">
                {lang === 'tr' ? 'Kayıtlı Gün' : 'Recorded'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSummary.map(
              ({ emp, present, absent, late, half_day, total_absent_hours, total }) => (
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
                    {total_absent_hours > 0 ? (
                      <span className="text-sm font-semibold tabular-nums text-purple">
                        {total_absent_hours} {lang === 'tr' ? 'sa' : 'h'}
                      </span>
                    ) : (
                      <span className="text-sm tabular-nums text-black/20">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm tabular-nums text-black/50">{total}</span>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>
      {summaryTotalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-sm">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <CaretLeft size={14} />
          </Button>
          <span className="text-xs tabular-nums text-black/50">
            {page} / {summaryTotalPages}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPage((p) => Math.min(summaryTotalPages, p + 1))}
            disabled={page === summaryTotalPages}
          >
            <CaretRight size={14} />
          </Button>
        </div>
      )}
    </>
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

const PAGE_SIZE = 15

export function AttendanceTab({ employees, canManage, lang }: AttendanceTabProps) {
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [view, setView] = useState<'daily' | 'summary'>('daily')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data: hrSettings } = useHrSettingsQuery()
  const settings = hrSettings ?? DEFAULT_HR_SETTINGS

  const activeEmployees = useMemo(() => employees.filter((e) => e.is_active), [employees])

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return activeEmployees
    const q = search.toLowerCase()
    return activeEmployees.filter((e) => e.full_name.toLowerCase().includes(q))
  }, [activeEmployees, search])

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE))
  const paginatedEmployees = useMemo(
    () => filteredEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredEmployees, page],
  )

  // eslint-disable-next-line react-hooks/set-state-in-effect -- pagination reset on filter change
  useEffect(() => {
    setPage(1)
  }, [search, selectedDate])

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

  /* ---- Monthly Summary Screen ---- */
  if (view === 'summary') {
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
    return (
      <div className="space-y-lg">
        {/* Header row */}
        <div className="flex items-center gap-sm">
          <Button variant="outline" size="sm" onClick={() => setView('daily')}>
            <CaretLeft size={14} className="mr-1" />
            {lang === 'tr' ? 'Geri' : 'Back'}
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
              <CaretLeft size={14} />
            </Button>
            <span className="min-w-[120px] text-center text-sm font-medium text-black">
              {monthNames[lang][summaryMonth - 1]} {summaryYear}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
              <CaretRight size={14} />
            </Button>
          </div>
          <div className="relative min-w-48">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
            />
            <Input
              className="pl-9"
              placeholder={lang === 'tr' ? 'Çalışan ara...' : 'Search employee...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

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
        ) : (
          <MonthlySummary
            employees={activeEmployees}
            year={summaryYear}
            month={summaryMonth}
            lang={lang}
            search={search}
            weekendOff={settings.weekend_off}
          />
        )}
      </div>
    )
  }

  /* ---- Daily Screen (default) ---- */
  return (
    <div className="space-y-lg">
      {/* Date picker + search */}
      <div className="flex items-center gap-sm">
        <DatePicker
          dateFrom={selectedDate}
          dateTo={selectedDate}
          onChange={(from) => {
            if (from) setSelectedDate(from)
          }}
          minWidth="9rem"
        />
        <div className="relative min-w-48">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
          />
          <Input
            className="pl-9"
            placeholder={lang === 'tr' ? 'Çalışan ara...' : 'Search employee...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setView('summary')}>
          {lang === 'tr' ? 'Aylık Özet' : 'Monthly Summary'}
        </Button>
      </div>

      {/* Weekend OFF banner */}
      {settings.weekend_off && isWeekendDate(selectedDate) && (
        <div className="flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/5 px-4 py-3">
          <SunHorizon size={18} weight="duotone" className="shrink-0 text-cyan" />
          <p className="text-sm text-black/60">
            {lang === 'tr'
              ? 'Bu gün hafta sonu — devam takibi yapılmıyor. Tüm çalışanlar otomatik OFF.'
              : 'This is a weekend day — no attendance tracking. All employees are automatically OFF.'}
          </p>
        </div>
      )}

      {/* Daily table */}
      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title={lang === 'tr' ? 'Aktif çalışan yok' : 'No active employees'}
          description={
            lang === 'tr'
              ? 'Devam takibi için aktif çalışan eklenmeli.'
              : 'Add active employees to track attendance.'
          }
        />
      ) : isLoading && !(settings.weekend_off && isWeekendDate(selectedDate)) ? (
        <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[22%]" /> {/* Çalışan */}
                <col className="w-[12%]" /> {/* Eksik Saat */}
                <col className="w-[13%]" /> {/* Giriş */}
                <col className="w-[10%]" /> {/* Çıkış */}
                <col className="w-[15%]" /> {/* Durum */}
                <col className="w-[20%]" /> {/* Etiket */}
                <col className="w-[8%]" /> {/* İstisna */}
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
                  <TableHead>{lang === 'tr' ? 'Eksik Saat' : 'Missing Hrs'}</TableHead>
                  <TableHead>{lang === 'tr' ? 'Giriş' : 'Check-in'}</TableHead>
                  <TableHead>{lang === 'tr' ? 'Çıkış' : 'Check-out'}</TableHead>
                  <TableHead>{lang === 'tr' ? 'Durum' : 'Status'}</TableHead>
                  <TableHead>{lang === 'tr' ? 'Etiket' : 'Badge'}</TableHead>
                  <TableHead className="text-center">
                    {lang === 'tr' ? 'İstisna' : 'Exempt'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.weekend_off && isWeekendDate(selectedDate)
                  ? paginatedEmployees.map((emp) => (
                      <AttendanceOffRow key={emp.id} employee={emp} lang={lang} />
                    ))
                  : paginatedEmployees.map((emp) => (
                      <AttendanceRow
                        key={emp.id}
                        employee={emp}
                        record={recordMap.get(emp.id)}
                        date={selectedDate}
                        canManage={canManage}
                        lang={lang}
                        settings={settings}
                      />
                    ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-sm">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <CaretLeft size={14} />
              </Button>
              <span className="text-xs tabular-nums text-black/50">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <CaretRight size={14} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
