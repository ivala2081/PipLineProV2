import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  getTransferHistory,
  type NormalizedTransfer,
  type TransferHistoryResult,
} from '@/lib/tatumServiceSecure'

interface UseWalletTransfersReturn {
  /** All accumulated transfers fetched so far */
  transfers: NormalizedTransfer[]
  isLoading: boolean
  error: string | null
  /** True if the API has more pages to fetch */
  hasMore: boolean
  /** Fetch the next page from the API */
  loadMore: () => void
  /** Reset and re-fetch from scratch */
  refetch: () => void
}

export function useWalletTransfersQuery(
  walletId: string,
  chain: string,
  address: string,
  enabled = true,
): UseWalletTransfersReturn {
  const [page, setPage] = useState(0)
  const [allTxs, setAllTxs] = useState<NormalizedTransfer[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [prevData, setPrevData] = useState<TransferHistoryResult | undefined>(undefined)

  // Use page number as part of query key so each "loadMore" triggers a new fetch
  const { data, isLoading, error, refetch } = useQuery<TransferHistoryResult>({
    queryKey: queryKeys.wallets.transfers(walletId, String(page)),
    queryFn: () => getTransferHistory(chain, address, 50, page === 0 ? undefined : nextCursor),
    enabled: enabled && !!address && !!chain,
    staleTime: 60_000, // 1 min – wallet transfers change frequently
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  // Sync API results into accumulated state
  if (data && data !== prevData) {
    setPrevData(data)
    if (page === 0) {
      setAllTxs(data.transfers)
    } else {
      const seen = new Set(allTxs.map((tx) => tx.hash))
      const fresh = data.transfers.filter((tx) => !seen.has(tx.hash))
      if (fresh.length > 0) {
        setAllTxs([...allTxs, ...fresh])
      }
    }
    setNextCursor(data.nextCursor)
    setHasMore(data.hasMore)
  }

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
    transfers: allTxs,
    isLoading,
    error: error instanceof Error ? error.message : null,
    hasMore,
    loadMore,
    refetch: handleRefetch,
  }
}
