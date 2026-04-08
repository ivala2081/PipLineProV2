import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { localYMD, localDayStart, localDayEnd } from '@/lib/date'
import { getDateRange, type DashboardPeriod } from './useDashboardQuery'

/* ── Types ─────────────────────────────────────────── */

export interface VolumeTrendPoint {
  label: string
  deposits: number
  withdrawals: number
  depositsUsd: number
  withdrawalsUsd: number
}

export interface NetFlowPoint {
  label: string
  net: number
}

export interface PaymentMethodItem {
  name: string
  volume: number
  count: number
}

export interface DashboardChartsData {
  volumeTrend: VolumeTrendPoint[]
  netFlow: NetFlowPoint[]
  paymentMethodBreakdown: PaymentMethodItem[]
}

/* ── Raw row type ─────────────────────────────────── */

interface RawRow {
  amount_try: number | null
  amount_usd: number
  category_id: string
  transfer_date: string
  payment_methods: { name: string } | null
  transfer_types: { name: string } | null
}

/* ── Granularity helper ──────────────────────────── */

export type ChartGranularity = 'day' | 'month'

function getGranularity(period: DashboardPeriod, from: string, to: string): ChartGranularity {
  if (period === 'month') return 'month' // "Bu Ay" → yearly monthly view
  if (period === 'custom') {
    const diffMs = new Date(to).getTime() - new Date(from).getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays > 45 ? 'month' : 'day'
  }
  return 'day' // today → daily (current month), week → daily
}

/**
 * For volume trend chart, override the date range based on period:
 * - "month" → last 12 months
 * - "today" → current month (daily)
 * - "week" / "custom" → use getDateRange as-is
 */
function getChartDateRange(
  period: DashboardPeriod,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const now = new Date()
  const todayStr = localYMD(now)

  if (period === 'month') {
    // Last 12 months
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    return {
      from: localDayStart(localYMD(start)),
      to: localDayEnd(todayStr),
    }
  }

  if (period === 'today') {
    // Current month daily view
    const monthStart = `${todayStr.slice(0, 7)}-01`
    return {
      from: localDayStart(monthStart),
      to: localDayEnd(todayStr),
    }
  }

  // week / custom → standard range
  return getDateRange(period, customFrom, customTo)
}

function bucketKey(dateStr: string, granularity: ChartGranularity): string {
  const d = new Date(dateStr)
  if (granularity === 'month') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return dateStr.slice(0, 10)
}

/* ── Compute ─────────────────────────────────────── */

function computeCharts(rows: RawRow[], granularity: ChartGranularity): DashboardChartsData {
  const filtered = rows.filter((row) => {
    const typeName = (row.transfer_types?.name ?? '').toLowerCase()
    return !typeName.includes('bloke') && !typeName.includes('blocked')
  })

  // Volume trend + net flow
  const bucketMap = new Map<
    string,
    { deposits: number; withdrawals: number; depositsUsd: number; withdrawalsUsd: number }
  >()

  // Payment method breakdown
  const pmMap = new Map<string, { volume: number; count: number }>()

  for (const row of filtered) {
    const tryAmt = Math.abs(Number(row.amount_try) || 0)
    const usdAmt = Math.abs(Number(row.amount_usd) || 0)
    const isDeposit = row.category_id === 'dep'
    const key = bucketKey(row.transfer_date, granularity)
    const pmName = row.payment_methods?.name ?? 'Unknown'

    // Volume buckets
    if (!bucketMap.has(key)) {
      bucketMap.set(key, { deposits: 0, withdrawals: 0, depositsUsd: 0, withdrawalsUsd: 0 })
    }
    const bucket = bucketMap.get(key)!
    if (isDeposit) {
      bucket.deposits += tryAmt
      bucket.depositsUsd += usdAmt
    } else {
      bucket.withdrawals += tryAmt
      bucket.withdrawalsUsd += usdAmt
    }

    // Payment method
    if (!pmMap.has(pmName)) pmMap.set(pmName, { volume: 0, count: 0 })
    const pm = pmMap.get(pmName)!
    pm.volume += tryAmt
    pm.count++
  }

  const volumeTrend = [...bucketMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, vals]) => ({ label, ...vals }))

  const netFlow = [...bucketMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, vals]) => ({
      label,
      net: vals.deposits - vals.withdrawals,
    }))

  const paymentMethodBreakdown = [...pmMap.entries()]
    .map(([name, vals]) => ({ name, ...vals }))
    .sort((a, b) => b.volume - a.volume)

  return { volumeTrend, netFlow, paymentMethodBreakdown }
}

/* ── Hook ─────────────────────────────────────────── */

const COLUMNS =
  'amount_try, amount_usd, category_id, transfer_date, payment_methods(name), transfer_types(name)'

export function useDashboardChartsQuery(
  period: DashboardPeriod,
  customFrom?: string,
  customTo?: string,
) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const { from, to } = useMemo(
    () => getChartDateRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  )

  const granularity = useMemo(() => getGranularity(period, from, to), [period, from, to])

  const query = useQuery({
    queryKey: queryKeys.dashboard.charts(orgId, from, to),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('transfers')
        .select(COLUMNS)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .gte('transfer_date', from)
        .lte('transfer_date', to)
        .abortSignal(signal!)
      if (error) throw error
      return computeCharts((data ?? []) as RawRow[], granularity)
    },
    enabled: !!currentOrg,
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
  })

  return {
    chartsData: query.data ?? null,
    isChartsLoading: query.isLoading,
    granularity,
  }
}
