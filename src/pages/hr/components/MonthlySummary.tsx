/**
 * MonthlySummary — Attendance summary table for a given month.
 *
 * Extracted from AttendanceTab.tsx (Phase 2 refactoring).
 */
import { useState, useMemo, useEffect } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import {
  Button,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@ds'
import { useHrMonthlyAttendanceQuery, type HrEmployee } from '@/hooks/queries/useHrQuery'
import { isWeekendDate } from '../utils/attendanceHelpers'

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 15

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface MonthlySummaryProps {
  employees: HrEmployee[]
  year: number
  month: number
  lang: 'tr' | 'en'
  search: string
  weekendOff: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function MonthlySummary({
  employees,
  year,
  month,
  lang,
  search,
  weekendOff,
}: MonthlySummaryProps) {
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pagination reset on search change
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
