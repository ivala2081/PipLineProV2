import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Money,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckFat,
  ClockCounterClockwise,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  Bank,
  UserMinus,
  XCircle,
} from '@phosphor-icons/react'
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  EmptyState,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ds'
import {
  useAllSalaryPaymentsQuery,
  useAdvancesQuery,
  useHrMonthlyAttendanceQuery,
  useHrMonthlyLeavesQuery,
  countLeaveDaysInMonth,
  useHrSettingsQuery,
  type HrEmployee,
  type BulkSalaryPayoutItem,
} from '@/hooks/queries/useHrQuery'
import { SalaryPaymentsTab } from './SalaryPaymentsTab'
import { MONTH_NAMES_TR, MONTH_NAMES_EN, getRoleVariant } from './utils/hrConstants'
import { isWeekendDate } from './utils/attendanceHelpers'
import { fmtAmount } from './utils/salaryCalculations'
import { calculateProratedSalary, type ProratedSalaryResult } from './utils/proratedSalary'

/* ------------------------------------------------------------------ */

interface SalariesTabProps {
  employees: HrEmployee[]
  canManage: boolean
  lang: 'tr' | 'en'
}

export function SalariesTab({ employees, canManage, lang }: SalariesTabProps) {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [salarySubTab, setSalarySubTab] = useState<'active' | 'exited'>('active')
  const PAGE_SIZE = 15

  const { data: allSalaryPayments = [], isLoading } = useAllSalaryPaymentsQuery()
  const { data: advances = [] } = useAdvancesQuery(year, month)
  const { data: monthlyAttendance = [] } = useHrMonthlyAttendanceQuery(year, month)
  const { data: monthlyLeaves = [] } = useHrMonthlyLeavesQuery(year, month)
  const { data: hrSettings } = useHrSettingsQuery()
  const supplementTl = hrSettings?.supplement_tl ?? 4000
  const supplementCurrency = hrSettings?.supplement_currency ?? 'TL'
  const insuredBankAmountTl = hrSettings?.insured_bank_amount_tl ?? 28075.50
  const insuredBankCurrency = hrSettings?.insured_bank_currency ?? 'TL'
  const fullDayDivisor = hrSettings?.absence_full_day_divisor ?? 30
  const halfDayDivisor = hrSettings?.absence_half_day_divisor ?? 60
  const hourlyDivisor = hrSettings?.absence_hourly_divisor ?? 240
  const dailyDeductionEnabled = hrSettings?.daily_deduction_enabled ?? true
  const hourlyDeductionEnabled = hrSettings?.hourly_deduction_enabled ?? true
  const weekendOff = hrSettings?.weekend_off ?? true

  const monthNames = lang === 'tr' ? MONTH_NAMES_TR : MONTH_NAMES_EN
  const periodLabel = `${monthNames[month - 1]} ${year}`

  /* Employees with salary > 0 and active */
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.is_active && e.salary_tl > 0),
    [employees],
  )

  /* Passive employees whose exit_date falls within the selected period */
  const passiveEmployeesForPeriod = useMemo(() => {
    return employees.filter((e) => {
      if (e.is_active || e.salary_tl <= 0 || !e.exit_date) return false
      const exitDate = new Date(e.exit_date)
      return exitDate.getFullYear() === year && (exitDate.getMonth() + 1) === month
    })
  }, [employees, year, month])

  /* Combined list: active + relevant passive */
  const salaryEmployees = useMemo(
    () => [...activeEmployees, ...passiveEmployeesForPeriod],
    [activeEmployees, passiveEmployeesForPeriod],
  )

  /* Prorated salary for passive employees */
  const proratedSalaryByEmp = useMemo(() => {
    const map = new Map<string, ProratedSalaryResult>()
    for (const emp of passiveEmployeesForPeriod) {
      const empAttendance = monthlyAttendance
        .filter((a) => a.employee_id === emp.id)
        .map((a) => ({ date: a.date, status: a.status }))
      const result = calculateProratedSalary({
        monthlySalary: emp.salary_tl,
        exitDate: emp.exit_date!,
        hireDate: emp.hire_date,
        year,
        month,
        attendanceRecords: empAttendance,
        weekendOff,
      })
      map.set(emp.id, result)
    }
    return map
  }, [passiveEmployeesForPeriod, monthlyAttendance, year, month, weekendOff])

  /* Map of employee_id → paid salary payment for this period (matched by period label) */
  const paidByEmp = useMemo(() => {
    const map = new Map<string, (typeof allSalaryPayments)[number]>()
    for (const p of allSalaryPayments) {
      if (p.period === periodLabel) {
        map.set(p.employee_id, p)
      }
    }
    return map
  }, [allSalaryPayments, periodLabel])

  /* Unpaid active employees */
  const unpaidActiveEmployees = useMemo(() => {
    const unpaid = activeEmployees.filter((e) => !paidByEmp.has(e.id))
    if (!search.trim()) return unpaid
    const q = search.toLowerCase()
    return unpaid.filter((e) => e.full_name.toLowerCase().includes(q))
  }, [activeEmployees, paidByEmp, search])

  /* Unpaid exited employees for this period */
  const unpaidExitedEmployees = useMemo(() => {
    const unpaid = passiveEmployeesForPeriod.filter((e) => !paidByEmp.has(e.id))
    if (!search.trim()) return unpaid
    const q = search.toLowerCase()
    return unpaid.filter((e) => e.full_name.toLowerCase().includes(q))
  }, [passiveEmployeesForPeriod, paidByEmp, search])

  /* Current sub-tab filtered list */
  const filteredUnpaid = salarySubTab === 'active' ? unpaidActiveEmployees : unpaidExitedEmployees

  const totalPages = Math.max(1, Math.ceil(filteredUnpaid.length / PAGE_SIZE))
  const paginatedUnpaid = useMemo(
    () => filteredUnpaid.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredUnpaid, page],
  )

  // Reset page and selection when search or period changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pagination reset on filter change
    setPage(1)

    setSelectedIds(new Set())
  }, [search, periodLabel, salarySubTab])

  /* Map of employee_id → salary advance total for this period */
  const salaryAdvanceByEmp = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of advances) {
      if (a.advance_type === 'salary') {
        map.set(a.hr_employee_id, (map.get(a.hr_employee_id) ?? 0) + a.amount)
      }
    }
    return map
  }, [advances])

  /* Map of employee_id → insured bank deposit total for this period */
  const insuredBankDepositByEmp = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of advances) {
      if (a.advance_type === 'insured_salary') {
        map.set(a.hr_employee_id, (map.get(a.hr_employee_id) ?? 0) + a.amount)
      }
    }
    return map
  }, [advances])

  /* Map of employee_id → attendance deduction for this period */
  const attendanceDeductionByEmp = useMemo(() => {
    const map = new Map<string, number>()
    for (const emp of salaryEmployees) {
      // Skip passive employees — their attendance is already factored into proration
      const prorated = proratedSalaryByEmp.get(emp.id)
      if (prorated) continue

      let empAttendance = monthlyAttendance.filter((a) => a.employee_id === emp.id)
      if (weekendOff) {
        empAttendance = empAttendance.filter((a) => !isWeekendDate(a.date))
      }
      const nonExempt = empAttendance.filter((a) => !a.deduction_exempt)

      let deduction = 0

      if (dailyDeductionEnabled) {
        const absentDays = nonExempt.filter((a) => a.status === 'absent').length
        const halfDays = nonExempt.filter((a) => a.status === 'half_day').length
        deduction +=
          Math.round((emp.salary_tl * absentDays) / fullDayDivisor) +
          Math.round((emp.salary_tl * halfDays) / halfDayDivisor)
      }

      if (hourlyDeductionEnabled) {
        const totalAbsentHours = nonExempt.reduce((sum, a) => sum + (a.absent_hours ?? 0), 0)
        deduction += Math.round((emp.salary_tl * totalAbsentHours) / hourlyDivisor)
      }

      if (deduction > 0) map.set(emp.id, deduction)
    }
    return map
  }, [
    monthlyAttendance,
    salaryEmployees,
    proratedSalaryByEmp,
    fullDayDivisor,
    halfDayDivisor,
    hourlyDivisor,
    dailyDeductionEnabled,
    hourlyDeductionEnabled,
    weekendOff,
  ])

  /* Map of employee_id → unpaid leave deduction for this period */
  const unpaidLeaveDeductionByEmp = useMemo(() => {
    const map = new Map<string, number>()
    for (const emp of salaryEmployees) {
      // Skip passive employees — proration already covers their worked period
      if (proratedSalaryByEmp.has(emp.id)) continue

      const empUnpaidLeaves = monthlyLeaves.filter(
        (l) => l.employee_id === emp.id && l.leave_type === 'unpaid',
      )
      const unpaidDays = empUnpaidLeaves.reduce(
        (sum, l) => sum + countLeaveDaysInMonth(l, year, month),
        0,
      )
      if (unpaidDays > 0) {
        map.set(emp.id, Math.round((emp.salary_tl * unpaidDays) / fullDayDivisor))
      }
    }
    return map
  }, [monthlyLeaves, salaryEmployees, proratedSalaryByEmp, fullDayDivisor, year, month])

  /* Build bulk payout items: employees not yet paid this period */
  const bulkItems = useMemo<BulkSalaryPayoutItem[]>(() => {
    return salaryEmployees
      .filter((e) => !paidByEmp.has(e.id))
      .map((e) => {
        const prorated = proratedSalaryByEmp.get(e.id)
        const effectiveSalary = prorated ? prorated.proratedSalary : e.salary_tl
        const hasSupp = !e.is_insured && e.receives_supplement && !prorated
        const deduction = attendanceDeductionByEmp.get(e.id) ?? 0
        const leaveDeduction = unpaidLeaveDeductionByEmp.get(e.id) ?? 0
        const cur = (e.salary_currency ?? 'TL') as 'TL' | 'USD'
        const isAutoBank = e.is_insured && cur === insuredBankCurrency && !prorated
        // Use expected bank amount for auto-bank employees (not actual deposit)
        const expectedBankAmount = isAutoBank ? (e.bank_salary_tl ?? insuredBankAmountTl) : 0
        return {
          employee_id: e.id,
          employee_name: e.full_name,
          amount_tl: effectiveSalary,
          salary_currency: cur,
          supplement_tl: hasSupp ? supplementTl : 0,
          supplement_currency: supplementCurrency as 'TL' | 'USD',
          bank_deposit_tl: expectedBankAmount,
          attendance_deduction_tl: deduction,
          unpaid_leave_deduction_tl: leaveDeduction,
          period: periodLabel,
          description:
            prorated
              ? lang === 'tr'
                ? `${e.full_name} — ${periodLabel} Hakediş (${prorated.workedDays}/${prorated.totalBusinessDays} iş günü)`
                : `${e.full_name} — ${periodLabel} Prorated Salary (${prorated.workedDays}/${prorated.totalBusinessDays} days)`
              : lang === 'tr'
                ? `${e.full_name} — ${periodLabel} Maaş Ödemesi`
                : `${e.full_name} — ${periodLabel} Salary Payment`,
        }
      })
  }, [
    salaryEmployees,
    paidByEmp,
    proratedSalaryByEmp,
    periodLabel,
    lang,
    attendanceDeductionByEmp,
    unpaidLeaveDeductionByEmp,
    supplementTl,
    supplementCurrency,
    insuredBankCurrency,
    insuredBankAmountTl,
  ])

  const unpaidCount = bulkItems.length
  const activeUnpaidCount = unpaidActiveEmployees.length
  const exitedUnpaidCount = unpaidExitedEmployees.length
  const paidCount = paidByEmp.size

  /* Selection helpers */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUnpaid.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredUnpaid.map((e) => e.id)))
    }
  }
  const allSelected = filteredUnpaid.length > 0 && selectedIds.size === filteredUnpaid.length
  const hasSelection = selectedIds.size > 0

  /* Items to pass to payout dialog — filtered by selection or all */
  const payoutItems = useMemo(() => {
    if (!hasSelection) return bulkItems
    return bulkItems.filter((item) => selectedIds.has(item.employee_id))
  }, [bulkItems, selectedIds, hasSelection])

  /* Month navigation */
  const prevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  return (
    <div className="space-y-lg">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            <Money size={14} className="mr-1" />
            {lang === 'tr' ? 'Maaş Ödemeleri' : 'Salary Payments'}
            {unpaidCount > 0 && (
              <span className="ml-1.5 rounded-full bg-orange/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-orange">
                {unpaidCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <ClockCounterClockwise size={14} className="mr-1" />
            {lang === 'tr' ? 'Ödeme Geçmişi' : 'Payment History'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="pt-lg">
          <div className="space-y-lg">
            {/* Controls */}
            <div className="space-y-sm">
              {/* Row 1: Period + Toggle + Actions */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-sm">
                {/* Period navigator */}
                <div className="flex items-center gap-1 rounded-lg border border-black/[0.07] bg-bg1 px-1 py-1">
                  <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
                    <ArrowLeft size={14} />
                  </Button>
                  <span className="min-w-24 sm:min-w-32 text-center text-sm font-semibold text-black">
                    {periodLabel}
                  </span>
                  <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
                    <ArrowRight size={14} />
                  </Button>
                </div>

                {/* Active / Exited sub-tabs */}
                {!isLoading && (activeEmployees.length > 0 || passiveEmployeesForPeriod.length > 0) && (
                  <Tabs value={salarySubTab} onValueChange={(v) => setSalarySubTab(v as 'active' | 'exited')}>
                    <TabsList>
                      <TabsTrigger value="active">
                        <CheckCircle size={13} weight="fill" className="mr-1 text-green" />
                        {lang === 'tr' ? 'Aktif Çalışanlar' : 'Active Employees'}
                        {activeUnpaidCount > 0 && (
                          <span className="ml-1.5 rounded-full bg-orange/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-orange">
                            {activeUnpaidCount}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="exited">
                        <UserMinus size={13} weight="fill" className="mr-1 text-red" />
                        {lang === 'tr' ? 'Bu Ay Ayrılanlar' : 'Exited This Month'}
                        {exitedUnpaidCount > 0 && (
                          <span className="ml-1.5 rounded-full bg-red/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-red">
                            {exitedUnpaidCount}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 sm:ml-auto">
                  {/* Bank deposit button */}
                  {canManage && insuredBankAmountTl > 0 && (() => {
                    const insuredWithoutDeposit = activeEmployees.filter(
                      (e) => e.is_insured && !insuredBankDepositByEmp.has(e.id),
                    )
                    return insuredWithoutDeposit.length > 0 ? (
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          navigate('/hr/bank-deposit', {
                            state: {
                              employees: insuredWithoutDeposit,
                              insuredBankAmountTl,
                              insuredBankCurrency,
                              periodLabel,
                              lang,
                            },
                          })
                        }
                      >
                        <Bank size={15} weight="fill" />
                        {lang === 'tr'
                          ? `Banka Ödemeleri (${insuredWithoutDeposit.length})`
                          : `Bank Deposits (${insuredWithoutDeposit.length})`}
                      </Button>
                    ) : null
                  })()}

                  {/* Pay button */}
                  {canManage && unpaidCount > 0 && (
                    <Button
                      variant="filled"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        navigate('/hr/salary-payout', {
                          state: { items: payoutItems, periodLabel, lang },
                        })
                      }
                    >
                      <CheckFat size={15} weight="fill" />
                      {hasSelection
                        ? lang === 'tr'
                          ? `Seçilenleri Öde (${selectedIds.size})`
                          : `Pay Selected (${selectedIds.size})`
                        : lang === 'tr'
                          ? `Maaşları Toplu Öde (${unpaidCount})`
                          : `Bulk Pay Salaries (${unpaidCount})`}
                    </Button>
                  )}
                </div>
              </div>

              {/* Row 2: Search + Stats */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-sm">
                <div className="relative w-full sm:min-w-48 sm:max-w-xs">
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

                {!isLoading && salaryEmployees.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2">
                      <CheckCircle size={14} weight="fill" className="text-green" />
                      <span className="text-xs text-black/50">
                        {lang === 'tr' ? 'Ödendi' : 'Paid'}
                      </span>
                      <span className="text-sm font-bold text-green tabular-nums">{paidCount}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2">
                      <Clock size={14} weight="fill" className="text-orange" />
                      <span className="text-xs text-black/50">
                        {lang === 'tr' ? 'Bekleyen' : 'Pending'}
                      </span>
                      <span className="text-sm font-bold text-orange tabular-nums">
                        {unpaidCount}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table — Bekleyen Ödemeler */}
            {!isLoading && filteredUnpaid.length > 0 && (
              <h3 className="text-sm font-semibold text-black/70">
                {salarySubTab === 'active'
                  ? (lang === 'tr' ? 'Bekleyen Ödemeler' : 'Pending Payments')
                  : (lang === 'tr' ? 'Ayrılan Çalışan Hakedişleri' : 'Exited Employee Earnings')}
              </h3>
            )}
            {isLoading ? (
              <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredUnpaid.length === 0 ? (
              salarySubTab === 'exited' ? (
                <EmptyState
                  icon={UserMinus}
                  title={lang === 'tr' ? 'Bu dönemde ayrılan çalışan yok' : 'No exited employees this period'}
                  description={
                    lang === 'tr'
                      ? `${periodLabel} döneminde çıkış tarihi olan çalışan bulunamadı.`
                      : `No employees with an exit date in ${periodLabel}.`
                  }
                />
              ) : activeEmployees.length === 0 ? (
                <EmptyState
                  icon={Money}
                  title={lang === 'tr' ? 'Maaşlı çalışan yok' : 'No salaried employees'}
                  description={
                    lang === 'tr'
                      ? 'Maaş girilmiş aktif çalışan bulunamadı.'
                      : 'No active employees with a salary configured.'
                  }
                />
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title={lang === 'tr' ? 'Tüm maaşlar ödendi' : 'All salaries paid'}
                  description={
                    lang === 'tr'
                      ? `${periodLabel} dönemi maaşlarının tamamı ödenmiştir.`
                      : `All salaries for ${periodLabel} have been paid.`
                  }
                />
              )
            ) : (
              <>
                <div className="rounded-xl border border-black/[0.07] bg-bg1 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                  <Table cardOnMobile>
                    <TableHeader>
                      <TableRow>
                        {canManage && (
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                            />
                          </TableHead>
                        )}
                        <TableHead className="w-48">
                          {lang === 'tr' ? 'Çalışan' : 'Employee'}
                        </TableHead>
                        <TableHead>{lang === 'tr' ? 'Rol' : 'Role'}</TableHead>
                        {salarySubTab === 'exited' && (
                          <TableHead>
                            {lang === 'tr' ? 'Çıkış Tarihi' : 'Exit Date'}
                          </TableHead>
                        )}
                        <TableHead className="text-right">
                          {salarySubTab === 'exited'
                            ? (lang === 'tr' ? 'Hakediş' : 'Earned')
                            : (lang === 'tr' ? 'Brüt Maaş' : 'Gross Salary')}
                        </TableHead>
                        <TableHead className="text-right">
                          {lang === 'tr' ? 'Banka' : 'Bank'}
                        </TableHead>
                        <TableHead className="text-right">
                          {lang === 'tr' ? 'Elden' : 'Cash'}
                        </TableHead>
                        <TableHead className="text-right">
                          {lang === 'tr' ? 'Sigorta Elden' : 'Supplement'}
                        </TableHead>
                        <TableHead className="text-right">
                          {lang === 'tr' ? 'Avans' : 'Advance'}
                        </TableHead>
                        <TableHead className="text-right">
                          {lang === 'tr' ? 'Devam Kesintisi' : 'Absence Ded.'}
                        </TableHead>
                        <TableHead className="text-right">
                          {lang === 'tr' ? 'İzin Kesintisi' : 'Leave Ded.'}
                        </TableHead>
                        <TableHead className="text-right">
                          {lang === 'tr' ? 'Net Ödeme' : 'Net Payment'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUnpaid.map((emp) => {
                        const prorated = proratedSalaryByEmp.get(emp.id)
                        const effectiveSalary = prorated ? prorated.proratedSalary : emp.salary_tl
                        const cur = emp.salary_currency ?? 'TL'
                        const advance = salaryAdvanceByEmp.get(emp.id) ?? 0
                        const supplement =
                          !emp.is_insured && emp.receives_supplement && !prorated ? supplementTl : 0
                        const deduction = attendanceDeductionByEmp.get(emp.id) ?? 0
                        const leaveDeduction = unpaidLeaveDeductionByEmp.get(emp.id) ?? 0
                        const bankDeposit = insuredBankDepositByEmp.get(emp.id) ?? 0
                        const isAutoBank = emp.is_insured && cur === insuredBankCurrency && !prorated
                        const bankAmount = isAutoBank
                          ? (emp.bank_salary_tl ?? insuredBankAmountTl)
                          : 0
                        const cashAmount = isAutoBank
                          ? Math.max(0, effectiveSalary - bankAmount)
                          : 0
                        // Net salary in employee's currency (supplement excluded for USD employees)
                        const netSalary =
                          effectiveSalary - advance - deduction - leaveDeduction - bankDeposit
                        // For TL employees supplement is same currency, for USD it stays separate
                        const netTl = cur === 'TL' ? netSalary + supplement : netSalary
                        const hasMixedNet = cur === 'USD' && supplement > 0

                        return (
                          <TableRow
                            key={emp.id}
                            className={selectedIds.has(emp.id) ? 'bg-brand/[0.03]' : ''}
                          >
                            {/* Checkbox */}
                            {canManage && (
                              <TableCell>
                                <input
                                  type="checkbox"
                                  className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                                  checked={selectedIds.has(emp.id)}
                                  onChange={() => toggleSelect(emp.id)}
                                />
                              </TableCell>
                            )}
                            {/* Employee */}
                            <TableCell data-label="Employee">
                              <div className="flex items-center gap-sm">
                                <button
                                  type="button"
                                  className="text-sm font-medium text-black hover:text-brand hover:underline transition-colors text-left"
                                  onClick={() => navigate(`/hr/employees/${emp.id}/edit`)}
                                >
                                  {emp.full_name}
                                </button>
                              </div>
                            </TableCell>

                            {/* Role */}
                            <TableCell data-label="Role">
                              <Tag variant={getRoleVariant(emp.role)}>{emp.role}</Tag>
                            </TableCell>

                            {/* Exit Date — only in exited tab */}
                            {salarySubTab === 'exited' && (
                              <TableCell data-label="Exit Date">
                                <span className="tabular-nums text-xs text-black/60">
                                  {emp.exit_date
                                    ? new Date(emp.exit_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                                        day: 'numeric',
                                        month: 'short',
                                      })
                                    : '—'}
                                </span>
                              </TableCell>
                            )}

                            {/* Gross salary / Prorated */}
                            <TableCell data-label="Gross Salary" className="text-right">
                              <div className="flex flex-col items-end">
                                <span className="tabular-nums text-sm font-medium text-black/70">
                                  {fmtAmount(effectiveSalary, cur)}
                                </span>
                                {prorated && (
                                  <span className="text-[10px] text-black/40">
                                    {prorated.workedDays}/{prorated.totalBusinessDays} {lang === 'tr' ? 'iş günü' : 'days'}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Bank deposit */}
                            <TableCell data-label="Bank" className="text-right">
                              {emp.is_insured && isAutoBank ? (
                                <div className="flex items-center justify-end gap-1">
                                  {bankDeposit > 0 && (
                                    <CheckCircle
                                      size={13}
                                      weight="fill"
                                      className="text-green"
                                    />
                                  )}
                                  <span
                                    className={`tabular-nums text-sm font-medium ${bankDeposit > 0 ? 'text-green' : 'text-blue'}`}
                                  >
                                    {fmtAmount(bankAmount, insuredBankCurrency)}
                                  </span>
                                </div>
                              ) : emp.is_insured ? (
                                <span className="text-xs text-orange/70">
                                  {lang === 'tr' ? 'Elle' : 'Manual'}
                                </span>
                              ) : (
                                <span className="text-xs text-black/25">—</span>
                              )}
                            </TableCell>

                            {/* Cash amount */}
                            <TableCell data-label="Cash" className="text-right">
                              {emp.is_insured && isAutoBank ? (
                                <span className="tabular-nums text-sm font-medium text-black/50">
                                  {fmtAmount(cashAmount, cur)}
                                </span>
                              ) : (
                                <span className="text-xs text-black/25">—</span>
                              )}
                            </TableCell>

                            {/* Supplement */}
                            <TableCell data-label="Supplement" className="text-right">
                              {supplement > 0 ? (
                                <span className="tabular-nums text-sm font-medium text-orange">
                                  +{fmtAmount(supplement, supplementCurrency)}
                                </span>
                              ) : (
                                <span className="text-xs text-black/25">—</span>
                              )}
                            </TableCell>

                            {/* Advance */}
                            <TableCell data-label="Advance" className="text-right">
                              {advance > 0 ? (
                                <span className="tabular-nums text-sm font-medium text-orange">
                                  -{fmtAmount(advance, cur)}
                                </span>
                              ) : (
                                <span className="text-xs text-black/25">—</span>
                              )}
                            </TableCell>

                            {/* Attendance deduction */}
                            <TableCell data-label="Absence Ded." className="text-right">
                              {deduction > 0 ? (
                                <span className="tabular-nums text-sm font-medium text-red">
                                  -{fmtAmount(deduction, cur)}
                                </span>
                              ) : (
                                <span className="text-xs text-black/25">—</span>
                              )}
                            </TableCell>

                            {/* Unpaid leave deduction */}
                            <TableCell data-label="Leave Ded." className="text-right">
                              {leaveDeduction > 0 ? (
                                <span className="tabular-nums text-sm font-medium text-red">
                                  -{fmtAmount(leaveDeduction, cur)}
                                </span>
                              ) : (
                                <span className="text-xs text-black/25">—</span>
                              )}
                            </TableCell>

                            {/* Net */}
                            <TableCell data-label="Net Payment" className="text-right">
                              <div className="flex flex-col items-end">
                                <span className="tabular-nums text-sm font-semibold text-black">
                                  {fmtAmount(netTl > 0 ? netTl : 0, cur === 'TL' ? 'TL' : 'USD')}
                                </span>
                                {hasMixedNet && (
                                  <span className="tabular-nums text-xs font-medium text-orange">
                                    + {fmtAmount(supplement, supplementCurrency)}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
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
        </TabsContent>

        <TabsContent value="history" className="pt-lg">
          <SalaryPaymentsTab employees={employees} canManage={canManage} lang={lang} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
