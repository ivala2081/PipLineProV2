import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

export interface ChartDataPoint {
  date: string
  totalUsd: number
}

interface UseWalletChartReturn {
  chartData: ChartDataPoint[]
  isLoading: boolean
}

export function useWalletChartQuery(walletId: string): UseWalletChartReturn {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.wallets.chart(walletId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_snapshots')
        .select('snapshot_date, total_usd')
        .eq('wallet_id', walletId)
        .order('snapshot_date', { ascending: true })
        .limit(30)
      if (error) throw error
      return (data ?? []).map((row) => ({
        date: row.snapshot_date,
        totalUsd: Number(row.total_usd) || 0,
      }))
    },
    enabled: !!walletId,
  })

  return {
    chartData: data ?? [],
    isLoading,
  }
}
