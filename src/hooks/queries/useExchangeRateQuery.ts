import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchExchangeRate } from '@/lib/exchangeRateService'

/**
 * Always fetches the current USD/TRY rate.
 * The rate is used for both TL and USD transfers to compute dual-currency amounts.
 */
export function useExchangeRateQuery() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['exchangeRate', 'USD'],
    queryFn: () => fetchExchangeRate('USD'),
    staleTime: 1000 * 60 * 15, // 15 min
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    placeholderData: 1,
  })

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['exchangeRate', 'USD'] })
  }

  return {
    rate: query.data ?? 1,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
  }
}
