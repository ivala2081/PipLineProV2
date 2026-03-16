import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { localYMD, localDayStart, localDayEnd } from '@/lib/date'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

/* ── Types ─────────────────────────────────────────── */

export type DashboardPeriod = 'today' | 'week' | 'month' | 'custom'

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
  // ── Gross (before commission) ──────────────────────
  totalDeposits: number
  totalWithdrawals: number
  netCash: number
  /** Sum of stored amount_usd for every deposit — uses each transfer's own exchange rate */
  totalDepositsUsd: number
  /** Sum of stored amount_usd for every withdrawal — uses each transfer's own exchange rate */
  totalWithdrawalsUsd: number
  /** totalDepositsUsd − totalWithdrawalsUsd */
  netCashUsd: number
  // ── Net (after deposit commission deducted) ────────
  /** Gross deposits minus commission, expressed in TRY */
  totalDepositsNet: number
  /** Gross deposits minus commission, expressed in USD */
  totalDepositsNetUsd: number
  /** totalDepositsNet − totalWithdrawals */
  netCashNet: number
  /** totalDepositsNetUsd − totalWithdrawalsUsd */
  netCashNetUsd: number
  // ── Other ──────────────────────────────────────────
  totalCommission: number
  transactionCount: number
  depositCount: number
  withdrawalCount: number
  depositSplit: CurrencySplit
  withdrawalSplit: CurrencySplit
}

/* ── Date range helpers ────────────────────────────── */

export function getDateRange(
  period: DashboardPeriod,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const now = new Date()
  const todayStr = localYMD(now)
  const to = localDayEnd(todayStr)

  switch (period) {
    case 'today':
      return { from: localDayStart(todayStr), to }
    case 'week': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - diff)
      return { from: localDayStart(localYMD(monday)), to }
    }
    case 'month':
      return { from: localDayStart(`${todayStr.slice(0, 7)}-01`), to }
    case 'custom': {
      const cf = customFrom || todayStr
      const ct = customTo || todayStr
      return { from: localDayStart(cf), to: localDayEnd(ct) }
    }
  }
}

export function getPreviousDateRange(
  period: DashboardPeriod,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const current = getDateRange(period, customFrom, customTo)
  const fromDate = new Date(current.from)

  switch (period) {
    case 'today': {
      const prev = new Date(fromDate)
      prev.setDate(prev.getDate() - 1)
      const s = localYMD(prev)
      return { from: localDayStart(s), to: localDayEnd(s) }
    }
    case 'week': {
      const prevMonday = new Date(fromDate)
      prevMonday.setDate(prevMonday.getDate() - 7)
      const prevSunday = new Date(fromDate)
      prevSunday.setDate(prevSunday.getDate() - 1)
      return {
        from: localDayStart(localYMD(prevMonday)),
        to: localDayEnd(localYMD(prevSunday)),
      }
    }
    case 'month': {
      const prevMonthStart = new Date(fromDate)
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)
      const prevMonthEnd = new Date(fromDate)
      prevMonthEnd.setDate(0)
      return {
        from: localDayStart(localYMD(prevMonthStart)),
        to: localDayEnd(localYMD(prevMonthEnd)),
      }
    }
    case 'custom': {
      // Equal-length preceding window
      const toDate = new Date(current.to)
      const durationMs = toDate.getTime() - fromDate.getTime()
      const prevTo = new Date(fromDate.getTime() - 1)
      const prevFrom = new Date(prevTo.getTime() - durationMs)
      return {
        from: localDayStart(localYMD(prevFrom)),
        to: localDayEnd(localYMD(prevTo)),
      }
    }
  }
}

/* ── KPI computation ───────────────────────────────── */

interface RawTransferRow {
  amount: number
  commission: number
  net: number | null
  exchange_rate: number | null
  currency: string
  category_id: string
  amount_try: number | null
  amount_usd: number
  transfer_types: { name: string } | null
}

function computeKpis(rows: RawTransferRow[], baseCurrency: string): DashboardKpis {
  // Exclude blocked transfers — mirrors the SQL filter in get_monthly_summary
  const filtered = rows.filter((row) => {
    const typeName = (row.transfer_types?.name ?? '').toLowerCase()
    return !typeName.includes('bloke') && !typeName.includes('blocked')
  })

  let totalDeposits = 0
  let totalWithdrawals = 0
  let totalDepositsUsd = 0
  let totalWithdrawalsUsd = 0
  let totalDepositsNet = 0
  let totalDepositsNetUsd = 0
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

  for (const row of filtered) {
    // DB stores withdrawal amounts as negative; use abs() to normalise (mirrors SQL abs() in get_monthly_summary)
    const amount = Math.abs(Number(row.amount) || 0)
    // Use amount_try when populated; avoid the falsy-0 fallback that would misuse raw USD as TRY
    const amountTry = row.amount_try != null ? Math.abs(Number(row.amount_try)) : amount
    const amountUsd = Math.abs(Number(row.amount_usd) || 0)
    const commission = Number(row.commission) || 0
    const exchangeRate = Number(row.exchange_rate) || 1
    const isDeposit = row.category_id === 'dep'
    const isTry = row.currency === baseCurrency

    if (isDeposit) {
      // Gross
      totalDeposits += amountTry
      totalDepositsUsd += amountUsd
      totalCommission += commission // commission is deposit-only (mirrors get_psp_summary)
      // Net — commission converted to TRY and USD per transfer's own rate
      const commissionTry = isTry ? commission : commission * exchangeRate
      const commissionUsd = isTry ? (exchangeRate > 0 ? commission / exchangeRate : 0) : commission
      totalDepositsNet += amountTry - commissionTry
      totalDepositsNetUsd += amountUsd - commissionUsd
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
      totalWithdrawalsUsd += amountUsd
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
  }

  return {
    totalDeposits,
    totalWithdrawals,
    netCash: totalDeposits - totalWithdrawals,
    totalDepositsUsd,
    totalWithdrawalsUsd,
    netCashUsd: totalDepositsUsd - totalWithdrawalsUsd,
    totalDepositsNet,
    totalDepositsNetUsd,
    // Withdrawals are unchanged between gross/net (commission is deposits-only)
    netCashNet: totalDepositsNet - totalWithdrawals,
    netCashNetUsd: totalDepositsNetUsd - totalWithdrawalsUsd,
    totalCommission,
    transactionCount: filtered.length,
    depositCount,
    withdrawalCount,
    depositSplit,
    withdrawalSplit,
  }
}

/* ── Hook ──────────────────────────────────────────── */

const COLUMNS =
  'amount, commission, net, exchange_rate, currency, category_id, amount_try, amount_usd, transfer_types(name)'

async function fetchKpis(
  orgId: string,
  from: string,
  to: string,
  baseCurrency: string,
): Promise<DashboardKpis> {
  const { data, error } = await supabase
    .from('transfers')
    .select(COLUMNS)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .gte('transfer_date', from)
    .lte('transfer_date', to)

  if (error) throw error
  return computeKpis((data ?? []) as RawTransferRow[], baseCurrency)
}

export function useDashboardQuery(period: DashboardPeriod, customFrom?: string, customTo?: string) {
  const { currentOrg } = useOrganization()
  const baseCurrency = currentOrg?.base_currency ?? 'TRY'

  const currentRange = getDateRange(period, customFrom, customTo)
  const prevRange = getPreviousDateRange(period, customFrom, customTo)

  const currentQuery = useQuery({
    queryKey: queryKeys.dashboard.current(currentOrg?.id ?? '', period, currentRange.from),
    queryFn: () => fetchKpis(currentOrg!.id, currentRange.from, currentRange.to, baseCurrency),
    enabled: !!currentOrg,
    staleTime: 3 * 60_000, // 3 min – dashboard KPIs change moderately
    gcTime: 10 * 60_000,
  })

  const prevQuery = useQuery({
    queryKey: queryKeys.dashboard.previous(currentOrg?.id ?? '', period, prevRange.from),
    queryFn: () => fetchKpis(currentOrg!.id, prevRange.from, prevRange.to, baseCurrency),
    enabled: !!currentOrg,
    staleTime: 5 * 60_000, // 5 min – previous period is historical
    gcTime: 10 * 60_000,
  })

  return {
    kpis: currentQuery.data ?? null,
    prevKpis: prevQuery.data ?? null,
    isLoading: currentQuery.isLoading,
    error: currentQuery.error?.message ?? null,
  }
}
