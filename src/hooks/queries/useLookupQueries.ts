import { useQueries } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type {
  Psp,
  TransferCategory,
  PaymentMethod,
  TransferType,
} from '@/lib/database.types'

interface LookupQueries {
  psps: Psp[]
  categories: TransferCategory[]
  paymentMethods: PaymentMethod[]
  transferTypes: TransferType[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export function useLookupQueries(): LookupQueries {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.lookups.psps(orgId ?? ''),
        queryFn: async () => {
          if (!orgId) throw new Error('No organization selected')
          const { data, error } = await supabase
            .from('psps')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('name')

          if (error) throw error
          return data as Psp[]
        },
        enabled: !!orgId,
      },
      {
        queryKey: queryKeys.lookups.categories(orgId ?? ''),
        queryFn: async () => {
          if (!orgId) throw new Error('No organization selected')
          const { data, error } = await supabase
            .from('transfer_categories')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('name')

          if (error) throw error
          return data as TransferCategory[]
        },
        enabled: !!orgId,
      },
      {
        queryKey: queryKeys.lookups.paymentMethods(orgId ?? ''),
        queryFn: async () => {
          if (!orgId) throw new Error('No organization selected')
          const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('name')

          if (error) throw error
          return data as PaymentMethod[]
        },
        enabled: !!orgId,
      },
      {
        queryKey: queryKeys.lookups.transferTypes(orgId ?? ''),
        queryFn: async () => {
          if (!orgId) throw new Error('No organization selected')
          const { data, error } = await supabase
            .from('transfer_types')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('name')

          if (error) throw error
          return data as TransferType[]
        },
        enabled: !!orgId,
      },
    ],
  })

  const [pspsQuery, categoriesQuery, paymentMethodsQuery, transferTypesQuery] =
    results

  return {
    psps: pspsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    paymentMethods: paymentMethodsQuery.data ?? [],
    transferTypes: transferTypesQuery.data ?? [],
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    error: results.find((r) => r.error)?.error ?? null,
  }
}
