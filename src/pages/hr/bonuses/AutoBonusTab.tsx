import { useState, useMemo, useEffect } from 'react'
import {
  TrendUp,
  Trophy,
  Star,
  ChartBar,
  Trash,
  CheckFat,
  Money,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  Crosshair,
  PencilSimple,
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
  useBaremTargetsQuery,
  useBaremTargetMutation,
  useHrSettingsQuery,
  type HrEmployee,
  type AutoBonusTransfer,
  type HrBonusPayment,
  type MtConfig,
  type MtTier,
  type ReConfig,
  type ReTier,
  type BulkPayoutItem,
  type BaremTarget,
} from '@/hooks/queries/useHrQuery'
import { cn } from '@ds/utils'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'
import { MONTH_NAMES_TR, MONTH_NAMES_EN } from '../utils/hrConstants'

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
        <Table className="[&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:h-8">
          <TableHeader>
            <TableRow>
              <TableHead>{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
              <TableHead>{lang === 'tr' ? 'Dönem' : 'Period'}</TableHead>
              <TableHead>{lang === 'tr' ? 'Tutar (USDT)' : 'Amount (USDT)'}</TableHead>
              <TableHead>{lang === 'tr' ? 'Ödeme Tarihi' : 'Paid At'}</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pmts.slice(0, 20).map((p) => {
              const emp = employeeMap.get(p.employee_id)
              return (
                <TableRow key={p.id} className="group">
                  <TableCell>
                    <span className="text-xs font-medium text-black/80">
                      {emp?.full_name ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Tag variant="blue">{p.period || '—'}</Tag>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums font-semibold text-purple">
                      {p.amount_usdt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] tabular-nums text-black/50">
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
                        className="text-red/50 md:opacity-0 hover:text-red md:group-hover:opacity-100"
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
  const marketingEmps = employees.filter(
    (e) => (e.role === 'Marketing' || e.role === 'Marketing Manager') && e.is_active,
  )
  if (marketingEmps.length === 0) return []

  const empStats = marketingEmps.map((emp) => {
    const isManager = emp.role === 'Marketing Manager'
    const firstDeposits = transfers.filter(
      (t) => t.employee_id === emp.id && t.category_id === 'dep',
    )
    const count = firstDeposits.length
    const totalVolumeUsd = firstDeposits.reduce((s, t) => s + Math.abs(t.amount_usd), 0)
    const depositBonus = isManager
      ? 0
      : firstDeposits.reduce(
          (s, t) => s + getMtDepositBonus(Math.abs(t.amount_usd), config.deposit_tiers),
          0,
        )
    const countBonus = isManager ? 0 : getMtCountBonus(count, config.count_tiers)
    const volumeBonus = isManager ? 0 : getMtVolumeBonus(totalVolumeUsd, config.volume_tiers)

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

  // Manager IDs — excluded from prizes and bonus calculation
  const managerIds = new Set(
    empStats.filter((s) => s.employee.role === 'Marketing Manager').map((s) => s.employee.id),
  )

  // Weekly prizes (managers excluded)
  const weeklyEmpCounts = new Map<string, Map<string, { count: number; volume: number }>>()
  for (const stat of empStats) {
    if (managerIds.has(stat.employee.id)) continue
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

  // Monthly prize (managers excluded)
  let monthlyWinner: MtEmployeeStat | null = null
  for (const stat of empStats) {
    if (managerIds.has(stat.employee.id)) continue
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
    if (managerIds.has(stat.employee.id)) {
      return { ...stat, weeklyPrize: 0, monthlyPrize: false, totalBonus: 0 }
    }
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

function computeReStats(
  employees: HrEmployee[],
  transfers: AutoBonusTransfer[],
  config: ReConfig,
): ReEmployeeStat[] {
  const reEmps = employees.filter(
    (e) => (e.role === 'Retention' || e.role === 'Retention Manager') && e.is_active,
  )
  return reEmps.map((emp) => {
    const isManager = emp.role === 'Retention Manager'
    const empTransfers = transfers.filter((t) => t.employee_id === emp.id)
    const totalDepositsUsd = empTransfers
      .filter((t) => t.category_id === 'dep')
      .reduce((s, t) => s + Math.abs(t.amount_usd), 0)
    const totalWithdrawalsUsd = empTransfers
      .filter((t) => t.category_id === 'wd')
      .reduce((s, t) => s + Math.abs(t.amount_usd), 0)
    const netUsd = totalDepositsUsd - totalWithdrawalsUsd
    const rate = isManager ? 0 : getReRate(netUsd, config.rate_tiers)
    const bonus = isManager ? 0 : netUsd > 0 ? Math.round(netUsd * (rate / 100) * 100) / 100 : 0
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

function BonusCell({ value, color = 'text-purple' }: { value: number; color?: string }) {
  if (value === 0) return <span className="text-[11px] text-black/30">—</span>
  return <span className={`text-xs tabular-nums font-semibold ${color}`}>{fmt(value)}</span>
}

/* ------------------------------------------------------------------ */
/*  Barem progress helpers                                              */
/* ------------------------------------------------------------------ */

interface BaremProgress {
  pct: number // 0-100
  countPct: number | null
  volumePct: number | null
  passed: boolean
  hasTarget: boolean
}

function calcBaremProgress(
  target: BaremTarget | undefined,
  count: number,
  volumeUsd: number,
): BaremProgress {
  if (!target || (target.count_target == null && target.volume_target == null)) {
    return { pct: 100, countPct: null, volumePct: null, passed: true, hasTarget: false }
  }
  const countPct =
    target.count_target != null && target.count_target > 0
      ? Math.min(100, Math.round((count / target.count_target) * 100))
      : null
  const volumePct =
    target.volume_target != null && target.volume_target > 0
      ? Math.min(100, Math.round((volumeUsd / target.volume_target) * 100))
      : null

  // If both set, must pass both. If only one, use that.
  let pct: number
  if (countPct != null && volumePct != null) {
    pct = Math.min(countPct, volumePct)
  } else {
    pct = countPct ?? volumePct ?? 100
  }

  return { pct, countPct, volumePct, passed: pct >= 100, hasTarget: true }
}

function BaremProgressCell({
  progress,
  lang,
  canManage,
  onEdit,
}: {
  progress: BaremProgress
  lang: 'tr' | 'en'
  canManage: boolean
  onEdit?: () => void
}) {
  if (!progress.hasTarget) {
    if (canManage) {
      return (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-black/30 transition-colors hover:bg-black/[0.04] hover:text-black/50"
          title={lang === 'tr' ? 'Hedef belirle' : 'Set target'}
        >
          <Crosshair size={10} />
          {lang === 'tr' ? 'Hedef' : 'Target'}
        </button>
      )
    }
    return <span className="text-[11px] text-black/30">—</span>
  }

  const pct = progress.pct
  const barColor =
    pct >= 100 ? 'bg-green' : pct >= 70 ? 'bg-yellow-500' : pct >= 40 ? 'bg-orange' : 'bg-red'

  const tooltipParts: string[] = []
  if (progress.countPct != null)
    tooltipParts.push(`${lang === 'tr' ? 'Adet' : 'Count'}: ${progress.countPct}%`)
  if (progress.volumePct != null)
    tooltipParts.push(`${lang === 'tr' ? 'Hacim' : 'Vol'}: ${progress.volumePct}%`)

  return (
    <button
      type="button"
      onClick={canManage ? onEdit : undefined}
      className={cn(
        'group relative flex w-full min-w-[56px] flex-col items-center gap-0.5',
        canManage && 'cursor-pointer',
      )}
      title={tooltipParts.join(' / ')}
    >
      <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out',
            barColor,
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span
        className={cn(
          'text-[10px] font-semibold tabular-nums leading-none',
          pct >= 100 ? 'text-green' : pct >= 70 ? 'text-yellow-600' : 'text-red',
        )}
      >
        %{pct}
      </span>
      {canManage && (
        <PencilSimple
          size={8}
          className="absolute -right-0.5 -top-0.5 text-black/20 opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Barem Target Dialog                                                 */
/* ------------------------------------------------------------------ */

function BaremTargetDialog({
  open,
  onClose,
  employee,
  target,
  lang,
  onSave,
  isPending,
}: {
  open: boolean
  onClose: () => void
  employee: HrEmployee | null
  target: BaremTarget | undefined
  lang: 'tr' | 'en'
  onSave: (countTarget: number | null, volumeTarget: number | null) => void
  isPending: boolean
}) {
  const [countStr, setCountStr] = useState('')
  const [volumeStr, setVolumeStr] = useState('')

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form
      setCountStr(target?.count_target != null ? String(target.count_target) : '')

      setVolumeStr(target?.volume_target != null ? String(target.volume_target) : '')
    }
  }, [open, target])

  const handleSave = () => {
    const ct = countStr.trim() ? parseInt(countStr, 10) : null
    const vt = volumeStr.trim() ? parseFloat(volumeStr) : null
    onSave(
      ct != null && !isNaN(ct) && ct > 0 ? ct : null,
      vt != null && !isNaN(vt) && vt > 0 ? vt : null,
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crosshair size={18} className="text-brand" weight="duotone" />
            {lang === 'tr' ? 'Barem Hedefi' : 'Threshold Target'}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/55">
            {employee && <span className="font-medium text-black/70">{employee.full_name}</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-md">
          <div>
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
              {lang === 'tr' ? 'Adet Hedefi' : 'Count Target'}
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={countStr}
              onChange={(e) => setCountStr(e.target.value)}
              placeholder={lang === 'tr' ? 'Ör: 25' : 'E.g: 25'}
            />
            <p className="mt-0.5 text-[10px] text-black/30">
              {lang === 'tr'
                ? 'Boş bırakılırsa adet hedefi uygulanmaz'
                : 'Leave empty to skip count target'}
            </p>
          </div>
          <div>
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
              {lang === 'tr' ? 'Hacim Hedefi (USD)' : 'Volume Target (USD)'}
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={volumeStr}
              onChange={(e) => setVolumeStr(e.target.value)}
              placeholder={lang === 'tr' ? 'Ör: 10000' : 'E.g: 10000'}
            />
            <p className="mt-0.5 text-[10px] text-black/30">
              {lang === 'tr'
                ? 'Boş bırakılırsa hacim hedefi uygulanmaz'
                : 'Leave empty to skip volume target'}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="filled"
              size="sm"
              disabled={isPending}
              onClick={handleSave}
            >
              {isPending
                ? lang === 'tr'
                  ? 'Kaydediliyor...'
                  : 'Saving...'
                : lang === 'tr'
                  ? 'Kaydet'
                  : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form state on dialog open
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

const PAGE_SIZE = 15

function MarketingBonusTable({
  stats,
  isLoading,
  lang,
  config,
  advancesByEmp,
  canManage = false,
  paidEmployeeIds,
  onPayEmployee,
  search,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  baremEnabled = false,
  baremTargets,
  onEditBaremTarget,
}: {
  stats: MtEmployeeStat[]
  isLoading: boolean
  lang: 'tr' | 'en'
  config: MtConfig | undefined
  advancesByEmp: Map<string, number>
  canManage?: boolean
  paidEmployeeIds?: Set<string>
  onPayEmployee?: (emp: HrEmployee, amount: number) => void
  search: string
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: () => void
  baremEnabled?: boolean
  baremTargets?: Map<string, BaremTarget>
  onEditBaremTarget?: (emp: HrEmployee) => void
}) {
  const [page, setPage] = useState(1)

  const unpaidStats = useMemo(
    () => stats.filter((s) => !paidEmployeeIds?.has(s.employee.id)),
    [stats, paidEmployeeIds],
  )

  const filteredStats = useMemo(() => {
    if (!search.trim()) return unpaidStats
    const q = search.toLowerCase()
    return unpaidStats.filter((s) => s.employee.full_name.toLowerCase().includes(q))
  }, [unpaidStats, search])

  const totalPages = Math.max(1, Math.ceil(filteredStats.length / PAGE_SIZE))
  const sortedStats = useMemo(
    () =>
      [...filteredStats].sort((a, b) => {
        const aManager = a.employee.role === 'Marketing Manager' ? 1 : 0
        const bManager = b.employee.role === 'Marketing Manager' ? 1 : 0
        if (aManager !== bManager) return bManager - aManager
        return b.count - a.count || b.totalVolumeUsd - a.totalVolumeUsd
      }),
    [filteredStats],
  )
  const paginatedStats = useMemo(
    () => sortedStats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedStats, page],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pagination reset on search change
    setPage(1)
  }, [search])

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

  const allMtSelected =
    selectedIds && filteredStats.length > 0 && selectedIds.size === filteredStats.length

  if (filteredStats.length === 0) {
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-black/[0.07] bg-bg1 px-4 py-2.5 text-sm">
          <Trophy size={16} weight="fill" className="shrink-0 text-orange" />
          <span className="font-semibold text-black">{monthlyWinner.employee.full_name}</span>
          <span className="text-black/40">—</span>
          <span className="text-black/70">
            {lang === 'tr' ? `${monthlyWinner.count} satış` : `${monthlyWinner.count} sales`}
          </span>
          <span className="text-xs text-black/40">+{config?.monthly_prize_amount ?? 200} USDT</span>
          <Tag variant="orange" className="shrink-0 text-[10px]">
            {lang === 'tr' ? 'Ay Birincisi' : '1st Place'}
          </Tag>
        </div>
      )}

      {/* Summary table */}
      <div className="overflow-x-auto rounded-xl border border-black/[0.07] bg-bg1">
        <Table className="[&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:h-8">
          <TableHeader>
            <TableRow>
              {canManage && onToggleSelectAll && (
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                    checked={!!allMtSelected}
                    onChange={onToggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="min-w-[100px]">
                {lang === 'tr' ? 'Çalışan' : 'Employee'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'FD' : 'FD'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Hacim' : 'Vol.'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Dep.P' : 'Dep.B'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Adet P' : 'Cnt.B'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Hacim P' : 'Vol.B'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'H.Ödül' : 'W.Prize'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'A.Ödül' : 'M.Prize'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Avans' : 'Adv.'}
              </TableHead>
              {baremEnabled && (
                <TableHead className="w-14 text-center text-[11px]">
                  {lang === 'tr' ? 'Barem' : 'Thr.'}
                </TableHead>
              )}
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Net' : 'Net'}
              </TableHead>
              {canManage && <TableHead className="w-7" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStats.map((stat, idx) => {
              const isManager = stat.employee.role === 'Marketing Manager'
              const baremTarget = baremTargets?.get(stat.employee.id)
              const baremProgress = calcBaremProgress(baremTarget, stat.count, stat.totalVolumeUsd)
              const isBaremedOut = baremEnabled && baremProgress.hasTarget && !baremProgress.passed
              const advance = advancesByEmp.get(stat.employee.id) ?? 0
              const effectiveBonus = isBaremedOut ? 0 : stat.totalBonus
              const net = Math.max(0, effectiveBonus - advance)
              return (
                <TableRow
                  key={stat.employee.id}
                  className={cn(
                    selectedIds?.has(stat.employee.id) && 'bg-brand/[0.03]',
                    isManager && 'bg-purple/[0.06] border-l-2 border-l-purple/40',
                  )}
                >
                  {canManage && onToggleSelect && (
                    <TableCell>
                      {!isManager && (
                        <input
                          type="checkbox"
                          className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                          checked={selectedIds?.has(stat.employee.id) ?? false}
                          onChange={() => onToggleSelect(stat.employee.id)}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="max-w-[140px]">
                    <div className="flex items-center gap-1 overflow-hidden">
                      {idx === 0 && !isManager && (
                        <Star size={11} weight="fill" className="shrink-0 text-yellow-500" />
                      )}
                      <span
                        className="truncate text-xs font-medium text-black"
                        title={stat.employee.full_name}
                      >
                        {stat.employee.full_name}
                      </span>
                      {isManager && (
                        <Tag variant="purple" className="shrink-0 text-[10px]">
                          Mgr
                        </Tag>
                      )}
                      {stat.monthlyPrize && (
                        <Tag variant="orange" className="shrink-0 text-[10px]">
                          1.
                        </Tag>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="tabular-nums text-xs font-semibold text-black/80">
                      {stat.count}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="tabular-nums text-xs font-medium text-black/60">
                      {fmt(stat.totalVolumeUsd, 0)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <BonusCell value={stat.depositBonus} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <BonusCell value={stat.countBonus} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <BonusCell value={stat.volumeBonus} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {stat.weeklyPrize > 0 ? (
                      <span className="tabular-nums text-xs font-semibold text-yellow-600">
                        {fmt(stat.weeklyPrize)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-black/30">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {stat.monthlyPrize ? (
                      <span className="tabular-nums text-xs font-semibold text-orange">
                        {fmt(config?.monthly_prize_amount ?? 200)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-black/30">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {advance > 0 ? (
                      <span className="tabular-nums text-xs font-semibold text-orange">
                        -{fmt(advance)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-black/30">—</span>
                    )}
                  </TableCell>
                  {baremEnabled && (
                    <TableCell className="w-14">
                      {!isManager && (
                        <BaremProgressCell
                          progress={baremProgress}
                          lang={lang}
                          canManage={canManage}
                          onEdit={() => onEditBaremTarget?.(stat.employee)}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-right">
                    {isBaremedOut ? (
                      <span className="text-[11px] font-medium text-red/60">
                        {lang === 'tr' ? 'Barem ✗' : 'Thr. ✗'}
                      </span>
                    ) : effectiveBonus > 0 ? (
                      <span
                        className={`tabular-nums text-xs font-bold ${advance > 0 ? 'text-blue' : 'text-green'}`}
                      >
                        {fmt(net)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-black/30">—</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="w-7 text-right">
                      {effectiveBonus > 0 && !isBaremedOut && onPayEmployee ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-black/30 hover:text-brand"
                          onClick={() => onPayEmployee(stat.employee, effectiveBonus)}
                          title={lang === 'tr' ? 'Ödeme Ekle' : 'Add Payment'}
                        >
                          <Money size={14} />
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
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Retention Tab                                                    */
/* ------------------------------------------------------------------ */

function ReattentionBonusTable({
  stats,
  isLoading,
  lang,
  advancesByEmp,
  canManage = false,
  paidEmployeeIds,
  onPayEmployee,
  search,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  baremEnabled = false,
  baremTargets,
  onEditBaremTarget,
}: {
  stats: ReEmployeeStat[]
  isLoading: boolean
  lang: 'tr' | 'en'
  advancesByEmp: Map<string, number>
  canManage?: boolean
  paidEmployeeIds?: Set<string>
  onPayEmployee?: (emp: HrEmployee, amount: number) => void
  search: string
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: () => void
  baremEnabled?: boolean
  baremTargets?: Map<string, BaremTarget>
  onEditBaremTarget?: (emp: HrEmployee) => void
}) {
  const [page, setPage] = useState(1)

  const unpaidReStats = useMemo(
    () => stats.filter((s) => !paidEmployeeIds?.has(s.employee.id)),
    [stats, paidEmployeeIds],
  )

  const filteredReStats = useMemo(() => {
    if (!search.trim()) return unpaidReStats
    const q = search.toLowerCase()
    return unpaidReStats.filter((s) => s.employee.full_name.toLowerCase().includes(q))
  }, [unpaidReStats, search])

  const allReSelected =
    selectedIds && filteredReStats.length > 0 && selectedIds.size === filteredReStats.length

  const sortedReStats = useMemo(
    () =>
      [...filteredReStats].sort((a, b) => {
        const aManager = a.employee.role === 'Retention Manager' ? 1 : 0
        const bManager = b.employee.role === 'Retention Manager' ? 1 : 0
        if (aManager !== bManager) return bManager - aManager
        return b.bonus - a.bonus
      }),
    [filteredReStats],
  )
  const totalPages = Math.max(1, Math.ceil(sortedReStats.length / PAGE_SIZE))
  const paginatedReStats = useMemo(
    () => sortedReStats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedReStats, page],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pagination reset on search change
    setPage(1)
  }, [search])

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
        title={lang === 'tr' ? 'Retention çalışanı yok' : 'No Retention employees'}
        description={
          lang === 'tr'
            ? 'İK modülünden Retention rolünde çalışan ekleyin.'
            : 'Add employees with Retention role in the HR module.'
        }
      />
    )
  }

  if (filteredReStats.length === 0) {
    return (
      <EmptyState
        icon={TrendUp}
        title={lang === 'tr' ? 'Tüm primler ödendi' : 'All bonuses paid'}
        description={
          lang === 'tr'
            ? 'Bu dönem için tüm Retention primleri ödenmiştir.'
            : 'All Retention bonuses for this period have been paid.'
        }
      />
    )
  }

  return (
    <div className="space-y-lg">
      <div className="overflow-x-auto rounded-xl border border-black/[0.07] bg-bg1">
        <Table className="[&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:h-8">
          <TableHeader>
            <TableRow>
              {canManage && onToggleSelectAll && (
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                    checked={!!allReSelected}
                    onChange={onToggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="min-w-[100px]">
                {lang === 'tr' ? 'Çalışan' : 'Employee'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Dep.' : 'Dep.'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Wd.' : 'Wd.'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Net' : 'Net'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Prim' : 'Bonus'}
              </TableHead>
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Avans' : 'Adv.'}
              </TableHead>
              {baremEnabled && (
                <TableHead className="w-14 text-center text-[11px]">
                  {lang === 'tr' ? 'Barem' : 'Thr.'}
                </TableHead>
              )}
              <TableHead className="text-right text-[11px] whitespace-nowrap">
                {lang === 'tr' ? 'Net' : 'Net'}
              </TableHead>
              {canManage && <TableHead className="w-7" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReStats.map((stat) => {
              const isManager = stat.employee.role === 'Retention Manager'
              const baremTarget = baremTargets?.get(stat.employee.id)
              // RE uses deposit count and net volume for barem
              const baremProgress = calcBaremProgress(baremTarget, 0, stat.totalDepositsUsd)
              const isBaremedOut = baremEnabled && baremProgress.hasTarget && !baremProgress.passed
              const advance = advancesByEmp.get(stat.employee.id) ?? 0
              const effectiveBonus = isBaremedOut ? 0 : stat.bonus
              const net = Math.max(0, effectiveBonus - advance)
              return (
                <TableRow
                  key={stat.employee.id}
                  className={cn(
                    selectedIds?.has(stat.employee.id) && 'bg-brand/[0.03]',
                    isManager && 'bg-purple/[0.06] border-l-2 border-l-purple/40',
                  )}
                >
                  {canManage && onToggleSelect && (
                    <TableCell>
                      {!isManager && (
                        <input
                          type="checkbox"
                          className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                          checked={selectedIds?.has(stat.employee.id) ?? false}
                          onChange={() => onToggleSelect(stat.employee.id)}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="max-w-[140px]">
                    <div className="flex items-center gap-1 overflow-hidden">
                      <span
                        className="truncate text-xs font-medium text-black"
                        title={stat.employee.full_name}
                      >
                        {stat.employee.full_name}
                      </span>
                      {isManager && (
                        <Tag variant="purple" className="shrink-0 text-[10px]">
                          Mgr
                        </Tag>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="tabular-nums text-xs text-green">
                      +{fmt(stat.totalDepositsUsd, 0)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="tabular-nums text-xs text-red">
                      −{fmt(stat.totalWithdrawalsUsd, 0)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span
                      className={`tabular-nums text-xs font-semibold ${stat.netUsd >= 0 ? 'text-blue' : 'text-red'}`}
                    >
                      {stat.netUsd >= 0 ? '+' : ''}
                      {fmt(stat.netUsd, 0)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <BonusCell value={stat.bonus} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {advance > 0 ? (
                      <span className="tabular-nums text-xs font-semibold text-orange">
                        -{fmt(advance)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-black/30">—</span>
                    )}
                  </TableCell>
                  {baremEnabled && (
                    <TableCell className="w-14">
                      {!isManager && (
                        <BaremProgressCell
                          progress={baremProgress}
                          lang={lang}
                          canManage={canManage}
                          onEdit={() => onEditBaremTarget?.(stat.employee)}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-right">
                    {isBaremedOut ? (
                      <span className="text-[11px] font-medium text-red/60">
                        {lang === 'tr' ? 'Barem ✗' : 'Thr. ✗'}
                      </span>
                    ) : effectiveBonus > 0 ? (
                      <span
                        className={`tabular-nums text-xs font-bold ${advance > 0 ? 'text-blue' : 'text-green'}`}
                      >
                        {fmt(net)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-black/30">—</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="w-7 text-right">
                      {effectiveBonus > 0 && !isBaremedOut && onPayEmployee ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-black/30 hover:text-brand"
                          onClick={() => onPayEmployee(stat.employee, effectiveBonus)}
                          title={lang === 'tr' ? 'Ödeme Ekle' : 'Add Payment'}
                        >
                          <Money size={14} />
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
                <TableCell
                  colSpan={canManage && onToggleSelectAll ? 7 : 6}
                  className="text-right text-[11px] font-semibold text-black/50"
                >
                  {lang === 'tr' ? 'Toplam' : 'Total'}
                </TableCell>
                <TableCell className="text-right">
                  <span className="tabular-nums text-xs font-bold text-green">
                    {fmt(
                      stats.reduce((s, stat) => {
                        const advance = advancesByEmp.get(stat.employee.id) ?? 0
                        return s + Math.max(0, stat.bonus - advance)
                      }, 0),
                    )}
                  </span>
                </TableCell>
                {canManage && <TableCell />}
              </TableRow>
            )}
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
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [search, setSearch] = useState('')
  const [selectedAutoIds, setSelectedAutoIds] = useState<Set<string>>(new Set())
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
  const { data: hrSettings } = useHrSettingsQuery()

  const baremRoles = hrSettings?.barem_roles ?? []
  const mtBaremEnabled = baremRoles.includes('Marketing')
  const reBaremEnabled = baremRoles.includes('Retention')

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

  // Barem targets
  const { data: baremTargets = new Map<string, BaremTarget>() } = useBaremTargetsQuery(periodLabel)
  const { upsertTarget } = useBaremTargetMutation()
  const [baremTargetEmp, setBaremTargetEmp] = useState<HrEmployee | null>(null)

  const handleSaveBaremTarget = (countTarget: number | null, volumeTarget: number | null) => {
    if (!baremTargetEmp) return
    upsertTarget.mutate(
      { employeeId: baremTargetEmp.id, period: periodLabel, countTarget, volumeTarget },
      { onSuccess: () => setBaremTargetEmp(null) },
    )
  }

  // Helper: check if employee is baremed out based on targets
  const isBaremFailed = (empId: string, count: number, volumeUsd: number) => {
    const target = baremTargets.get(empId)
    const progress = calcBaremProgress(target, count, volumeUsd)
    return progress.hasTarget && !progress.passed
  }

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
    const mtIds = new Set(
      employees
        .filter((e) => e.role === 'Marketing' || e.role === 'Marketing Manager')
        .map((e) => e.id),
    )
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
    const reIds = new Set(
      employees
        .filter((e) => e.role === 'Retention' || e.role === 'Retention Manager')
        .map((e) => e.id),
    )
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
  const getPaymentsForDept = (role: 'Marketing' | 'Retention') => {
    const deptIds = new Set(
      employees.filter((e) => e.role === role || e.role === `${role} Manager`).map((e) => e.id),
    )
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
        .filter(
          (s) =>
            s.totalBonus > 0 &&
            !paidMtIds.has(s.employee.id) &&
            !(mtBaremEnabled && isBaremFailed(s.employee.id, s.count, s.totalVolumeUsd)),
        )
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
        .filter(
          (s) =>
            s.bonus > 0 &&
            !paidReIds.has(s.employee.id) &&
            !(reBaremEnabled && isBaremFailed(s.employee.id, 0, s.totalDepositsUsd)),
        )
        .map((s) => ({
          employee_id: s.employee.id,
          employee_name: s.employee.full_name,
          amount_usdt: s.bonus,
          period: periodLabel,
          description: `Retention Primi — ${s.employee.full_name} (${periodLabel})`,
        }))
    }
    return []
  }

  const handlePayEmployee = (emp: HrEmployee, amount: number) => {
    setPayTarget({ employee: emp, amount, period: periodLabel })
  }

  /* Selection helpers for auto bonus tables */
  const toggleAutoSelect = (id: string) => {
    setSelectedAutoIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Get unpaid stats for the current dept (used for select-all logic)
  const unpaidMtStats = useMemo(
    () =>
      mtStats.filter(
        (s) =>
          s.totalBonus > 0 &&
          !paidMtIds.has(s.employee.id) &&
          !(mtBaremEnabled && isBaremFailed(s.employee.id, s.count, s.totalVolumeUsd)),
      ),
    [mtStats, paidMtIds, baremTargets, mtBaremEnabled],
  )
  const unpaidReStats = useMemo(
    () =>
      reStats.filter(
        (s) =>
          s.bonus > 0 &&
          !paidReIds.has(s.employee.id) &&
          !(reBaremEnabled && isBaremFailed(s.employee.id, 0, s.totalDepositsUsd)),
      ),
    [reStats, paidReIds, baremTargets, reBaremEnabled],
  )

  const toggleAutoSelectAll = () => {
    const currentUnpaid = dept === 'marketing' ? unpaidMtStats : unpaidReStats
    const ids = currentUnpaid.map((s) => s.employee.id)
    if (selectedAutoIds.size === ids.length) {
      setSelectedAutoIds(new Set())
    } else {
      setSelectedAutoIds(new Set(ids))
    }
  }
  const hasAutoSelection = selectedAutoIds.size > 0

  // Reset selection when period or search changes
  useEffect(() => {
    setSelectedAutoIds(new Set())
  }, [year, month, search])

  // Build bulk items filtered by selection
  const buildFilteredBulkItems = (): BulkPayoutItem[] => {
    const all = buildBulkItems()
    if (!hasAutoSelection) return all
    return all.filter((item) => selectedAutoIds.has(item.employee_id))
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
        description: `${payTarget.employee.role.startsWith('Marketing') ? 'Marketing' : 'Retention'} Primi — ${payTarget.employee.full_name} (${payTarget.period})`,
      })
      toast({ title: lang === 'tr' ? 'Ödeme kaydedildi' : 'Payment recorded', variant: 'success' })
      setPayTarget(null)
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  }

  // Single-department mode (used by department tabs in BonusesTab)
  if (dept === 'marketing') {
    const total = mtStats.reduce(
      (s, e) =>
        s +
        (mtBaremEnabled && isBaremFailed(e.employee.id, e.count, e.totalVolumeUsd)
          ? 0
          : e.totalBonus),
      0,
    )
    const pmts = getPaymentsForDept('Marketing')
    return (
      <div className="space-y-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div className="flex flex-wrap items-center gap-sm">
            {periodSelector}
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
          <div className="flex items-center gap-sm">
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
              <span className="text-xs text-black/50">{lang === 'tr' ? 'Toplam' : 'Total'}</span>
              <span className="text-sm font-bold tabular-nums text-purple">{fmt(total)} USDT</span>
            </div>
            {canManage && !isLoading && mtStats.some((s) => s.totalBonus > 0) && (
              <Button
                variant="filled"
                size="sm"
                onClick={() =>
                  navigate('/hr/bonus-payout', {
                    state: {
                      items: buildFilteredBulkItems(),
                      dept: 'marketing' as const,
                      periodLabel,
                      lang,
                    },
                  })
                }
              >
                <CheckFat size={14} weight="fill" />
                {hasAutoSelection
                  ? lang === 'tr'
                    ? `Seçilenleri Öde (${selectedAutoIds.size})`
                    : `Pay Selected (${selectedAutoIds.size})`
                  : lang === 'tr'
                    ? 'Toplu Ödendi İşaretle'
                    : 'Mark All Paid'}
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
          search={search}
          selectedIds={selectedAutoIds}
          onToggleSelect={toggleAutoSelect}
          onToggleSelectAll={toggleAutoSelectAll}
          baremEnabled={mtBaremEnabled}
          baremTargets={baremTargets}
          onEditBaremTarget={setBaremTargetEmp}
        />
        <RecentPaymentsSection
          pmts={pmts}
          lang={lang}
          employeeMap={employeeMap}
          canManage={canManage}
          onDeletePayment={(id) => void handleDeletePayment(id)}
        />
        <AutoBonusPaymentDialog
          open={!!payTarget}
          onClose={() => setPayTarget(null)}
          target={payTarget}
          lang={lang}
          onConfirm={handleSinglePayment}
          isPending={createPayment.isPending}
        />
        <BaremTargetDialog
          open={!!baremTargetEmp}
          onClose={() => setBaremTargetEmp(null)}
          employee={baremTargetEmp}
          target={baremTargetEmp ? baremTargets.get(baremTargetEmp.id) : undefined}
          lang={lang}
          onSave={handleSaveBaremTarget}
          isPending={upsertTarget.isPending}
        />
      </div>
    )
  }

  if (dept === 'reattention') {
    const total = reStats.reduce(
      (s, e) =>
        s + (reBaremEnabled && isBaremFailed(e.employee.id, 0, e.totalDepositsUsd) ? 0 : e.bonus),
      0,
    )
    const pmts = getPaymentsForDept('Retention')
    return (
      <div className="space-y-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div className="flex flex-wrap items-center gap-sm">
            {periodSelector}
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
          <div className="flex items-center gap-sm">
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
              <span className="text-xs text-black/50">{lang === 'tr' ? 'Toplam' : 'Total'}</span>
              <span className="text-sm font-bold tabular-nums text-orange">{fmt(total)} USDT</span>
            </div>
            {canManage && !isLoading && reStats.some((s) => s.bonus > 0) && (
              <Button
                variant="filled"
                size="sm"
                onClick={() =>
                  navigate('/hr/bonus-payout', {
                    state: {
                      items: buildFilteredBulkItems(),
                      dept: 'reattention' as const,
                      periodLabel,
                      lang,
                    },
                  })
                }
              >
                <CheckFat size={14} weight="fill" />
                {hasAutoSelection
                  ? lang === 'tr'
                    ? `Seçilenleri Öde (${selectedAutoIds.size})`
                    : `Pay Selected (${selectedAutoIds.size})`
                  : lang === 'tr'
                    ? 'Toplu Ödendi İşaretle'
                    : 'Mark All Paid'}
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
          search={search}
          selectedIds={selectedAutoIds}
          onToggleSelect={toggleAutoSelect}
          onToggleSelectAll={toggleAutoSelectAll}
          baremEnabled={reBaremEnabled}
          baremTargets={baremTargets}
          onEditBaremTarget={setBaremTargetEmp}
        />
        <RecentPaymentsSection
          pmts={pmts}
          lang={lang}
          employeeMap={employeeMap}
          canManage={canManage}
          onDeletePayment={(id) => void handleDeletePayment(id)}
        />
        <AutoBonusPaymentDialog
          open={!!payTarget}
          onClose={() => setPayTarget(null)}
          target={payTarget}
          lang={lang}
          onConfirm={handleSinglePayment}
          isPending={createPayment.isPending}
        />
        <BaremTargetDialog
          open={!!baremTargetEmp}
          onClose={() => setBaremTargetEmp(null)}
          employee={baremTargetEmp}
          target={baremTargetEmp ? baremTargets.get(baremTargetEmp.id) : undefined}
          lang={lang}
          onSave={handleSaveBaremTarget}
          isPending={upsertTarget.isPending}
        />
      </div>
    )
  }

  // Full mode (both departments + sub-tabs) — kept for backward compat
  const mtTotalBonus = mtStats.reduce(
    (s, e) =>
      s +
      (mtBaremEnabled && isBaremFailed(e.employee.id, e.count, e.totalVolumeUsd)
        ? 0
        : e.totalBonus),
    0,
  )
  const reTotalBonus = reStats.reduce(
    (s, e) =>
      s + (reBaremEnabled && isBaremFailed(e.employee.id, 0, e.totalDepositsUsd) ? 0 : e.bonus),
    0,
  )

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
            search=""
            baremEnabled={mtBaremEnabled}
            baremTargets={baremTargets}
          />
        </TabsContent>
        <TabsContent value="reattention" className="pt-lg">
          <ReattentionBonusTable
            stats={reStats}
            isLoading={isLoading}
            lang={lang}
            advancesByEmp={advancesByEmp}
            search=""
            baremEnabled={reBaremEnabled}
            baremTargets={baremTargets}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
