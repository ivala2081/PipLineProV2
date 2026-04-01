import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { supabaseQueryFn } from '@/lib/supabaseRetry'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

/* ── Types ─────────────────────────────────────────── */

export interface MonthlyKpis {
  total_deposits_try: number
  total_deposits_usd: number
  total_withdrawals_try: number
  total_withdrawals_usd: number
  total_bank_volume: number
  total_credit_card_volume: number
  total_usdt_volume: number
  total_commission_try: number
  transfer_count: number
  deposit_count: number
  withdrawal_count: number
  // Per-direction USD breakdowns (migration 056)
  usdt_deposits_usd: number
  usdt_withdrawals_usd: number
  bank_cc_deposits_usd: number
  bank_cc_withdrawals_usd: number
  // USD summary KPIs (migration 057)
  usdt_net: number // deposits_usd − withdrawals_usd (can be negative)
  commission_usd: number // total commission expressed in USD
  bank_usd_gross: number // non-USDT transfers total in USD
  usd_cevirim: number // bank_usd_gross + usdt_net
  kom_son_usd: number // usd_cevirim − commission_usd
  finans_pct: number // commission_usd / usd_cevirim × 100
}

export interface DailyVolumePoint {
  day: string
  deposits: number
  withdrawals: number
}

export interface DailyDetailedPoint {
  day: string
  bank_try: number
  kk_try: number
  commission_try: number
  usdt_net: number
  bank_usd: number
  commission_usd: number
  avg_rate: number | null
  usd_cevirim: number
  kom_son_usd: number
  finans_pct: number | null // NULL when usd_cevirim <= 0
}

export interface DailyNetPoint {
  day: string
  net: number
}

export interface BreakdownItem {
  name: string
  volume: number
  count: number
}

export interface CategoryBreakdownItem extends BreakdownItem {
  is_deposit: boolean
}

export interface CurrencySplitItem {
  currency: string
  volume_try: number
  count: number
}

export interface CommissionByPspItem {
  name: string
  commission: number
}

export interface MonthlyInsights {
  peak_day: string | null
  peak_day_volume: number
  active_days: number
  avg_daily_volume: number
  avg_per_transfer: number
}

export interface MonthlySummaryData {
  kpis: MonthlyKpis
  prev_kpis: MonthlyKpis | null
  insights: MonthlyInsights
  daily_volume: DailyVolumePoint[]
  daily_net: DailyNetPoint[]
  daily_detailed: DailyDetailedPoint[]
  psp_breakdown: BreakdownItem[]
  payment_method_breakdown: BreakdownItem[]
  category_breakdown: CategoryBreakdownItem[]
  currency_split: CurrencySplitItem[]
  commission_by_psp: CommissionByPspItem[]
  top_customers: BreakdownItem[]
  type_breakdown: BreakdownItem[]
}

/* ── Hook ──────────────────────────────────────────── */

export function useMonthlyAnalysisQuery(year: number, month: number) {
  const { currentOrg } = useOrganization()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.transfers.monthlySummary(currentOrg?.id ?? '', year, month),
    queryFn: supabaseQueryFn<MonthlySummaryData>(() =>
      supabase.rpc('get_monthly_summary', {
        _org_id: currentOrg!.id,
        _year: year,
        _month: month,
      }),
    ),
    enabled: !!currentOrg,
    staleTime: 5 * 60_000, // 5 min – monthly analysis is historical-ish
    gcTime: 10 * 60_000,
  })

  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
  }
}
