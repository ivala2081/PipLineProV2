import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

export interface PspSummary {
  psp_id: string
  psp_name: string
  commission_rate: number
  is_active: boolean
  is_internal: boolean
  total_deposits: number
  total_withdrawals: number
  total_commission: number
  total_net: number
  total_settlements: number
  balance: number
  last_settlement_date: string | null
}

export interface PspDashboardData {
  psps: PspSummary[]
  totals: {
    outstanding: number
    settlements: number
    deposits: number
    commission: number
  }
  isLoading: boolean
  error: string | null
}

export function usePspDashboardQuery(): PspDashboardData {
  const { currentOrg } = useOrganization()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.pspDashboard.summary(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const { data, error } = await supabase.rpc('get_psp_summary', {
        _org_id: currentOrg.id,
      })

      if (error) throw error

      return (data as Array<{
        psp_id: string
        psp_name: string
        commission_rate: number
        is_active: boolean
        is_internal: boolean
        total_deposits: number
        total_withdrawals: number
        total_commission: number
        total_net: number
        total_settlements: number
        last_settlement_date: string | null
      }>) ?? []
    },
    enabled: !!currentOrg,
  })

  const psps: PspSummary[] = (data ?? []).map((row) => ({
    ...row,
    total_deposits: Number(row.total_deposits),
    total_withdrawals: Number(row.total_withdrawals),
    total_commission: Number(row.total_commission),
    total_net: Number(row.total_net),
    total_settlements: Number(row.total_settlements),
    balance: Number(row.total_net) - Number(row.total_settlements),
  }))

  const totals = psps.reduce(
    (acc, psp) => ({
      outstanding: acc.outstanding + psp.balance,
      settlements: acc.settlements + psp.total_settlements,
      deposits: acc.deposits + psp.total_deposits,
      commission: acc.commission + psp.total_commission,
    }),
    { outstanding: 0, settlements: 0, deposits: 0, commission: 0 },
  )

  return {
    psps,
    totals,
    isLoading,
    error: error?.message ?? null,
  }
}
