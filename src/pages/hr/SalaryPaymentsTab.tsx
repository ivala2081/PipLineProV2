import { useState, useMemo } from 'react'
import {
  Money,
  ArrowLeft,
  ArrowRight,
  PencilSimple,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Skeleton,
  Input,
} from '@ds'
import {
  useAllSalaryPaymentsQuery,
  useHrSettingsQuery,
  type HrEmployee,
  type HrSalaryPaymentLocal,
} from '@/hooks/queries/useHrQuery'
import { SalaryEditDialog } from './SalaryEditDialog'

/* ------------------------------------------------------------------ */

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmtTL(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface SalaryPaymentsTabProps {
  employees: HrEmployee[]
  canManage: boolean
  lang: 'tr' | 'en'
}

export function SalaryPaymentsTab({ employees, canManage, lang }: SalaryPaymentsTabProps) {
  const { data: allPayments = [], isLoading } = useAllSalaryPaymentsQuery()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const { data: hrSettings } = useHrSettingsQuery()
  const settingsRoles = hrSettings?.roles ?? []
  const [editingPayment, setEditingPayment] = useState<HrSalaryPaymentLocal | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<HrEmployee | null>(null)

  const monthName = lang === 'tr' ? MONTH_NAMES_TR[month - 1] : MONTH_NAMES_EN[month - 1]

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const employeeMap = useMemo(() => {
    const m = new Map<string, HrEmployee>()
    employees.forEach((e) => m.set(e.id, e))
    return m
  }, [employees])

  // Filter by selected month (based on paid_at)
  const filtered = useMemo(() => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const q = search.trim().toLowerCase()
    return allPayments.filter((p) => {
      if (!p.paid_at.startsWith(monthStr)) return false
      // Get employee for dept filter and text search
      const emp = employees.find((e) => e.id === p.employee_id)
      // Dept filter
      if (deptFilter !== 'all' && emp?.role !== deptFilter) return false
      // Text search (name + email)
      if (q && !emp?.full_name.toLowerCase().includes(q) && !emp?.email.toLowerCase().includes(q)) return false
      return true
    })
  }, [allPayments, year, month, search, deptFilter, employees])

  const totalTl = useMemo(
    () => filtered.reduce((s, p) => s + p.amount_tl, 0),
    [filtered],
  )

  return (
    <div className="space-y-md">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-sm">
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
            <ArrowLeft size={14} />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium text-black/70">
            {monthName} {year}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
            <ArrowRight size={14} />
          </Button>
        </div>

        {/* Search + Dept filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-52">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
            <Input
              className="pl-8 text-sm"
              placeholder={lang === 'tr' ? 'İsim veya e-posta ara...' : 'Search by name or email...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger>
                <SelectValue placeholder={lang === 'tr' ? 'Departman' : 'Department'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {lang === 'tr' ? 'Tüm Departmanlar' : 'All Departments'}
                </SelectItem>
                {settingsRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-black/[0.07] bg-bg1 px-4 py-2.5">
          <Money size={16} className="shrink-0 text-green" />
          <span className="text-xs text-black/50">
            {lang === 'tr' ? 'Toplam Ödeme' : 'Total Paid'}&nbsp;—&nbsp;
            <span className="font-semibold text-black/80">
              {fmtTL(totalTl)} TL
            </span>
          </span>
          <span className="ml-auto text-xs text-black/40">
            {filtered.length} {lang === 'tr' ? 'kayıt' : 'records'}
          </span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-black/[0.07] bg-bg1">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-black/[0.07]">
                <TableHead className="text-xs font-medium text-black/40">
                  {lang === 'tr' ? 'Çalışan' : 'Employee'}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/40">
                  {lang === 'tr' ? 'Dönem' : 'Period'}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/40 text-right">
                  {lang === 'tr' ? 'Tutar' : 'Amount'}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/40">
                  {lang === 'tr' ? 'Ödeme Tarihi' : 'Paid Date'}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/40">
                  {lang === 'tr' ? 'Notlar' : 'Notes'}
                </TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-b border-black/[0.06] last:border-0">
                  <TableCell className="py-3"><Skeleton className="h-4 w-32 rounded" /></TableCell>
                  <TableCell className="py-3"><Skeleton className="h-4 w-24 rounded" /></TableCell>
                  <TableCell className="py-3"><Skeleton className="h-4 w-20 rounded ml-auto" /></TableCell>
                  <TableCell className="py-3"><Skeleton className="h-4 w-24 rounded" /></TableCell>
                  <TableCell className="py-3"><Skeleton className="h-4 w-28 rounded" /></TableCell>
                  {canManage && <TableCell className="py-3" />}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Money}
          title={lang === 'tr' ? 'Bu dönemde maaş ödemesi yok' : 'No salary payments in this period'}
          description={
            lang === 'tr'
              ? 'Maaş ödemesi yapıldığında burada görünecek.'
              : 'Salary payments will appear here once recorded.'
          }
        />
      ) : (
        <div className="rounded-xl border border-black/[0.07] bg-bg1">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-black/[0.07]">
                <TableHead className="text-xs font-medium text-black/40">
                  {lang === 'tr' ? 'Çalışan' : 'Employee'}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/40">
                  {lang === 'tr' ? 'Dönem' : 'Period'}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/40 text-right">
                  {lang === 'tr' ? 'Tutar' : 'Amount'}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/40">
                  {lang === 'tr' ? 'Ödeme Tarihi' : 'Paid Date'}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/40">
                  {lang === 'tr' ? 'Notlar' : 'Notes'}
                </TableHead>
                {canManage && <TableHead className="w-14" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment) => {
                const emp = employeeMap.get(payment.employee_id)
                const paidDate = new Date(payment.paid_at).toLocaleDateString(
                  lang === 'tr' ? 'tr-TR' : 'en-US',
                  { day: 'numeric', month: 'short', year: 'numeric' },
                )

                return (
                  <TableRow
                    key={payment.id}
                    className="group border-b border-black/[0.06] last:border-0"
                  >
                    {/* Employee */}
                    <TableCell className="py-3">
                      <p className="text-sm font-medium text-black">
                        {emp?.full_name ?? payment.employee_id.slice(0, 8)}
                      </p>
                      {emp && (
                        <p className="mt-0.5 text-xs text-black/40">{emp.role}</p>
                      )}
                    </TableCell>

                    {/* Period */}
                    <TableCell className="py-3 text-sm text-black/60">
                      {payment.period || '—'}
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="py-3 text-right tabular-nums text-sm font-semibold text-black/80">
                      {fmtTL(payment.amount_tl)}{' '}
                      <span className="text-xs font-normal text-black/40">TL</span>
                    </TableCell>

                    {/* Paid Date */}
                    <TableCell className="py-3 text-xs text-black/50 tabular-nums">
                      {paidDate}
                    </TableCell>

                    {/* Notes */}
                    <TableCell className="py-3 text-xs text-black/40 max-w-48 truncate">
                      {payment.notes ?? '—'}
                    </TableCell>

                    {/* Edit */}
                    {canManage && (
                      <TableCell className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            setEditingPayment(payment)
                            setEditingEmployee(emp ?? null)
                          }}
                          title={lang === 'tr' ? 'Düzenle' : 'Edit'}
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
      )}

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
  )
}
