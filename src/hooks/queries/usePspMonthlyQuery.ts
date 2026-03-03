import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

export interface PspMonthlyRow {
  month: number
  year: number
  monthLabel: string
  depositTotal: number
  withdrawalTotal: number
  commissionTotal: number
  netTotal: number
  settlementTotal: number
  transferCount: number
  depositCount: number
  withdrawalCount: number
  avgDailyVolume: number
}

export function usePspMonthlyQuery(pspId: string | undefined) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.pspDashboard.monthly(pspId ?? ''),
    queryFn: async () => {
      if (!currentOrg || !pspId) throw new Error('Missing context')

      const { data: rows, error } = await supabase.rpc('get_psp_monthly_summary', {
        _psp_id: pspId,
        _org_id: currentOrg.id,
      })

      if (error) throw error

      return (rows ?? []).map(
        (r: Record<string, unknown>): PspMonthlyRow => ({
          month: Number(r.month),
          year: Number(r.year),
          monthLabel: String(r.month_label),
          depositTotal: Number(r.deposit_total),
          withdrawalTotal: Number(r.withdrawal_total),
          commissionTotal: Number(r.commission_total),
          netTotal: Number(r.net_total),
          settlementTotal: Number(r.settlement_total),
          transferCount: Number(r.transfer_count),
          depositCount: Number(r.deposit_count),
          withdrawalCount: Number(r.withdrawal_count),
          avgDailyVolume: Number(r.avg_daily_volume),
        }),
      )
    },
    enabled: !!currentOrg && !!pspId,
    staleTime: 5 * 60_000, // 5 min – monthly summary is historical-ish
    gcTime: 10 * 60_000,
  })
}
