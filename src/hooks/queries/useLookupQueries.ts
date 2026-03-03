import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import {
  TRANSFER_CATEGORIES,
  PAYMENT_METHODS,
  TRANSFER_TYPES,
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
 * Lookup data hook.
 *
 * Transfer Types and Payment Methods are queried per-org from the DB
 * (global system defaults + org-specific custom entries).
 *
 * Categories remain hardcoded constants (DEP/WD are always fixed).
 * PSPs come from the psps table filtered by org.
 */
export function useLookupQueries(): LookupQueries {
  const { currentOrg } = useOrganization()
  const { psps, isLoading: pspsLoading, error: pspsError } = usePspsQuery()

  const { data: transferTypesData, isLoading: typesLoading } = useQuery({
    queryKey: queryKeys.lookups.transferTypes(currentOrg?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_types')
        .select('*')
        .or(`organization_id.is.null,organization_id.eq.${currentOrg!.id}`)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as TransferType[]
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
  })

  const { data: paymentMethodsData, isLoading: methodsLoading } = useQuery({
    queryKey: queryKeys.lookups.paymentMethods(currentOrg?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .or(`organization_id.is.null,organization_id.eq.${currentOrg!.id}`)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PaymentMethod[]
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
  })

  return {
    categories: TRANSFER_CATEGORIES,
    paymentMethods: paymentMethodsData ?? PAYMENT_METHODS,
    transferTypes: transferTypesData ?? TRANSFER_TYPES,
    psps,
    isLoading: typesLoading || methodsLoading || pspsLoading,
    isError: !!pspsError,
    error: pspsError ? new Error(pspsError) : null,
  }
}
