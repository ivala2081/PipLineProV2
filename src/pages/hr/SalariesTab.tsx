import { useState, useMemo, useEffect } from 'react'
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
import { BulkSalaryConfirmDialog } from './BulkSalaryConfirmDialog'
import { BulkBankDepositDialog } from './BulkBankDepositDialog'
import { SalaryPaymentsTab } from './SalaryPaymentsTab'
import { MONTH_NAMES_TR, MONTH_NAMES_EN, getRoleVariant } from './utils/hrConstants'
import { isWeekendDate } from './utils/attendanceHelpers'
import { fmtAmount } from './utils/salaryCalculations'

/* ------------------------------------------------------------------ */

interface SalariesTabProps {
  employees: HrEmployee[]
  canManage: boolean
  lang: 'tr' | 'en'
}

export function SalariesTab({ employees, canManage, lang }: SalariesTabProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [bulkPayoutOpen, setBulkPayoutOpen] = useState(false)
  const [bankDepositOpen, setBankDepositOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const PAGE_SIZE = 15

  const { data: allSalaryPayments = [], isLoading } = useAllSalaryPaymentsQuery()
  const { data: advances = [] } = useAdvancesQuery(year, month)
  const { data: monthlyAttendance = [] } = useHrMonthlyAttendanceQuery(year, month)
  const { data: monthlyLeaves = [] } = useHrMonthlyLeavesQuery(year, month)
  const { data: hrSettings } = useHrSettingsQuery()
  const supplementTl = hrSettings?.supplement_tl ?? 4000
  const insuredBankAmountTl = hrSettings?.insured_bank_amount_tl ?? 28075.50
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

  /* Search-filtered unpaid employees */
  const filteredUnpaid = useMemo(() => {
    const unpaid = activeEmployees.filter((e) => !paidByEmp.has(e.id))
    if (!search.trim()) return unpaid
    const q = search.toLowerCase()
    return unpaid.filter((e) => e.full_name.toLowerCase().includes(q))
  }, [activeEmployees, paidByEmp, search])

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
  }, [search, periodLabel])

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
    for (const emp of activeEmployees) {
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
    activeEmployees,
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
    for (const emp of activeEmployees) {
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
  }, [monthlyLeaves, activeEmployees, fullDayDivisor, year, month])

  /* Build bulk payout items: employees not yet paid this period */
  const bulkItems = useMemo<BulkSalaryPayoutItem[]>(() => {
    return activeEmployees
      .filter((e) => !paidByEmp.has(e.id))
      .map((e) => {
        const hasSupp = !e.is_insured && e.receives_supplement
        const deduction = attendanceDeductionByEmp.get(e.id) ?? 0
        const leaveDeduction = unpaidLeaveDeductionByEmp.get(e.id) ?? 0
        const bankDeposit = e.is_insured ? (insuredBankDepositByEmp.get(e.id) ?? 0) : 0
        return {
          employee_id: e.id,
          employee_name: e.full_name,
          amount_tl: e.salary_tl,
          salary_currency: e.salary_currency ?? ('TL' as const),
          supplement_tl: hasSupp ? supplementTl : 0,
          bank_deposit_tl: bankDeposit,
          attendance_deduction_tl: deduction,
          unpaid_leave_deduction_tl: leaveDeduction,
          period: periodLabel,
          description:
            lang === 'tr'
              ? `${e.full_name} — ${periodLabel} Maaş Ödemesi`
              : `${e.full_name} — ${periodLabel} Salary Payment`,
        }
      })
  }, [
    activeEmployees,
    paidByEmp,
    periodLabel,
    lang,
    attendanceDeductionByEmp,
    unpaidLeaveDeductionByEmp,
    supplementTl,
    insuredBankDepositByEmp,
  ])

  const unpaidCount = bulkItems.length
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
            {/* Controls row */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-sm">
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

              {/* Search */}
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

              {/* Stats */}
              {!isLoading && activeEmployees.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
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

              {/* Bank deposit button — insured employees without deposit this period */}
              {canManage && (() => {
                const insuredWithoutDeposit = activeEmployees.filter(
                  (e) => e.is_insured && !insuredBankDepositByEmp.has(e.id) && !paidByEmp.has(e.id),
                )
                return insuredWithoutDeposit.length > 0 ? (
                  <Button
                    variant="outline"
                    className="ml-auto w-full sm:w-auto"
                    onClick={() => setBankDepositOpen(true)}
                  >
                    <Bank size={15} weight="fill" />
                    {lang === 'tr'
                      ? `Banka Ödemeleri (${insuredWithoutDeposit.length})`
                      : `Bank Deposits (${insuredWithoutDeposit.length})`}
                  </Button>
                ) : null
              })()}

              {/* Pay button — selected or all */}
              {canManage && unpaidCount > 0 && (
                <Button
                  variant="filled"
                  className={`${canManage && activeEmployees.some((e) => e.is_insured && !insuredBankDepositByEmp.has(e.id) && !paidByEmp.has(e.id)) ? '' : 'ml-auto'} w-full sm:w-auto`}
                  onClick={() => setBulkPayoutOpen(true)}
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

            {/* Table — Bekleyen Ödemeler */}
            {!isLoading && unpaidCount > 0 && (
              <h3 className="text-sm font-semibold text-black/70">
                {lang === 'tr' ? 'Bekleyen Ödemeler' : 'Pending Payments'}
              </h3>
            )}
            {isLoading ? (
              <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
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
            ) : filteredUnpaid.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title={lang === 'tr' ? 'Tüm maaşlar ödendi' : 'All salaries paid'}
                description={
                  lang === 'tr'
                    ? `${periodLabel} dönemi maaşlarının tamamı ödenmiştir.`
                    : `All salaries for ${periodLabel} have been paid.`
                }
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
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
                        <TableHead className="text-right">
                          {lang === 'tr' ? 'Brüt Maaş' : 'Gross Salary'}
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
                        const cur = emp.salary_currency ?? 'TL'
                        const advance = salaryAdvanceByEmp.get(emp.id) ?? 0
                        const supplement =
                          !emp.is_insured && emp.receives_supplement ? supplementTl : 0
                        const deduction = attendanceDeductionByEmp.get(emp.id) ?? 0
                        const leaveDeduction = unpaidLeaveDeductionByEmp.get(emp.id) ?? 0
                        const bankDeposit = insuredBankDepositByEmp.get(emp.id) ?? 0
                        const bankAmount = emp.is_insured
                          ? (emp.bank_salary_tl ?? insuredBankAmountTl)
                          : 0
                        const cashAmount = emp.is_insured
                          ? Math.max(0, emp.salary_tl - bankAmount)
                          : 0
                        // Net salary in employee's currency (supplement excluded for USD employees)
                        const netSalary =
                          emp.salary_tl - advance - deduction - leaveDeduction - bankDeposit
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
                                <span className="text-sm font-medium text-black">
                                  {emp.full_name}
                                </span>
                              </div>
                            </TableCell>

                            {/* Role */}
                            <TableCell data-label="Role">
                              <Tag variant={getRoleVariant(emp.role)}>{emp.role}</Tag>
                            </TableCell>

                            {/* Gross salary */}
                            <TableCell data-label="Gross Salary" className="text-right">
                              <span className="tabular-nums text-sm font-medium text-black/70">
                                {fmtAmount(emp.salary_tl, cur)}
                              </span>
                            </TableCell>

                            {/* Bank deposit */}
                            <TableCell data-label="Bank" className="text-right">
                              {emp.is_insured ? (
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
                                    {fmtAmount(bankAmount, 'TL')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-black/25">—</span>
                              )}
                            </TableCell>

                            {/* Cash amount */}
                            <TableCell data-label="Cash" className="text-right">
                              {emp.is_insured ? (
                                <span className="tabular-nums text-sm font-medium text-black/50">
                                  {fmtAmount(cashAmount, 'TL')}
                                </span>
                              ) : (
                                <span className="text-xs text-black/25">—</span>
                              )}
                            </TableCell>

                            {/* Supplement */}
                            <TableCell data-label="Supplement" className="text-right">
                              {supplement > 0 ? (
                                <span className="tabular-nums text-sm font-medium text-orange">
                                  +{fmtAmount(supplement, 'TL')}
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
                                    + {fmtAmount(supplement, 'TL')}
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

            {/* Salary confirm dialog */}
            <BulkSalaryConfirmDialog
              open={bulkPayoutOpen}
              onClose={() => {
                setBulkPayoutOpen(false)
                setSelectedIds(new Set())
              }}
              items={payoutItems}
              periodLabel={periodLabel}
              lang={lang}
            />

            {/* Bank deposit dialog */}
            <BulkBankDepositDialog
              open={bankDepositOpen}
              onClose={() => setBankDepositOpen(false)}
              employees={activeEmployees.filter(
                (e) =>
                  e.is_insured &&
                  !insuredBankDepositByEmp.has(e.id) &&
                  !paidByEmp.has(e.id),
              )}
              insuredBankAmountTl={insuredBankAmountTl}
              periodLabel={periodLabel}
              lang={lang}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="pt-lg">
          <SalaryPaymentsTab employees={employees} canManage={canManage} lang={lang} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
