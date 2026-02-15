import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { getWalletPortfolioWithUsd } from '@/lib/tatumServiceSecure'
import type { WalletSnapshot } from '@/lib/database.types'

interface UseWalletSnapshotsReturn {
  snapshots: WalletSnapshot[]
  isLoading: boolean
  error: string | null
  takeSnapshot: () => Promise<void>
  isTakingSnapshot: boolean
  deleteSnapshot: (snapshotId: string) => Promise<void>
  isDeleting: boolean
}

export function useWalletSnapshotsQuery(
  walletId: string,
  chain: string,
  address: string,
): UseWalletSnapshotsReturn {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.wallets.snapshots(walletId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_snapshots')
        .select('*')
        .eq('wallet_id', walletId)
        .order('snapshot_date', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data as WalletSnapshot[]) ?? []
    },
    enabled: !!walletId,
  })

  const snapshotMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      // Fetch current balances with USD valuation from Tatum
      const { assets, totalUsd } = await getWalletPortfolioWithUsd(chain, address)
      const balances = assets.map((a) => ({
        token: a.symbol || a.type,
        balance: a.balance,
        tokenAddress: a.tokenAddress,
      }))

      const today = new Date().toISOString().slice(0, 10)

      const { error } = await supabase.from('wallet_snapshots').upsert(
        {
          wallet_id: walletId,
          organization_id: currentOrg.id,
          snapshot_date: today,
          balances,
          total_usd: totalUsd,
        } as never,
        { onConflict: 'wallet_id,snapshot_date' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.snapshots(walletId) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      const { error } = await supabase.from('wallet_snapshots').delete().eq('id', snapshotId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.snapshots(walletId) })
    },
  })

  return {
    snapshots: data ?? [],
    isLoading,
    error: error?.message ?? null,
    takeSnapshot: snapshotMutation.mutateAsync,
    isTakingSnapshot: snapshotMutation.isPending,
    deleteSnapshot: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
