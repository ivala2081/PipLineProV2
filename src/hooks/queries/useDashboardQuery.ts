import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'

/* ── Types ─────────────────────────────────────────── */

export type DashboardPeriod = 'today' | 'week' | 'month'

export interface CurrencySplit {
  /** Raw amount in TRY for TL-denominated transfers */
  tryAmount: number
  /** Raw amount in USD for USD-denominated transfers */
  usdAmount: number
  /** TRY-equivalent volume from TL transfers (for proportional comparison) */
  tryVolume: number
  /** TRY-equivalent volume from USD transfers (for proportional comparison) */
  usdVolume: number
  tryCount: number
  usdCount: number
}

export interface DashboardKpis {
  totalDeposits: number
  totalWithdrawals: number
  netCash: number
  totalCommission: number
  transactionCount: number
  depositCount: number
  withdrawalCount: number
  depositSplit: CurrencySplit
  withdrawalSplit: CurrencySplit
}

/* ── Date range helpers ────────────────────────────── */

function getDateRange(period: DashboardPeriod): { from: string; to: string } {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const to = `${todayStr}T23:59:59`

  switch (period) {
    case 'today':
      return { from: `${todayStr}T00:00:00`, to }
    case 'week': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - diff)
      return { from: `${monday.toISOString().slice(0, 10)}T00:00:00`, to }
    }
    case 'month':
      return { from: `${todayStr.slice(0, 7)}-01T00:00:00`, to }
  }
}

function getPreviousDateRange(period: DashboardPeriod): { from: string; to: string } {
  const current = getDateRange(period)
  const fromDate = new Date(current.from)

  switch (period) {
    case 'today': {
      const prev = new Date(fromDate)
      prev.setDate(prev.getDate() - 1)
      const s = prev.toISOString().slice(0, 10)
      return { from: `${s}T00:00:00`, to: `${s}T23:59:59` }
    }
    case 'week': {
      const prevMonday = new Date(fromDate)
      prevMonday.setDate(prevMonday.getDate() - 7)
      const prevSunday = new Date(fromDate)
      prevSunday.setDate(prevSunday.getDate() - 1)
      return {
        from: `${prevMonday.toISOString().slice(0, 10)}T00:00:00`,
        to: `${prevSunday.toISOString().slice(0, 10)}T23:59:59`,
      }
    }
    case 'month': {
      const prevMonthStart = new Date(fromDate)
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)
      const prevMonthEnd = new Date(fromDate)
      prevMonthEnd.setDate(0)
      return {
        from: `${prevMonthStart.toISOString().slice(0, 10)}T00:00:00`,
        to: `${prevMonthEnd.toISOString().slice(0, 10)}T23:59:59`,
      }
    }
  }
}

/* ── KPI computation ───────────────────────────────── */

interface RawTransferRow {
  amount: number
  commission: number
  currency: string
  category_id: string
  amount_try: number
  amount_usd: number
}

function computeKpis(rows: RawTransferRow[]): DashboardKpis {
  let totalDeposits = 0
  let totalWithdrawals = 0
  let totalCommission = 0
  let depositCount = 0
  let withdrawalCount = 0

  const depositSplit: CurrencySplit = {
    tryAmount: 0,
    usdAmount: 0,
    tryVolume: 0,
    usdVolume: 0,
    tryCount: 0,
    usdCount: 0,
  }
  const withdrawalSplit: CurrencySplit = {
    tryAmount: 0,
    usdAmount: 0,
    tryVolume: 0,
    usdVolume: 0,
    tryCount: 0,
    usdCount: 0,
  }

  for (const row of rows) {
    const amount = Number(row.amount) || 0
    const amountTry = Number(row.amount_try) || amount
    const commission = Number(row.commission) || 0
    const isDeposit = row.category_id === 'dep'
    const isTry = row.currency === 'TL'

    if (isDeposit) {
      totalDeposits += amountTry
      depositCount++
      if (isTry) {
        depositSplit.tryAmount += amount
        depositSplit.tryVolume += amountTry
        depositSplit.tryCount++
      } else {
        depositSplit.usdAmount += amount
        depositSplit.usdVolume += amountTry
        depositSplit.usdCount++
      }
    } else {
      totalWithdrawals += amountTry
      withdrawalCount++
      if (isTry) {
        withdrawalSplit.tryAmount += amount
        withdrawalSplit.tryVolume += amountTry
        withdrawalSplit.tryCount++
      } else {
        withdrawalSplit.usdAmount += amount
        withdrawalSplit.usdVolume += amountTry
        withdrawalSplit.usdCount++
      }
    }

    totalCommission += commission
  }

  return {
    totalDeposits,
    totalWithdrawals,
    netCash: totalDeposits - totalWithdrawals,
    totalCommission,
    transactionCount: rows.length,
    depositCount,
    withdrawalCount,
    depositSplit,
    withdrawalSplit,
  }
}

/* ── Hook ──────────────────────────────────────────── */

const COLUMNS = 'amount, commission, currency, category_id, amount_try, amount_usd'

async function fetchKpis(orgId: string, from: string, to: string): Promise<DashboardKpis> {
  const { data, error } = await supabase
    .from('transfers')
    .select(COLUMNS)
    .eq('organization_id', orgId)
    .gte('transfer_date', from)
    .lte('transfer_date', to)

  if (error) throw error
  return computeKpis((data ?? []) as RawTransferRow[])
}

export function useDashboardQuery(period: DashboardPeriod) {
  const { currentOrg } = useOrganization()

  const currentRange = getDateRange(period)
  const prevRange = getPreviousDateRange(period)

  const currentQuery = useQuery({
    queryKey: ['dashboard', 'current', currentOrg?.id, period, currentRange.from],
    queryFn: () => fetchKpis(currentOrg!.id, currentRange.from, currentRange.to),
    enabled: !!currentOrg,
    staleTime: 60_000,
  })

  const prevQuery = useQuery({
    queryKey: ['dashboard', 'previous', currentOrg?.id, period, prevRange.from],
    queryFn: () => fetchKpis(currentOrg!.id, prevRange.from, prevRange.to),
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
  })

  return {
    kpis: currentQuery.data ?? null,
    prevKpis: prevQuery.data ?? null,
    isLoading: currentQuery.isLoading,
    error: currentQuery.error?.message ?? null,
  }
}
