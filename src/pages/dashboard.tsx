import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ArrowCircleDown,
  ArrowCircleUp,
  ArrowRight,
  Wallet,
  Percent,
  Receipt,
  TrendUp,
  TrendDown,
  ChartLine,
  ChartPie,
  ChartBar,
  Pulse,
  Clock,
  PencilSimple,
  Plus,
  Trophy,
  ListBullets,
  Lightning,
  LinkSimple,
  CalendarStar,
  Fire,
  CalendarCheck,
} from '@phosphor-icons/react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useDashboardQuery, type DashboardPeriod } from '@/hooks/queries/useDashboardQuery'
import { useMonthlyAnalysisQuery } from '@/hooks/queries/useMonthlyAnalysisQuery'
import { useExchangeRateQuery } from '@/hooks/queries/useExchangeRateQuery'
import { useDashboardRecentQuery } from '@/hooks/queries/useDashboardRecentQuery'
import type { RecentTransfer, ActivityEntry } from '@/hooks/queries/useDashboardRecentQuery'
import type { BreakdownItem } from '@/hooks/queries/useMonthlyAnalysisQuery'
import { useDashboardInsightsQuery } from '@/hooks/queries/useDashboardInsightsQuery'
import type { RatePoint } from '@/hooks/queries/useDashboardInsightsQuery'
import { useWalletsQuery } from '@/hooks/queries/useWalletsQuery'
import {
  Tag,
  StatCard,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@ds'
import { UserAvatar } from '@/components/UserAvatar'
import { useTheme } from '@ds'
import { cn } from '@ds/utils'
import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'

/* ================================================================== */
/*  Constants & Helpers                                                */
/* ================================================================== */

const GREEN = '#22c55e'
const RED = '#ef4444'

const DONUT_COLORS = [
  'rgba(146, 191, 255, 1)', // blue
  'rgba(201, 179, 237, 1)', // purple
  'rgba(255, 181, 91, 1)', // orange
  'rgba(150, 226, 214, 1)', // mint
  'rgba(159, 159, 248, 1)', // indigo
  'rgba(255, 219, 86, 1)', // yellow
]

const PSP_COLORS = [
  'rgba(146, 191, 255, 1)',
  'rgba(201, 179, 237, 1)',
  'rgba(150, 226, 214, 1)',
  'rgba(255, 181, 91, 1)',
  'rgba(159, 159, 248, 1)',
  'rgba(174, 199, 237, 1)',
  'rgba(255, 219, 86, 1)',
  'rgba(148, 233, 184, 1)',
]

function fmtMoney(n: number, lang: string, currency = '₺'): string {
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${n < 0 ? '−' : ''}${formatted} ${currency}`
}

function fmtCount(n: number, lang: string): string {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')
}

function fmtCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toFixed(0)
}

function fmtDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDate().toString()
}

/* ================================================================== */
/*  Chart Theme Hook (dark/light aware)                                */
/* ================================================================== */

function useChartTheme() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return useMemo(
    () => ({
      isDark,
      gridStroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      axisTick: {
        fontSize: 11,
        fill: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
      },
      axisLine: {
        stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      },
      tooltipStyle: {
        fontSize: 12,
        borderRadius: 8,
        backgroundColor: isDark ? '#1b2533' : '#ffffff',
        color: isDark ? '#e6e9f2' : '#18181b',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.06)',
      },
      lineColor: isDark ? '#94e9b8' : '#18181b',
      greenFill: isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)',
      redFill: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)',
    }),
    [isDark],
  )
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

/* ── Trend Badge ──────────────────────────────────────── */

function TrendBadge({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous == null || previous === 0) return null
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const isUp = pct >= 0
  const Icon = isUp ? TrendUp : TrendDown

  return (
    <span
      className={cn(
        'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        isUp ? 'bg-green/10 text-green' : 'bg-red/10 text-red',
      )}
    >
      <Icon size={12} weight="bold" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

/* ── Chart Card Wrapper ───────────────────────────────── */

function ChartCard({
  title,
  icon: Icon,
  iconColor,
  children,
  className,
}: {
  title: string
  icon: ComponentType<IconProps>
  iconColor: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card padding="default" className={cn('border border-black/10 bg-bg1', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className={iconColor} weight="duotone" />
        <h3 className="text-sm font-semibold text-black/60">{title}</h3>
      </div>
      {children}
    </Card>
  )
}

/* ── Chart: Skeleton ──────────────────────────────────── */

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24 rounded" />
      <Skeleton className="h-[240px] w-full rounded-lg" />
    </div>
  )
}

/* ── Chart: No Data ───────────────────────────────────── */

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-black/10">
      <p className="text-xs text-black/30">{message}</p>
    </div>
  )
}

/* ── Relative Time ────────────────────────────────────── */

function relativeTime(dateStr: string, lang: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diffMs / 60_000)
  const h = Math.floor(diffMs / 3_600_000)
  const d = Math.floor(diffMs / 86_400_000)

  if (m < 1) return lang === 'tr' ? 'az önce' : 'just now'
  if (m < 60) return `${m}${lang === 'tr' ? 'dk' : 'm'}`
  if (h < 24) return `${h}${lang === 'tr' ? 'sa' : 'h'}`
  return `${d}${lang === 'tr' ? 'g' : 'd'}`
}

function fmtTime(dateStr: string, lang: string): string {
  return new Date(dateStr).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDate(dateStr: string, lang: string): string {
  return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
  })
}

/* ── Recent Transfers Table ───────────────────────────── */

function RecentTransfersTable({
  transfers,
  isLoading,
  lang,
  t,
}: {
  transfers: RecentTransfer[]
  isLoading: boolean
  lang: string
  t: (key: string) => string
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-black/10">
        <p className="text-xs text-black/30">{t('dashboard.tables.noTransfers')}</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">{t('dashboard.tables.name')}</TableHead>
          <TableHead className="text-right text-xs">{t('dashboard.tables.amount')}</TableHead>
          <TableHead className="text-xs">{t('dashboard.tables.category')}</TableHead>
          <TableHead className="text-xs">{t('dashboard.tables.method')}</TableHead>
          <TableHead className="text-xs">{t('dashboard.tables.psp')}</TableHead>
          <TableHead className="text-right text-xs">{t('dashboard.tables.time')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transfers.map((tx) => (
          <TableRow key={tx.id} className="hover:bg-black/[0.015]">
            <TableCell className="whitespace-nowrap py-2.5">
              <span className="text-sm font-medium text-black/80">{tx.full_name}</span>
            </TableCell>
            <TableCell className="whitespace-nowrap py-2.5 text-right">
              <span
                className={cn(
                  'font-mono text-sm font-semibold tabular-nums',
                  tx.isDeposit ? 'text-green' : 'text-red',
                )}
              >
                {tx.isDeposit ? '+' : '−'}
                {Math.abs(tx.amount).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {tx.currency === 'TL' ? '₺' : '$'}
              </span>
            </TableCell>
            <TableCell className="whitespace-nowrap py-2.5">
              <Tag variant={tx.isDeposit ? 'green' : 'red'} className="text-[10px]">
                {tx.categoryName}
              </Tag>
            </TableCell>
            <TableCell className="whitespace-nowrap py-2.5 text-sm text-black/50">
              {tx.paymentMethodName}
            </TableCell>
            <TableCell className="whitespace-nowrap py-2.5">
              <Link
                to={`/psps/${tx.psp_id}`}
                className="text-sm font-medium text-black/60 underline decoration-black/15 underline-offset-2 hover:text-black"
              >
                {tx.pspName}
              </Link>
            </TableCell>
            <TableCell className="whitespace-nowrap py-2.5 text-right">
              <span className="text-xs text-black/40">
                {fmtDate(tx.transfer_date, lang)} {fmtTime(tx.transfer_date, lang)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/* ── Top Customers List ───────────────────────────────── */

function TopCustomersList({
  customers,
  prevCustomers,
  isLoading,
  lang,
  t,
}: {
  customers: BreakdownItem[]
  prevCustomers?: BreakdownItem[]
  isLoading: boolean
  lang: string
  t: (key: string) => string
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    )
  }

  const items = customers.slice(0, 8)
  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-black/10">
        <p className="text-xs text-black/30">{t('dashboard.charts.noData')}</p>
      </div>
    )
  }

  const maxVal = Math.max(...items.map((c) => c.volume))

  return (
    <div className="divide-y divide-black/[0.06]">
      {items.map((cust, i) => {
        const pct = maxVal > 0 ? (cust.volume / maxVal) * 100 : 0
        return (
          <div key={`${cust.name}-${i}`} className="py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-4 font-mono text-[10px] font-semibold text-black/20">
                  {i + 1}
                </span>
                <UserAvatar
                  name={cust.name}
                  size="sm"
                  className="bg-brand/5 border border-brand/10"
                />
                <span className="text-[13px] font-medium text-black/70">{cust.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[12px] font-bold tabular-nums text-black/70">
                    {fmtMoney(cust.volume, lang)}
                  </span>
                  {prevCustomers && (
                    <span className="text-[10px] font-semibold flex items-center gap-0.5">
                      {(() => {
                        const prev = prevCustomers.find((c) => c.name === cust.name)
                        if (!prev) return <span className="text-black/20 italic">New</span>
                        const diff = ((cust.volume - prev.volume) / prev.volume) * 100
                        if (Math.abs(diff) < 1) return null
                        return (
                          <span className={cn(diff > 0 ? 'text-green' : 'text-red')}>
                            {diff > 0 ? '↑' : '↓'}
                            {Math.abs(diff).toFixed(0)}%
                          </span>
                        )
                      })()}
                    </span>
                  )}
                </div>
                <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold tabular-nums text-black/30">
                  {cust.count}x
                </span>
              </div>
            </div>
            <div className="mt-1 ml-[30px] h-1 overflow-hidden rounded-full bg-black/[0.04]">
              <div
                className="h-full rounded-full bg-brand/25 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Activity Feed ────────────────────────────────────── */

function ActivityFeed({
  entries,
  isLoading,
  lang,
  t,
}: {
  entries: ActivityEntry[]
  isLoading: boolean
  lang: string
  t: (key: string) => string
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-black/10">
        <p className="text-xs text-black/30">{t('dashboard.tables.noActivity')}</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-black/[0.06]">
      {entries.map((entry) => {
        const isCreated = entry.action === 'created'
        return (
          <div key={entry.id} className="flex items-start gap-3 py-2.5">
            <div
              className={cn(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                isCreated ? 'bg-green/10' : 'bg-blue/10',
              )}
            >
              {isCreated ? (
                <Plus size={11} className="text-green" weight="bold" />
              ) : (
                <PencilSimple size={11} className="text-blue" weight="bold" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-tight text-black/70">
                <span className="font-semibold">{entry.performerName}</span>{' '}
                <span className="text-black/40">
                  {isCreated ? t('dashboard.tables.actCreated') : t('dashboard.tables.actUpdated')}
                </span>{' '}
                <span className="font-medium text-black/60">
                  &ldquo;{entry.transferName}&rdquo;
                </span>
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-black/25">
              {relativeTime(entry.created_at, lang)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Exchange Rate Sparkline ──────────────────────────── */

function ExchangeRateSparkline({
  rateHistory,
  liveRate,
  isLoading,
}: {
  rateHistory: RatePoint[]
  liveRate: number | null
  isLoading: boolean
}) {
  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-lg" />
  }

  if (rateHistory.length < 2 && !liveRate) {
    return (
      <div className="flex h-20 items-center justify-center">
        <p className="text-xs text-black/30">—</p>
      </div>
    )
  }

  const data =
    rateHistory.length >= 2 ? rateHistory : liveRate ? [{ date: 'now', rate: liveRate }] : []

  if (data.length < 2) {
    return (
      <div className="flex h-20 items-center justify-center">
        <p className="font-mono text-2xl font-bold tabular-nums text-black/70">
          {liveRate?.toFixed(4) ?? '—'}
        </p>
      </div>
    )
  }

  const minRate = Math.min(...data.map((d) => d.rate))
  const maxRate = Math.max(...data.map((d) => d.rate))
  const delta = data.length >= 2 ? data[data.length - 1].rate - data[0].rate : 0
  const isUp = delta >= 0

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-mono text-lg font-bold tabular-nums text-black/70">
          {(liveRate ?? data[data.length - 1].rate).toFixed(4)}
        </span>
        {data.length >= 2 && (
          <span
            className={cn(
              'text-[11px] font-semibold tabular-nums',
              isUp ? 'text-green' : 'text-red',
            )}
          >
            {isUp ? '+' : ''}
            {delta.toFixed(4)}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={data}>
          <YAxis domain={[minRate * 0.999, maxRate * 1.001]} hide />
          <Line
            type="monotone"
            dataKey="rate"
            stroke={isUp ? GREEN : RED}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Wallet Chain Distribution ────────────────────────── */

const CHAIN_COLORS: Record<string, { bg: string; ring: string; label: string }> = {
  tron: { bg: 'bg-red/20', ring: 'ring-red/30', label: 'Tron' },
  ethereum: { bg: 'bg-indigo/20', ring: 'ring-indigo/30', label: 'Ethereum' },
  bsc: { bg: 'bg-yellow/20', ring: 'ring-yellow/30', label: 'BSC' },
  bitcoin: { bg: 'bg-orange/20', ring: 'ring-orange/30', label: 'Bitcoin' },
  solana: { bg: 'bg-purple/20', ring: 'ring-purple/30', label: 'Solana' },
}

function WalletChainWidget({
  wallets,
  isLoading,
  t,
}: {
  wallets: Array<{ chain: string }>
  isLoading: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-full rounded" />
        <Skeleton className="h-6 w-full rounded" />
      </div>
    )
  }

  if (wallets.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center">
        <p className="text-xs text-black/30">{t('dashboard.insights.noWallets')}</p>
      </div>
    )
  }

  const chainCounts = new Map<string, number>()
  for (const w of wallets) {
    chainCounts.set(w.chain, (chainCounts.get(w.chain) ?? 0) + 1)
  }

  const sorted = [...chainCounts.entries()].sort((a, b) => b[1] - a[1])
  const total = wallets.length

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-3 overflow-hidden rounded-full">
        {sorted.map(([chain, count]) => {
          const style = CHAIN_COLORS[chain] ?? { bg: 'bg-black/10', ring: '', label: chain }
          return (
            <div
              key={chain}
              className={cn('h-full', style.bg)}
              style={{ width: `${(count / total) * 100}%` }}
            />
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {sorted.map(([chain, count]) => {
          const style = CHAIN_COLORS[chain] ?? { bg: 'bg-black/10', ring: '', label: chain }
          return (
            <div key={chain} className="flex items-center gap-1.5">
              <div className={cn('size-2.5 rounded-full', style.bg, style.ring, 'ring-1')} />
              <span className="text-[11px] font-medium text-black/50">{style.label}</span>
              <span className="font-mono text-[10px] text-black/25">{count}</span>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-black/30">
        {t('dashboard.insights.totalWallets', { count: total })}
      </p>
    </div>
  )
}

/* ── Monthly Insights Row ─────────────────────────────── */

function InsightPill({
  icon: Icon,
  iconColor,
  label,
  value,
}: {
  icon: ComponentType<IconProps>
  iconColor: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-black/[0.015] px-4 py-3">
      <Icon size={16} className={iconColor} weight="duotone" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-black/30">{label}</p>
        <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-black/70">{value}</p>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Dashboard Page                                                     */
/* ================================================================== */

export function DashboardPage() {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language?.slice(0, 2) ?? 'en'
  const { profile, isGod } = useAuth()
  const { currentOrg, membership } = useOrganization()
  const ct = useChartTheme()

  /* ── Data hooks ──────────────────────────────────── */
  const [period, setPeriod] = useState<DashboardPeriod>('today')
  const [pmView, setPmView] = useState<'volume' | 'count'>('volume')
  const { kpis, prevKpis, isLoading } = useDashboardQuery(period)
  const { rate: exchangeRate } = useExchangeRateQuery()

  const now = new Date()
  const { data: monthlyData, isLoading: isMonthlyLoading } = useMonthlyAnalysisQuery(
    now.getFullYear(),
    now.getMonth() + 1,
  )
  const prevMonthDate = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d
  }, [now])
  const { data: prevMonthlyData } = useMonthlyAnalysisQuery(
    prevMonthDate.getFullYear(),
    prevMonthDate.getMonth() + 1,
  )
  const { recentTransfers, isTransfersLoading, activity, isActivityLoading } =
    useDashboardRecentQuery()
  const { rateHistory, isRateHistoryLoading } = useDashboardInsightsQuery()
  const { wallets, isLoading: isWalletsLoading } = useWalletsQuery()

  /* ── Derived values ──────────────────────────────── */
  const displayName = profile?.display_name || t('dashboard.defaultUser')

  const roleBadge = isGod
    ? { label: 'God', variant: 'red' as const }
    : membership?.role === 'admin'
      ? { label: 'Admin', variant: 'green' as const }
      : membership?.role === 'manager'
        ? { label: 'Manager', variant: 'purple' as const }
        : membership?.role === 'operation'
          ? { label: 'Operation', variant: 'blue' as const }
          : null

  // Top 8 PSPs for the horizontal bar chart
  const topPsps = useMemo(
    () => (monthlyData?.psp_breakdown ?? []).slice(0, 8),
    [monthlyData?.psp_breakdown],
  )

  // Payment method donut data
  const paymentMethods = useMemo(
    () =>
      (monthlyData?.payment_method_breakdown ?? [])
        .filter((pm) => (pmView === 'volume' ? pm.volume > 0 : pm.count > 0))
        .sort((a, b) => (pmView === 'volume' ? b.volume - a.volume : b.count - a.count)),
    [monthlyData?.payment_method_breakdown, pmView],
  )

  const pmTotal = useMemo(
    () => paymentMethods.reduce((s, pm) => s + (pmView === 'volume' ? pm.volume : pm.count), 0),
    [paymentMethods, pmView],
  )

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="w-full max-w-full space-y-6">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">
            {t('dashboard.welcome', { name: displayName })}
          </h1>
          <p className="mt-1 text-sm text-black/60">
            {currentOrg
              ? t('dashboard.orgContext', { org: currentOrg.name })
              : t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {roleBadge && (
            <Tag variant={roleBadge.variant} className="text-xs">
              {roleBadge.label}
            </Tag>
          )}
          <Tabs value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <TabsList>
              <TabsTrigger value="today">{t('dashboard.period.today')}</TabsTrigger>
              <TabsTrigger value="week">{t('dashboard.period.week')}</TabsTrigger>
              <TabsTrigger value="month">{t('dashboard.period.month')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ── KPI Hero Row ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          icon={ArrowCircleDown}
          iconBg="bg-green/10"
          iconColor="text-green"
          label={t('dashboard.kpi.deposits')}
          value={fmtMoney(kpis?.totalDeposits ?? 0, lang)}
          isLoading={isLoading}
          trend={
            <TrendBadge current={kpis?.totalDeposits ?? 0} previous={prevKpis?.totalDeposits} />
          }
        />
        <StatCard
          icon={ArrowCircleUp}
          iconBg="bg-red/10"
          iconColor="text-red"
          label={t('dashboard.kpi.withdrawals')}
          value={fmtMoney(kpis?.totalWithdrawals ?? 0, lang)}
          isLoading={isLoading}
          trend={
            <TrendBadge
              current={kpis?.totalWithdrawals ?? 0}
              previous={prevKpis?.totalWithdrawals}
            />
          }
        />
        <StatCard
          icon={Wallet}
          iconBg="bg-indigo/10"
          iconColor="text-indigo"
          label={t('dashboard.kpi.netCash')}
          value={fmtMoney(kpis?.netCash ?? 0, lang)}
          isLoading={isLoading}
          trend={<TrendBadge current={kpis?.netCash ?? 0} previous={prevKpis?.netCash} />}
        />
        <StatCard
          icon={Percent}
          iconBg="bg-orange/10"
          iconColor="text-orange"
          label={t('dashboard.kpi.commission')}
          value={fmtMoney(kpis?.totalCommission ?? 0, lang)}
          isLoading={isLoading}
          trend={
            <TrendBadge current={kpis?.totalCommission ?? 0} previous={prevKpis?.totalCommission} />
          }
        />
        <StatCard
          icon={Receipt}
          iconBg="bg-cyan/10"
          iconColor="text-cyan"
          label={t('dashboard.kpi.transactions')}
          value={fmtCount(kpis?.transactionCount ?? 0, lang)}
          isLoading={isLoading}
          className="col-span-2 lg:col-span-1"
          trend={
            <TrendBadge
              current={kpis?.transactionCount ?? 0}
              previous={prevKpis?.transactionCount}
            />
          }
        />
      </div>

      {/* ── Charts Section (2×2 grid) ───────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ─ Daily Volume Trend (AreaChart) ─────────── */}
        <ChartCard
          title={t('dashboard.charts.dailyVolume')}
          icon={ChartLine}
          iconColor="text-indigo"
        >
          {isMonthlyLoading ? (
            <ChartSkeleton />
          ) : !monthlyData?.daily_volume?.length ? (
            <ChartEmpty message={t('dashboard.charts.noData')} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData.daily_volume}>
                <defs>
                  <linearGradient id="gradDep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={RED} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                <XAxis
                  dataKey="day"
                  tickFormatter={fmtDay}
                  tick={ct.axisTick}
                  axisLine={ct.axisLine}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtCompact}
                  tick={ct.axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    fmtMoney(value, lang),
                    name === 'deposits'
                      ? t('dashboard.charts.deposits')
                      : t('dashboard.charts.withdrawals'),
                  ]}
                  labelFormatter={fmtDay}
                  contentStyle={ct.tooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  stackId="vol"
                  stroke={GREEN}
                  strokeWidth={2}
                  fill="url(#gradDep)"
                />
                <Area
                  type="monotone"
                  dataKey="withdrawals"
                  stackId="vol"
                  stroke={RED}
                  strokeWidth={2}
                  fill="url(#gradWd)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          {monthlyData?.daily_volume?.length ? (
            <div className="mt-2 flex items-center justify-center gap-5">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-green" />
                <span className="text-[11px] text-black/50">{t('dashboard.charts.deposits')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-red" />
                <span className="text-[11px] text-black/50">
                  {t('dashboard.charts.withdrawals')}
                </span>
              </div>
            </div>
          ) : null}
        </ChartCard>

        {/* ─ Payment Method Distribution (Donut) ────── */}
        <ChartCard
          title={t('dashboard.charts.paymentMethods')}
          icon={ChartPie}
          iconColor="text-purple"
        >
          {isMonthlyLoading ? (
            <ChartSkeleton />
          ) : !paymentMethods.length ? (
            <ChartEmpty message={t('dashboard.charts.noData')} />
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <Tabs value={pmView} onValueChange={(v) => setPmView(v as 'volume' | 'count')}>
                  <TabsList className="h-7 p-0.5">
                    <TabsTrigger value="volume" className="px-2 py-1 text-[10px]">
                      {t('dashboard.charts.volume')}
                    </TabsTrigger>
                    <TabsTrigger value="count" className="px-2 py-1 text-[10px]">
                      {t('dashboard.charts.count')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="relative">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      dataKey={pmView === 'volume' ? 'volume' : 'count'}
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={92}
                      paddingAngle={3}
                      stroke="none"
                      animationBegin={0}
                      animationDuration={1200}
                    >
                      {paymentMethods.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) =>
                        pmView === 'volume' ? fmtMoney(value, lang) : fmtCount(value, lang)
                      }
                      contentStyle={ct.tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">
                      {pmView === 'volume'
                        ? t('dashboard.charts.total')
                        : t('dashboard.charts.totalCount')}
                    </p>
                    <p className="mt-0.5 font-mono text-xl font-black tabular-nums text-black/80">
                      {pmView === 'volume' ? fmtCompact(pmTotal) : pmTotal}
                      {pmView === 'volume' && <span className="ml-0.5 text-sm font-medium">₺</span>}
                    </p>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 px-2">
                {paymentMethods.map((pm, i) => {
                  const val = pmView === 'volume' ? pm.volume : pm.count
                  const pct = pmTotal > 0 ? ((val / pmTotal) * 100).toFixed(1) : '0'

                  // Find previous month data for comparison
                  const prevPm = prevMonthlyData?.payment_method_breakdown?.find(
                    (p) => p.name === pm.name,
                  )
                  const prevVal = prevPm ? (pmView === 'volume' ? prevPm.volume : prevPm.count) : 0
                  const diff = prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : 0
                  const avgVal = pm.count > 0 ? pm.volume / pm.count : 0

                  return (
                    <div
                      key={pm.name}
                      className="flex flex-col border-b border-black/[0.03] pb-1.5 last:border-0 hover:bg-black/[0.01] transition-colors rounded-sm px-1 cursor-default group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2 rounded-full ring-2 ring-white shadow-sm"
                            style={{
                              background: DONUT_COLORS[i % DONUT_COLORS.length],
                            }}
                          />
                          <span className="text-[12px] font-medium text-black/60 truncate max-w-[80px]">
                            {pm.name}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-[11px] font-bold text-black/70">
                            {pmView === 'volume' ? fmtCompact(pm.volume) : pm.count}
                          </span>
                        </div>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between pl-4">
                        <span className="text-[9px] font-semibold text-black/25">
                          {pct}%{' '}
                          {diff !== 0 && (
                            <span className={cn('ml-1', diff > 0 ? 'text-green' : 'text-red')}>
                              {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}%
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] font-medium text-black/20 group-hover:text-black/40 transition-colors">
                          {pmView === 'volume' ? `${pm.count}x` : fmtMoney(avgVal, lang)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </ChartCard>

        {/* ─ Volume by PSP (Horizontal Bar) ─────────── */}
        <ChartCard title={t('dashboard.charts.pspVolume')} icon={ChartBar} iconColor="text-blue">
          {isMonthlyLoading ? (
            <ChartSkeleton />
          ) : !topPsps.length ? (
            <ChartEmpty message={t('dashboard.charts.noData')} />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, topPsps.length * 38 + 30)}>
              <BarChart data={topPsps} layout="vertical" barGap={0}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={fmtCompact}
                  tick={ct.axisTick}
                  axisLine={ct.axisLine}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11, fill: ct.axisTick.fill }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => fmtMoney(value, lang)}
                  contentStyle={ct.tooltipStyle}
                />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {topPsps.map((_, i) => (
                    <Cell key={i} fill={PSP_COLORS[i % PSP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ─ Daily Net Flow (Line) ──────────────────── */}
        <ChartCard title={t('dashboard.charts.dailyNet')} icon={Pulse} iconColor="text-green">
          {isMonthlyLoading ? (
            <ChartSkeleton />
          ) : !monthlyData?.daily_net?.length ? (
            <ChartEmpty message={t('dashboard.charts.noData')} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData.daily_net}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                <XAxis
                  dataKey="day"
                  tickFormatter={fmtDay}
                  tick={ct.axisTick}
                  axisLine={ct.axisLine}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtCompact}
                  tick={ct.axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number) => [fmtMoney(value, lang), t('dashboard.charts.net')]}
                  labelFormatter={fmtDay}
                  contentStyle={ct.tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke={ct.lineColor}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: ct.lineColor }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Recent Transfers Table ─────────────────── */}
      <Card padding="default" className="border border-black/10 bg-bg1">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListBullets size={16} className="text-black/40" weight="duotone" />
            <h2 className="text-sm font-semibold text-black/60">
              {t('dashboard.tables.recentTransfers')}
            </h2>
          </div>
          <Link
            to="/transfers"
            className="flex items-center gap-1 text-xs font-medium text-black/40 hover:text-black/70"
          >
            {t('dashboard.tables.viewAll')}
            <ArrowRight size={12} />
          </Link>
        </div>
        <RecentTransfersTable
          transfers={recentTransfers}
          isLoading={isTransfersLoading}
          lang={lang}
          t={t}
        />
      </Card>

      {/* ── Top Customers + Activity Feed (2-column) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="default" className="border border-black/10 bg-bg1">
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-yellow" weight="duotone" />
            <h2 className="text-sm font-semibold text-black/60">
              {t('dashboard.tables.topCustomers')}
            </h2>
          </div>
          <TopCustomersList
            customers={monthlyData?.top_customers ?? []}
            prevCustomers={prevMonthlyData?.top_customers}
            isLoading={isMonthlyLoading}
            lang={lang}
            t={t}
          />
        </Card>

        <Card padding="default" className="border border-black/10 bg-bg1">
          <div className="mb-3 flex items-center gap-2">
            <Clock size={16} className="text-indigo" weight="duotone" />
            <h2 className="text-sm font-semibold text-black/60">
              {t('dashboard.tables.activityFeed')}
            </h2>
          </div>
          <ActivityFeed entries={activity} isLoading={isActivityLoading} lang={lang} t={t} />
        </Card>
      </div>

      {/* ── Insights Footer (2-column) ────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Exchange Rate + Sparkline */}
        <Card padding="default" className="border border-black/10 bg-bg1">
          <div className="mb-3 flex items-center gap-2">
            <Lightning size={16} className="text-yellow" weight="duotone" />
            <h2 className="text-sm font-semibold text-black/60">
              {t('dashboard.insights.exchangeRate')}
            </h2>
          </div>
          <ExchangeRateSparkline
            rateHistory={rateHistory}
            liveRate={exchangeRate}
            isLoading={isRateHistoryLoading}
          />
        </Card>

        {/* Wallet Chain Distribution */}
        <Card padding="default" className="border border-black/10 bg-bg1">
          <div className="mb-3 flex items-center gap-2">
            <LinkSimple size={16} className="text-cyan" weight="duotone" />
            <h2 className="text-sm font-semibold text-black/60">
              {t('dashboard.insights.walletChains')}
            </h2>
          </div>
          <WalletChainWidget wallets={wallets} isLoading={isWalletsLoading} t={t} />
        </Card>
      </div>

      {/* ── Monthly Insights ────────────────────────── */}
      {monthlyData?.insights && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <InsightPill
            icon={CalendarStar}
            iconColor="text-yellow"
            label={t('dashboard.insights.peakDay')}
            value={
              monthlyData.insights.peak_day
                ? `${fmtDate(monthlyData.insights.peak_day, lang)} — ${fmtCompact(monthlyData.insights.peak_day_volume)} ₺`
                : '—'
            }
          />
          <InsightPill
            icon={CalendarCheck}
            iconColor="text-green"
            label={t('dashboard.insights.activeDays')}
            value={`${monthlyData.insights.active_days} ${t('dashboard.insights.days')}`}
          />
          <InsightPill
            icon={Fire}
            iconColor="text-orange"
            label={t('dashboard.insights.avgDailyVolume')}
            value={fmtMoney(monthlyData.insights.avg_daily_volume, lang)}
          />
          <InsightPill
            icon={Receipt}
            iconColor="text-blue"
            label={t('dashboard.insights.avgPerTransfer')}
            value={fmtMoney(monthlyData.insights.avg_per_transfer, lang)}
          />
        </div>
      )}
    </div>
  )
}
