import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  getTransactionHistory,
  type NormalizedTransaction,
  type TransactionHistoryResult,
} from '@/lib/tatumService'

interface UseWalletTransactionsReturn {
  /** All accumulated transactions fetched so far */
  transactions: NormalizedTransaction[]
  isLoading: boolean
  error: string | null
  /** True if the API has more pages to fetch */
  hasMore: boolean
  /** Fetch the next page from the API */
  loadMore: () => void
  /** Reset and re-fetch from scratch */
  refetch: () => void
}

export function useWalletTransactionsQuery(
  walletId: string,
  chain: string,
  address: string,
  enabled = true,
): UseWalletTransactionsReturn {
  const [page, setPage] = useState(0)
  const [allTxs, setAllTxs] = useState<NormalizedTransaction[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)

  // Use page number as part of query key so each "loadMore" triggers a new fetch
  const { data, isLoading, error, refetch } = useQuery<TransactionHistoryResult>({
    queryKey: queryKeys.wallets.transactions(walletId, String(page)),
    queryFn: () => getTransactionHistory(chain, address, 50, page === 0 ? undefined : nextCursor),
    enabled: enabled && !!address && !!chain,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  })

  // Sync API results into accumulated state
  useEffect(() => {
    if (!data) return
    if (page === 0) {
      setAllTxs(data.transactions)
    } else {
      setAllTxs((prev) => {
        const seen = new Set(prev.map((tx) => tx.hash))
        const fresh = data.transactions.filter((tx) => !seen.has(tx.hash))
        return [...prev, ...fresh]
      })
    }
    setNextCursor(data.nextCursor)
    setHasMore(data.hasMore)
  }, [data, page])

  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor) return
    setPage((p) => p + 1)
  }, [hasMore, nextCursor])

  const handleRefetch = useCallback(() => {
    setPage(0)
    setAllTxs([])
    setNextCursor(undefined)
    setHasMore(false)
    refetch()
  }, [refetch])

  return {
    transactions: allTxs,
    isLoading,
    error: error instanceof Error ? error.message : null,
    hasMore,
    loadMore,
    refetch: handleRefetch,
  }
}
