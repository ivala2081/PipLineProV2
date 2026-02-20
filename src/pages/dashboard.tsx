import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  Trophy,
  ListBullets,
  CalendarStar,
  Fire,
  CalendarCheck,
} from '@phosphor-icons/react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { supabase } from '@/lib/supabase'
import { useDashboardQuery, type DashboardPeriod } from '@/hooks/queries/useDashboardQuery'
import { useMonthlyAnalysisQuery } from '@/hooks/queries/useMonthlyAnalysisQuery'
import { useDashboardRecentQuery } from '@/hooks/queries/useDashboardRecentQuery'
import type { RecentTransfer } from '@/hooks/queries/useDashboardRecentQuery'
import type { BreakdownItem } from '@/hooks/queries/useMonthlyAnalysisQuery'
import { Tag, Tabs, TabsList, TabsTrigger, Skeleton, Grid } from '@ds'
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
  '#6366f1', // indigo-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#f43f5e', // rose-500
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

/* ================================================================== */
/*  Chart Theme Hook (dark / light aware)                              */
/* ================================================================== */

function useChartTheme() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return useMemo(
    () => ({
      isDark,
      gridStroke: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      axisTick: {
        fontSize: 11,
        fill: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
      },
      axisLine: {
        stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      },
      tooltipStyle: {
        fontSize: 12,
        borderRadius: 12,
        padding: '10px 14px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#e2e8f0' : '#1e293b',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.06)',
      },
      lineColor: isDark ? '#94e9b8' : '#18181b',
      zeroLineStroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      cursorStroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
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
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        isUp ? 'bg-green/10 text-green' : 'bg-red/10 text-red',
      )}
    >
      <Icon size={12} weight="bold" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

/* ── Hero KPI Card ───────────────────────────────────── */

function HeroKpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  isLoading,
  trend,
  splitLeft,
  splitRight,
  className,
}: {
  icon: ComponentType<IconProps>
  iconBg: string
  iconColor: string
  label: string
  value: string | number
  isLoading?: boolean
  trend?: React.ReactNode
  splitLeft?: { label: string; value: string }
  splitRight?: { label: string; value: string }
  className?: string
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-bg1 p-3 md:p-5',
        'border-black/[0.06] transition-all duration-200',
        'hover:border-black/[0.1] hover:shadow-[0_2px_16px_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {/* Header: Icon + Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex size-9 items-center justify-center rounded-xl', iconBg)}>
            <Icon size={16} className={iconColor} weight="duotone" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
            {label}
          </span>
        </div>
        {!isLoading && trend}
      </div>

      {/* Value */}
      {isLoading ? (
        <Skeleton className="mt-4 h-7 w-28 rounded-lg" />
      ) : (
        <p className="mt-4 text-lg font-bold tabular-nums tracking-tight text-black md:text-[22px]">
          {value}
        </p>
      )}

      {/* Currency Splits */}
      {(splitLeft || splitRight) && !isLoading && (
        <div className="mt-3 flex gap-4 border-t border-black/[0.04] pt-2.5">
          {splitLeft && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold tracking-wide text-black/20">
                {splitLeft.label}
              </span>
              <span className="font-mono text-[11px] font-semibold tabular-nums text-black/40">
                {splitLeft.value}
              </span>
            </div>
          )}
          {splitRight && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold tracking-wide text-black/20">
                {splitRight.label}
              </span>
              <span className="font-mono text-[11px] font-semibold tabular-nums text-black/40">
                {splitRight.value}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Chart Card Wrapper ──────────────────────────────── */

function ChartCard({
  title,
  icon: Icon,
  iconColor,
  children,
  headerRight,
  className,
}: {
  title: string
  icon: ComponentType<IconProps>
  iconColor: string
  children: React.ReactNode
  headerRight?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-black/[0.06] bg-bg1 p-3 md:p-5',
        'transition-all duration-200 hover:border-black/[0.1]',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} weight="duotone" />
          <h3 className="text-[13px] font-semibold text-black/50">{title}</h3>
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  )
}

/* ── Chart: Skeleton ─────────────────────────────────── */

function ChartSkeleton() {
  return <Skeleton className="h-[260px] w-full rounded-xl" />
}

/* ── Chart: No Data ──────────────────────────────────── */

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-black/[0.06]">
      <p className="text-xs text-black/25">{message}</p>
    </div>
  )
}

/* ── Recent Transfers List ───────────────────────────── */

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
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-black/[0.06]">
        <p className="text-xs text-black/25">{t('dashboard.tables.noTransfers')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {transfers.map((tx) => (
        <div
          key={tx.id}
          className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-black/[0.02]"
        >
          {/* Direction icon */}
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full',
              tx.isDeposit ? 'bg-green/10' : 'bg-red/10',
            )}
          >
            {tx.isDeposit ? (
              <ArrowCircleDown size={18} className="text-green" weight="duotone" />
            ) : (
              <ArrowCircleUp size={18} className="text-red" weight="duotone" />
            )}
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold text-black/75">
                {tx.full_name}
              </span>
              <Tag variant={tx.isDeposit ? 'green' : 'red'} className="shrink-0 text-[9px]">
                {tx.categoryName}
              </Tag>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-black/30">
              <Link
                to={`/psps/${tx.psp_id}`}
                className="font-medium text-black/40 transition-colors hover:text-black/70"
              >
                {tx.pspName}
              </Link>
              <span className="text-black/15">·</span>
              <span>{tx.paymentMethodName}</span>
              <span className="text-black/15">·</span>
              <span>{fmtDate(tx.transfer_date, lang)}</span>
            </div>
          </div>

          {/* Amount + time */}
          <div className="shrink-0 text-right">
            <p
              className={cn(
                'font-mono text-[14px] font-bold tabular-nums',
                tx.isDeposit ? 'text-green' : 'text-red',
              )}
            >
              {tx.isDeposit ? '+' : '−'}
              {Math.abs(tx.amount).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {tx.currency === 'TL' ? '₺' : '$'}
            </p>
            <p className="mt-0.5 text-[10px] text-black/25">{fmtTime(tx.transfer_date, lang)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Top Customers List ──────────────────────────────── */

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
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const items = customers.slice(0, 8)
  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-black/[0.06]">
        <p className="text-xs text-black/25">{t('dashboard.charts.noData')}</p>
      </div>
    )
  }

  const maxVal = Math.max(...items.map((c) => c.volume))

  const rankStyle = (i: number) => {
    if (i === 0) return { badge: 'bg-yellow/20 text-yellow', bar: '#f59e0b' }
    if (i === 1) return { badge: 'bg-black/[0.07] text-black/40', bar: '#94a3b8' }
    if (i === 2) return { badge: 'bg-orange/15 text-orange', bar: '#f97316' }
    return { badge: 'bg-black/[0.04] text-black/25', bar: '#6366f1' }
  }

  return (
    <div className="space-y-0.5">
      {items.map((cust, i) => {
        const pct = maxVal > 0 ? (cust.volume / maxVal) * 100 : 0
        const prev = prevCustomers?.find((c) => c.name === cust.name)
        const diff = prev ? ((cust.volume - prev.volume) / prev.volume) * 100 : null
        const { badge, bar } = rankStyle(i)

        return (
          <div
            key={`${cust.name}-${i}`}
            className="rounded-xl px-2 py-2 transition-colors hover:bg-black/[0.02]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-black',
                    badge,
                  )}
                >
                  {i + 1}
                </span>
                <UserAvatar name={cust.name} size="sm" className="shrink-0" />
                <span className="truncate text-[13px] font-medium text-black/65">{cust.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[12px] font-bold tabular-nums text-black/65">
                  {fmtMoney(cust.volume, lang)}
                </span>
                {diff !== null && Math.abs(diff) >= 1 && (
                  <span
                    className={cn(
                      'text-[10px] font-semibold',
                      diff > 0 ? 'text-green' : 'text-red',
                    )}
                  >
                    {diff > 0 ? '↑' : '↓'}
                    {Math.abs(diff).toFixed(0)}%
                  </span>
                )}
                {!prev && prevCustomers && prevCustomers.length > 0 && (
                  <span className="text-[10px] italic text-black/20">New</span>
                )}
                <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-black/25">
                  {cust.count}x
                </span>
              </div>
            </div>
            <div className="ml-[72px] mt-1.5 h-1 overflow-hidden rounded-full bg-black/[0.04]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: bar, opacity: 0.5 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Insight Card ────────────────────────────────────── */

function InsightCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
}: {
  icon: ComponentType<IconProps>
  iconColor: string
  iconBg: string
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-bg1 px-4 py-4 transition-all duration-200 hover:border-black/[0.1] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className={cn('flex size-9 items-center justify-center rounded-xl', iconBg)}>
        <Icon size={16} className={iconColor} weight="duotone" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-black/25">{label}</p>
        <p className="mt-1 font-mono text-[15px] font-bold tabular-nums text-black/70">{value}</p>
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
  const { profile } = useAuth()
  const { currentOrg } = useOrganization()
  const ct = useChartTheme()

  /* ── Data hooks ──────────────────────────────────── */
  const [period, setPeriod] = useState<DashboardPeriod>('month')
  const [pmView, setPmView] = useState<'volume' | 'count'>('volume')
  const [primaryCurrency, setPrimaryCurrency] = useState<'USD' | 'TRY'>('USD')
  const { kpis, prevKpis, isLoading } = useDashboardQuery(period)

  const now = useMemo(() => new Date(), [])
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
  const { recentTransfers, isTransfersLoading } = useDashboardRecentQuery()

  /* ── PSP Currency Split (TL vs USD→TL per PSP) ───── */
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const todayStr = now.toISOString().slice(0, 10)
  const { data: pspCurrencySplit } = useQuery({
    queryKey: ['dashboard', 'pspCurrencySplit', currentOrg?.id, monthStartStr],
    queryFn: async () => {
      if (!currentOrg) throw new Error('No org')
      const { data, error } = await supabase
        .from('transfers')
        .select('psp_id, currency, amount_try, psp:psps!psp_id(name, is_internal)')
        .eq('organization_id', currentOrg.id)
        .gte('transfer_date', `${monthStartStr}T00:00:00`)
        .lte('transfer_date', `${todayStr}T23:59:59`)
      if (error) throw error

      const map = new Map<
        string,
        { name: string; try_volume: number; usd_volume: number; is_internal: boolean }
      >()
      for (const row of (data ?? []) as Array<{
        psp_id: string
        currency: string
        amount_try: number
        psp: { name: string; is_internal: boolean } | null
      }>) {
        const psp = row.psp as { name: string; is_internal: boolean } | null
        const name = psp?.name ?? row.psp_id
        const isInternal = psp?.is_internal ?? false
        if (!map.has(name))
          map.set(name, { name, try_volume: 0, usd_volume: 0, is_internal: isInternal })
        const entry = map.get(name)!
        const amtTry = Number(row.amount_try) || 0
        if (row.currency === 'TL') entry.try_volume += amtTry
        else entry.usd_volume += amtTry
      }

      const all = [...map.values()]
      const external = all
        .filter((p) => !p.is_internal)
        .sort((a, b) => b.try_volume + b.usd_volume - (a.try_volume + a.usd_volume))
      const internal = all
        .filter((p) => p.is_internal)
        .sort((a, b) => b.try_volume + b.usd_volume - (a.try_volume + a.usd_volume))

      const top = external.slice(0, 8)
      const rest = external.slice(8)
      if (rest.length > 0) {
        top.push({
          name: `Other (${rest.length})`,
          try_volume: rest.reduce((s, r) => s + r.try_volume, 0),
          usd_volume: rest.reduce((s, r) => s + r.usd_volume, 0),
          is_internal: false,
        })
      }
      return { external: top, internal }
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
  })

  /* ── Derived values ──────────────────────────────── */
  const displayName = profile?.display_name || t('dashboard.defaultUser')

  const topPsps = useMemo(
    () => (monthlyData?.psp_breakdown ?? []).slice(0, 8),
    [monthlyData?.psp_breakdown],
  )

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

  /* ── Currency-aware KPI values ───────────────────── */
  const isUSD = primaryCurrency === 'USD'

  // Raw split amounts
  const depUsd = kpis?.depositSplit?.usdAmount ?? 0
  const depTry = kpis?.depositSplit?.tryAmount ?? 0
  const wdUsd = kpis?.withdrawalSplit?.usdAmount ?? 0
  const wdTry = kpis?.withdrawalSplit?.tryAmount ?? 0
  const netUsd = depUsd - wdUsd
  const netTry = depTry - wdTry

  // Previous period splits for trends
  const prevDepUsd = prevKpis?.depositSplit?.usdAmount ?? 0
  const prevWdUsd = prevKpis?.withdrawalSplit?.usdAmount ?? 0
  const prevNetUsd = prevDepUsd - prevWdUsd

  // Formatted values for primary/secondary display
  const depositMainValue = isUSD
    ? fmtMoney(depUsd, lang, '$')
    : fmtMoney(kpis?.totalDeposits ?? 0, lang)
  const depositTrend = isUSD
    ? { current: depUsd, previous: prevDepUsd }
    : { current: kpis?.totalDeposits ?? 0, previous: prevKpis?.totalDeposits }
  const depositSecondary = isUSD
    ? { label: 'TRY', value: fmtCompact(depTry) + ' ₺' }
    : { label: 'USD', value: fmtCompact(depUsd) + ' $' }

  const withdrawalMainValue = isUSD
    ? fmtMoney(wdUsd, lang, '$')
    : fmtMoney(kpis?.totalWithdrawals ?? 0, lang)
  const withdrawalTrend = isUSD
    ? { current: wdUsd, previous: prevWdUsd }
    : { current: kpis?.totalWithdrawals ?? 0, previous: prevKpis?.totalWithdrawals }
  const withdrawalSecondary = isUSD
    ? { label: 'TRY', value: fmtCompact(wdTry) + ' ₺' }
    : { label: 'USD', value: fmtCompact(wdUsd) + ' $' }

  const netMainValue = isUSD ? fmtMoney(netUsd, lang, '$') : fmtMoney(kpis?.netCash ?? 0, lang)
  const netTrend = isUSD
    ? { current: netUsd, previous: prevNetUsd }
    : { current: kpis?.netCash ?? 0, previous: prevKpis?.netCash }
  const netSecondary = isUSD
    ? { label: 'TRY', value: fmtCompact(netTry) + ' ₺' }
    : { label: 'USD', value: fmtCompact(netUsd) + ' $' }

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="w-full max-w-full space-y-6">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            {t('dashboard.welcome', { name: displayName })}
          </h1>
          <p className="mt-1 text-sm text-black/40">
            {currentOrg
              ? t('dashboard.orgContext', { org: currentOrg.name })
              : t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Currency toggle */}
          <div className="flex items-center overflow-hidden rounded-lg border border-black/[0.08]">
            <button
              onClick={() => setPrimaryCurrency('USD')}
              className={cn(
                'px-3 py-1.5 text-[11px] font-bold tracking-wide transition-all',
                isUSD
                  ? 'bg-black/[0.07] text-black'
                  : 'text-black/35 hover:bg-black/[0.03] hover:text-black/60',
              )}
            >
              $ USD
            </button>
            <div className="h-4 w-px bg-black/[0.08]" />
            <button
              onClick={() => setPrimaryCurrency('TRY')}
              className={cn(
                'px-3 py-1.5 text-[11px] font-bold tracking-wide transition-all',
                !isUSD
                  ? 'bg-black/[0.07] text-black'
                  : 'text-black/35 hover:bg-black/[0.03] hover:text-black/60',
              )}
            >
              ₺ TRY
            </button>
          </div>
          {/* Period toggle */}
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <HeroKpiCard
          icon={ArrowCircleDown}
          iconBg="bg-green/10"
          iconColor="text-green"
          label={t('dashboard.kpi.deposits')}
          value={depositMainValue}
          isLoading={isLoading}
          trend={<TrendBadge {...depositTrend} />}
          splitLeft={depositSecondary}
        />
        <HeroKpiCard
          icon={ArrowCircleUp}
          iconBg="bg-red/10"
          iconColor="text-red"
          label={t('dashboard.kpi.withdrawals')}
          value={withdrawalMainValue}
          isLoading={isLoading}
          trend={<TrendBadge {...withdrawalTrend} />}
          splitLeft={withdrawalSecondary}
        />
        <HeroKpiCard
          icon={Wallet}
          iconBg="bg-indigo/10"
          iconColor="text-indigo"
          label={t('dashboard.kpi.netCash')}
          value={netMainValue}
          isLoading={isLoading}
          trend={<TrendBadge {...netTrend} />}
          splitLeft={netSecondary}
        />
        <HeroKpiCard
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
        <HeroKpiCard
          icon={Receipt}
          iconBg="bg-cyan/10"
          iconColor="text-cyan"
          label={t('dashboard.kpi.transactions')}
          value={fmtCount(kpis?.transactionCount ?? 0, lang)}
          isLoading={isLoading}
          className="sm:col-span-2 lg:col-span-1"
          trend={
            <TrendBadge
              current={kpis?.transactionCount ?? 0}
              previous={prevKpis?.transactionCount}
            />
          }
          splitLeft={{ label: '↑', value: fmtCount(kpis?.depositCount ?? 0, lang) }}
          splitRight={{ label: '↓', value: fmtCount(kpis?.withdrawalCount ?? 0, lang) }}
        />
      </div>

      {/* ── Charts Section (2x2 grid) ────────────────── */}
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
            <>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData.daily_volume}>
                  <defs>
                    <linearGradient id="gradDep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradWd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RED} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={RED} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} vertical={false} />
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
                    width={50}
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
                    cursor={{ strokeDasharray: '4 4', stroke: ct.cursorStroke }}
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
              {/* Legend */}
              <div className="mt-3 flex items-center justify-center gap-6">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-green" />
                  <span className="text-[11px] text-black/40">
                    {t('dashboard.charts.deposits')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-red" />
                  <span className="text-[11px] text-black/40">
                    {t('dashboard.charts.withdrawals')}
                  </span>
                </div>
              </div>
            </>
          )}
        </ChartCard>

        {/* ─ Payment Methods (Donut with side legend) ─ */}
        <ChartCard
          title={t('dashboard.charts.paymentMethods')}
          icon={ChartPie}
          iconColor="text-purple"
          headerRight={
            !isMonthlyLoading && paymentMethods.length > 0 ? (
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
            ) : null
          }
        >
          {isMonthlyLoading ? (
            <ChartSkeleton />
          ) : !paymentMethods.length ? (
            <ChartEmpty message={t('dashboard.charts.noData')} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center">
                {/* Donut */}
                <div className="relative h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        dataKey={pmView === 'volume' ? 'volume' : 'count'}
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={2}
                        stroke={ct.isDark ? '#0f172a' : '#ffffff'}
                        strokeWidth={2}
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {paymentMethods.map((_, i) => (
                          <Cell
                            key={i}
                            fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                            className="transition-opacity hover:opacity-80"
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
                      <p className="text-[9px] font-bold uppercase tracking-widest text-black/25">
                        {pmView === 'volume'
                          ? t('dashboard.charts.total')
                          : t('dashboard.charts.totalCount')}
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-black tabular-nums text-black/70">
                        {pmView === 'volume' ? fmtCompact(pmTotal) : pmTotal}
                        {pmView === 'volume' && (
                          <span className="ml-0.5 text-sm font-medium">₺</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Side Legend */}
                <div className="min-w-0 flex-1 space-y-1">
                  {paymentMethods.map((pm, i) => {
                    const val = pmView === 'volume' ? pm.volume : pm.count
                    const pct = pmTotal > 0 ? ((val / pmTotal) * 100).toFixed(1) : '0'
                    const prevPm = prevMonthlyData?.payment_method_breakdown?.find(
                      (p) => p.name === pm.name,
                    )
                    const prevVal = prevPm
                      ? pmView === 'volume'
                        ? prevPm.volume
                        : prevPm.count
                      : 0
                    const diff = prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : 0

                    return (
                      <div
                        key={pm.name}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-black/[0.02]"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                          />
                          <span className="truncate text-[12px] font-medium text-black/55">
                            {pm.name}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-[11px] font-bold tabular-nums text-black/60">
                            {pmView === 'volume' ? fmtCompact(pm.volume) : pm.count}
                          </span>
                          <span className="text-[10px] font-semibold text-black/20">{pct}%</span>
                          {diff !== 0 && (
                            <span
                              className={cn(
                                'text-[10px] font-semibold',
                                diff > 0 ? 'text-green' : 'text-red',
                              )}
                            >
                              {diff > 0 ? '↑' : '↓'}
                              {Math.abs(diff).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        {/* ─ Volume by PSP (Ranked Leaderboard) ─────── */}
        <ChartCard title={t('dashboard.charts.pspVolume')} icon={ChartBar} iconColor="text-blue">
          {isMonthlyLoading || !pspCurrencySplit ? (
            <ChartSkeleton />
          ) : !pspCurrencySplit.external.length && !pspCurrencySplit.internal.length ? (
            <ChartEmpty message={t('dashboard.charts.noData')} />
          ) : (
            <>
              {/* ── External (ranked) ── */}
              {pspCurrencySplit.external.length > 0 &&
                (() => {
                  const maxTotal =
                    pspCurrencySplit.external[0].try_volume +
                    pspCurrencySplit.external[0].usd_volume
                  return (
                    <div className="space-y-0.5">
                      {pspCurrencySplit.external.map((psp, i) => {
                        const total = psp.try_volume + psp.usd_volume
                        const widthPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0
                        const tryPct = total > 0 ? (psp.try_volume / total) * 100 : 100
                        const isOther = psp.name.startsWith('Other (')
                        const prevPsp = isOther
                          ? null
                          : prevMonthlyData?.psp_breakdown?.find((p) => p.name === psp.name)
                        const diff =
                          prevPsp && prevPsp.volume > 0
                            ? ((total - prevPsp.volume) / prevPsp.volume) * 100
                            : null
                        const rankBadge = isOther
                          ? 'bg-black/[0.03] text-black/20'
                          : i === 0
                            ? 'bg-yellow/20 text-yellow'
                            : i === 1
                              ? 'bg-black/[0.07] text-black/40'
                              : i === 2
                                ? 'bg-orange/15 text-orange'
                                : 'bg-black/[0.04] text-black/25'

                        return (
                          <div
                            key={psp.name}
                            className={cn(
                              'rounded-xl px-2 py-2 transition-colors hover:bg-black/[0.025]',
                              isOther && 'mt-1 border-t border-dashed border-black/[0.05] pt-3',
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  'flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-black',
                                  rankBadge,
                                )}
                              >
                                {isOther ? '···' : i + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-[13px] font-semibold text-black/70">
                                    {psp.name}
                                  </span>
                                  <div className="flex shrink-0 items-center gap-2">
                                    {diff !== null && (
                                      <span
                                        className={cn(
                                          'text-[10px] font-bold',
                                          diff >= 0 ? 'text-green' : 'text-red',
                                        )}
                                      >
                                        {diff >= 0 ? '↑' : '↓'}
                                        {Math.abs(diff).toFixed(0)}%
                                      </span>
                                    )}
                                    <span className="font-mono text-[12px] font-bold tabular-nums text-black/70">
                                      {fmtMoney(total, lang)}
                                    </span>
                                    <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-bold text-black/25">
                                      {topPsps.find((p) => p.name === psp.name)?.count ?? 0}x
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                                  <div className="flex h-full" style={{ width: `${widthPct}%` }}>
                                    <div
                                      className="h-full bg-[#6366f1] transition-all duration-700"
                                      style={{ width: `${tryPct}%` }}
                                    />
                                    <div
                                      className="h-full bg-[#06b6d4] transition-all duration-700"
                                      style={{ width: `${100 - tryPct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

              {/* ── Internal (reference only) ── */}
              {pspCurrencySplit.internal.length > 0 &&
                (() => {
                  const intMaxTotal =
                    pspCurrencySplit.internal[0].try_volume +
                    pspCurrencySplit.internal[0].usd_volume
                  return (
                    <div className="mt-3 border-t border-black/[0.05] pt-3">
                      <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-black/20">
                        Internal
                      </p>
                      <div className="space-y-0.5">
                        {pspCurrencySplit.internal.map((psp) => {
                          const total = psp.try_volume + psp.usd_volume
                          const widthPct = intMaxTotal > 0 ? (total / intMaxTotal) * 100 : 0
                          const tryPct = total > 0 ? (psp.try_volume / total) * 100 : 100
                          return (
                            <div
                              key={psp.name}
                              className="rounded-xl px-2 py-1.5 transition-colors hover:bg-black/[0.015]"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-black/[0.03] font-mono text-[9px] font-bold text-black/20">
                                  INT
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-[12px] font-medium text-black/40">
                                      {psp.name}
                                    </span>
                                    <span className="font-mono text-[11px] font-semibold tabular-nums text-black/35">
                                      {fmtMoney(total, lang)}
                                    </span>
                                  </div>
                                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/[0.03]">
                                    <div className="flex h-full" style={{ width: `${widthPct}%` }}>
                                      <div
                                        className="h-full bg-[#6366f1]/40"
                                        style={{ width: `${tryPct}%` }}
                                      />
                                      <div
                                        className="h-full bg-[#06b6d4]/40"
                                        style={{ width: `${100 - tryPct}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

              {/* Legend */}
              <div className="mt-3 flex items-center justify-center gap-5 border-t border-black/[0.04] pt-3">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-[#6366f1]" />
                  <span className="text-[11px] text-black/35">₺ TL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-[#06b6d4]" />
                  <span className="text-[11px] text-black/35">$ USD → ₺</span>
                </div>
              </div>
            </>
          )}
        </ChartCard>

        {/* ─ Daily Net Flow (Area with zero-line) ───── */}
        <ChartCard title={t('dashboard.charts.dailyNet')} icon={Pulse} iconColor="text-green">
          {isMonthlyLoading ? (
            <ChartSkeleton />
          ) : !monthlyData?.daily_net?.length ? (
            <ChartEmpty message={t('dashboard.charts.noData')} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData.daily_net}>
                <defs>
                  <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ct.lineColor} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={ct.lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} vertical={false} />
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
                  width={50}
                />
                <ReferenceLine y={0} stroke={ct.zeroLineStroke} strokeDasharray="4 4" />
                <Tooltip
                  formatter={(value: number) => [fmtMoney(value, lang), t('dashboard.charts.net')]}
                  labelFormatter={fmtDay}
                  contentStyle={ct.tooltipStyle}
                  cursor={{ strokeDasharray: '4 4', stroke: ct.cursorStroke }}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke={ct.lineColor}
                  strokeWidth={2}
                  fill="url(#gradNet)"
                  dot={{ r: 2, fill: ct.lineColor, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Bottom: Transfers + Customers side-by-side  */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Recent Transfers */}
        <div className="rounded-2xl border border-black/[0.06] bg-bg1 p-3 md:p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListBullets size={16} className="text-black/35" weight="duotone" />
              <h2 className="text-[13px] font-semibold text-black/50">
                {t('dashboard.tables.recentTransfers')}
              </h2>
            </div>
            <Link
              to="/transfers"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/35 transition-colors hover:bg-black/[0.03] hover:text-black/60"
            >
              {t('dashboard.tables.viewAll')}
              <ArrowRight size={12} />
            </Link>
          </div>
          <RecentTransfersTable
            transfers={recentTransfers.slice(0, 5)}
            isLoading={isTransfersLoading}
            lang={lang}
            t={t as (key: string) => string}
          />
        </div>

        {/* Top Customers */}
        <div className="rounded-2xl border border-black/[0.06] bg-bg1 p-3 md:p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-yellow" weight="duotone" />
            <h2 className="text-[13px] font-semibold text-black/50">
              {t('dashboard.tables.topCustomers')}
            </h2>
          </div>
          <TopCustomersList
            customers={monthlyData?.top_customers ?? []}
            prevCustomers={prevMonthlyData?.top_customers}
            isLoading={isMonthlyLoading}
            lang={lang}
            t={t as (key: string) => string}
          />
        </div>
      </div>

      {/* ── Monthly Insights ────────────────────────── */}
      {monthlyData?.insights && (
        <Grid cols={4}>
          <InsightCard
            icon={CalendarStar}
            iconBg="bg-yellow/10"
            iconColor="text-yellow"
            label={t('dashboard.insights.peakDay')}
            value={
              monthlyData.insights.peak_day
                ? `${fmtDate(monthlyData.insights.peak_day, lang)} — ${fmtCompact(monthlyData.insights.peak_day_volume)} ₺`
                : '—'
            }
          />
          <InsightCard
            icon={CalendarCheck}
            iconBg="bg-green/10"
            iconColor="text-green"
            label={t('dashboard.insights.activeDays')}
            value={`${monthlyData.insights.active_days} ${t('dashboard.insights.days')}`}
          />
          <InsightCard
            icon={Fire}
            iconBg="bg-orange/10"
            iconColor="text-orange"
            label={t('dashboard.insights.avgDailyVolume')}
            value={fmtMoney(monthlyData.insights.avg_daily_volume, lang)}
          />
          <InsightCard
            icon={Receipt}
            iconBg="bg-blue/10"
            iconColor="text-blue"
            label={t('dashboard.insights.avgPerTransfer')}
            value={fmtMoney(monthlyData.insights.avg_per_transfer, lang)}
          />
        </Grid>
      )}
    </div>
  )
}
