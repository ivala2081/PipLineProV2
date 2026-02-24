import { useState, useMemo } from 'react'
import {
  CurrencyDollar,
  Plus,
  MagnifyingGlass,
  DotsThree,
  PencilSimple,
  Trash,
  CheckCircle,
  XCircle,
  Money,
  Megaphone,
  ArrowsClockwise,
  Buildings,
  GearSix,
  CheckFat,
} from '@phosphor-icons/react'
import {
  Button,
  Input,
  Tag,
  EmptyState,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useBonusAgreementsQuery,
  useBonusPaymentsQuery,
  useBonusMutations,
  useAdvancesQuery,
  useVariablePendingQuery,
  type HrBonusAgreement,
  type HrBonusPayment,
  type HrEmployee,
  type BulkPayoutItem,
} from '@/hooks/queries/useHrQuery'
import { BonusAgreementDialog } from './BonusAgreementDialog'
import { BonusPaymentDialog } from './BonusPaymentDialog'
import { BulkPayoutConfirmDialog } from './BulkPayoutConfirmDialog'
import { VariablePendingDialog } from './VariablePendingDialog'
import { AutoBonusTab } from './AutoBonusTab'
import { MtConfigTab } from './MtConfigTab'
import type { HrBonusType } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function getBonusTypeTag(type: HrBonusType) {
  const map: Record<
    HrBonusType,
    { variant: 'blue' | 'purple' | 'green' | 'orange'; label: string; labelTr: string }
  > = {
    fixed: { variant: 'blue', label: 'Fixed', labelTr: 'Sabit' },
    variable: { variant: 'orange', label: 'Variable', labelTr: 'Değişken' },
    percentage: { variant: 'purple', label: 'Percentage', labelTr: 'Yüzdelik' },
    tiered: { variant: 'green', label: 'Tiered', labelTr: 'Kademeli' },
    custom: { variant: 'orange', label: 'Custom', labelTr: 'Özel' },
  }
  return map[type] ?? { variant: 'blue', label: type, labelTr: type }
}

function StatPill({ label, value, variant }: { label: string; value: string; variant: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
      <span className={`text-lg font-bold tabular-nums ${variant}`}>{value}</span>
      <span className="text-xs text-black/50">{label}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bonuses Tab (embedded inside HR page)                              */
/* ------------------------------------------------------------------ */

interface BonusesTabProps {
  employees: HrEmployee[]
  canManage: boolean
  lang: 'tr' | 'en'
  onAddRef?: (fn: () => void) => void
}

// Roles that use automatic bonus calculation — excluded from manual agreements
const AUTO_BONUS_ROLES = ['Marketing', 'Re-attention'] as const

type DeptTab = 'marketing' | 'reattention' | 'other' | 'config'

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

export function BonusesTab({ employees, canManage, lang, onAddRef }: BonusesTabProps) {
  const { toast } = useToast()

  const { data: agreements = [], isLoading } = useBonusAgreementsQuery()
  const { data: payments = [] } = useBonusPaymentsQuery()
  const { data: variablePending = [] } = useVariablePendingQuery()
  const { deleteAgreement, deletePayment } = useBonusMutations()

  const now = new Date()
  const [otherYear, setOtherYear] = useState(now.getFullYear())
  const [otherMonth, setOtherMonth] = useState(now.getMonth() + 1)
  const [deptTab, setDeptTab] = useState<DeptTab>('marketing')
  const [otherSubTab, setOtherSubTab] = useState<'agreements' | 'pending'>('agreements')
  const [search, setSearch] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false)
  const [editAgreement, setEditAgreement] = useState<HrBonusAgreement | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentAgreement, setPaymentAgreement] = useState<HrBonusAgreement | null>(null)
  const [variablePendingDialogOpen, setVariablePendingDialogOpen] = useState(false)
  const [variablePendingAgreement, setVariablePendingAgreement] = useState<HrBonusAgreement | null>(null)
  const [bulkPayoutOpen, setBulkPayoutOpen] = useState(false)

  const { data: advances = [] } = useAdvancesQuery(otherYear, otherMonth)

  // Only non-auto-bonus employees can have manual agreements
  const manualBonusEmployees = useMemo(
    () => employees.filter((e) => !(AUTO_BONUS_ROLES as readonly string[]).includes(e.role)),
    [employees],
  )

  const employeeMap = useMemo(() => {
    const map = new Map<string, HrEmployee>()
    employees.forEach((e) => map.set(e.id, e))
    return map
  }, [employees])

  const filtered = useMemo(() => {
    let list = agreements
    if (employeeFilter !== 'all') list = list.filter((a) => a.employee_id === employeeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((a) => {
        const emp = employeeMap.get(a.employee_id)
        return a.title.toLowerCase().includes(q) || emp?.full_name.toLowerCase().includes(q)
      })
    }
    return list
  }, [agreements, search, employeeFilter, employeeMap])

  const stats = useMemo(() => {
    const totalAgreements = agreements.length
    const activeAgreements = agreements.filter((a) => a.is_active).length
    const totalPaid = payments.reduce((s, p) => s + p.amount_usdt, 0)
    const uniqueEmployees = new Set(agreements.map((a) => a.employee_id)).size
    return { totalAgreements, activeAgreements, totalPaid, uniqueEmployees }
  }, [agreements, payments])

  // Bonus advances for the selected other-dept period
  const bonusAdvancesByEmp = useMemo(() => {
    const m = new Map<string, number>()
    for (const adv of advances) {
      if (adv.advance_type !== 'bonus') continue
      m.set(adv.hr_employee_id, (m.get(adv.hr_employee_id) ?? 0) + adv.amount)
    }
    return m
  }, [advances])

  // Period label for bulk payout
  const otherPeriodLabel = `${lang === 'tr' ? MONTH_NAMES_TR[otherMonth - 1] : MONTH_NAMES_EN[otherMonth - 1]} ${otherYear}`

  // Variable pending entries for the currently selected period
  const variablePendingForPeriod = useMemo(
    () => variablePending.filter((p) => p.period === otherPeriodLabel),
    [variablePending, otherPeriodLabel],
  )

  // Map from agreement_id → pending entry (for the current period)
  const variablePendingByAgreement = useMemo(() => {
    const m = new Map<string, HrBonusPayment>()
    for (const p of variablePendingForPeriod) {
      if (p.agreement_id) m.set(p.agreement_id, p)
    }
    return m
  }, [variablePendingForPeriod])

  // Agreement IDs already paid for the selected period (used to hide from pending table)
  const paidAgreementIdsForPeriod = useMemo(() => {
    return new Set(
      payments
        .filter(
          (p) =>
            p.period === otherPeriodLabel &&
            (!p.status || p.status === 'paid') &&
            p.agreement_id,
        )
        .map((p) => p.agreement_id!),
    )
  }, [payments, otherPeriodLabel])

  // Build bulk payout items for "other" departments (fixed + variable pending, excluding already-paid)
  const otherBulkItems = useMemo((): BulkPayoutItem[] => {
    // Fixed agreement items — exclude already-paid for this period
    const fixedItems = filtered
      .filter(
        (a) =>
          a.is_active &&
          a.bonus_type === 'fixed' &&
          a.fixed_amount > 0 &&
          !paidAgreementIdsForPeriod.has(a.id),
      )
      .map((a) => {
        const emp = employeeMap.get(a.employee_id)
        return {
          employee_id: a.employee_id,
          employee_name: emp?.full_name ?? '—',
          amount_usdt: a.fixed_amount,
          period: otherPeriodLabel,
          description: `${a.title} — ${emp?.full_name ?? ''} (${otherPeriodLabel})`,
          agreement_id: a.id,
        }
      })

    // Variable pending items for the selected period (already excludes paid by query)
    const variableItems = variablePendingForPeriod
      .filter((p) => {
        const agr = agreements.find((a) => a.id === p.agreement_id)
        return agr?.is_active
      })
      .map((p) => {
        const emp = employeeMap.get(p.employee_id)
        const agr = agreements.find((a) => a.id === p.agreement_id)
        return {
          employee_id: p.employee_id,
          employee_name: emp?.full_name ?? '—',
          amount_usdt: p.amount_usdt,
          period: otherPeriodLabel,
          description: `${agr?.title ?? 'Değişken Prim'} — ${emp?.full_name ?? ''} (${otherPeriodLabel})`,
          pending_payment_id: p.id,
          agreement_id: p.agreement_id,
        }
      })

    return [...fixedItems, ...variableItems]
  }, [filtered, employeeMap, otherPeriodLabel, variablePendingForPeriod, agreements, paidAgreementIdsForPeriod])

  const handleAddNew = () => {
    setDeptTab('other')
    setEditAgreement(null)
    setAgreementDialogOpen(true)
  }

  if (onAddRef) onAddRef(handleAddNew)

  const handleDeleteAgreement = async (id: string) => {
    try {
      await deleteAgreement.mutateAsync(id)
      toast({ title: lang === 'tr' ? 'Anlaşma silindi' : 'Agreement deleted', variant: 'success' })
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  }

  return (
    <div className="space-y-lg">
      <Tabs value={deptTab} onValueChange={(v) => setDeptTab(v as DeptTab)}>
        <div className="flex items-center justify-between gap-sm">
          <TabsList>
            <TabsTrigger value="marketing">
              <Megaphone size={14} className="mr-1" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="reattention">
              <ArrowsClockwise size={14} className="mr-1" />
              Retention
            </TabsTrigger>
            <TabsTrigger value="other">
              <Buildings size={14} className="mr-1" />
              {lang === 'tr' ? 'Diğer Departmanlar' : 'Other Departments'}
            </TabsTrigger>
            {canManage && (
              <TabsTrigger value="config">
                <GearSix size={14} className="mr-1" />
                {lang === 'tr' ? 'MT Yapılandırma' : 'MT Config'}
              </TabsTrigger>
            )}
          </TabsList>

          {/* "Add Agreement" button — only on Other Departments tab */}
          {canManage && deptTab === 'other' && (
            <Button variant="filled" size="sm" className="h-8 shrink-0" onClick={handleAddNew}>
              <Plus size={13} weight="bold" />
              {lang === 'tr' ? 'Prim Anlaşması Ekle' : 'Add Bonus Agreement'}
            </Button>
          )}
        </div>

        <TabsContent value="marketing" className="pt-lg">
          <AutoBonusTab lang={lang} dept="marketing" canManage={canManage} />
        </TabsContent>

        <TabsContent value="reattention" className="pt-lg">
          <AutoBonusTab lang={lang} dept="reattention" canManage={canManage} />
        </TabsContent>

        <TabsContent value="other" className="pt-lg">
          <div className="space-y-lg">
            <Tabs value={otherSubTab} onValueChange={(v) => setOtherSubTab(v as 'agreements' | 'pending')}>
              <TabsList>
                <TabsTrigger value="agreements">
                  {lang === 'tr' ? 'Anlaşmalar' : 'Agreements'}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  {lang === 'tr' ? 'Bekleyen Ödemeler' : 'Pending Payments'}
                  {otherBulkItems.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-orange/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-orange">
                      {otherBulkItems.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── Sub-tab 1: Agreements ── */}
              <TabsContent value="agreements" className="pt-lg">
                <div className="space-y-md">
                  {/* Stats */}
                  {agreements.length > 0 && (
                    <div className="flex flex-wrap items-center gap-sm">
                      <StatPill
                        label={lang === 'tr' ? 'Toplam' : 'Total'}
                        value={String(stats.totalAgreements)}
                        variant="text-black"
                      />
                      <StatPill
                        label={lang === 'tr' ? 'Aktif' : 'Active'}
                        value={String(stats.activeAgreements)}
                        variant="text-green"
                      />
                    </div>
                  )}

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-sm">
                    <div className="relative min-w-48 flex-1">
                      <MagnifyingGlass
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
                      />
                      <Input
                        className="pl-9"
                        placeholder={
                          lang === 'tr'
                            ? 'Anlaşma veya çalışan ara...'
                            : 'Search agreement or employee...'
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="w-56">
                      <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={lang === 'tr' ? 'Çalışana göre filtrele' : 'Filter by employee'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {lang === 'tr' ? 'Tüm Çalışanlar' : 'All Employees'}
                          </SelectItem>
                          {manualBonusEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Agreements table */}
                  {isLoading ? (
                    <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <EmptyState
                      icon={CurrencyDollar}
                      title={
                        search || employeeFilter !== 'all'
                          ? lang === 'tr'
                            ? 'Eşleşen anlaşma bulunamadı'
                            : 'No matching agreements'
                          : lang === 'tr'
                            ? 'Henüz prim anlaşması yok'
                            : 'No bonus agreements yet'
                      }
                      description={
                        !search && employeeFilter === 'all'
                          ? lang === 'tr'
                            ? 'Prim anlaşması eklemek için butona tıklayın.'
                            : 'Click the button to add a bonus agreement.'
                          : undefined
                      }
                      action={
                        canManage && !search && employeeFilter === 'all' ? (
                          <Button variant="filled" onClick={handleAddNew}>
                            <Plus size={16} weight="bold" />
                            {lang === 'tr' ? 'Prim Anlaşması Ekle' : 'Add Bonus Agreement'}
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-52">
                              {lang === 'tr' ? 'Çalışan' : 'Employee'}
                            </TableHead>
                            <TableHead>{lang === 'tr' ? 'Anlaşma' : 'Agreement'}</TableHead>
                            <TableHead>{lang === 'tr' ? 'Tür' : 'Type'}</TableHead>
                            <TableHead>{lang === 'tr' ? 'Tutar / Oran' : 'Amount / Rate'}</TableHead>
                            <TableHead>{lang === 'tr' ? 'Durum' : 'Status'}</TableHead>
                            <TableHead>{lang === 'tr' ? 'Toplam Ödenen' : 'Total Paid'}</TableHead>
                            <TableHead className="w-14" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((agreement) => {
                            const emp = employeeMap.get(agreement.employee_id)
                            const typeInfo = getBonusTypeTag(agreement.bonus_type as HrBonusType)
                            const empPayments = payments.filter(
                              (p) => p.agreement_id === agreement.id && (!p.status || p.status === 'paid'),
                            )
                            const totalPaid = empPayments.reduce((s, p) => s + p.amount_usdt, 0)

                            return (
                              <TableRow key={agreement.id} className="group">
                                <TableCell>
                                  <div className="flex items-center gap-sm">
                                    <span className="truncate text-sm font-medium text-black">
                                      {emp?.full_name ?? '—'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-black/80">
                                      {agreement.title}
                                    </p>
                                    {agreement.description && (
                                      <p className="truncate text-[11px] text-black/40">
                                        {agreement.description}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Tag variant={typeInfo.variant}>
                                    {lang === 'tr' ? typeInfo.labelTr : typeInfo.label}
                                  </Tag>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm tabular-nums font-medium text-black/70">
                                    {agreement.bonus_type === 'fixed' && (
                                      <>{agreement.fixed_amount.toLocaleString()} USDT</>
                                    )}
                                    {agreement.bonus_type === 'variable' && (
                                      <span className="text-xs text-black/40">
                                        {lang === 'tr' ? 'Değişken' : 'Variable'}
                                      </span>
                                    )}
                                    {agreement.bonus_type === 'percentage' && (
                                      <>
                                        %{agreement.percentage_rate}
                                        {agreement.percentage_base
                                          ? ` (${agreement.percentage_base})`
                                          : ''}
                                      </>
                                    )}
                                    {agreement.bonus_type === 'tiered' && (
                                      <>{lang === 'tr' ? 'Kademeli' : 'Tiered'}</>
                                    )}
                                    {agreement.bonus_type === 'custom' && (
                                      <>{lang === 'tr' ? 'Özel' : 'Custom'}</>
                                    )}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {agreement.is_active ? (
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle size={14} weight="fill" className="text-green" />
                                      <span className="text-xs text-green">
                                        {lang === 'tr' ? 'Aktif' : 'Active'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <XCircle size={14} weight="fill" className="text-black/30" />
                                      <span className="text-xs text-black/40">
                                        {lang === 'tr' ? 'Pasif' : 'Inactive'}
                                      </span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm tabular-nums font-semibold text-purple">
                                    {totalPaid > 0
                                      ? `${totalPaid.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2 })} USDT`
                                      : '—'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {canManage && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="opacity-0 group-hover:opacity-100 h-7 w-7"
                                          >
                                            <DotsThree size={16} weight="bold" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          {agreement.bonus_type === 'variable' && (
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setVariablePendingAgreement(agreement)
                                                setVariablePendingDialogOpen(true)
                                              }}
                                            >
                                              <CurrencyDollar size={14} />
                                              {lang === 'tr' ? 'Değişken Prim Gir' : 'Enter Variable Bonus'}
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setEditAgreement(agreement)
                                              setAgreementDialogOpen(true)
                                            }}
                                          >
                                            <PencilSimple size={14} />
                                            {lang === 'tr' ? 'Düzenle' : 'Edit'}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => void handleDeleteAgreement(agreement.id)}
                                            className="text-red focus:text-red"
                                          >
                                            <Trash size={14} />
                                            {lang === 'tr' ? 'Sil' : 'Delete'}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Sub-tab 2: Pending Payments ── */}
              <TabsContent value="pending" className="pt-lg">
                <div className="space-y-md">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <div className="flex flex-wrap items-center gap-sm">
                      {/* Period filter */}
                      <Select value={String(otherMonth)} onValueChange={(v) => setOtherMonth(Number(v))}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(lang === 'tr' ? MONTH_NAMES_TR : MONTH_NAMES_EN).map((m, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={String(otherYear)} onValueChange={(v) => setOtherYear(Number(v))}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 3 }, (_, i) => now.getFullYear() - i).map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {canManage && otherBulkItems.length > 0 && (
                      <Button variant="filled" size="sm" onClick={() => setBulkPayoutOpen(true)}>
                        <CheckFat size={14} weight="fill" />
                        {lang === 'tr' ? 'Toplu Ödendi İşaretle' : 'Mark All Paid'}
                      </Button>
                    )}
                  </div>

                  {/* Pending payments table */}
                  {otherBulkItems.length === 0 ? (
                    <EmptyState
                      icon={CheckCircle}
                      title={
                        lang === 'tr'
                          ? 'Bekleyen ödeme yok'
                          : 'No pending payments'
                      }
                      description={
                        lang === 'tr'
                          ? `${otherPeriodLabel} dönemi için tüm ödemeler tamamlanmış veya henüz anlaşma eklenmemiş.`
                          : `All payments for ${otherPeriodLabel} have been completed, or no agreements have been added yet.`
                      }
                    />
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-52">
                              {lang === 'tr' ? 'Çalışan' : 'Employee'}
                            </TableHead>
                            <TableHead>{lang === 'tr' ? 'Anlaşma' : 'Agreement'}</TableHead>
                            <TableHead className="text-right">
                              {lang === 'tr' ? 'Tutar (USDT)' : 'Amount (USDT)'}
                            </TableHead>
                            <TableHead className="text-right">
                              {lang === 'tr' ? 'Avans' : 'Advance'}
                            </TableHead>
                            <TableHead className="text-right">
                              {lang === 'tr' ? 'Net Ödeme' : 'Net Payment'}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {otherBulkItems.map((item) => {
                            const emp = employeeMap.get(item.employee_id)
                            const agr = item.agreement_id
                              ? agreements.find((a) => a.id === item.agreement_id)
                              : null
                            const empAdvance = bonusAdvancesByEmp.get(item.employee_id) ?? 0
                            const net = Math.max(0, item.amount_usdt - empAdvance)
                            return (
                              <TableRow key={item.agreement_id ?? item.employee_id}>
                                <TableCell>
                                  <span className="truncate text-sm font-medium text-black">
                                    {emp?.full_name ?? item.employee_name}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-black/60">
                                    {agr?.title ?? '—'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="tabular-nums text-sm font-semibold text-purple">
                                    {item.amount_usdt.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                                      minimumFractionDigits: 2,
                                    })}{' '}
                                    USDT
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {empAdvance > 0 ? (
                                    <span className="tabular-nums text-sm font-semibold text-orange">
                                      -{empAdvance.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                                        minimumFractionDigits: 2,
                                      })}{' '}
                                      USDT
                                    </span>
                                  ) : (
                                    <span className="text-xs text-black/30">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="tabular-nums text-sm font-bold text-green">
                                    {net.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                                      minimumFractionDigits: 2,
                                    })}{' '}
                                    USDT
                                  </span>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          {/* Total row */}
                          {otherBulkItems.length > 1 && (
                            <TableRow className="bg-black/[0.02]">
                              <TableCell
                                colSpan={4}
                                className="text-right text-xs font-semibold text-black/50"
                              >
                                {lang === 'tr' ? 'Toplam' : 'Total'}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="tabular-nums text-sm font-bold text-green">
                                  {otherBulkItems
                                    .reduce((s, i) => {
                                      const adv = bonusAdvancesByEmp.get(i.employee_id) ?? 0
                                      return s + Math.max(0, i.amount_usdt - adv)
                                    }, 0)
                                    .toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                                      minimumFractionDigits: 2,
                                    })}{' '}
                                  USDT
                                </span>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <BonusAgreementDialog
              open={agreementDialogOpen}
              onClose={() => {
                setAgreementDialogOpen(false)
                setEditAgreement(null)
              }}
              agreement={editAgreement}
              employees={manualBonusEmployees}
            />
            <BonusPaymentDialog
              open={paymentDialogOpen}
              onClose={() => {
                setPaymentDialogOpen(false)
                setPaymentAgreement(null)
              }}
              agreement={paymentAgreement ?? undefined}
              employees={manualBonusEmployees}
            />
            <VariablePendingDialog
              open={variablePendingDialogOpen}
              onClose={() => {
                setVariablePendingDialogOpen(false)
                setVariablePendingAgreement(null)
              }}
              agreement={variablePendingAgreement}
              employees={manualBonusEmployees}
              periodLabel={otherPeriodLabel}
              existingPending={
                variablePendingAgreement
                  ? (variablePendingByAgreement.get(variablePendingAgreement.id) ?? null)
                  : null
              }
            />
            <BulkPayoutConfirmDialog
              open={bulkPayoutOpen}
              onClose={() => setBulkPayoutOpen(false)}
              items={otherBulkItems}
              dept="other"
              periodLabel={otherPeriodLabel}
              lang={lang}
            />
          </div>
        </TabsContent>

        {canManage && (
          <TabsContent value="config" className="pt-lg">
            <MtConfigTab lang={lang} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
