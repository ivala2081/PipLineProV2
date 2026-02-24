import { useState, useMemo } from 'react'
import { Money, CheckCircle, Clock, ArrowLeft, ArrowRight, CheckFat, PencilSimple, ClockCounterClockwise } from '@phosphor-icons/react'
import {
  Button,
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
  useHrSettingsQuery,
  type HrEmployee,
  type HrSalaryPaymentLocal,
  type BulkSalaryPayoutItem,
} from '@/hooks/queries/useHrQuery'
import { BulkSalaryConfirmDialog } from './BulkSalaryConfirmDialog'
import { SalaryEditDialog } from './SalaryEditDialog'
import { SalaryPaymentsTab } from './SalaryPaymentsTab'
import type { HrEmployeeRole } from '@/lib/database.types'

/* ------------------------------------------------------------------ */

function fmtTL(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const MONTH_NAMES_TR = [
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
]
const MONTH_NAMES_EN = [
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
]

function getRoleVariant(
  role: HrEmployeeRole,
): 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan' {
  const map: Partial<
    Record<HrEmployeeRole, 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan'>
  > = {
    Manager: 'blue',
    Marketing: 'purple',
    Operation: 'green',
    'Retention': 'orange',
    'Project Management': 'cyan',
    'Social Media': 'purple',
    'Sales Development': 'red',
    Programmer: 'blue',
  }
  return map[role] ?? 'blue'
}

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
  const [editingPayment, setEditingPayment] = useState<HrSalaryPaymentLocal | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<HrEmployee | null>(null)

  const { data: allSalaryPayments = [], isLoading } = useAllSalaryPaymentsQuery()
  const { data: advances = [] } = useAdvancesQuery(year, month)
  const { data: monthlyAttendance = [] } = useHrMonthlyAttendanceQuery(year, month)
  const { data: hrSettings } = useHrSettingsQuery()
  const supplementTl = hrSettings?.supplement_tl ?? 4000
  const fullDayDivisor = hrSettings?.absence_full_day_divisor ?? 30
  const halfDayDivisor = hrSettings?.absence_half_day_divisor ?? 60

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

  /* Map of employee_id → attendance deduction for this period */
  const attendanceDeductionByEmp = useMemo(() => {
    const map = new Map<string, number>()
    for (const emp of activeEmployees) {
      const empAttendance = monthlyAttendance.filter((a) => a.employee_id === emp.id)
      const absentDays = empAttendance.filter((a) => a.status === 'absent').length
      const halfDays = empAttendance.filter((a) => a.status === 'half_day').length
      const deduction = Math.round((emp.salary_tl * absentDays) / fullDayDivisor) + Math.round((emp.salary_tl * halfDays) / halfDayDivisor)
      if (deduction > 0) map.set(emp.id, deduction)
    }
    return map
  }, [monthlyAttendance, activeEmployees, fullDayDivisor, halfDayDivisor])


  /* Build bulk payout items: employees not yet paid this period */
  const bulkItems = useMemo<BulkSalaryPayoutItem[]>(() => {
    return activeEmployees
      .filter((e) => !paidByEmp.has(e.id))
      .map((e) => {
        const hasSupp = !e.is_insured && e.receives_supplement
        const deduction = attendanceDeductionByEmp.get(e.id) ?? 0
        return {
          employee_id: e.id,
          employee_name: e.full_name,
          amount_tl: e.salary_tl,
          supplement_tl: hasSupp ? supplementTl : 0,
          attendance_deduction_tl: deduction,
          period: periodLabel,
          description:
            lang === 'tr'
              ? `${e.full_name} — ${periodLabel} Maaş Ödemesi`
              : `${e.full_name} — ${periodLabel} Salary Payment`,
        }
      })
  }, [activeEmployees, paidByEmp, periodLabel, lang, attendanceDeductionByEmp, supplementTl])

  const unpaidCount = bulkItems.length
  const paidCount = paidByEmp.size

  /* Employee lookup map */
  const employeeMap = useMemo(() => {
    const m = new Map<string, HrEmployee>()
    employees.forEach((e) => m.set(e.id, e))
    return m
  }, [employees])

  /* Paid salary records for the selected period */
  const paidRecords = useMemo(
    () => allSalaryPayments.filter((p) => p.period === periodLabel),
    [allSalaryPayments, periodLabel],
  )

  const paidTotalTl = useMemo(
    () => paidRecords.reduce((s, p) => s + p.amount_tl, 0),
    [paidRecords],
  )

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
      <div className="flex flex-wrap items-center gap-sm">
        {/* Period navigator */}
        <div className="flex items-center gap-1 rounded-lg border border-black/[0.07] bg-bg1 px-1 py-1">
          <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
            <ArrowLeft size={14} />
          </Button>
          <span className="min-w-32 text-center text-sm font-semibold text-black">
            {periodLabel}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
            <ArrowRight size={14} />
          </Button>
        </div>

        {/* Stats */}
        {!isLoading && activeEmployees.length > 0 && (
          <div className="flex items-center gap-sm">
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2">
              <CheckCircle size={14} weight="fill" className="text-green" />
              <span className="text-xs text-black/50">{lang === 'tr' ? 'Ödendi' : 'Paid'}</span>
              <span className="text-sm font-bold text-green tabular-nums">{paidCount}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2">
              <Clock size={14} weight="fill" className="text-orange" />
              <span className="text-xs text-black/50">
                {lang === 'tr' ? 'Bekleyen' : 'Pending'}
              </span>
              <span className="text-sm font-bold text-orange tabular-nums">{unpaidCount}</span>
            </div>
          </div>
        )}

        {/* Bulk pay button */}
        {canManage && unpaidCount > 0 && (
          <Button variant="filled" className="ml-auto" onClick={() => setBulkPayoutOpen(true)}>
            <CheckFat size={15} weight="fill" />
            {lang === 'tr'
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
      ) : unpaidCount === 0 ? (
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
        <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-56">{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
                <TableHead>{lang === 'tr' ? 'Rol' : 'Role'}</TableHead>
                <TableHead className="text-right">
                  {lang === 'tr' ? 'Brüt Maaş' : 'Gross Salary'}
                </TableHead>
                <TableHead className="text-right">
                  {lang === 'tr' ? 'Sigorta Elden Ödeme' : 'Insurance Supplement'}
                </TableHead>
                <TableHead className="text-right">{lang === 'tr' ? 'Avans' : 'Advance'}</TableHead>
                <TableHead className="text-right">
                  {lang === 'tr' ? 'Devam Kesintisi' : 'Absence Deduction'}
                </TableHead>
                <TableHead className="text-right">
                  {lang === 'tr' ? 'Net Ödeme' : 'Net Payment'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEmployees.filter((e) => !paidByEmp.has(e.id)).map((emp) => {
                const advance = salaryAdvanceByEmp.get(emp.id) ?? 0
                const supplement = !emp.is_insured && emp.receives_supplement ? supplementTl : 0
                const deduction = attendanceDeductionByEmp.get(emp.id) ?? 0
                const net = emp.salary_tl + supplement - advance - deduction

                return (
                  <TableRow key={emp.id}>
                    {/* Employee */}
                    <TableCell>
                      <div className="flex items-center gap-sm">
                        <span className="text-sm font-medium text-black">{emp.full_name}</span>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Tag variant={getRoleVariant(emp.role)}>{emp.role}</Tag>
                    </TableCell>

                    {/* Gross salary */}
                    <TableCell className="text-right">
                      <span className="tabular-nums text-sm font-medium text-black/70">
                        {fmtTL(emp.salary_tl)} TL
                      </span>
                    </TableCell>

                    {/* Supplement */}
                    <TableCell className="text-right">
                      {supplement > 0 ? (
                        <span className="tabular-nums text-sm font-medium text-orange">
                          +{fmtTL(supplement)} TL
                        </span>
                      ) : (
                        <span className="text-xs text-black/25">—</span>
                      )}
                    </TableCell>

                    {/* Advance */}
                    <TableCell className="text-right">
                      {advance > 0 ? (
                        <span className="tabular-nums text-sm font-medium text-orange">
                          -{fmtTL(advance)} TL
                        </span>
                      ) : (
                        <span className="text-xs text-black/25">—</span>
                      )}
                    </TableCell>

                    {/* Attendance deduction */}
                    <TableCell className="text-right">
                      {deduction > 0 ? (
                        <span className="tabular-nums text-sm font-medium text-red">
                          -{fmtTL(deduction)} TL
                        </span>
                      ) : (
                        <span className="text-xs text-black/25">—</span>
                      )}
                    </TableCell>

                    {/* Net */}
                    <TableCell className="text-right">
                      <span className="tabular-nums text-sm font-semibold text-black">
                        {fmtTL(net > 0 ? net : 0)} TL
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Geçmiş Ödemeler (paid salary records for this period) ── */}
      {!isLoading && paidRecords.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-sm">
            <h3 className="text-sm font-semibold text-black/70">
              {lang === 'tr' ? 'Geçmiş Ödemeler' : 'Payment History'}
            </h3>
            <span className="text-xs text-black/40">
              {lang === 'tr' ? 'Toplam' : 'Total'}:{' '}
              <span className="font-semibold text-black/60">{fmtTL(paidTotalTl)} TL</span>
              {' · '}
              {paidRecords.length} {lang === 'tr' ? 'kayıt' : 'records'}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
                  <TableHead className="text-right">{lang === 'tr' ? 'Tutar' : 'Amount'}</TableHead>
                  <TableHead>{lang === 'tr' ? 'Ödeme Tarihi' : 'Paid Date'}</TableHead>
                  <TableHead>{lang === 'tr' ? 'Notlar' : 'Notes'}</TableHead>
                  {canManage && <TableHead className="w-14" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidRecords.map((payment) => {
                  const emp = employeeMap.get(payment.employee_id)
                  const paidDate = new Date(payment.paid_at).toLocaleDateString(
                    lang === 'tr' ? 'tr-TR' : 'en-US',
                    { day: 'numeric', month: 'short', year: 'numeric' },
                  )
                  return (
                    <TableRow key={payment.id} className="group">
                      <TableCell>
                        <p className="text-sm font-medium text-black">
                          {emp?.full_name ?? '—'}
                        </p>
                        {emp && <p className="mt-0.5 text-xs text-black/40">{emp.role}</p>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold text-black/80">
                        {fmtTL(payment.amount_tl)}{' '}
                        <span className="text-xs font-normal text-black/40">TL</span>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-black/50">
                        {paidDate}
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-xs text-black/40">
                        {payment.notes ?? '—'}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              setEditingPayment(payment)
                              setEditingEmployee(emp ?? null)
                            }}
                          >
                            <PencilSimple size={14} />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Bulk salary confirm dialog */}
      <BulkSalaryConfirmDialog
        open={bulkPayoutOpen}
        onClose={() => setBulkPayoutOpen(false)}
        items={bulkItems}
        periodLabel={periodLabel}
        lang={lang}
      />

      {/* Edit salary payment dialog */}
      <SalaryEditDialog
        open={!!editingPayment}
        onClose={() => {
          setEditingPayment(null)
          setEditingEmployee(null)
        }}
        payment={editingPayment}
        employee={editingEmployee}
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
