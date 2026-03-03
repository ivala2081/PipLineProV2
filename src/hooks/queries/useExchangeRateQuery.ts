import { useQuery } from '@tanstack/react-query'
import { fetchExchangeRate } from '@/lib/exchangeRateService'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Always fetches the current USD/TRY rate.
 * The rate is used for both TL and USD transfers to compute dual-currency amounts.
 */
export function useExchangeRateQuery() {
  const query = useQuery({
    queryKey: queryKeys.exchangeRate.byCurrency('USD'),
    queryFn: () => fetchExchangeRate('USD'),
    staleTime: 15 * 60_000, // 15 min – exchange rates change at most every few hours
    gcTime: 60 * 60_000, // 1 hour
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  })

  const refetch = () => query.refetch()

  return {
    rate: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch,
  }
}
