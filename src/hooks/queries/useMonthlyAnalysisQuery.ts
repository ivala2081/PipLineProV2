import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
}

export interface DailyVolumePoint {
  day: string
  deposits: number
  withdrawals: number
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

export interface MonthlySummaryData {
  kpis: MonthlyKpis
  daily_volume: DailyVolumePoint[]
  daily_net: DailyNetPoint[]
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
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const { data, error } = await supabase.rpc('get_monthly_summary', {
        _org_id: currentOrg.id,
        _year: year,
        _month: month,
      })

      if (error) throw error
      return data as unknown as MonthlySummaryData
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60 * 1000,
  })

  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
  }
}
