import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getWalletPortfolioWithUsd, type PortfolioAssetWithUsd } from '@/lib/tatumServiceSecure'
import type { Wallet } from '@/lib/database.types'

export interface TokenAllocation {
  symbol: string
  usd: number
  percent: number
}

export interface ChainAllocation {
  chain: string
  usd: number
  percent: number
}

export interface UsePortfolioReturn {
  totalUsd: number
  tokenAllocation: TokenAllocation[]
  chainAllocation: ChainAllocation[]
  /** All assets across all wallets, keyed by walletId */
  assetsByWallet: Map<string, PortfolioAssetWithUsd[]>
  isLoading: boolean
  isError: boolean
}

export function usePortfolioQuery(wallets: Wallet[]): UsePortfolioReturn {
  const results = useQueries({
    queries: wallets.map((w) => ({
      queryKey: queryKeys.wallets.balances(w.id),
      queryFn: () => getWalletPortfolioWithUsd(w.chain, w.address),
      enabled: !!w.address && !!w.chain,
      staleTime: 3 * 60_000, // 3 min – portfolio balances change moderately
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
    })),
  })

  const isLoading = results.some((r) => r.isLoading)
  const isError = results.some((r) => r.isError)

  const { totalUsd, tokenAllocation, chainAllocation, assetsByWallet } = useMemo(() => {
    let total = 0
    const tokenMap = new Map<string, number>()
    const chainMap = new Map<string, number>()
    const byWallet = new Map<string, PortfolioAssetWithUsd[]>()

    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i]
      const data = results[i]?.data
      if (!data) continue

      total += data.totalUsd
      byWallet.set(wallet.id, data.assets)

      // Aggregate by chain
      chainMap.set(wallet.chain, (chainMap.get(wallet.chain) ?? 0) + data.totalUsd)

      // Aggregate by token symbol
      for (const asset of data.assets) {
        const sym = asset.symbol || 'UNKNOWN'
        tokenMap.set(sym, (tokenMap.get(sym) ?? 0) + asset.usdValue)
      }
    }

    // Build sorted token allocation (top tokens by USD)
    const tokens: TokenAllocation[] = [...tokenMap.entries()]
      .map(([symbol, usd]) => ({
        symbol,
        usd,
        percent: total > 0 ? (usd / total) * 100 : 0,
      }))
      .sort((a, b) => b.usd - a.usd)

    // Build sorted chain allocation
    const chains: ChainAllocation[] = [...chainMap.entries()]
      .map(([chain, usd]) => ({
        chain,
        usd,
        percent: total > 0 ? (usd / total) * 100 : 0,
      }))
      .sort((a, b) => b.usd - a.usd)

    return {
      totalUsd: total,
      tokenAllocation: tokens,
      chainAllocation: chains,
      assetsByWallet: byWallet,
    }
  }, [wallets, results])

  return { totalUsd, tokenAllocation, chainAllocation, assetsByWallet, isLoading, isError }
}
