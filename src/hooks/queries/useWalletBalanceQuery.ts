import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getWalletPortfolio, type PortfolioAsset } from '@/lib/tatumService'

interface UseWalletBalanceReturn {
  assets: PortfolioAsset[]
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
    queryFn: () => getWalletPortfolio(chain, address),
    enabled: enabled && !!address && !!chain,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  return {
    assets: data ?? [],
    isLoading,
    error: error?.message ?? null,
    refetch,
  }
}
