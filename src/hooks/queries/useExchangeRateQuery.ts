import { useQuery } from '@tanstack/react-query'
import { fetchExchangeRate } from '@/lib/exchangeRateService'
import { queryKeys } from '@/lib/queryKeys'
import { useOrganization } from '@/app/providers/OrganizationProvider'

/**
 * Returns the exchange rate for converting `from` → org base currency.
 *
 * Also exposes `baseCurrency`, `secondaryCurrency`, and `currencySlots` so
 * consumers get the 3-slot pattern `[base, secondary, 'USDT']` without
 * recomputing it everywhere.
 *
 * Slot rule:
 *   secondary = 'USD'  (unless base = 'USD', then secondary = 'EUR')
 *
 * @param from - The currency being converted FROM (default: secondaryCurrency)
 */
export function useExchangeRateQuery(from?: string) {
  const { currentOrg } = useOrganization()
  const baseCurrency = currentOrg?.base_currency ?? 'USD'
  const secondaryCurrency = baseCurrency === 'USD' ? 'EUR' : 'USD'
  const fromCurrency = from ?? secondaryCurrency

  // Deduplicated 3-slot list
  const currencySlots = [baseCurrency, secondaryCurrency, 'USDT'].filter(
    (c, i, arr) => arr.indexOf(c) === i,
  )

  const query = useQuery({
    queryKey: queryKeys.exchangeRate.byCurrency(`${fromCurrency}_${baseCurrency}`),
    queryFn: () => fetchExchangeRate(fromCurrency, baseCurrency),
    enabled: fromCurrency !== baseCurrency,
    staleTime: 15 * 60_000, // 15 min
    gcTime: 60 * 60_000, // 1 hour
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  })

  const refetch = () => query.refetch()

  return {
    rate: fromCurrency === baseCurrency ? 1 : (query.data ?? null),
    isLoading: fromCurrency === baseCurrency ? false : query.isLoading,
    isFetching: fromCurrency === baseCurrency ? false : query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch,
    baseCurrency,
    secondaryCurrency,
    currencySlots,
  }
}
