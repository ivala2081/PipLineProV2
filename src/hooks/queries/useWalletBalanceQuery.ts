import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  getWalletPortfolioWithUsd,
  type PortfolioAssetWithUsd,
} from '@/lib/tatumService'

interface UseWalletBalanceReturn {
  assets: PortfolioAssetWithUsd[]
  totalUsd: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useWalletBalanceQuery(
  walletId: string,
  chain: string,
  address: string,
  enabled = true,
): UseWalletBalanceReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.wallets.balances(walletId),
    queryFn: () => getWalletPortfolioWithUsd(chain, address),
    enabled: enabled && !!address && !!chain,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  return {
    assets: data?.assets ?? [],
    totalUsd: data?.totalUsd ?? 0,
    isLoading,
    error: error?.message ?? null,
    refetch,
  }
}
