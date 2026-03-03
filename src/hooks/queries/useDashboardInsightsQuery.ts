import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

/* ── Exchange Rate Point ───────────────────────────── */

export interface RatePoint {
  date: string
  rate: number
}

/* ── Hook ──────────────────────────────────────────── */

export function useDashboardInsightsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  // Exchange rate history (last 14 days from exchange_rates table)
  const rateHistoryQuery = useQuery({
    queryKey: queryKeys.dashboard.rateHistory(orgId),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No org')

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate_to_base, rate_date')
        .eq('organization_id', currentOrg.id)
        .eq('currency', 'USD')
        .order('rate_date', { ascending: true })
        .limit(30)

      if (error) throw error

      return ((data ?? []) as Array<{ rate_to_base: number; rate_date: string }>).map(
        (r): RatePoint => ({
          date: r.rate_date,
          rate: Number(r.rate_to_base),
        }),
      )
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000, // 5 min – rate history changes slowly
    gcTime: 10 * 60_000,
  })

  return {
    rateHistory: rateHistoryQuery.data ?? [],
    isRateHistoryLoading: rateHistoryQuery.isLoading,
  }
}
