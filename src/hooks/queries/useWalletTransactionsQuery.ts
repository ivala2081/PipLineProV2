import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  getTransactionHistory,
  type NormalizedTransaction,
  type TransactionHistoryResult,
} from '@/lib/tatumService'

interface UseWalletTransactionsReturn {
  transactions: NormalizedTransaction[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  refetch: () => void
}

export function useWalletTransactionsQuery(
  walletId: string,
  chain: string,
  address: string,
  enabled = true,
): UseWalletTransactionsReturn {
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [allTxs, setAllTxs] = useState<NormalizedTransaction[]>([])
  const [hasMore, setHasMore] = useState(false)

  const { isLoading, error, refetch } = useQuery<TransactionHistoryResult>({
    queryKey: queryKeys.wallets.transactions(walletId, cursor),
    queryFn: async () => {
      const result = await getTransactionHistory(chain, address, 50, cursor)
      if (!cursor) {
        setAllTxs(result.transactions)
      } else {
        setAllTxs((prev) => [...prev, ...result.transactions])
      }
      setHasMore(result.hasMore)
      return result
    },
    enabled: enabled && !!address && !!chain,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  })

  const loadMore = () => {
    if (!hasMore) return
    const lastTx = allTxs[allTxs.length - 1]
    if (lastTx) {
      // For cursor-based pagination, use the nextCursor from last result
      // The query will re-fetch with the new cursor
      setCursor((prev) => {
        const offset = parseInt(prev ?? '0') || 0
        return String(offset + 50)
      })
    }
  }

  const handleRefetch = () => {
    setCursor(undefined)
    setAllTxs([])
    setHasMore(false)
    refetch()
  }

  return {
    transactions: allTxs,
    isLoading,
    error: error?.message ?? null,
    hasMore,
    loadMore,
    refetch: handleRefetch,
  }
}
