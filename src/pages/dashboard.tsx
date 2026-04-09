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
  Trophy,
  ListBullets,
  CalendarStar,
  Fire,
  CalendarCheck,
  Hash,
  CalendarBlank,
  Users,
  Handshake,
} from '@phosphor-icons/react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { CURRENCIES } from '@/lib/currencies'
import {
  useDashboardQuery,
  type DashboardPeriod,
} from '@/hooks/queries/useDashboardQuery'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { queryKeys } from '@/lib/queryKeys'
import { useMonthlyAnalysisQuery } from '@/hooks/queries/useMonthlyAnalysisQuery'
import { useExchangeRateQuery } from '@/hooks/queries/useExchangeRateQuery'
import { useDashboardRecentQuery } from '@/hooks/queries/useDashboardRecentQuery'
import type { RecentTransfer } from '@/hooks/queries/useDashboardRecentQuery'
import type { BreakdownItem } from '@/hooks/queries/useMonthlyAnalysisQuery'
import { useDashboardChartsQuery } from '@/hooks/queries/useDashboardChartsQuery'
import { useBestEmployeesQuery, type EmployeePerformance } from '@/hooks/queries/useBestEmployeesQuery'
import { useTopBrokersQuery, type BrokerPerformance } from '@/hooks/queries/useTopBrokersQuery'
import { Tag, Tabs, TabsList, TabsTrigger, Skeleton, Grid, EmptyState } from '@ds'
import { SectionErrorBoundary } from '@/components/ErrorBoundary'

import { UserAvatar } from '@/components/UserAvatar'
import { useTheme } from '@ds'
import { cn } from '@ds/utils'
import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'

/* ================================================================== */
/*  Constants & Helpers                                                */
/* ================================================================== */

const DEPOSIT_COLOR = 'var(--color-deposit)'
const WITHDRAWAL_COLOR = 'var(--color-withdrawal)'

const DONUT_COLORS = [
  '#9f9ff8', // indigo (muted)
  '#aec7ed', // cyan (muted)
  '#96e2d6', // mint (muted)
  '#ffdb56', // yellow (muted)
  '#c9b3ed', // purple (muted)
  '#ffb55b', // orange (muted)
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

function fmtMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-')
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  return `${months[Number(m) - 1]} ${y.slice(2)}`
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
      lineColor: 'var(--color-net-line)',
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
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
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
  valueColor,
  isLoading,
  trend,
  splitLeft,
  splitRight,
  className,
  onClick,
}: {
  icon: ComponentType<IconProps>
  iconBg: string
  iconColor: string
  label: string
  value: string | number
  valueColor?: string
  isLoading?: boolean
  trend?: React.ReactNode
  splitLeft?: { label: string; value: string }
  splitRight?: { label: string; value: string }
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-bg1 p-3 md:p-5',
        'border-black/[0.06] transition-all duration-200',
        'hover:border-black/[0.1] hover:shadow-[0_2px_16px_rgba(0,0,0,0.04)]',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {/* Header: Icon + Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex size-9 items-center justify-center rounded-xl', iconBg)}>
            <Icon size={16} className={iconColor} weight="duotone" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-black/40">
            {label}
          </span>
        </div>
        {!isLoading && trend}
      </div>

      {/* Value */}
      {isLoading ? (
        <Skeleton className="mt-4 h-7 w-28 rounded-lg" />
      ) : (
        <p className={cn('mt-4 text-lg font-bold tabular-nums tracking-tight md:text-[22px]', valueColor || 'text-black')}>
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
              <span className="font-mono text-xs font-semibold tabular-nums text-black/40">
                {splitLeft.value}
              </span>
            </div>
          )}
          {splitRight && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold tracking-wide text-black/20">
                {splitRight.label}
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-black/40">
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
  subtitle,
  icon: Icon,
  iconColor,
  children,
  headerRight,
  className,
}: {
  title: string
  subtitle?: string | null
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
          <h3 className="text-sm font-semibold text-black/60">{title}</h3>
          {subtitle && (
            <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-black/40">
              {subtitle}
            </span>
          )}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  )
}

/* ── Chart: Skeleton ─────────────────────────────────── */

function ChartSkeleton() {
  return <Skeleton className="min-h-[250px] md:min-h-[350px] w-full rounded-xl" />
}

/* ── Chart: No Data ──────────────────────────────────── */

function ChartEmpty({ message }: { message: string }) {
  return (
    <EmptyState
      icon={ChartLine}
      title={message}
      className="min-h-[250px] md:min-h-[350px] border-dashed py-0"
    />
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
      <EmptyState
        icon={ListBullets}
        title={t('dashboard.tables.noTransfers')}
        className="h-40 py-0"
      />
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
              <span className="truncate text-sm font-semibold text-black/60">{tx.full_name}</span>
              <Tag variant={tx.isDeposit ? 'green' : 'red'} className="shrink-0 text-[9px]">
                {tx.categoryName}
              </Tag>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-black/40">
              <Link
                to={`/psps/${tx.psp_id}`}
                className="font-medium text-black/40 transition-colors hover:text-black/60"
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
                'font-mono text-sm font-bold tabular-nums',
                tx.isDeposit ? 'text-green' : 'text-red',
              )}
            >
              {tx.isDeposit ? '+' : '−'}
              {Math.abs(tx.amount).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {CURRENCIES.find((c) => c.code === tx.currency)?.symbol ?? tx.currency}
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

  const items = customers.slice(0, 5)
  if (items.length === 0) {
    return <EmptyState icon={Trophy} title={t('dashboard.charts.noData')} className="h-40 py-0" />
  }

  const maxVal = Math.max(...items.map((c) => c.volume))

  const rankStyle = (i: number) => {
    if (i === 0) return { badge: 'bg-black/[0.12] text-black/80', bar: '#475569' }
    if (i === 1) return { badge: 'bg-black/10 text-black/60', bar: '#64748b' }
    if (i === 2) return { badge: 'bg-black/[0.08] text-black/50', bar: '#94a3b8' }
    return { badge: 'bg-black/[0.06] text-black/40', bar: '#cbd5e1' }
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
                <span className="truncate text-sm font-medium text-black/60">{cust.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-xs font-bold tabular-nums text-black/60">
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
            <div className="ml-[38px] mt-1.5 h-1 overflow-hidden rounded-full bg-black/[0.04]">
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
        <p className="text-xs font-semibold uppercase tracking-wider text-black/40">{label}</p>
        <p className="mt-1 font-mono text-sm font-bold tabular-nums text-black/60">{value}</p>
      </div>
    </div>
  )
}

/* ── Best Employees List ─────────────────────────────── */

function BestEmployeesList({
  employees,
  tab,
  isLoading,
  lang,
  t,
}: {
  employees: EmployeePerformance[]
  tab: 'marketing' | 'retention'
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

  const items = employees.slice(0, 5)
  if (items.length === 0) {
    return <EmptyState icon={Users} title={t('dashboard.charts.noEmployees')} className="h-40 py-0" />
  }

  const maxVal = Math.max(
    ...items.map((e) => (tab === 'marketing' ? e.transferCount : e.netContributionUsd)),
  )

  const rankStyle = (i: number) => {
    if (i === 0) return { badge: 'bg-black/[0.12] text-black/80', bar: '#475569' }
    if (i === 1) return { badge: 'bg-black/10 text-black/60', bar: '#64748b' }
    if (i === 2) return { badge: 'bg-black/[0.08] text-black/50', bar: '#94a3b8' }
    return { badge: 'bg-black/[0.06] text-black/40', bar: '#cbd5e1' }
  }

  return (
    <div className="space-y-0.5">
      {items.map((emp, i) => {
        const primaryVal = tab === 'marketing' ? emp.transferCount : emp.netContributionUsd
        const pct = maxVal > 0 ? (Math.abs(primaryVal) / Math.max(Math.abs(maxVal), 1)) * 100 : 0
        const { badge, bar } = rankStyle(i)

        return (
          <div
            key={emp.employeeId}
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
                <span className="truncate text-sm font-medium text-black/60">{emp.fullName}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {tab === 'marketing' ? (
                  <>
                    <span className="font-mono text-xs font-bold tabular-nums text-black/60">
                      {emp.transferCount} tx
                    </span>
                    {emp.firstDepositCount > 0 && (
                      <span className="rounded-full bg-green/10 px-1.5 py-0.5 text-[10px] font-bold text-green">
                        {emp.firstDepositCount} FTD
                      </span>
                    )}
                    <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-black/25">
                      {fmtCompact(emp.totalVolumeUsd)} $
                    </span>
                  </>
                ) : (
                  <>
                    <span className={cn(
                      'font-mono text-xs font-bold tabular-nums',
                      emp.netContributionUsd >= 0 ? 'text-green' : 'text-red',
                    )}>
                      {fmtMoney(emp.netContributionUsd, lang, '$')}
                    </span>
                    <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-black/25">
                      {emp.transferCount} tx
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="ml-[38px] mt-1.5 h-1 overflow-hidden rounded-full bg-black/[0.04]">
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

/* ── Top Brokers List ───────────────────────────────── */

function TopBrokersList({
  brokers,
  isLoading,
  lang,
  t,
}: {
  brokers: BrokerPerformance[]
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

  const items = brokers.slice(0, 5)
  if (items.length === 0) {
    return <EmptyState icon={Handshake} title={t('dashboard.charts.noBrokers')} className="h-40 py-0" />
  }

  const maxVal = Math.max(...items.map((b) => Math.abs(b.netProfit)))

  const rankStyle = (i: number) => {
    if (i === 0) return { badge: 'bg-black/[0.12] text-black/80', bar: '#475569' }
    if (i === 1) return { badge: 'bg-black/10 text-black/60', bar: '#64748b' }
    if (i === 2) return { badge: 'bg-black/[0.08] text-black/50', bar: '#94a3b8' }
    return { badge: 'bg-black/[0.06] text-black/40', bar: '#cbd5e1' }
  }

  return (
    <div className="space-y-0.5">
      {items.map((broker, i) => {
        const pct = maxVal > 0 ? (Math.abs(broker.netProfit) / maxVal) * 100 : 0
        const { badge, bar } = rankStyle(i)

        return (
          <div
            key={broker.partnerId}
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
                <span className="truncate text-sm font-medium text-black/60">{broker.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className={cn(
                  'font-mono text-xs font-bold tabular-nums',
                  broker.netProfit >= 0 ? 'text-green' : 'text-red',
                )}>
                  {fmtMoney(broker.netProfit, lang, '$')}
                </span>
                {broker.referralCount > 0 && (
                  <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-black/25">
                    {broker.referralCount} ref
                  </span>
                )}
              </div>
            </div>
            <div className="ml-[38px] mt-1.5 h-1 overflow-hidden rounded-full bg-black/[0.04]">
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

/* ================================================================== */
/*  Dashboard Page                                                     */
/* ================================================================== */

export function DashboardPage() {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language?.slice(0, 2) ?? 'en'
  const { profile } = useAuth()
  const { currentOrg } = useOrganization()
  const ct = useChartTheme()

  const [activeFilter, setActiveFilter] = useState<
    'deposits' | 'withdrawals' | 'commission' | null
  >(null)

  useRealtimeSubscription('transfers', [queryKeys.transfers.all, ['dashboard']])

  /* ── Exchange rate (USD → base, for chart conversion) */
  const { rate: usdToBaseRate } = useExchangeRateQuery('USD')

  /* ── Data hooks ──────────────────────────────────── */
  const [period, setPeriod] = useState<DashboardPeriod>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [pmView, setPmView] = useState<'volume' | 'count'>('volume')
  const [showUsd, setShowUsd] = useState(true)
  const [viewMode, setViewMode] = useState<'gross' | 'net'>('gross')
  const { kpis, prevKpis, isLoading } = useDashboardQuery(
    period,
    period === 'custom' ? customFrom : undefined,
    period === 'custom' ? customTo : undefined,
  )

  /* ── Period-aware chart data ─────────────────────── */
  const { chartsData, isChartsLoading, granularity } = useDashboardChartsQuery(
    period,
    period === 'custom' ? customFrom : undefined,
    period === 'custom' ? customTo : undefined,
  )
  const { bestEmployees, isBestEmployeesLoading } = useBestEmployeesQuery(
    period,
    period === 'custom' ? customFrom : undefined,
    period === 'custom' ? customTo : undefined,
  )
  const { topBrokers, isTopBrokersLoading } = useTopBrokersQuery(
    period,
    period === 'custom' ? customFrom : undefined,
    period === 'custom' ? customTo : undefined,
  )
  const [empTab, setEmpTab] = useState<'marketing' | 'retention'>('marketing')

  /* ── Previous month (for bottom overview section) ── */
  const now = useMemo(() => new Date(), [])
  const prevMonthDate = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d
  }, [now])
  const { data: prevMonthlyData, isLoading: isPrevMonthlyLoading } = useMonthlyAnalysisQuery(
    prevMonthDate.getFullYear(),
    prevMonthDate.getMonth() + 1,
  )
  /* ── Current month (for insights section) ────────── */
  const { data: monthlyData, isLoading: isMonthlyLoading } = useMonthlyAnalysisQuery(
    now.getFullYear(),
    now.getMonth() + 1,
  )
  const chartMonthlyData = monthlyData ?? prevMonthlyData

  const { recentTransfers, isTransfersLoading } = useDashboardRecentQuery()

  const filteredRecentTransfers = useMemo(
    () =>
      activeFilter === 'deposits'
        ? recentTransfers.filter((tx) => tx.isDeposit)
        : activeFilter === 'withdrawals'
          ? recentTransfers.filter((tx) => !tx.isDeposit)
          : recentTransfers,
    [recentTransfers, activeFilter],
  )


  /* ── Derived values ──────────────────────────────── */
  const displayName = profile?.display_name || t('dashboard.defaultUser')

  /* ── Period-aware chart derived data ──────────────── */
  const paymentMethods = useMemo(() => {
    const factor = showUsd && usdToBaseRate ? 1 / usdToBaseRate : 1
    return (chartsData?.paymentMethodBreakdown ?? [])
      .filter((pm) => (pmView === 'volume' ? pm.volume > 0 : pm.count > 0))
      .sort((a, b) => (pmView === 'volume' ? b.volume - a.volume : b.count - a.count))
      .map((pm) => ({ ...pm, volume: pm.volume * factor }))
  }, [chartsData?.paymentMethodBreakdown, pmView, showUsd, usdToBaseRate])

  const pmTotal = useMemo(
    () => paymentMethods.reduce((s, pm) => s + (pmView === 'volume' ? pm.volume : pm.count), 0),
    [paymentMethods, pmView],
  )

  /* ── Currency-aware KPI values ───────────────────── */
  const isUSD = showUsd
  const isNet = viewMode === 'net'

  const baseCurrency = currentOrg?.base_currency ?? 'TRY'
  const baseCurrencySymbol = CURRENCIES.find((c) => c.code === baseCurrency)?.symbol ?? baseCurrency

  // Base → USD multiplier for chart conversion (null = rate not yet loaded)
  const chartUsdFactor = isUSD && usdToBaseRate ? 1 / usdToBaseRate : null

  const chartVolumeTrend = useMemo(() => {
    const src = chartsData?.volumeTrend ?? []
    if (!isUSD) return src.map((p) => ({ label: p.label, deposits: p.deposits, withdrawals: p.withdrawals }))
    return src.map((p) => ({ label: p.label, deposits: p.depositsUsd, withdrawals: p.withdrawalsUsd }))
  }, [chartsData?.volumeTrend, isUSD])

  const prevChartDailyVolume = useMemo(() => {
    const src = prevMonthlyData?.daily_volume ?? []
    if (!chartUsdFactor) return src
    return src.map((p) => ({
      day: p.day,
      deposits: p.deposits * chartUsdFactor,
      withdrawals: p.withdrawals * chartUsdFactor,
    }))
  }, [prevMonthlyData?.daily_volume, chartUsdFactor])

  /* ── Dynamic chart titles based on period ────────── */
  const volumeChartTitle = useMemo(() => {
    switch (period) {
      case 'today': return t('dashboard.charts.dailyVolume')     // today → current month daily
      case 'week': return t('dashboard.charts.weeklyVolume')
      case 'month': return t('dashboard.charts.monthlyVolume')   // month → yearly monthly
      case 'custom': return t('dashboard.charts.volumeTrend')
    }
  }, [period, t])

  const volumeXFormatter = useMemo(() => {
    if (granularity === 'month') return fmtMonth
    return fmtDay
  }, [granularity])

  // Tooltip formatter: switches symbol with toggle
  const chartMoneyFmt = (value: number) =>
    isUSD ? fmtMoney(value, lang, '$') : fmtMoney(value, lang)

  // Gross totals
  const depUsdGross = kpis?.totalDepositsUsd ?? 0
  const wdUsdGross = kpis?.totalWithdrawalsUsd ?? 0
  const netUsdGross = kpis?.netCashUsd ?? 0
  const prevDepUsdGross = prevKpis?.totalDepositsUsd ?? 0
  const prevWdUsdGross = prevKpis?.totalWithdrawalsUsd ?? 0
  const prevNetUsdGross = prevKpis?.netCashUsd ?? 0

  // Net totals (after deposit commission)
  const depUsdNet = kpis?.totalDepositsNetUsd ?? 0
  const depTryNet = kpis?.totalDepositsNet ?? 0
  const netUsdNet = kpis?.netCashNetUsd ?? 0
  const netTryNet = kpis?.netCashNet ?? 0
  const prevDepUsdNet = prevKpis?.totalDepositsNetUsd ?? 0
  const prevDepTryNet = prevKpis?.totalDepositsNet ?? 0
  const prevNetUsdNet = prevKpis?.netCashNetUsd ?? 0
  const prevNetTryNet = prevKpis?.netCashNet ?? 0

  // Active values based on current view mode
  const depUsdActive = isNet ? depUsdNet : depUsdGross
  const depTryActive = isNet ? depTryNet : (kpis?.totalDeposits ?? 0)
  const wdUsdActive = wdUsdGross // withdrawals unchanged between gross/net
  const wdTryActive = kpis?.totalWithdrawals ?? 0
  const netUsdActive = isNet ? netUsdNet : netUsdGross
  const netTryActive = isNet ? netTryNet : (kpis?.netCash ?? 0)

  const prevDepUsdActive = isNet ? prevDepUsdNet : prevDepUsdGross
  const prevDepTryActive = isNet ? prevDepTryNet : (prevKpis?.totalDeposits ?? 0)
  const prevWdUsdActive = prevWdUsdGross
  const prevWdTryActive = prevKpis?.totalWithdrawals ?? 0
  const prevNetUsdActive = isNet ? prevNetUsdNet : prevNetUsdGross
  const prevNetTryActive = isNet ? prevNetTryNet : (prevKpis?.netCash ?? 0)

  // Deposits card
  const depositMainValue = isUSD ? fmtMoney(depUsdActive, lang, '$') : fmtMoney(depTryActive, lang)
  const depositTrend = isUSD
    ? { current: depUsdActive, previous: prevDepUsdActive }
    : { current: depTryActive, previous: prevDepTryActive }
  const depositSecondary = isUSD
    ? { label: baseCurrency, value: fmtCompact(depTryActive) + ' ' + baseCurrencySymbol }
    : { label: 'USD', value: fmtCompact(depUsdActive) + ' $' }

  // Withdrawals card (gross = net, no commission on withdrawals)
  const withdrawalMainValue = isUSD ? fmtMoney(wdUsdActive, lang, '$') : fmtMoney(wdTryActive, lang)
  const withdrawalTrend = isUSD
    ? { current: wdUsdActive, previous: prevWdUsdActive }
    : { current: wdTryActive, previous: prevWdTryActive }
  const withdrawalSecondary = isUSD
    ? { label: baseCurrency, value: fmtCompact(wdTryActive) + ' ' + baseCurrencySymbol }
    : { label: 'USD', value: fmtCompact(wdUsdActive) + ' $' }

  // Net Cash card (toggleable)
  const netMainValue = isUSD ? fmtMoney(netUsdActive, lang, '$') : fmtMoney(netTryActive, lang)
  const netTrend = isUSD
    ? { current: netUsdActive, previous: prevNetUsdActive }
    : { current: netTryActive, previous: prevNetTryActive }
  const netSecondary = isUSD
    ? { label: baseCurrency, value: fmtCompact(netTryActive) + ' ' + baseCurrencySymbol }
    : { label: 'USD', value: fmtCompact(netUsdActive) + ' $' }

  /* ── Card filter helpers ─────────────────────────── */
  const cardCls = (filter: 'deposits' | 'withdrawals' | 'commission') => {
    if (activeFilter === filter) {
      return 'ring-1 ring-black/20 border-black/[0.12] bg-black/[0.02]'
    }
    return activeFilter !== null ? 'opacity-50' : ''
  }
  const neutralCardCls = activeFilter !== null ? 'opacity-50' : ''

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
          {/* Gross / Net toggle */}
          <div className="flex items-center overflow-hidden rounded-lg border border-black/[0.08]">
            <button
              onClick={() => setViewMode('gross')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold tracking-wide transition-all',
                !isNet
                  ? 'bg-black/[0.07] text-black'
                  : 'text-black/40 hover:bg-black/[0.03] hover:text-black/60',
              )}
            >
              {t('dashboard.viewMode.gross')}
            </button>
            <div className="h-4 w-px bg-black/[0.08]" />
            <button
              onClick={() => setViewMode('net')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold tracking-wide transition-all',
                isNet
                  ? 'bg-black/[0.07] text-black'
                  : 'text-black/40 hover:bg-black/[0.03] hover:text-black/60',
              )}
            >
              {t('dashboard.viewMode.net')}
            </button>
          </div>
          {/* Currency toggle */}
          <div className="flex items-center overflow-hidden rounded-lg border border-black/[0.08]">
            <button
              onClick={() => setShowUsd(true)}
              className={cn(
                'px-3 py-1.5 text-xs font-bold tracking-wide transition-all',
                isUSD
                  ? 'bg-black/[0.07] text-black'
                  : 'text-black/40 hover:bg-black/[0.03] hover:text-black/60',
              )}
            >
              $ USD
            </button>
            <div className="h-4 w-px bg-black/[0.08]" />
            <button
              onClick={() => setShowUsd(false)}
              className={cn(
                'px-3 py-1.5 text-xs font-bold tracking-wide transition-all',
                !isUSD
                  ? 'bg-black/[0.07] text-black'
                  : 'text-black/40 hover:bg-black/[0.03] hover:text-black/60',
              )}
            >
              {baseCurrencySymbol} {baseCurrency}
            </button>
          </div>
          {/* Period toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
              <TabsList>
                <TabsTrigger value="today">{t('dashboard.period.today')}</TabsTrigger>
                <TabsTrigger value="week">{t('dashboard.period.week')}</TabsTrigger>
                <TabsTrigger value="month">{t('dashboard.period.month')}</TabsTrigger>
                <TabsTrigger value="custom">{t('dashboard.period.custom', 'Custom')}</TabsTrigger>
              </TabsList>
            </Tabs>
            {period === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 w-[130px] min-w-0 rounded-md border border-black/10 bg-bg1 px-2 text-xs text-black"
                />
                <span className="text-xs text-black/30">–</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 w-[130px] min-w-0 rounded-md border border-black/10 bg-bg1 px-2 text-xs text-black"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Hero Row ────────────────────────────── */}
      <SectionErrorBoundary sectionName="KPI Cards" fallbackHeight="min-h-[120px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <HeroKpiCard
            icon={ArrowCircleDown}
            iconBg="bg-black/10"
            iconColor="text-black/60"
            label={t('dashboard.kpi.deposits')}
            value={depositMainValue}
            valueColor="text-green"
            isLoading={isLoading}
            trend={<TrendBadge {...depositTrend} />}
            splitLeft={depositSecondary}
            className={cardCls('deposits')}
            onClick={() => setActiveFilter((f) => (f === 'deposits' ? null : 'deposits'))}
          />
          <HeroKpiCard
            icon={ArrowCircleUp}
            iconBg="bg-black/10"
            iconColor="text-black/60"
            label={t('dashboard.kpi.withdrawals')}
            value={withdrawalMainValue}
            valueColor="text-red"
            isLoading={isLoading}
            trend={<TrendBadge {...withdrawalTrend} />}
            splitLeft={withdrawalSecondary}
            className={cardCls('withdrawals')}
            onClick={() => setActiveFilter((f) => (f === 'withdrawals' ? null : 'withdrawals'))}
          />
          <HeroKpiCard
            icon={Percent}
            iconBg="bg-black/10"
            iconColor="text-black/60"
            label={t('dashboard.kpi.commission')}
            value={fmtMoney(kpis?.totalCommission ?? 0, lang)}
            valueColor="text-red/60"
            isLoading={isLoading}
            trend={
              <TrendBadge
                current={kpis?.totalCommission ?? 0}
                previous={prevKpis?.totalCommission}
              />
            }
            className={cardCls('commission')}
            onClick={() => setActiveFilter((f) => (f === 'commission' ? null : 'commission'))}
          />
          <HeroKpiCard
            icon={Wallet}
            iconBg="bg-black/10"
            iconColor="text-black/60"
            label={t('dashboard.kpi.netCash')}
            value={netMainValue}
            isLoading={isLoading}
            trend={<TrendBadge {...netTrend} />}
            splitLeft={netSecondary}
            className={neutralCardCls}
            onClick={() => setActiveFilter(null)}
          />
          <HeroKpiCard
            icon={Hash}
            iconBg="bg-black/10"
            iconColor="text-black/60"
            label={t('dashboard.kpi.transactions', 'Transactions')}
            value={fmtCount(kpis?.transactionCount ?? 0, lang)}
            isLoading={isLoading}
            trend={
              <TrendBadge
                current={kpis?.transactionCount ?? 0}
                previous={prevKpis?.transactionCount}
              />
            }
            splitLeft={{ label: '↓', value: fmtCount(kpis?.depositCount ?? 0, lang) }}
            splitRight={{ label: '↑', value: fmtCount(kpis?.withdrawalCount ?? 0, lang) }}
            className={cn('sm:col-span-2 lg:col-span-1', neutralCardCls)}
            onClick={() => setActiveFilter(null)}
          />
        </div>
      </SectionErrorBoundary>

      {/* ── Charts Section ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* ─ Volume Trend (AreaChart, 3 cols) ────────── */}
        <div className="xl:col-span-3">
          <SectionErrorBoundary sectionName="Volume Chart" fallbackHeight="min-h-[350px]">
            <ChartCard
              title={volumeChartTitle}
              icon={ChartLine}
              iconColor="text-black/60"
            >
              {isChartsLoading ? (
                <ChartSkeleton />
              ) : !chartVolumeTrend.length ? (
                <ChartEmpty message={t('dashboard.charts.noData')} />
              ) : (
                <>
                  <div className="h-[300px] md:h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartVolumeTrend}>
                        <defs>
                          <linearGradient id="gradDep" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={DEPOSIT_COLOR} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={DEPOSIT_COLOR} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradWd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={WITHDRAWAL_COLOR} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={WITHDRAWAL_COLOR} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={ct.gridStroke}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickFormatter={volumeXFormatter}
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
                            chartMoneyFmt(value),
                            name === 'deposits'
                              ? t('dashboard.charts.deposits')
                              : t('dashboard.charts.withdrawals'),
                          ]}
                          labelFormatter={volumeXFormatter}
                          contentStyle={ct.tooltipStyle}
                          cursor={{ strokeDasharray: '4 4', stroke: ct.cursorStroke }}
                        />
                        <Area
                          type="monotone"
                          dataKey="deposits"
                          stroke={DEPOSIT_COLOR}
                          strokeWidth={2}
                          fill="url(#gradDep)"
                          opacity={activeFilter === 'withdrawals' ? 0.12 : 1}
                        />
                        <Area
                          type="monotone"
                          dataKey="withdrawals"
                          stroke={WITHDRAWAL_COLOR}
                          strokeWidth={2}
                          fill="url(#gradWd)"
                          opacity={activeFilter === 'deposits' ? 0.12 : 1}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="mt-3 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-green" />
                      <span className="text-xs text-black/40">{t('dashboard.charts.deposits')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-red" />
                      <span className="text-xs text-black/40">
                        {t('dashboard.charts.withdrawals')}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </ChartCard>
          </SectionErrorBoundary>
        </div>

        {/* ─ Right column: Payment Methods + Insights (2 cols) ─ */}
        <div className="flex flex-col gap-3 xl:col-span-2">
          {/* Payment Methods - compact cards */}
          <SectionErrorBoundary sectionName="Payment Methods" fallbackHeight="min-h-[120px]">
            <div className="rounded-2xl border border-black/[0.06] bg-bg1 p-3 md:p-4">
              <div className="mb-3 flex items-center gap-2">
                <ChartPie size={16} className="text-black/60" weight="duotone" />
                <h3 className="text-sm font-semibold text-black/60">{t('dashboard.charts.paymentMethods')}</h3>
              </div>
              {isChartsLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : !paymentMethods.length ? (
                <p className="py-4 text-center text-xs text-black/30">{t('dashboard.charts.noData')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((pm, i) => {
                    const val = pmView === 'volume' ? pm.volume : pm.count
                    const pct = pmTotal > 0 ? ((val / pmTotal) * 100).toFixed(1) : '0'
                    return (
                      <div
                        key={pm.name}
                        className="rounded-xl border border-black/[0.04] bg-black/[0.015] px-3 py-2.5 transition-colors hover:border-black/[0.08]"
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                          />
                          <span className="truncate text-[11px] font-medium text-black/50">{pm.name}</span>
                        </div>
                        <p className="mt-1 font-mono text-sm font-bold tabular-nums text-black/70">
                          {pmView === 'volume' ? fmtCompact(pm.volume) : pm.count}
                          {pmView === 'volume' && <span className="ml-0.5 text-[10px] font-medium text-black/30">{isUSD ? '$' : baseCurrencySymbol}</span>}
                        </p>
                        <p className="text-[10px] font-semibold text-black/25">{pct}%</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </SectionErrorBoundary>

          {/* Insight cards - larger */}
          {chartMonthlyData?.insights && (
            <SectionErrorBoundary sectionName="Insights" fallbackHeight="min-h-[100px]">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-bg1 p-4 md:p-5 transition-all duration-200 hover:border-black/[0.1] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-black/10">
                      <Fire size={18} className="text-black/60" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-black/40">{t('dashboard.insights.avgDailyVolume')}</p>
                      <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-black/70">{fmtMoney(chartMonthlyData.insights.avg_daily_volume, lang)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-bg1 p-4 md:p-5 transition-all duration-200 hover:border-black/[0.1] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-black/10">
                      <Receipt size={18} className="text-black/60" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-black/40">{t('dashboard.insights.avgPerTransfer')}</p>
                      <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-black/70">{fmtMoney(chartMonthlyData.insights.avg_per_transfer, lang)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-bg1 p-4 md:p-5 transition-all duration-200 hover:border-black/[0.1] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-black/10">
                      <CalendarStar size={18} className="text-black/60" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-black/40">{t('dashboard.insights.peakDay')}</p>
                      <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-black/70">
                        {chartMonthlyData.insights.peak_day
                          ? `${fmtDate(chartMonthlyData.insights.peak_day, lang)} — ${fmtCompact(chartMonthlyData.insights.peak_day_volume)} ₺`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionErrorBoundary>
          )}
        </div>
      </div>

      {/* ── Best Employees + Top Brokers ────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionErrorBoundary sectionName="Best Employees" fallbackHeight="min-h-[250px]">
          <ChartCard
            title={t('dashboard.charts.bestEmployees')}
            icon={Users}
            iconColor="text-black/60"
            headerRight={
              <Tabs value={empTab} onValueChange={(v) => setEmpTab(v as 'marketing' | 'retention')}>
                <TabsList className="h-7 p-0.5">
                  <TabsTrigger value="marketing" className="px-2 py-1 text-xs">
                    {t('dashboard.charts.marketing')}
                  </TabsTrigger>
                  <TabsTrigger value="retention" className="px-2 py-1 text-xs">
                    {t('dashboard.charts.retention')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }
          >
            <BestEmployeesList
              employees={empTab === 'marketing' ? (bestEmployees?.marketing ?? []) : (bestEmployees?.retention ?? [])}
              tab={empTab}
              isLoading={isBestEmployeesLoading}
              lang={lang}
              t={t as (key: string) => string}
            />
          </ChartCard>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Top Brokers" fallbackHeight="min-h-[250px]">
          <ChartCard
            title={t('dashboard.charts.topBrokers')}
            icon={Handshake}
            iconColor="text-black/60"
            headerRight={
              <Link
                to="/ib"
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/40 transition-colors hover:bg-black/[0.03] hover:text-black/60"
              >
                {t('dashboard.tables.viewAll')}
                <ArrowRight size={12} />
              </Link>
            }
          >
            <TopBrokersList
              brokers={topBrokers}
              isLoading={isTopBrokersLoading}
              lang={lang}
              t={t as (key: string) => string}
            />
          </ChartCard>
        </SectionErrorBoundary>
      </div>

      {/* ── Bottom: Transfers + Customers side-by-side  */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Recent Transfers */}
        <div className="rounded-2xl border border-black/[0.06] bg-bg1 p-3 md:p-5 xl:col-span-3">
          <SectionErrorBoundary sectionName="Recent Transfers" fallbackHeight="min-h-[250px]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListBullets size={16} className="text-black/35" weight="duotone" />
                <h2 className="text-sm font-semibold text-black/60">
                  {t('dashboard.tables.recentTransfers')}
                </h2>
              </div>
              <Link
                to="/transfers"
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/40 transition-colors hover:bg-black/[0.03] hover:text-black/60"
              >
                {t('dashboard.tables.viewAll')}
                <ArrowRight size={12} />
              </Link>
            </div>
            <RecentTransfersTable
              transfers={filteredRecentTransfers.slice(0, 5)}
              isLoading={isTransfersLoading}
              lang={lang}
              t={t as (key: string) => string}
            />
          </SectionErrorBoundary>
        </div>

        {/* Top Customers */}
        <div className="rounded-2xl border border-black/[0.06] bg-bg1 p-3 md:p-5 xl:col-span-2">
          <SectionErrorBoundary sectionName="Top Customers" fallbackHeight="min-h-[200px]">
            <div className="mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-black/60" weight="duotone" />
              <h2 className="text-[13px] font-semibold text-black/50">
                {t('dashboard.tables.topCustomers')}
              </h2>
            </div>
            <TopCustomersList
              customers={chartMonthlyData?.top_customers ?? []}
              prevCustomers={prevMonthlyData?.top_customers}
              isLoading={isMonthlyLoading || isPrevMonthlyLoading}
              lang={lang}
              t={t as (key: string) => string}
            />
          </SectionErrorBoundary>
        </div>
      </div>


      {/* ── Previous Month Overview ──────────────────── */}
      {(isPrevMonthlyLoading || prevMonthlyData) && (
        <SectionErrorBoundary sectionName="Previous Month" fallbackHeight="min-h-[200px]">
          <div className="rounded-2xl border border-dashed border-black/[0.08] p-1">
            <div className="rounded-xl bg-black/[0.015] px-4 py-5 md:px-5">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-black/[0.05]0">
                    <CalendarBlank size={15} weight="duotone" className="text-black/35" />
                  </div>
                  <div>
                    {isPrevMonthlyLoading ? (
                      <Skeleton className="h-4 w-36 rounded-md" />
                    ) : (
                      <>
                        <h2 className="text-sm font-semibold text-black/60">
                          {t('dashboard.prevMonth.title')}
                        </h2>
                        <p className="text-xs text-black/40">
                          {prevMonthDate.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <span className="rounded-full border border-black/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black/25">
                  {t('dashboard.prevMonth.historical')}
                </span>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {isPrevMonthlyLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                  ))
                ) : prevMonthlyData ? (
                  <>
                    {/* Deposits */}
                    <HeroKpiCard
                      icon={ArrowCircleDown}
                      iconBg="bg-black/[0.08]"
                      iconColor="text-black/60"
                      label={t('dashboard.kpi.deposits')}
                      valueColor="text-green"
                      value={
                        isUSD
                          ? fmtMoney(
                              isNet
                                ? prevMonthlyData.kpis.total_deposits_usd -
                                    prevMonthlyData.kpis.commission_usd
                                : prevMonthlyData.kpis.total_deposits_usd,
                              lang,
                              '$',
                            )
                          : fmtMoney(
                              isNet
                                ? prevMonthlyData.kpis.total_deposits_try -
                                    prevMonthlyData.kpis.total_commission_try
                                : prevMonthlyData.kpis.total_deposits_try,
                              lang,
                            )
                      }
                      splitLeft={
                        isUSD
                          ? {
                              label: 'TRY',
                              value:
                                fmtCompact(
                                  isNet
                                    ? prevMonthlyData.kpis.total_deposits_try -
                                        prevMonthlyData.kpis.total_commission_try
                                    : prevMonthlyData.kpis.total_deposits_try,
                                ) + ' ₺',
                            }
                          : {
                              label: 'USD',
                              value:
                                fmtCompact(
                                  isNet
                                    ? prevMonthlyData.kpis.total_deposits_usd -
                                        prevMonthlyData.kpis.commission_usd
                                    : prevMonthlyData.kpis.total_deposits_usd,
                                ) + ' $',
                            }
                      }
                    />

                    {/* Withdrawals */}
                    <HeroKpiCard
                      icon={ArrowCircleUp}
                      iconBg="bg-black/[0.08]"
                      iconColor="text-black/60"
                      label={t('dashboard.kpi.withdrawals')}
                      valueColor="text-red"
                      value={
                        isUSD
                          ? fmtMoney(prevMonthlyData.kpis.total_withdrawals_usd, lang, '$')
                          : fmtMoney(prevMonthlyData.kpis.total_withdrawals_try, lang)
                      }
                      splitLeft={
                        isUSD
                          ? {
                              label: 'TRY',
                              value: fmtCompact(prevMonthlyData.kpis.total_withdrawals_try) + ' ₺',
                            }
                          : {
                              label: 'USD',
                              value: fmtCompact(prevMonthlyData.kpis.total_withdrawals_usd) + ' $',
                            }
                      }
                    />

                    {/* Net Cash */}
                    <HeroKpiCard
                      icon={Wallet}
                      iconBg="bg-black/[0.08]"
                      iconColor="text-black/60"
                      label={t('dashboard.kpi.netCash')}
                      value={
                        isUSD
                          ? fmtMoney(
                              (isNet
                                ? prevMonthlyData.kpis.total_deposits_usd -
                                  prevMonthlyData.kpis.commission_usd
                                : prevMonthlyData.kpis.total_deposits_usd) -
                                prevMonthlyData.kpis.total_withdrawals_usd,
                              lang,
                              '$',
                            )
                          : fmtMoney(
                              (isNet
                                ? prevMonthlyData.kpis.total_deposits_try -
                                  prevMonthlyData.kpis.total_commission_try
                                : prevMonthlyData.kpis.total_deposits_try) -
                                prevMonthlyData.kpis.total_withdrawals_try,
                              lang,
                            )
                      }
                      splitLeft={
                        isUSD
                          ? {
                              label: 'TRY',
                              value:
                                fmtCompact(
                                  (isNet
                                    ? prevMonthlyData.kpis.total_deposits_try -
                                      prevMonthlyData.kpis.total_commission_try
                                    : prevMonthlyData.kpis.total_deposits_try) -
                                    prevMonthlyData.kpis.total_withdrawals_try,
                                ) + ' ₺',
                            }
                          : {
                              label: 'USD',
                              value:
                                fmtCompact(
                                  (isNet
                                    ? prevMonthlyData.kpis.total_deposits_usd -
                                      prevMonthlyData.kpis.commission_usd
                                    : prevMonthlyData.kpis.total_deposits_usd) -
                                    prevMonthlyData.kpis.total_withdrawals_usd,
                                ) + ' $',
                            }
                      }
                    />

                    {/* Commission */}
                    <HeroKpiCard
                      icon={Percent}
                      iconBg="bg-black/[0.08]"
                      iconColor="text-black/60"
                      label={t('dashboard.kpi.commission')}
                      valueColor="text-red/60"
                      value={fmtMoney(prevMonthlyData.kpis.total_commission_try, lang)}
                      splitLeft={{
                        label: 'USD',
                        value: fmtCompact(prevMonthlyData.kpis.commission_usd) + ' $',
                      }}
                    />

                    {/* Transactions */}
                    <HeroKpiCard
                      icon={Hash}
                      iconBg="bg-black/[0.08]"
                      iconColor="text-black/60"
                      label={t('dashboard.kpi.transactions')}
                      value={fmtCount(prevMonthlyData.kpis.transfer_count, lang)}
                      splitLeft={{
                        label: '↓',
                        value: fmtCount(prevMonthlyData.kpis.deposit_count, lang),
                      }}
                      splitRight={{
                        label: '↑',
                        value: fmtCount(prevMonthlyData.kpis.withdrawal_count, lang),
                      }}
                      className="sm:col-span-2 lg:col-span-1"
                    />
                  </>
                ) : null}
              </div>

              {/* Chart + Insights row */}
              {isPrevMonthlyLoading ? (
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
              ) : (
                prevMonthlyData && (
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Daily Volume Mini Chart */}
                    {prevMonthlyData.daily_volume?.length > 0 && (
                      <ChartCard
                        title={t('dashboard.charts.dailyVolume')}
                        icon={ChartLine}
                        iconColor="text-black/60"
                      >
                        <div className="min-h-[250px] md:min-h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={prevChartDailyVolume}>
                              <defs>
                                <linearGradient id="gradDepPrev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={DEPOSIT_COLOR} stopOpacity={0.15} />
                                  <stop offset="100%" stopColor={DEPOSIT_COLOR} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradWdPrev" x1="0" y1="0" x2="0" y2="1">
                                  <stop
                                    offset="0%"
                                    stopColor={WITHDRAWAL_COLOR}
                                    stopOpacity={0.1}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor={WITHDRAWAL_COLOR}
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={ct.gridStroke}
                                vertical={false}
                              />
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
                                  chartMoneyFmt(value),
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
                                stroke={DEPOSIT_COLOR}
                                strokeWidth={1.5}
                                fill="url(#gradDepPrev)"
                                strokeOpacity={0.7}
                              />
                              <Area
                                type="monotone"
                                dataKey="withdrawals"
                                stroke={WITHDRAWAL_COLOR}
                                strokeWidth={1.5}
                                fill="url(#gradWdPrev)"
                                strokeOpacity={0.7}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Legend */}
                        <div className="mt-3 flex items-center justify-center gap-6">
                          <div className="flex items-center gap-1.5">
                            <div className="size-2 rounded-full bg-green opacity-70" />
                            <span className="text-xs text-black/40">
                              {t('dashboard.charts.deposits')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="size-2 rounded-full bg-red opacity-70" />
                            <span className="text-xs text-black/40">
                              {t('dashboard.charts.withdrawals')}
                            </span>
                          </div>
                        </div>
                      </ChartCard>
                    )}

                    {/* Insights 2x2 */}
                    {prevMonthlyData.insights && (
                      <Grid cols={2}>
                        <InsightCard
                          icon={CalendarStar}
                          iconBg="bg-black/10"
                          iconColor="text-black/60"
                          label={t('dashboard.insights.peakDay')}
                          value={
                            prevMonthlyData.insights.peak_day
                              ? `${fmtDate(prevMonthlyData.insights.peak_day, lang)} — ${fmtCompact(prevMonthlyData.insights.peak_day_volume)} ₺`
                              : '—'
                          }
                        />
                        <InsightCard
                          icon={CalendarCheck}
                          iconBg="bg-black/10"
                          iconColor="text-black/60"
                          label={t('dashboard.insights.activeDays')}
                          value={`${prevMonthlyData.insights.active_days} ${t('dashboard.insights.days')}`}
                        />
                        <InsightCard
                          icon={Fire}
                          iconBg="bg-black/10"
                          iconColor="text-black/60"
                          label={t('dashboard.insights.avgDailyVolume')}
                          value={fmtMoney(prevMonthlyData.insights.avg_daily_volume, lang)}
                        />
                        <InsightCard
                          icon={Receipt}
                          iconBg="bg-black/10"
                          iconColor="text-black/60"
                          label={t('dashboard.insights.avgPerTransfer')}
                          value={fmtMoney(prevMonthlyData.insights.avg_per_transfer, lang)}
                        />
                      </Grid>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </SectionErrorBoundary>
      )}
    </div>
  )
}
