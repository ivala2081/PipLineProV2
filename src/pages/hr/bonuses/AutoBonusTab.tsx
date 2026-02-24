import { useState, useMemo, useEffect } from 'react'
import {
  TrendUp,
  Trophy,
  Star,
  ChartBar,
  Trash,
  CheckFat,
  Money,
} from '@phosphor-icons/react'
import { localYMD } from '@/lib/date'
import {
  Tag,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  EmptyState,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
} from '@ds'
import {
  useAutoBonusTransfersQuery,
  useHrEmployeesQuery,
  useMtConfigQuery,
  useReConfigQuery,
  useBonusPaymentsQuery,
  useBonusMutations,
  useAdvancesQuery,
  type HrEmployee,
  type AutoBonusTransfer,
  type HrBonusPayment,
  type MtConfig,
  type MtTier,
  type ReConfig,
  type ReTier,
  type BulkPayoutItem,
} from '@/hooks/queries/useHrQuery'
import { useToast } from '@/hooks/useToast'
import { BulkPayoutConfirmDialog } from './BulkPayoutConfirmDialog'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'

/* ------------------------------------------------------------------ */
/*  Pure calculation helpers (accept tiers as params)                  */
/* ------------------------------------------------------------------ */

function getMtDepositBonus(amountUsd: number, tiers: MtTier[]): number {
  for (const tier of tiers) {
    if (amountUsd >= tier.min) return tier.bonus
  }
  return 0
}

function getMtCountBonus(count: number, tiers: MtTier[]): number {
  for (const tier of tiers) {
    if (count >= tier.min) return tier.bonus
  }
  return 0
}

function getMtVolumeBonus(volumeUsd: number, tiers: MtTier[]): number {
  for (const tier of tiers) {
    if (volumeUsd >= tier.min) return tier.bonus
  }
  return 0
}

function getReRate(netUsd: number, tiers: ReTier[]): number {
  for (const tier of tiers) {
    if (netUsd >= tier.min) return tier.rate
  }
  return 0
}

/* ------------------------------------------------------------------ */
/*  RecentPaymentsSection (defined at module level)                    */
/* ------------------------------------------------------------------ */

interface RecentPaymentsSectionProps {
  pmts: HrBonusPayment[]
  lang: string
  employeeMap: Map<string, HrEmployee>
  canManage: boolean
  onDeletePayment: (id: string) => void
}

function RecentPaymentsSection({
  pmts,
  lang,
  employeeMap,
  canManage,
  onDeletePayment,
}: RecentPaymentsSectionProps) {
  if (pmts.length === 0) return null
  return (
    <div className="space-y-sm">
      <h3 className="text-sm font-semibold text-black/70">
        {lang === 'tr' ? 'Son Ödemeler' : 'Recent Payments'}
      </h3>
      <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
              <TableHead>{lang === 'tr' ? 'Dönem' : 'Period'}</TableHead>
              <TableHead>{lang === 'tr' ? 'Tutar (USDT)' : 'Amount (USDT)'}</TableHead>
              <TableHead>{lang === 'tr' ? 'Ödeme Tarihi' : 'Paid At'}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pmts.slice(0, 20).map((p) => {
              const emp = employeeMap.get(p.employee_id)
              return (
                <TableRow key={p.id} className="group">
                  <TableCell>
                    <span className="text-sm font-medium text-black/80">
                      {emp?.full_name ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Tag variant="blue">{p.period || '—'}</Tag>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums font-semibold text-purple">
                      {p.amount_usdt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USDT
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums text-black/50">
                      {p.paid_at
                        ? new Date(p.paid_at).toLocaleDateString(
                            lang === 'tr' ? 'tr-TR' : 'en-US',
                            { year: 'numeric', month: 'short', day: 'numeric' },
                          )
                        : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-red/50 opacity-0 hover:text-red group-hover:opacity-100"
                        onClick={() => onDeletePayment(p.id)}
                      >
                        <Trash size={14} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface MtEmployeeStat {
  employee: HrEmployee
  firstDeposits: AutoBonusTransfer[]
  count: number
  totalVolumeUsd: number
  depositBonus: number // sum of per-deposit tier bonuses
  countBonus: number
  volumeBonus: number
  weeklyPrize: number
  monthlyPrize: boolean // true if this employee won the monthly prize
  totalBonus: number
}

interface ReEmployeeStat {
  employee: HrEmployee
  totalDepositsUsd: number
  totalWithdrawalsUsd: number
  netUsd: number
  bonus: number
}

/* ------------------------------------------------------------------ */
/*  Calculation helpers                                                 */
/* ------------------------------------------------------------------ */

/** Get Monday of the week for a given date string (YYYY-MM-DDTHH:MM:SS) */
function getMondayKey(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return localYMD(monday)
}

function computeMtStats(
  employees: HrEmployee[],
  transfers: AutoBonusTransfer[],
  config: MtConfig,
): MtEmployeeStat[] {
  const marketingEmps = employees.filter((e) => e.role === 'Marketing' && e.is_active)
  if (marketingEmps.length === 0) return []

  const empStats = marketingEmps.map((emp) => {
    const firstDeposits = transfers.filter(
      (t) => t.employee_id === emp.id && t.category_id === 'dep',
    )
    const count = firstDeposits.length
    const totalVolumeUsd = firstDeposits.reduce((s, t) => s + Math.abs(t.amount_usd), 0)
    const depositBonus = firstDeposits.reduce(
      (s, t) => s + getMtDepositBonus(Math.abs(t.amount_usd), config.deposit_tiers),
      0,
    )
    const countBonus = getMtCountBonus(count, config.count_tiers)
    const volumeBonus = getMtVolumeBonus(totalVolumeUsd, config.volume_tiers)

    return {
      employee: emp,
      firstDeposits,
      count,
      totalVolumeUsd,
      depositBonus,
      countBonus,
      volumeBonus,
      weeklyPrize: 0,
      monthlyPrize: false,
      totalBonus: 0,
    } as MtEmployeeStat
  })

  // Weekly prizes
  const weeklyEmpCounts = new Map<string, Map<string, { count: number; volume: number }>>()
  for (const stat of empStats) {
    for (const t of stat.firstDeposits) {
      const weekKey = getMondayKey(t.transfer_date)
      if (!weeklyEmpCounts.has(weekKey)) weeklyEmpCounts.set(weekKey, new Map())
      const empMap = weeklyEmpCounts.get(weekKey)!
      const existing = empMap.get(stat.employee.id) ?? { count: 0, volume: 0 }
      empMap.set(stat.employee.id, {
        count: existing.count + 1,
        volume: existing.volume + Math.abs(t.amount_usd),
      })
    }
  }
  const weeklyWinnerMap = new Map<string, string>()
  for (const [weekKey, empMap] of weeklyEmpCounts.entries()) {
    let best: { empId: string; count: number; volume: number } | null = null
    for (const [empId, data] of empMap.entries()) {
      if (data.count < config.weekly_prize_min_sales) continue
      if (
        !best ||
        data.count > best.count ||
        (data.count === best.count && data.volume > best.volume)
      ) {
        best = { empId, ...data }
      }
    }
    if (best) weeklyWinnerMap.set(weekKey, best.empId)
  }
  const weeklyPrizeMap = new Map<string, number>()
  for (const winnerId of weeklyWinnerMap.values()) {
    weeklyPrizeMap.set(winnerId, (weeklyPrizeMap.get(winnerId) ?? 0) + config.weekly_prize_amount)
  }

  // Monthly prize
  let monthlyWinner: MtEmployeeStat | null = null
  for (const stat of empStats) {
    if (stat.count < config.monthly_prize_min_sales) continue
    if (
      !monthlyWinner ||
      stat.count > monthlyWinner.count ||
      (stat.count === monthlyWinner.count && stat.totalVolumeUsd > monthlyWinner.totalVolumeUsd)
    ) {
      monthlyWinner = stat
    }
  }

  return empStats.map((stat) => {
    const weeklyPrize = weeklyPrizeMap.get(stat.employee.id) ?? 0
    const monthlyPrize = monthlyWinner?.employee.id === stat.employee.id
    const totalBonus =
      stat.depositBonus +
      stat.countBonus +
      stat.volumeBonus +
      weeklyPrize +
      (monthlyPrize ? config.monthly_prize_amount : 0)
    return { ...stat, weeklyPrize, monthlyPrize, totalBonus }
  })
}

function computeReStats(employees: HrEmployee[], transfers: AutoBonusTransfer[], config: ReConfig): ReEmployeeStat[] {
  const reEmps = employees.filter((e) => e.role === 'Re-attention' && e.is_active)
  return reEmps.map((emp) => {
    const empTransfers = transfers.filter((t) => t.employee_id === emp.id)
    const totalDepositsUsd = empTransfers
      .filter((t) => t.category_id === 'dep')
      .reduce((s, t) => s + Math.abs(t.amount_usd), 0)
    const totalWithdrawalsUsd = empTransfers
      .filter((t) => t.category_id === 'wd')
      .reduce((s, t) => s + Math.abs(t.amount_usd), 0)
    const netUsd = totalDepositsUsd - totalWithdrawalsUsd
    const rate = getReRate(netUsd, config.rate_tiers)
    const bonus = netUsd > 0 ? Math.round(netUsd * (rate / 100) * 100) / 100 : 0
    return { employee: emp, totalDepositsUsd, totalWithdrawalsUsd, netUsd, bonus }
  })
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function fmt(n: number, digits = 2) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
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

function BonusCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-black/30">—</span>
  return <span className="text-sm tabular-nums font-semibold text-purple">{fmt(value)} USDT</span>
}

function EmpAvatar({ emp }: { emp: HrEmployee }) {
  // Avatar removed as per design change; return null to avoid rendering initials
  return null
}

/* ------------------------------------------------------------------ */
/*  Auto Bonus Payment Dialog                                           */
/* ------------------------------------------------------------------ */

interface AutoPayTarget {
  employee: HrEmployee
  amount: number
  period: string
}

function AutoBonusPaymentDialog({
  open,
  onClose,
  target,
  lang,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  target: AutoPayTarget | null
  lang: 'tr' | 'en'
  onConfirm: (amount: number) => Promise<void>
  isPending: boolean
}) {
  const [amountDisplay, setAmountDisplay] = useState('')
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    if (open && target) {
      setAmount(target.amount)
      setAmountDisplay(target.amount > 0 ? numberToDisplay(target.amount, lang) : '')
    }
  }, [open, target, lang])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Money size={18} className="text-brand" weight="duotone" />
            {lang === 'tr' ? 'Prim Ödemesi' : 'Bonus Payment'}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/55">
            {target && (
              <span className="font-medium text-black/70">{target.employee.full_name}</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-md">
          <div>
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
              {lang === 'tr' ? 'Dönem' : 'Period'}
            </Label>
            <Input
              value={target?.period ?? ''}
              readOnly
              className="cursor-not-allowed opacity-60"
            />
          </div>
          <div>
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
              {lang === 'tr' ? 'Tutar (USDT)' : 'Amount (USDT)'}
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amountDisplay}
              onChange={(e) => {
                const formatted = formatAmount(e.target.value, lang)
                setAmountDisplay(formatted)
                setAmount(parseAmount(formatted, lang))
              }}
              placeholder={amountPlaceholder(lang)}
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="filled"
              size="sm"
              disabled={isPending || amount <= 0}
              onClick={() => void onConfirm(amount)}
            >
              {isPending
                ? lang === 'tr'
                  ? 'Kaydediliyor...'
                  : 'Saving...'
                : lang === 'tr'
                  ? 'Ödemeyi Kaydet'
                  : 'Save Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface PeriodSelectorProps {
  year: number
  month: number
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
  lang: 'tr' | 'en'
}

function PeriodSelector({ year, month, onYearChange, onMonthChange, lang }: PeriodSelectorProps) {
  const months =
    lang === 'tr'
      ? [
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
      : [
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
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)

  return (
    <div className="flex items-center gap-sm">
      <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Marketing Tab                                                       */
/* ------------------------------------------------------------------ */

function MarketingBonusTable({
  stats,
  isLoading,
  lang,
  config,
  advancesByEmp,
  canManage = false,
  paidEmployeeIds,
  onPayEmployee,
}: {
  stats: MtEmployeeStat[]
  isLoading: boolean
  lang: 'tr' | 'en'
  config: MtConfig | undefined
  advancesByEmp: Map<string, number>
  canManage?: boolean
  paidEmployeeIds?: Set<string>
  onPayEmployee?: (emp: HrEmployee, amount: number) => void
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <EmptyState
        icon={ChartBar}
        title={lang === 'tr' ? 'Marketing çalışanı yok' : 'No Marketing employees'}
        description={
          lang === 'tr'
            ? 'İK modülünden Marketing rolünde çalışan ekleyin.'
            : 'Add employees with Marketing role in the HR module.'
        }
      />
    )
  }

  const unpaidStats = stats.filter((s) => !paidEmployeeIds?.has(s.employee.id))

  if (unpaidStats.length === 0) {
    return (
      <EmptyState
        icon={ChartBar}
        title={lang === 'tr' ? 'Tüm primler ödendi' : 'All bonuses paid'}
        description={
          lang === 'tr'
            ? 'Bu dönem için tüm Marketing primleri ödenmiştir.'
            : 'All Marketing bonuses for this period have been paid.'
        }
      />
    )
  }

  // Find monthly winner
  const monthlyWinner = stats.find((s) => s.monthlyPrize)

  return (
    <div className="space-y-lg">
      {/* Monthly winner banner */}
      {monthlyWinner && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-400/30 bg-yellow-400/[0.06] px-4 py-3">
          <Trophy size={18} weight="duotone" className="shrink-0 text-yellow-500" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-yellow-700">
              {lang === 'tr' ? 'Ayın Birincisi' : 'Monthly Winner'} (+
              {config?.monthly_prize_amount ?? 200} USDT)
            </p>
            <p className="truncate text-sm font-bold text-yellow-800">
              {monthlyWinner.employee.full_name} —{' '}
              {lang === 'tr' ? `${monthlyWinner.count} satış` : `${monthlyWinner.count} sales`}
            </p>
          </div>
        </div>
      )}

      {/* Summary table */}
      <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
              <TableHead className="text-right">{lang === 'tr' ? 'FD Adet' : 'FD Count'}</TableHead>
              <TableHead className="text-right">
                {lang === 'tr' ? 'Dep. Prim' : 'Dep. Bonus'}
              </TableHead>
              <TableHead className="text-right">
                {lang === 'tr' ? 'Adet Prim' : 'Count Bonus'}
              </TableHead>
              <TableHead className="text-right">
                {lang === 'tr' ? 'Hacim Prim' : 'Vol. Bonus'}
              </TableHead>
              <TableHead className="text-right">{lang === 'tr' ? 'Ödül' : 'Prize'}</TableHead>
              <TableHead className="text-right">{lang === 'tr' ? 'Avans' : 'Advance'}</TableHead>
              <TableHead className="text-right">
                {lang === 'tr' ? 'Net Prim' : 'Net Bonus'}
              </TableHead>
              {canManage && <TableHead className="w-28" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats
              .filter((s) => !paidEmployeeIds?.has(s.employee.id))
              .sort((a, b) => b.count - a.count || b.totalVolumeUsd - a.totalVolumeUsd)
              .map((stat, idx) => {
                const advance = advancesByEmp.get(stat.employee.id) ?? 0
                const net = Math.max(0, stat.totalBonus - advance)
                return (
                  <TableRow key={stat.employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-sm">
                        <EmpAvatar emp={stat.employee} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {idx === 0 && (
                              <Star size={12} weight="fill" className="text-yellow-500" />
                            )}
                            <span className="truncate text-sm font-medium text-black">
                              {stat.employee.full_name}
                            </span>
                          </div>
                          {stat.monthlyPrize && (
                            <Tag variant="orange" className="mt-0.5 text-[10px]">
                              {lang === 'tr' ? 'Ay Birincisi' : '1st Monthly'}
                            </Tag>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="tabular-nums text-sm font-semibold text-black/80">
                        {stat.count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <BonusCell value={stat.depositBonus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <BonusCell value={stat.countBonus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <BonusCell value={stat.volumeBonus} />
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.weeklyPrize > 0 || stat.monthlyPrize ? (
                        <span className="tabular-nums text-sm font-semibold text-yellow-600">
                          {fmt(
                            stat.weeklyPrize +
                              (stat.monthlyPrize ? (config?.monthly_prize_amount ?? 200) : 0),
                          )}{' '}
                          USDT
                        </span>
                      ) : (
                        <span className="text-xs text-black/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {advance > 0 ? (
                        <span className="tabular-nums text-sm font-semibold text-orange">
                          -{fmt(advance)} USDT
                        </span>
                      ) : (
                        <span className="text-xs text-black/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.totalBonus > 0 ? (
                        <span
                          className={`tabular-nums text-sm font-bold ${advance > 0 ? 'text-blue' : 'text-green'}`}
                        >
                          {fmt(net)} USDT
                        </span>
                      ) : (
                        <span className="text-xs text-black/30">—</span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="w-28 text-right">
                        {stat.totalBonus > 0 && onPayEmployee ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => onPayEmployee(stat.employee, stat.totalBonus)}
                          >
                            <Money size={13} />
                            {lang === 'tr' ? 'Ödeme Ekle' : 'Add Payment'}
                          </Button>
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Re-attention Tab                                                    */
/* ------------------------------------------------------------------ */

function ReattentionBonusTable({
  stats,
  isLoading,
  lang,
  advancesByEmp,
  canManage = false,
  paidEmployeeIds,
  onPayEmployee,
}: {
  stats: ReEmployeeStat[]
  isLoading: boolean
  lang: 'tr' | 'en'
  advancesByEmp: Map<string, number>
  canManage?: boolean
  paidEmployeeIds?: Set<string>
  onPayEmployee?: (emp: HrEmployee, amount: number) => void
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <EmptyState
        icon={TrendUp}
        title={lang === 'tr' ? 'Re-attention çalışanı yok' : 'No Re-attention employees'}
        description={
          lang === 'tr'
            ? 'İK modülünden Re-attention rolünde çalışan ekleyin.'
            : 'Add employees with Re-attention role in the HR module.'
        }
      />
    )
  }

  const unpaidReStats = stats.filter((s) => !paidEmployeeIds?.has(s.employee.id))

  if (unpaidReStats.length === 0) {
    return (
      <EmptyState
        icon={TrendUp}
        title={lang === 'tr' ? 'Tüm primler ödendi' : 'All bonuses paid'}
        description={
          lang === 'tr'
            ? 'Bu dönem için tüm Re-attention primleri ödenmiştir.'
            : 'All Re-attention bonuses for this period have been paid.'
        }
      />
    )
  }

  return (
    <div className="space-y-lg">
      <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-52">{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
              <TableHead className="text-right">
                {lang === 'tr' ? 'Toplam Dep. (USD)' : 'Total Dep. (USD)'}
              </TableHead>
              <TableHead className="text-right">
                {lang === 'tr' ? 'Toplam Wd. (USD)' : 'Total Wd. (USD)'}
              </TableHead>
              <TableHead className="text-right">
                {lang === 'tr' ? 'Net (USD)' : 'Net (USD)'}
              </TableHead>
              <TableHead className="text-right">
                {lang === 'tr' ? 'Prim (USDT)' : 'Bonus (USDT)'}
              </TableHead>
              <TableHead className="text-right">{lang === 'tr' ? 'Avans' : 'Advance'}</TableHead>
              <TableHead className="text-right">
                {lang === 'tr' ? 'Net Prim' : 'Net Bonus'}
              </TableHead>
              {canManage && <TableHead className="w-28" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats
              .filter((s) => !paidEmployeeIds?.has(s.employee.id))
              .sort((a, b) => b.bonus - a.bonus)
              .map((stat) => {
                const advance = advancesByEmp.get(stat.employee.id) ?? 0
                const net = Math.max(0, stat.bonus - advance)
                return (
                  <TableRow key={stat.employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-sm">
                        <EmpAvatar emp={stat.employee} />
                        <span className="truncate text-sm font-medium text-black">
                          {stat.employee.full_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="tabular-nums text-sm text-green">
                        +{fmt(stat.totalDepositsUsd, 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="tabular-nums text-sm text-red">
                        −{fmt(stat.totalWithdrawalsUsd, 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`tabular-nums text-sm font-semibold ${stat.netUsd >= 0 ? 'text-blue' : 'text-red'}`}
                      >
                        {stat.netUsd >= 0 ? '+' : ''}
                        {fmt(stat.netUsd, 0)} USD
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <BonusCell value={stat.bonus} />
                    </TableCell>
                    <TableCell className="text-right">
                      {advance > 0 ? (
                        <span className="tabular-nums text-sm font-semibold text-orange">
                          -{fmt(advance)} USDT
                        </span>
                      ) : (
                        <span className="text-xs text-black/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.bonus > 0 ? (
                        <span
                          className={`tabular-nums text-sm font-bold ${advance > 0 ? 'text-blue' : 'text-green'}`}
                        >
                          {fmt(net)} USDT
                        </span>
                      ) : (
                        <span className="text-xs text-black/30">—</span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="w-28 text-right">
                        {stat.bonus > 0 && onPayEmployee ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => onPayEmployee(stat.employee, stat.bonus)}
                          >
                            <Money size={13} />
                            {lang === 'tr' ? 'Ödeme Ekle' : 'Add Payment'}
                          </Button>
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            {/* Total row */}
            {stats.length > 1 && (
              <TableRow className="bg-black/[0.02]">
                <TableCell colSpan={6} className="text-right text-xs font-semibold text-black/50">
                  {lang === 'tr' ? 'Toplam' : 'Total'}
                </TableCell>
                <TableCell className="text-right">
                  <span className="tabular-nums text-sm font-bold text-green">
                    {fmt(
                      stats.reduce((s, stat) => {
                        const advance = advancesByEmp.get(stat.employee.id) ?? 0
                        return s + Math.max(0, stat.bonus - advance)
                      }, 0),
                    )}{' '}
                    USDT
                  </span>
                </TableCell>
                {canManage && <TableCell />}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

interface AutoBonusTabProps {
  lang: 'tr' | 'en'
  /** When provided, renders only that department's section (no inner sub-tabs). */
  dept?: 'marketing' | 'reattention'
  canManage?: boolean
}

export function AutoBonusTab({ lang, dept, canManage = false }: AutoBonusTabProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [bulkPayoutOpen, setBulkPayoutOpen] = useState(false)
  const { toast } = useToast()

  const { data: employees = [], isLoading: empLoading } = useHrEmployeesQuery()
  const { data: transfers = [], isLoading: transfersLoading } = useAutoBonusTransfersQuery(
    year,
    month,
  )
  const { data: config, isLoading: configLoading } = useMtConfigQuery()
  const { data: reConfig, isLoading: reConfigLoading } = useReConfigQuery()
  const { data: allPayments = [] } = useBonusPaymentsQuery()
  const { data: advances = [] } = useAdvancesQuery(year, month)
  const { deletePayment, createPayment } = useBonusMutations()

  const [payTarget, setPayTarget] = useState<AutoPayTarget | null>(null)

  const isLoading = empLoading || transfersLoading || configLoading || reConfigLoading

  const mtStats = useMemo(
    () => (dept !== 'reattention' && config ? computeMtStats(employees, transfers, config) : []),
    [employees, transfers, config, dept],
  )
  const reStats = useMemo(
    () => (dept !== 'marketing' && reConfig ? computeReStats(employees, transfers, reConfig) : []),
    [employees, transfers, reConfig, dept],
  )

  // Period label for display and bulk payout
  const monthNames = lang === 'tr' ? MONTH_NAMES_TR : MONTH_NAMES_EN
  const periodLabel = `${monthNames[month - 1]} ${year}`

  // Build advance map per employee (bonus advances only)
  const advancesByEmp = useMemo(() => {
    const m = new Map<string, number>()
    for (const adv of advances) {
      if (adv.advance_type !== 'bonus') continue
      m.set(adv.hr_employee_id, (m.get(adv.hr_employee_id) ?? 0) + adv.amount)
    }
    return m
  }, [advances])

  // Already-paid employee IDs for this period (matched by period label, not paid_at date)
  const paidMtIds = useMemo(() => {
    const mtIds = new Set(employees.filter((e) => e.role === 'Marketing').map((e) => e.id))
    return new Set(
      allPayments
        .filter(
          (p) =>
            mtIds.has(p.employee_id) &&
            p.period === periodLabel &&
            (!p.status || p.status === 'paid'),
        )
        .map((p) => p.employee_id),
    )
  }, [allPayments, employees, periodLabel])

  const paidReIds = useMemo(() => {
    const reIds = new Set(employees.filter((e) => e.role === 'Re-attention').map((e) => e.id))
    return new Set(
      allPayments
        .filter(
          (p) =>
            reIds.has(p.employee_id) &&
            p.period === periodLabel &&
            (!p.status || p.status === 'paid'),
        )
        .map((p) => p.employee_id),
    )
  }, [allPayments, employees, periodLabel])

  const periodSelector = (
    <PeriodSelector
      year={year}
      month={month}
      onYearChange={setYear}
      onMonthChange={setMonth}
      lang={lang}
    />
  )

  // Build employee map for payment display
  const employeeMap = useMemo(() => {
    const m = new Map<string, HrEmployee>()
    employees.forEach((e) => m.set(e.id, e))
    return m
  }, [employees])

  // Payments for a dept, filtered by selected period label
  const getPaymentsForDept = (role: 'Marketing' | 'Re-attention') => {
    const deptIds = new Set(employees.filter((e) => e.role === role).map((e) => e.id))
    return allPayments.filter((p) => {
      if (!deptIds.has(p.employee_id)) return false
      return p.period === periodLabel
    })
  }

  const handleDeletePayment = async (id: string) => {
    try {
      await deletePayment.mutateAsync(id)
      toast({ title: lang === 'tr' ? 'Ödeme silindi' : 'Payment deleted', variant: 'success' })
    } catch {
      toast({ title: lang === 'tr' ? 'Hata oluştu' : 'Error occurred', variant: 'error' })
    }
  }

  // Build bulk payout items — exclude employees who already received individual payment
  const buildBulkItems = (): BulkPayoutItem[] => {
    if (dept === 'marketing') {
      return mtStats
        .filter((s) => s.totalBonus > 0 && !paidMtIds.has(s.employee.id))
        .map((s) => ({
          employee_id: s.employee.id,
          employee_name: s.employee.full_name,
          amount_usdt: s.totalBonus,
          period: periodLabel,
          description: `Marketing Primi — ${s.employee.full_name} (${periodLabel})`,
        }))
    }
    if (dept === 'reattention') {
      return reStats
        .filter((s) => s.bonus > 0 && !paidReIds.has(s.employee.id))
        .map((s) => ({
          employee_id: s.employee.id,
          employee_name: s.employee.full_name,
          amount_usdt: s.bonus,
          period: periodLabel,
          description: `Re-attention Primi — ${s.employee.full_name} (${periodLabel})`,
        }))
    }
    return []
  }

  const handlePayEmployee = (emp: HrEmployee, amount: number) => {
    setPayTarget({ employee: emp, amount, period: periodLabel })
  }

  const handleSinglePayment = async (amount: number) => {
    if (!payTarget) return
    try {
      await createPayment.mutateAsync({
        employee_id: payTarget.employee.id,
        period: payTarget.period,
        amount_usdt: amount,
        paid_at: new Date().toISOString().split('T')[0],
        agreement_id: null,
        description: `${payTarget.employee.role === 'Marketing' ? 'Marketing' : 'Re-attention'} Primi — ${payTarget.employee.full_name} (${payTarget.period})`,
      })
      toast({ title: lang === 'tr' ? 'Ödeme kaydedildi' : 'Payment recorded', variant: 'success' })
      setPayTarget(null)
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  }

  // Single-department mode (used by department tabs in BonusesTab)
  if (dept === 'marketing') {
    const total = mtStats.reduce((s, e) => s + e.totalBonus, 0)
    const pmts = getPaymentsForDept('Marketing')
    return (
      <div className="space-y-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          {periodSelector}
          <div className="flex items-center gap-sm">
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
              <span className="text-xs text-black/50">{lang === 'tr' ? 'Toplam' : 'Total'}</span>
              <span className="text-sm font-bold tabular-nums text-purple">{fmt(total)} USDT</span>
            </div>
            {canManage && !isLoading && mtStats.some((s) => s.totalBonus > 0) && (
              <Button variant="filled" size="sm" onClick={() => setBulkPayoutOpen(true)}>
                <CheckFat size={14} weight="fill" />
                {lang === 'tr' ? 'Toplu Ödendi İşaretle' : 'Mark All Paid'}
              </Button>
            )}
          </div>
        </div>
        {!isLoading && mtStats.some((s) => !paidMtIds.has(s.employee.id)) && (
          <h3 className="text-sm font-semibold text-black/70">
            {lang === 'tr' ? 'Bekleyen Ödemeler' : 'Pending Payments'}
          </h3>
        )}
        <MarketingBonusTable
          stats={mtStats}
          isLoading={isLoading}
          lang={lang}
          config={config}
          advancesByEmp={advancesByEmp}
          canManage={canManage}
          paidEmployeeIds={paidMtIds}
          onPayEmployee={handlePayEmployee}
        />
        <RecentPaymentsSection
          pmts={pmts}
          lang={lang}
          employeeMap={employeeMap}
          canManage={canManage}
          onDeletePayment={(id) => void handleDeletePayment(id)}
        />
        <BulkPayoutConfirmDialog
          open={bulkPayoutOpen}
          onClose={() => setBulkPayoutOpen(false)}
          items={buildBulkItems()}
          dept="marketing"
          periodLabel={periodLabel}
          lang={lang}
        />
        <AutoBonusPaymentDialog
          open={!!payTarget}
          onClose={() => setPayTarget(null)}
          target={payTarget}
          lang={lang}
          onConfirm={handleSinglePayment}
          isPending={createPayment.isPending}
        />
      </div>
    )
  }

  if (dept === 'reattention') {
    const total = reStats.reduce((s, e) => s + e.bonus, 0)
    const pmts = getPaymentsForDept('Re-attention')
    return (
      <div className="space-y-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          {periodSelector}
          <div className="flex items-center gap-sm">
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
              <span className="text-xs text-black/50">{lang === 'tr' ? 'Toplam' : 'Total'}</span>
              <span className="text-sm font-bold tabular-nums text-orange">{fmt(total)} USDT</span>
            </div>
            {canManage && !isLoading && reStats.some((s) => s.bonus > 0) && (
              <Button variant="filled" size="sm" onClick={() => setBulkPayoutOpen(true)}>
                <CheckFat size={14} weight="fill" />
                {lang === 'tr' ? 'Toplu Ödendi İşaretle' : 'Mark All Paid'}
              </Button>
            )}
          </div>
        </div>
        {!isLoading && reStats.some((s) => !paidReIds.has(s.employee.id)) && (
          <h3 className="text-sm font-semibold text-black/70">
            {lang === 'tr' ? 'Bekleyen Ödemeler' : 'Pending Payments'}
          </h3>
        )}
        <ReattentionBonusTable
          stats={reStats}
          isLoading={isLoading}
          lang={lang}
          advancesByEmp={advancesByEmp}
          canManage={canManage}
          paidEmployeeIds={paidReIds}
          onPayEmployee={handlePayEmployee}
        />
        <RecentPaymentsSection
          pmts={pmts}
          lang={lang}
          employeeMap={employeeMap}
          canManage={canManage}
          onDeletePayment={(id) => void handleDeletePayment(id)}
        />
        <BulkPayoutConfirmDialog
          open={bulkPayoutOpen}
          onClose={() => setBulkPayoutOpen(false)}
          items={buildBulkItems()}
          dept="reattention"
          periodLabel={periodLabel}
          lang={lang}
        />
        <AutoBonusPaymentDialog
          open={!!payTarget}
          onClose={() => setPayTarget(null)}
          target={payTarget}
          lang={lang}
          onConfirm={handleSinglePayment}
          isPending={createPayment.isPending}
        />
      </div>
    )
  }

  // Full mode (both departments + sub-tabs) — kept for backward compat
  const mtTotalBonus = mtStats.reduce((s, e) => s + e.totalBonus, 0)
  const reTotalBonus = reStats.reduce((s, e) => s + e.bonus, 0)

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        {periodSelector}
        <div className="flex flex-wrap items-center gap-sm">
          <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
            <span className="text-xs text-black/50">MT</span>
            <span className="text-sm font-bold tabular-nums text-purple">
              {fmt(mtTotalBonus)} USDT
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
            <span className="text-xs text-black/50">RE</span>
            <span className="text-sm font-bold tabular-nums text-orange">
              {fmt(reTotalBonus)} USDT
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="marketing">
        <TabsList>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="reattention">Retention</TabsTrigger>
        </TabsList>
        <TabsContent value="marketing" className="pt-lg">
          <MarketingBonusTable
            stats={mtStats}
            isLoading={isLoading}
            lang={lang}
            config={config}
            advancesByEmp={advancesByEmp}
          />
        </TabsContent>
        <TabsContent value="reattention" className="pt-lg">
          <ReattentionBonusTable
            stats={reStats}
            isLoading={isLoading}
            lang={lang}
            advancesByEmp={advancesByEmp}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
