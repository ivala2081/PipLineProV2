import { useState, useMemo } from 'react'
import {
  CurrencyCircleDollar,
  ArrowLeft,
  ArrowRight,
  PencilSimple,
  Trash,
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
import { useToast } from '@/hooks/useToast'
import {
  useBonusPaymentsQuery,
  useBonusAgreementsQuery,
  useBonusMutations,
  useHrSettingsQuery,
  type HrEmployee,
  type HrBonusPayment,
} from '@/hooks/queries/useHrQuery'
import { BonusPaymentDialog } from './bonuses/BonusPaymentDialog'

/* ------------------------------------------------------------------ */

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface PaymentsTabProps {
  employees: HrEmployee[]
  canManage: boolean
  lang: 'tr' | 'en'
}

export function PaymentsTab({ employees, canManage, lang }: PaymentsTabProps) {
  const { toast } = useToast()
  const { data: allPayments = [], isLoading } = useBonusPaymentsQuery()
  const { data: agreements = [] } = useBonusAgreementsQuery()
  const { deletePayment } = useBonusMutations()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-based
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const { data: hrSettings } = useHrSettingsQuery()
  const settingsRoles = hrSettings?.roles ?? []
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<HrBonusPayment | null>(null)

  const monthName = lang === 'tr' ? MONTH_NAMES_TR[month - 1] : MONTH_NAMES_EN[month - 1]

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  // Build agreement lookup map
  const agreementMap = useMemo(
    () => new Map(agreements.map((a) => [a.id, a])),
    [agreements],
  )

  // Filter: paid status only, within the selected month by paid_at
  const filtered = useMemo(() => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const q = search.trim().toLowerCase()
    return allPayments.filter((p) => {
      // Only paid entries
      if (p.status && p.status !== 'paid') return false
      // Filter by month (based on paid_at or created_at fallback)
      const dateStr = p.paid_at ?? p.created_at.slice(0, 10)
      if (!dateStr.startsWith(monthStr)) return false
      // Get employee for dept filter and text search
      const emp = employees.find((e) => e.id === p.employee_id)
      // Dept filter
      if (deptFilter !== 'all' && emp?.role !== deptFilter) return false
      // Text search (name + email)
      if (q && !emp?.full_name.toLowerCase().includes(q) && !emp?.email.toLowerCase().includes(q)) return false
      return true
    })
  }, [allPayments, year, month, search, deptFilter, employees])

  const totalUsdt = useMemo(
    () => filtered.reduce((s, p) => s + p.amount_usdt, 0),
    [filtered],
  )

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deletePayment.mutateAsync(id)
      toast({ title: lang === 'tr' ? 'Ödeme silindi' : 'Payment deleted', variant: 'success' })
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

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
          <CurrencyCircleDollar size={16} className="shrink-0 text-purple" />
          <span className="text-xs text-black/50">
            {lang === 'tr' ? 'Toplam Ödeme' : 'Total Paid'}&nbsp;—&nbsp;
            <span className="font-semibold text-black/80">
              {totalUsdt.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              USDT
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
                  {lang === 'tr' ? 'Anlaşma' : 'Agreement'}
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
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-b border-black/[0.06] last:border-0">
                  <TableCell className="py-3"><Skeleton className="h-4 w-32 rounded" /></TableCell>
                  <TableCell className="py-3"><Skeleton className="h-4 w-40 rounded" /></TableCell>
                  <TableCell className="py-3"><Skeleton className="h-4 w-24 rounded" /></TableCell>
                  <TableCell className="py-3"><Skeleton className="h-4 w-20 rounded ml-auto" /></TableCell>
                  <TableCell className="py-3"><Skeleton className="h-4 w-24 rounded" /></TableCell>
                  {canManage && <TableCell className="py-3" />}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CurrencyCircleDollar}
          title={lang === 'tr' ? 'Bu dönemde ödeme kaydı yok' : 'No payments in this period'}
          description={
            lang === 'tr'
              ? 'Toplu ödeme yapıldığında veya tekil ödeme eklendiğinde burada görünecek.'
              : 'Payments will appear here after bulk payout or individual payment is recorded.'
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
                  {lang === 'tr' ? 'Anlaşma' : 'Agreement'}
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
                {canManage && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment) => {
                const emp = employees.find((e) => e.id === payment.employee_id)
                const agreement = payment.agreement_id ? agreementMap.get(payment.agreement_id) : null
                const paidDate = payment.paid_at
                  ? new Date(payment.paid_at).toLocaleDateString(
                      lang === 'tr' ? 'tr-TR' : 'en-US',
                      { day: 'numeric', month: 'short', year: 'numeric' },
                    )
                  : '—'

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

                    {/* Agreement */}
                    <TableCell className="py-3 text-sm text-black/60">
                      {agreement?.title ?? '—'}
                    </TableCell>

                    {/* Period */}
                    <TableCell className="py-3 text-sm text-black/60">
                      {payment.period || '—'}
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="py-3 text-right tabular-nums text-sm font-semibold text-black/80">
                      {payment.amount_usdt.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span className="text-xs font-normal text-black/40">USDT</span>
                    </TableCell>

                    {/* Paid Date */}
                    <TableCell className="py-3 text-xs text-black/50 tabular-nums">
                      {paidDate}
                    </TableCell>

                    {/* Actions */}
                    {canManage && (
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => setEditingPayment(payment)}
                            title={lang === 'tr' ? 'Düzenle' : 'Edit'}
                          >
                            <PencilSimple size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-red opacity-0 hover:bg-red/10 group-hover:opacity-100"
                            disabled={deletingId === payment.id}
                            onClick={() => void handleDelete(payment.id)}
                            title={lang === 'tr' ? 'Sil' : 'Delete'}
                          >
                            <Trash size={14} />
                          </Button>
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

      {/* Edit payment dialog */}
      <BonusPaymentDialog
        open={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        existingPayment={editingPayment}
        employees={employees}
      />
    </div>
  )
}
