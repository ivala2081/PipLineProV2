import {
  TRANSFER_TYPES,
  TRANSFER_CATEGORIES,
  PAYMENT_METHODS,
  type TransferType,
  type TransferCategory,
  type PaymentMethod,
} from '@/lib/transferLookups'
import { usePspsQuery, type Psp } from './usePspsQuery'

export interface LookupQueries {
  categories: TransferCategory[]
  paymentMethods: PaymentMethod[]
  transferTypes: TransferType[]
  psps: Psp[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * TEMPORARY: Using hardcoded data directly while debugging database issues.
 * TODO: Re-enable database queries once lookup tables are properly seeded.
 */
export function useLookupQueries(): LookupQueries {
  const { psps, isLoading: pspsLoading, error: pspsError } = usePspsQuery()

  // TEMPORARY: Return hardcoded data directly for categories, payment methods, and types
  return {
    categories: TRANSFER_CATEGORIES,
    paymentMethods: PAYMENT_METHODS,
    transferTypes: TRANSFER_TYPES,
    psps, // Fetch PSPs from database
    isLoading: pspsLoading,
    isError: !!pspsError,
    error: pspsError ? new Error(pspsError) : null,
  }
}

/* ORIGINAL CODE - COMMENTED OUT FOR DEBUGGING
export function useLookupQueries_DATABASE(): LookupQueries {
  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['transfer-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_categories')
        .select('id, name, is_deposit, aliases')
        .order('name')

      if (error) throw error
      return data as TransferCategory[]
    },
    staleTime: Infinity, // Lookups are fixed, never stale
  })

  // Fetch payment methods
  const paymentMethodsQuery = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, name, aliases')
        .order('name')

      if (error) throw error
      return data as PaymentMethod[]
    },
    staleTime: Infinity,
  })

  // Fetch transfer types
  const transferTypesQuery = useQuery({
    queryKey: ['transfer-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_types')
        .select('id, name, aliases')
        .order('name')

      if (error) throw error
      return data as TransferType[]
    },
    staleTime: Infinity,
  })

  const isLoading = categoriesQuery.isLoading || paymentMethodsQuery.isLoading || transferTypesQuery.isLoading
  const isError = categoriesQuery.isError || paymentMethodsQuery.isError || transferTypesQuery.isError
  const error = categoriesQuery.error || paymentMethodsQuery.error || transferTypesQuery.error

  // Fallback to hardcoded data if fetch fails OR returns empty array
  return {
    categories: (categoriesQuery.data && categoriesQuery.data.length > 0) ? categoriesQuery.data : TRANSFER_CATEGORIES,
    paymentMethods: (paymentMethodsQuery.data && paymentMethodsQuery.data.length > 0) ? paymentMethodsQuery.data : PAYMENT_METHODS,
    transferTypes: (transferTypesQuery.data && transferTypesQuery.data.length > 0) ? transferTypesQuery.data : TRANSFER_TYPES,
    isLoading,
    isError: isError as boolean,
    error: error as Error | null,
  }
}
*/
