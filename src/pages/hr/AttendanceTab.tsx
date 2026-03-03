import { useState, useMemo, useEffect } from 'react'
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
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
  EmptyState,
  DatePicker,
} from '@ds'
import {
  useHrAttendanceQuery,
  useHrSettingsQuery,
  DEFAULT_HR_SETTINGS,
  type HrEmployee,
  type HrAttendance,
} from '@/hooks/queries/useHrQuery'
import { todayString, isWeekendDate } from './utils/attendanceHelpers'
import { MONTH_NAMES_TR, MONTH_NAMES_EN } from './utils/hrConstants'
import { AttendanceRow } from './components/AttendanceRow'
import { MonthlySummary } from './components/MonthlySummary'

/* ------------------------------------------------------------------ */
/*  Weekend OFF Row (read-only)                                         */
/* ------------------------------------------------------------------ */

function AttendanceOffRow({ employee }: { employee: HrEmployee; lang: 'tr' | 'en' }) {
  return (
    <TableRow className="opacity-60">
      <TableCell data-label="Employee">
        <span className="text-sm font-medium text-black">{employee.full_name}</span>
      </TableCell>
      <TableCell data-label="Missing Hrs">
        <span className="inline-flex h-8 w-16 items-center justify-center rounded-md bg-bg2/40 text-xs text-black/15">
          —
        </span>
      </TableCell>
      <TableCell data-label="Check-in">
        <span className="inline-flex h-8 items-center rounded-md bg-bg2/40 px-2 text-xs text-black/15">
          —
        </span>
      </TableCell>
      <TableCell data-label="Check-out">
        <span className="inline-flex h-8 items-center rounded-md bg-bg2/40 px-2 text-xs text-black/15">
          —
        </span>
      </TableCell>
      <TableCell data-label="Status">
        <span className="text-xs text-black/30">—</span>
      </TableCell>
      <TableCell data-label="Badge">
        <Tag variant="cyan">
          <SunHorizon size={12} weight="fill" className="mr-0.5" />
          OFF
        </Tag>
      </TableCell>
      <TableCell data-label="Exempt">
        <span className="text-xs text-black/15">—</span>
      </TableCell>
    </TableRow>
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pagination reset on filter change
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
    const monthNames = lang === 'tr' ? MONTH_NAMES_TR : MONTH_NAMES_EN
    return (
      <div className="space-y-lg">
        {/* Header row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-sm">
          <Button variant="outline" size="sm" onClick={() => setView('daily')}>
            <CaretLeft size={14} className="mr-1" />
            {lang === 'tr' ? 'Geri' : 'Back'}
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
              <CaretLeft size={14} />
            </Button>
            <span className="min-w-[120px] text-center text-sm font-medium text-black">
              {monthNames[summaryMonth - 1]} {summaryYear}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
              <CaretRight size={14} />
            </Button>
          </div>
          <div className="relative w-full sm:min-w-48">
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-sm">
        <DatePicker
          dateFrom={selectedDate}
          dateTo={selectedDate}
          onChange={(from) => {
            if (from) setSelectedDate(from)
          }}
          minWidth="9rem"
        />
        <div className="relative w-full sm:min-w-48">
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
            <Table cardOnMobile className="table-fixed">
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
